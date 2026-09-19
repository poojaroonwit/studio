import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { getPool } from '@/lib/db';
import { getDownloadedStorageFile } from '@/app/api/download/download-route-storage';
import { deleteMobileEmergencyContact, writeMobileEmergencyContact } from '@/lib/ess/mobile-emergency-contacts';

export const dynamic = 'force-dynamic';

const ACCOUNT_URL = (process.env.OUTBORN_ACCOUNT_AUTH_URL || process.env.OUTBORN_ACCOUNT_BASE_URL || '').replace(/\/+$/, '');
const DOWNLOAD_TTL_SECONDS = 5 * 60;

type RouteContext = { params: Promise<{ path?: string[] }> };
type EssIdentity = {
  userId: string;
  employeeId: string;
  email: string;
  employeeNumber: string;
};

type DbRow = Record<string, unknown>;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function bodyJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function stringValue(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function optionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function jsonArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : [];
}

function asIsoDate(value: unknown) {
  if (!(value instanceof Date) && typeof value !== 'string') return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function asIso(value: unknown) {
  if (!(value instanceof Date) && typeof value !== 'string') return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function maskLast4(value: unknown) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, '') : '';
  return text ? text.slice(-4) : undefined;
}

function maskTaxId(value: unknown) {
  const text = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (!text) return undefined;
  if (text.length <= 4) return '*'.repeat(text.length);
  return `${'*'.repeat(Math.min(9, text.length - 4))}${text.slice(-4)}`;
}

async function fetchBearerProfile(token: string): Promise<{ sub?: string; email?: string } | null> {
  if (!ACCOUNT_URL || !ACCOUNT_URL.startsWith('https://')) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${ACCOUNT_URL}/api/auth/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const profile = await response.json() as Record<string, unknown>;
    return {
      sub: typeof profile.sub === 'string' ? profile.sub : undefined,
      email: typeof profile.email === 'string' ? profile.email.toLowerCase() : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveIdentity(request: NextRequest): Promise<EssIdentity | null> {
  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  let userId = '';
  let email = '';

  if (bearer) {
    const profile = await fetchBearerProfile(bearer);
    if (!profile?.email) return null;
    email = profile.email;
  } else {
    const session = await auth();
    if (!session?.user) return null;
    userId = session.user.id || '';
    email = (session.user.email || '').toLowerCase();
  }

  const result = await getPool().query(
    `SELECT u.id AS "userId", u.email, e.id AS "employeeId", e.employee_number AS "employeeNumber"
       FROM "User" u
       JOIN hr_employees e ON e.user_id = u.id
      WHERE u.is_active = TRUE
        AND e.status = 'active'
        AND (($1::uuid IS NOT NULL AND u.id = $1::uuid) OR ($2 <> '' AND LOWER(u.email) = LOWER($2)))
      LIMIT 1`,
    [userId || null, email],
  );
  const row = result.rows[0] as DbRow | undefined;
  if (!row) return null;
  return {
    userId: String(row.userId),
    employeeId: String(row.employeeId),
    email: String(row.email),
    employeeNumber: String(row.employeeNumber),
  };
}

async function requireIdentity(request: NextRequest) {
  const identity = await resolveIdentity(request);
  return identity ? { identity } : { response: jsonError('Unauthorized', 401) };
}

function downloadSecret() {
  return process.env.ESS_DOWNLOAD_SIGNING_SECRET || process.env.NEXTAUTH_SECRET || '';
}

function signDocument(documentId: string, expires: number) {
  const secret = downloadSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(`${documentId}:${expires}`).digest('hex');
}

function validDocumentSignature(documentId: string, expires: number, signature: string) {
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000) || expires > Math.floor(Date.now() / 1000) + DOWNLOAD_TTL_SECONDS + 30) return false;
  const expected = signDocument(documentId, expires);
  if (!expected || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

async function bootstrap(identity: EssIdentity) {
  const pool = getPool();
  const [employeeResult, attendanceResult, leaveResult, documentResult, notificationResult, shiftResult, leaveBalanceResult] = await Promise.all([
    pool.query(
      `SELECT e.*, p.title AS "positionTitle", d.name AS "departmentName"
         FROM hr_employees e
         LEFT JOIN "Position" p ON p.id = e.position_id
         LEFT JOIN hr_departments d ON d.id = e.department_id
        WHERE e.id = $1`,
      [identity.employeeId],
    ),
    pool.query(
      `SELECT id, work_date, clock_in, clock_out, status
         FROM hr_attendance_records
        WHERE employee_id = $1
        ORDER BY work_date DESC
        LIMIT 60`,
      [identity.employeeId],
    ),
    pool.query(
      `SELECT r.id, r.start_date, r.end_date, r.days, r.status,
              COALESCE(p.name, p.leave_type, 'Leave') AS type
         FROM hr_leave_requests r
         LEFT JOIN hr_leave_policies p ON p.id = r.policy_id
        WHERE r.employee_id = $1
        ORDER BY r.created_at DESC
        LIMIT 60`,
      [identity.employeeId],
    ),
    pool.query(
      `SELECT id, title, type, category, issue_date, created_at
         FROM hr_employee_documents
        WHERE employee_id = $1
          AND status NOT IN ('deleted', 'revoked')
        ORDER BY COALESCE(issue_date, created_at) DESC
        LIMIT 60`,
      [identity.employeeId],
    ),
    pool.query(
      `SELECT id, title, message, "createdAt", "isRead"
         FROM "Notification"
        WHERE "userId" = $1
        ORDER BY "createdAt" DESC
        LIMIT 80`,
      [identity.userId],
    ),
    pool.query(
      `SELECT shift_date, start_time, end_time, work_location
         FROM hr_shift_assignments
        WHERE employee_id = $1
          AND shift_date >= (NOW() AT TIME ZONE 'Asia/Bangkok')::date
          AND status NOT IN ('cancelled', 'deleted')
        ORDER BY shift_date ASC
        LIMIT 1`,
      [identity.employeeId],
    ),
    pool.query(
      `SELECT COALESCE(SUM(allocated + carry_forward + accrued - used - pending - reserved), 0) AS balance
         FROM hr_leave_balances
        WHERE employee_id = $1
          AND year = EXTRACT(YEAR FROM NOW())::int`,
      [identity.employeeId],
    ),
  ]);

  const employee = employeeResult.rows[0] as DbRow;
  if (!employee) throw new Error('Employee profile not found');
  const personal = jsonObject(employee.personal_information);
  const bank = jsonObject(employee.bank_information);
  const tax = jsonObject(employee.tax_information);
  const address = jsonObject(employee.address);
  const contacts = jsonArray(employee.emergency_contacts);
  const shift = shiftResult.rows[0] as DbRow | undefined;
  const notifications = notificationResult.rows as DbRow[];

  return {
    employee: {
      employeeId: String(employee.employee_number),
      name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
      position: String(employee.job_title || employee.positionTitle || 'Employee'),
      department: String(employee.departmentName || employee.business_unit || 'General'),
      avatarUrl: typeof employee.profile_photo_url === 'string' ? employee.profile_photo_url : undefined,
      shiftLabel: shift ? asIsoDate(shift.shift_date) : 'Schedule',
      nextShift: shift ? `${shift.start_time || ''}–${shift.end_time || ''}${shift.work_location ? ` · ${shift.work_location}` : ''}` : 'No upcoming shift',
      leaveBalanceDays: Number((leaveBalanceResult.rows[0] as DbRow | undefined)?.balance || 0),
      unreadNotifications: notifications.filter(item => !item.isRead).length,
    },
    profile: {
      preferredName: typeof employee.preferred_name === 'string' ? employee.preferred_name : undefined,
      personalEmail: typeof personal.email === 'string' ? personal.email : undefined,
      phone: typeof employee.phone === 'string' ? employee.phone : undefined,
      address: typeof address.formatted === 'string' ? address.formatted : undefined,
    },
    bankTax: {
      bankName: typeof bank.bankName === 'string' ? bank.bankName : typeof bank.bank_name === 'string' ? bank.bank_name : undefined,
      accountLast4: maskLast4(bank.accountNumber ?? bank.account_number),
      taxIdMasked: maskTaxId(tax.taxId ?? tax.tax_id),
      withholdingLabel: typeof tax.withholdingLabel === 'string' ? tax.withholdingLabel : undefined,
    },
    benefits: [],
    emergencyContacts: contacts.map((contact, index) => ({
      id: typeof contact.id === 'string' ? contact.id : `contact-${index}`,
      name: stringValue(contact.name, 120),
      relationship: stringValue(contact.relationship, 80),
      phone: stringValue(contact.phone, 50),
      primary: contact.primary === true,
    })),
    notifications: notifications.map(item => ({
      id: String(item.id),
      title: String(item.title || 'Notification'),
      body: typeof item.message === 'string' ? item.message : undefined,
      createdAt: asIso(item.createdAt),
      read: item.isRead === true,
    })),
    attendance: (attendanceResult.rows as DbRow[]).map(item => ({
      id: String(item.id),
      date: asIsoDate(item.work_date),
      checkIn: item.clock_in ? asIso(item.clock_in) : undefined,
      checkOut: item.clock_out ? asIso(item.clock_out) : undefined,
      status: ['present', 'late', 'leave', 'missing', 'holiday'].includes(String(item.status)) ? String(item.status) : 'present',
    })),
    leaveRequests: (leaveResult.rows as DbRow[]).map(item => ({
      id: String(item.id),
      type: String(item.type || 'Leave'),
      startDate: asIsoDate(item.start_date),
      endDate: asIsoDate(item.end_date),
      days: Number(item.days || 0),
      status: ['draft', 'pending', 'approved', 'rejected', 'cancelled'].includes(String(item.status)) ? String(item.status) : 'pending',
    })),
    documents: (documentResult.rows as DbRow[]).map(item => ({
      id: String(item.id),
      title: String(item.title || 'Employee document'),
      subtitle: typeof item.category === 'string' ? item.category : undefined,
      kind: ['payslip', 'tax', 'policy', 'certificate'].includes(String(item.type)) ? String(item.type) : 'other',
      issuedAt: asIsoDate(item.issue_date || item.created_at),
    })),
  };
}

async function clock(identity: EssIdentity, mode: 'in' | 'out', body: Record<string, unknown>, request: NextRequest) {
  const latitude = optionalNumber(body.latitude);
  const longitude = optionalNumber(body.longitude);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT id, clock_in, clock_out
         FROM hr_attendance_records
        WHERE employee_id = $1 AND work_date = (NOW() AT TIME ZONE 'Asia/Bangkok')::date
        FOR UPDATE`,
      [identity.employeeId],
    );
    let record = existing.rows[0] as DbRow | undefined;
    if (mode === 'in') {
      if (record?.clock_in) {
        await client.query('ROLLBACK');
        return jsonError('Already clocked in for this work date', 409);
      }
      if (!record) {
        const inserted = await client.query(
          `INSERT INTO hr_attendance_records
             (id, employee_id, work_date, clock_in, status, source, latitude, longitude, timezone, created_at, updated_at)
           VALUES ($1, $2, (NOW() AT TIME ZONE 'Asia/Bangkok')::date, NOW(), 'present', 'mobile', $3, $4, 'Asia/Bangkok', NOW(), NOW())
           RETURNING id, clock_in, clock_out`,
          [randomUUID(), identity.employeeId, latitude ?? null, longitude ?? null],
        );
        record = inserted.rows[0] as DbRow;
      } else {
        await client.query(
          `UPDATE hr_attendance_records
              SET clock_in = NOW(), source = 'mobile', latitude = $2, longitude = $3, updated_at = NOW(), version = version + 1
            WHERE id = $1`,
          [record.id, latitude ?? null, longitude ?? null],
        );
      }
    } else {
      if (!record?.clock_in) {
        await client.query('ROLLBACK');
        return jsonError('Clock in is required before clock out', 409);
      }
      if (record.clock_out) {
        await client.query('ROLLBACK');
        return jsonError('Already clocked out for this work date', 409);
      }
      await client.query(
        `UPDATE hr_attendance_records
            SET clock_out = NOW(),
                worked_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - clock_in)) / 60))::int,
                hours_worked = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - clock_in)) / 3600),
                latitude = COALESCE($2, latitude), longitude = COALESCE($3, longitude),
                source = 'mobile', updated_at = NOW(), version = version + 1
          WHERE id = $1`,
        [record.id, latitude ?? null, longitude ?? null],
      );
    }
    await client.query(
      `INSERT INTO hr_attendance_events
         (id, attendance_record_id, employee_id, event_type, occurred_at, logical_shift_date, source,
          latitude, longitude, ip_address, user_agent, idempotency_key, actor_user_id, created_at)
       VALUES ($1, $2, $3, $4, NOW(), (NOW() AT TIME ZONE 'Asia/Bangkok')::date, 'mobile',
               $5, $6, $7, $8, $9, $10, NOW())`,
      [
        randomUUID(), record!.id, identity.employeeId, mode === 'in' ? 'clock_in' : 'clock_out',
        latitude ?? null, longitude ?? null,
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        request.headers.get('user-agent') || null,
        randomUUID(), identity.userId,
      ],
    );
    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('ESS attendance clock failed', error);
    return jsonError('Unable to update attendance', 500);
  } finally {
    client.release();
  }
}

async function createLeave(identity: EssIdentity, body: Record<string, unknown>) {
  const type = stringValue(body.type, 120);
  const startDate = stringValue(body.startDate, 10);
  const endDate = stringValue(body.endDate, 10);
  const reason = stringValue(body.reason, 1000);
  if (!type || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return jsonError('Invalid leave request', 400);
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return jsonError('Invalid leave dates', 400);
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const policy = await getPool().query(
    `SELECT id FROM hr_leave_policies
      WHERE is_active = TRUE AND (LOWER(name) = LOWER($1) OR LOWER(leave_type) = LOWER($1))
      ORDER BY updated_at DESC LIMIT 1`,
    [type],
  );
  const result = await getPool().query(
    `INSERT INTO hr_leave_requests
       (id, employee_id, policy_id, start_date, end_date, days, reason, status, request_id, submitted_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, 'pending', $8, NOW(), NOW(), NOW())
     RETURNING id, start_date, end_date, days, status`,
    [randomUUID(), identity.employeeId, policy.rows[0]?.id ?? null, startDate, endDate, days, reason || null, `ESS-${Date.now()}-${randomUUID().slice(0, 8)}`],
  );
  const row = result.rows[0] as DbRow;
  return NextResponse.json({ id: String(row.id), type, startDate: asIsoDate(row.start_date), endDate: asIsoDate(row.end_date), days: Number(row.days), status: String(row.status) }, { status: 201 });
}

async function cancelLeave(identity: EssIdentity, id: string) {
  const result = await getPool().query(
    `UPDATE hr_leave_requests
        SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW(), version = version + 1
      WHERE id = $1 AND employee_id = $2 AND status IN ('draft', 'pending')
      RETURNING id, start_date, end_date, days, status, policy_id`,
    [id, identity.employeeId],
  );
  if (!result.rows[0]) return jsonError('Leave request not found or cannot be cancelled', 404);
  const row = result.rows[0] as DbRow;
  return NextResponse.json({ id: String(row.id), type: 'Leave', startDate: asIsoDate(row.start_date), endDate: asIsoDate(row.end_date), days: Number(row.days), status: 'cancelled' });
}

async function createCorrection(identity: EssIdentity, body: Record<string, unknown>) {
  const attendanceId = stringValue(body.attendanceId, 80);
  const reason = stringValue(body.reason, 1000);
  const requestedCheckIn = stringValue(body.requestedCheckIn, 80);
  const requestedCheckOut = stringValue(body.requestedCheckOut, 80);
  if (!attendanceId || !reason) return jsonError('Attendance record and reason are required', 400);
  const owned = await getPool().query('SELECT id FROM hr_attendance_records WHERE id = $1 AND employee_id = $2', [attendanceId, identity.employeeId]);
  if (!owned.rows[0]) return jsonError('Attendance record not found', 404);
  await getPool().query(
    `INSERT INTO hr_attendance_exceptions
       (id, attendance_record_id, code, severity, status, explanation, created_at, updated_at)
     VALUES ($1, $2, 'employee_correction_requested', 'warning', 'open', $3, NOW(), NOW())`,
    [randomUUID(), attendanceId, JSON.stringify({ reason, requestedCheckIn: requestedCheckIn || null, requestedCheckOut: requestedCheckOut || null, requestedBy: identity.userId })],
  );
  await getPool().query(`UPDATE hr_attendance_records SET exception_status = 'needs_review', review_status = 'open', updated_at = NOW() WHERE id = $1`, [attendanceId]);
  return NextResponse.json({ success: true }, { status: 201 });
}

async function patchProfile(identity: EssIdentity, body: Record<string, unknown>) {
  const preferredName = stringValue(body.preferredName, 120);
  const personalEmail = stringValue(body.personalEmail, 255);
  const phone = stringValue(body.phone, 80);
  const address = stringValue(body.address, 500);
  await getPool().query(
    `UPDATE hr_employees
        SET preferred_name = CASE WHEN $2 <> '' THEN $2 ELSE preferred_name END,
            phone = CASE WHEN $3 <> '' THEN $3 ELSE phone END,
            personal_information = personal_information || CASE WHEN $4 <> '' THEN jsonb_build_object('email', $4) ELSE '{}'::jsonb END,
            address = address || CASE WHEN $5 <> '' THEN jsonb_build_object('formatted', $5) ELSE '{}'::jsonb END,
            updated_at = NOW(), version = version + 1
      WHERE id = $1`,
    [identity.employeeId, preferredName, phone, personalEmail, address],
  );
  return NextResponse.json({ success: true });
}

async function patchBankTax(identity: EssIdentity, body: Record<string, unknown>) {
  const bankName = stringValue(body.bankName, 160);
  const accountNumber = stringValue(body.accountNumber, 80);
  const taxId = stringValue(body.taxId, 80);
  await getPool().query(
    `UPDATE hr_employees
        SET bank_information = bank_information || jsonb_strip_nulls(jsonb_build_object(
              'bankName', NULLIF($2, ''), 'accountNumber', NULLIF($3, '')
            )),
            tax_information = tax_information || jsonb_strip_nulls(jsonb_build_object('taxId', NULLIF($4, ''))),
            updated_at = NOW(), version = version + 1
      WHERE id = $1`,
    [identity.employeeId, bankName, accountNumber, taxId],
  );
  return NextResponse.json({ success: true });
}

async function createSupportTicket(identity: EssIdentity, body: Record<string, unknown>) {
  const subject = stringValue(body.subject, 180);
  const message = stringValue(body.message, 5000);
  const category = stringValue(body.category, 100) || 'general';
  if (!subject || !message) return jsonError('Subject and message are required', 400);
  const id = randomUUID();
  const requestNumber = `ESS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
  await getPool().query(
    `INSERT INTO employee_support_requests
       (id, request_number, requester_user_id, employee_id, category, subject, description, status, priority, metadata, submitted_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted', 'normal', $8::jsonb, NOW(), NOW(), NOW())`,
    [id, requestNumber, identity.userId, identity.employeeId, category, subject, message, JSON.stringify({ source: 'ess-mobile' })],
  );
  return NextResponse.json({ id, status: 'submitted' }, { status: 201 });
}

async function documentLink(request: NextRequest, identity: EssIdentity, id: string) {
  const result = await getPool().query(
    `SELECT id FROM hr_employee_documents WHERE id = $1 AND employee_id = $2 AND status NOT IN ('deleted', 'revoked') AND file_path IS NOT NULL`,
    [id, identity.employeeId],
  );
  if (!result.rows[0]) return jsonError('Document not found', 404);
  if (!downloadSecret()) return jsonError('Document signing is not configured', 503);
  const expires = Math.floor(Date.now() / 1000) + DOWNLOAD_TTL_SECONDS;
  const signature = signDocument(id, expires);
  return NextResponse.json({ url: `${request.nextUrl.origin}/api/ess/document-file/${encodeURIComponent(id)}?expires=${expires}&signature=${signature}` });
}

async function serveDocument(request: NextRequest, id: string) {
  const expires = Number(request.nextUrl.searchParams.get('expires'));
  const signature = request.nextUrl.searchParams.get('signature') || '';
  if (!validDocumentSignature(id, expires, signature)) return jsonError('Document link expired or invalid', 401);
  const result = await getPool().query(
    `SELECT file_path, title, mime_type FROM hr_employee_documents WHERE id = $1 AND status NOT IN ('deleted', 'revoked')`,
    [id],
  );
  const row = result.rows[0] as DbRow | undefined;
  if (!row?.file_path) return jsonError('Document not found', 404);
  try {
    const file = await getDownloadedStorageFile(String(row.file_path));
    const safeName = String(row.title || 'employee-document').replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120);
    return new NextResponse(file.buffer, {
      headers: {
        'Content-Type': typeof row.mime_type === 'string' ? row.mime_type : file.contentType,
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('ESS document download failed', error);
    return jsonError('Unable to open document', 500);
  }
}

async function pathParts(context: RouteContext) {
  return (await context.params).path || [];
}

export async function GET(request: NextRequest, context: RouteContext) {
  const path = await pathParts(context);
  if (path[0] === 'document-file' && path[1]) return serveDocument(request, path[1]);
  const authResult = await requireIdentity(request);
  if ('response' in authResult) return authResult.response;
  const { identity } = authResult;
  if (path.join('/') === 'mobile/bootstrap') {
    try { return NextResponse.json(await bootstrap(identity)); }
    catch (error) { console.error('ESS bootstrap failed', error); return jsonError('Unable to load employee self-service', 500); }
  }
  if (path[0] === 'documents' && path[1] && path[2] === 'download') return documentLink(request, identity, path[1]);
  return jsonError('Not found', 404);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const path = await pathParts(context);
  const authResult = await requireIdentity(request);
  if ('response' in authResult) return authResult.response;
  const { identity } = authResult;
  const body = await bodyJson(request) || {};
  if (path.join('/') === 'attendance/clock-in') return clock(identity, 'in', body, request);
  if (path.join('/') === 'attendance/clock-out') return clock(identity, 'out', body, request);
  if (path.join('/') === 'attendance/corrections') return createCorrection(identity, body);
  if (path.join('/') === 'leave/requests') return createLeave(identity, body);
  if (path[0] === 'leave' && path[1] === 'requests' && path[2] && path[3] === 'cancel') return cancelLeave(identity, path[2]);
  if (path.join('/') === 'emergency-contacts') {
    const result = await writeMobileEmergencyContact(identity.employeeId, body);
    return 'error' in result ? jsonError(result.error, result.status) : NextResponse.json(result.contact, { status: 201 });
  }
  if (path.join('/') === 'hr-support/tickets') return createSupportTicket(identity, body);
  if (path[0] === 'notifications' && path[1] && path[2] === 'read') {
    await getPool().query('UPDATE "Notification" SET "isRead" = TRUE, "updatedAt" = NOW() WHERE id = $1 AND "userId" = $2', [path[1], identity.userId]);
    return new NextResponse(null, { status: 204 });
  }
  if (path.join('/') === 'notifications/read-all') {
    await getPool().query('UPDATE "Notification" SET "isRead" = TRUE, "updatedAt" = NOW() WHERE "userId" = $1 AND "isRead" = FALSE', [identity.userId]);
    return new NextResponse(null, { status: 204 });
  }
  return jsonError('Not found', 404);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const path = await pathParts(context);
  const authResult = await requireIdentity(request);
  if ('response' in authResult) return authResult.response;
  const { identity } = authResult;
  const body = await bodyJson(request);
  if (!body) return jsonError('Invalid JSON body', 400);
  if (path.join('/') === 'profile') return patchProfile(identity, body);
  if (path.join('/') === 'bank-tax') return patchBankTax(identity, body);
  const contactId = path[1];
  if (path[0] === 'emergency-contacts' && contactId) {
    const result = await writeMobileEmergencyContact(identity.employeeId, body, contactId);
    return 'error' in result ? jsonError(result.error, result.status) : NextResponse.json(result.contact);
  }
  return jsonError('Not found', 404);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const path = await pathParts(context);
  const authResult = await requireIdentity(request);
  if ('response' in authResult) return authResult.response;
  const contactId = path[1];
  if (path[0] === 'emergency-contacts' && contactId) {
    const deleted = await deleteMobileEmergencyContact(authResult.identity.employeeId, contactId);
    return deleted ? new NextResponse(null, { status: 204 }) : jsonError('Emergency contact not found', 404);
  }
  return jsonError('Not found', 404);
}
