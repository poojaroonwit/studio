import { getPool } from '@/lib/db';

type EssIdentity = {
  userId: string;
  employeeId: string;
  email: string;
  employeeNumber: string;
};

type DbRow = Record<string, unknown>;

function stringValue(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
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

export async function loadMobileEssBootstrap(identity: EssIdentity) {
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
