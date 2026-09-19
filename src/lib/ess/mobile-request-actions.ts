import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

import { getPool } from '@/lib/db';
import { cancelOwnLeaveRequest, createEssGroupedLeaveRequest } from '@/lib/hr/ess-service';
import { acknowledgeOwnDocument } from '@/lib/hr/ess-action-service';
import { essRequestCreateSchema } from '@/lib/hr/ess-contracts';
import { createEssRequest } from '@/lib/hr/ess-request-service';

export type MobileEssRequestIdentity = {
  userId: string;
  employeeId: string;
  email: string;
};

type DbRow = Record<string, unknown>;

function text(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function isoDate(value: unknown) {
  if (!(value instanceof Date) && typeof value !== 'string') return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function iso(value: unknown) {
  if (!(value instanceof Date) && typeof value !== 'string') return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function sameMinute(left: string, right: unknown) {
  if (!left || !right) return false;
  const leftDate = new Date(left);
  const rightDate = right instanceof Date ? right : new Date(String(right));
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) return false;
  return Math.floor(leftDate.getTime() / 60_000) === Math.floor(rightDate.getTime() / 60_000);
}

function errorResponse(error: unknown, fallback: string) {
  return NextResponse.json({ error: error instanceof Error ? error.message : fallback }, { status: 400 });
}

export async function createMobileAttendanceCorrection(identity: MobileEssRequestIdentity, body: Record<string, unknown>) {
  const attendanceId = text(body.attendanceId, 80);
  const reason = text(body.reason, 2000);
  const correctionType = text(body.correctionType, 80);
  const requestedCheckIn = text(body.requestedCheckIn, 80);
  const requestedCheckOut = text(body.requestedCheckOut, 80);

  if (!attendanceId) return NextResponse.json({ error: 'Choose an attendance record' }, { status: 400 });

  const owned = await getPool().query(
    `SELECT id, work_date, clock_in, clock_out
       FROM hr_attendance_records
      WHERE id = $1::uuid AND employee_id = $2::uuid
      LIMIT 1`,
    [attendanceId, identity.employeeId],
  ).catch(() => ({ rows: [] as DbRow[] }));
  const record = owned.rows[0] as DbRow | undefined;
  if (!record) return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });

  const workDate = isoDate(record.work_date);
  const correctsCheckIn = ['missing_check_in', 'incorrect_check_in'].includes(correctionType);
  const correctsCheckOut = ['missing_check_out', 'incorrect_check_out'].includes(correctionType);
  if (!correctsCheckIn && !correctsCheckOut) {
    return NextResponse.json({ error: 'Choose whether to correct clock in or clock out' }, { status: 400 });
  }
  if (correctsCheckIn && !requestedCheckIn) return NextResponse.json({ error: 'Choose the requested clock-in time' }, { status: 400 });
  if (correctsCheckOut && !requestedCheckOut) return NextResponse.json({ error: 'Choose the requested clock-out time' }, { status: 400 });
  if (correctsCheckIn && sameMinute(requestedCheckIn, record.clock_in)) {
    return NextResponse.json({ error: 'Requested clock-in time matches the current record' }, { status: 400 });
  }
  if (correctsCheckOut && sameMinute(requestedCheckOut, record.clock_out)) {
    return NextResponse.json({ error: 'Requested clock-out time matches the current record' }, { status: 400 });
  }

  const values: Record<string, unknown> = {
    workDate,
    correctionType,
    attendanceRecordId: attendanceId,
  };
  if (correctsCheckIn) values.clockIn = requestedCheckIn;
  if (correctsCheckOut) values.clockOut = requestedCheckOut;

  const parsed = essRequestCreateSchema.safeParse({
    requestType: 'attendance_correction',
    title: `Attendance correction · ${workDate}`,
    reason,
    values,
    originalValues: {
      clockIn: iso(record.clock_in) || null,
      clockOut: iso(record.clock_out) || null,
    },
    supportingDocuments: [],
    saveAsDraft: false,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid attendance correction request' }, { status: 400 });
  }

  try {
    const data = await createEssRequest(identity.userId, identity.email, parsed.data);
    return NextResponse.json({ id: data.id, requestNumber: data.request_id, status: data.status }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Unable to create attendance correction');
  }
}

function normalizeProfileChangeValue(
  field: 'preferredName' | 'phone' | 'address' | 'bankInformation' | 'taxInformation',
  value: unknown,
) {
  if (field === 'preferredName') {
    const normalized = text(value, 120);
    return normalized ? normalized : null;
  }
  if (field === 'phone') {
    const normalized = text(value, 80);
    return normalized ? normalized : null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (field === 'address') {
    const formatted = text(record.formatted, 500);
    return formatted ? { formatted } : null;
  }
  if (field === 'bankInformation') {
    const bankName = text(record.bankName, 160);
    const accountNumber = text(record.accountNumber, 80);
    const normalized = {
      ...(bankName ? { bankName } : {}),
      ...(accountNumber ? { accountNumber } : {}),
    };
    return Object.keys(normalized).length > 0 ? normalized : null;
  }
  const taxId = text(record.taxId, 80);
  return taxId ? { taxId } : null;
}

async function createProfileChange(
  identity: MobileEssRequestIdentity,
  field: 'preferredName' | 'phone' | 'address' | 'bankInformation' | 'taxInformation',
  value: unknown,
  reason: string,
) {
  const labels: Record<string, string> = {
    preferredName: 'Preferred name',
    phone: 'Personal phone',
    address: 'Address',
    bankInformation: 'Bank information',
    taxInformation: 'Tax information',
  };
  const parsed = essRequestCreateSchema.safeParse({
    requestType: 'profile_change',
    title: `Update ${labels[field] || 'profile'}`,
    reason,
    values: { [field]: value },
    originalValues: {},
    saveAsDraft: false,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Invalid profile change request');
  return createEssRequest(identity.userId, identity.email, parsed.data);
}

export async function createMobileProfileChangeRequest(identity: MobileEssRequestIdentity, body: Record<string, unknown>) {
  const field = text(body.field, 80);
  const reason = text(body.reason, 2000);
  const allowedFields = new Set(['preferredName', 'phone', 'address', 'bankInformation', 'taxInformation']);
  if (!allowedFields.has(field)) return NextResponse.json({ error: 'This profile field cannot be changed from mobile' }, { status: 400 });
  if (reason.length < 3) return NextResponse.json({ error: 'Add a short reason for this change request' }, { status: 400 });

  const typedField = field as 'preferredName' | 'phone' | 'address' | 'bankInformation' | 'taxInformation';
  const normalizedValue = normalizeProfileChangeValue(typedField, body.value);
  if (normalizedValue === null) return NextResponse.json({ error: 'Enter a valid value for this profile change' }, { status: 400 });

  try {
    const data = await createProfileChange(
      identity,
      typedField,
      normalizedValue,
      reason,
    );
    return NextResponse.json({ id: data.id, requestNumber: data.request_id, status: data.status }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Unable to create profile change request');
  }
}

export async function createLegacyMobileProfileChangeRequests(
  identity: MobileEssRequestIdentity,
  kind: 'profile' | 'bank-tax',
  body: Record<string, unknown>,
) {
  const changes: Array<{
    field: 'preferredName' | 'phone' | 'address' | 'bankInformation' | 'taxInformation';
    value: unknown;
  }> = [];

  if (kind === 'profile') {
    const currentResult = await getPool().query(
      `SELECT preferred_name, phone, address
         FROM hr_employees
        WHERE id = $1::uuid
        LIMIT 1`,
      [identity.employeeId],
    ).catch(() => ({ rows: [] as DbRow[] }));
    const current = currentResult.rows[0] as DbRow | undefined;
    const currentAddress = current?.address && typeof current.address === 'object' && !Array.isArray(current.address)
      ? text((current.address as Record<string, unknown>).formatted, 500)
      : '';
    const preferredName = text(body.preferredName, 120);
    const phone = text(body.phone, 80);
    const address = text(body.address, 500);
    if (preferredName && preferredName !== text(current?.preferred_name, 120)) changes.push({ field: 'preferredName', value: preferredName });
    if (phone && phone !== text(current?.phone, 80)) changes.push({ field: 'phone', value: phone });
    if (address && address !== currentAddress) changes.push({ field: 'address', value: { formatted: address } });
  } else {
    const bankName = text(body.bankName, 160);
    const accountNumber = text(body.accountNumber, 80);
    const taxId = text(body.taxId, 80);
    const bankInformation = {
      ...(bankName ? { bankName } : {}),
      ...(accountNumber ? { accountNumber } : {}),
    };
    if (Object.keys(bankInformation).length > 0) changes.push({ field: 'bankInformation', value: bankInformation });
    if (taxId) changes.push({ field: 'taxInformation', value: { taxId } });
  }

  if (changes.length === 0) {
    return NextResponse.json({
      error: kind === 'profile'
        ? 'No supported profile changes were provided. Account email is managed by Outborn Account.'
        : 'Enter at least one bank or tax value to change.',
    }, { status: 400 });
  }

  try {
    const requests = [];
    for (const change of changes) {
      const data = await createProfileChange(identity, change.field, change.value, 'Requested from mobile account settings');
      requests.push({ id: data.id, requestNumber: data.request_id, status: data.status });
    }
    return NextResponse.json({ success: true, requests }, { status: 202 });
  } catch (error) {
    return errorResponse(error, 'Unable to create profile change request');
  }
}

export async function createMobileLeaveRequest(identity: MobileEssRequestIdentity, body: Record<string, unknown>) {
  const policyId = text(body.policyId, 80);
  const startDate = text(body.startDate, 10);
  const endDate = text(body.endDate, 10);
  const reason = text(body.reason, 1000);
  const emergencyContact = text(body.emergencyContact, 500);

  if (!policyId || !/^[0-9a-f-]{36}$/i.test(policyId) || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return NextResponse.json({ error: 'Choose an available leave policy and valid dates' }, { status: 400 });
  }
  if (!emergencyContact) return NextResponse.json({ error: 'Choose an emergency contact before submitting leave' }, { status: 400 });

  try {
    const result = await createEssGroupedLeaveRequest(identity.userId, identity.email, {
      startDate,
      endDate,
      policyId,
      requestUnit: 'full_day',
      halfDayPeriod: null,
      requestedHours: null,
      reason: reason || null,
      emergencyContact,
      handoverInformation: null,
      actingEmployeeId: null,
      saveAsDraft: false,
    });
    const segment = result.segments[0] as DbRow | undefined;
    return NextResponse.json({
      id: segment?.id ? String(segment.id) : result.id,
      requestGroupId: result.requestGroupId,
      startDate: isoDate(segment?.start_date || startDate),
      endDate: isoDate(segment?.end_date || endDate),
      days: Number(segment?.days || 0),
      status: String(segment?.status || 'pending_approval'),
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Unable to create leave request');
  }
}

export async function cancelMobileLeaveRequest(identity: MobileEssRequestIdentity, id: string) {
  try {
    const result = await cancelOwnLeaveRequest(identity.userId, identity.email, id, 'cancel');
    if (!result) return NextResponse.json({ error: 'Leave request changed or can no longer be cancelled' }, { status: 409 });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, 'Unable to cancel leave request');
  }
}

export async function createMobileSupportTicket(identity: MobileEssRequestIdentity, body: Record<string, unknown>) {
  const subject = text(body.subject, 180);
  const message = text(body.message, 5000);
  const category = text(body.category, 100) || 'general';
  if (!subject || !message) return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });

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

export async function replyMobileSupportTicket(identity: MobileEssRequestIdentity, id: string, body: Record<string, unknown>) {
  const message = text(body.message, 5000);
  if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

  const owned = await getPool().query(
    `SELECT id, status FROM employee_support_requests
      WHERE id = $1::uuid AND employee_id = $2::uuid LIMIT 1`,
    [id, identity.employeeId],
  );
  const request = owned.rows[0] as DbRow | undefined;
  if (!request) return NextResponse.json({ error: 'HR request not found' }, { status: 404 });
  if (['resolved', 'closed', 'cancelled', 'canceled'].includes(String(request.status || '').toLowerCase())) {
    return NextResponse.json({ error: 'This HR request is closed. Create a new request to continue.' }, { status: 409 });
  }

  await getPool().query(
    `INSERT INTO employee_support_activities
       (id, request_id, actor_user_id, action, message, visibility, metadata, created_at)
     VALUES ($1, $2::uuid, $3::uuid, 'requester_message', $4, 'requester', '{}'::jsonb, NOW())`,
    [randomUUID(), id, identity.userId, message],
  );
  await getPool().query(
    `UPDATE employee_support_requests SET updated_at = NOW() WHERE id = $1::uuid AND employee_id = $2::uuid`,
    [id, identity.employeeId],
  );
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function acknowledgeMobileDocument(
  identity: MobileEssRequestIdentity,
  documentId: string,
  request: { headers: Headers },
) {
  try {
    const data = await acknowledgeOwnDocument({
      userId: identity.userId,
      email: identity.email,
      documentId,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: request.headers.get('user-agent'),
    });
    if (!data) return NextResponse.json({ error: 'Document not found or acknowledgment is not required' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'Unable to acknowledge document');
  }
}
