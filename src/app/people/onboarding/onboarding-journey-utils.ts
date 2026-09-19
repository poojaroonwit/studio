export type RecordItem = Record<string, unknown> & { id: string };
export type ResourceResponse = { resource?: { records?: RecordItem[] }; records?: RecordItem[]; data?: RecordItem };
export type JourneyFilter = 'all' | 'needs_action' | 'starting_soon' | 'on_track' | 'completed';
export type JourneyGroup = 'needs_action' | 'starting_soon' | 'on_track' | 'completed';
export type JourneyStageId = 'personal_information' | 'employment_details' | 'payroll' | 'account_access' | 'equipment' | 'compliance' | 'orientation';

export type JourneyRow = {
  caseItem: RecordItem;
  employee: RecordItem | null;
  employeeId: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  role: string;
  department: string;
  location: string;
  owner: string;
  startDate: Date | null;
  startDateLabel: string;
  daysToStart: number | null;
  phase: string;
  progress: number;
  status: string;
  group: JourneyGroup;
  risk: 'high' | 'medium' | 'low' | 'none';
  topBlocker: string;
  nextAction: string;
};

export const FILTERS: Array<{ id: JourneyFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'needs_action', label: 'Needs action' },
  { id: 'starting_soon', label: 'Starting soon' },
  { id: 'on_track', label: 'On track' },
  { id: 'completed', label: 'Completed' },
];

export const GROUPS: Array<{ id: JourneyGroup; label: string }> = [
  { id: 'needs_action', label: 'Needs action' },
  { id: 'starting_soon', label: 'Starting soon' },
  { id: 'on_track', label: 'On track' },
  { id: 'completed', label: 'Completed' },
];

export function records(payload: ResourceResponse) {
  return payload.resource?.records || payload.records || [];
}

export function value(record: Record<string, unknown> | null | undefined, camel: string, snake?: string) {
  return record?.[camel] ?? (snake ? record?.[snake] : undefined);
}

export function label(valueToFormat: unknown, fallback = '—') {
  return valueToFormat === null || valueToFormat === undefined || valueToFormat === ''
    ? fallback
    : String(valueToFormat).replace(/_/g, ' ');
}

export function percentage(valueToFormat: unknown) {
  const parsed = Number(valueToFormat);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 0;
}

export function dateValue(valueToParse: unknown) {
  if (!valueToParse) return null;
  const parsed = new Date(String(valueToParse));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(dateToFormat: Date | null) {
  if (!dateToFormat) return 'Not set';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(dateToFormat);
}

export function startDifference(date: Date | null) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return Math.ceil((normalized.getTime() - today.getTime()) / 86_400_000);
}

export function firstText(record: RecordItem | null, fields: Array<[string, string?]>, fallback: string) {
  for (const [camel, snake] of fields) {
    const candidate = value(record, camel, snake);
    if (candidate !== null && candidate !== undefined && candidate !== '') return label(candidate, fallback);
  }
  return fallback;
}

export function employeeName(employee: RecordItem | null, caseItem: RecordItem) {
  if (!employee) return firstText(caseItem, [['employeeName', 'employee_name'], ['name'], ['title']], 'Employee record');
  const first = label(value(employee, 'preferredName', 'preferred_name'), '') || label(value(employee, 'firstName', 'first_name'), '');
  const last = label(value(employee, 'lastName', 'last_name'), '');
  return `${first} ${last}`.trim() || label(employee.email, 'Employee record');
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'NH';
}

export function journeyPhase(daysToStart: number | null, status: string) {
  if (status === 'completed') return 'Completed';
  if (daysToStart === null || daysToStart > 0) return 'Before start';
  if (daysToStart >= -1) return 'First day';
  if (daysToStart >= -7) return 'First week';
  return 'First 30 days';
}

export function buildJourneyRow(caseItem: RecordItem, employees: RecordItem[]): JourneyRow {
  const employeeId = String(value(caseItem, 'employeeId', 'employee_id') || '');
  const employee = employees.find(candidate => candidate.id === employeeId) || null;
  const status = label(caseItem.status, 'not started').toLowerCase();
  const startDate = dateValue(value(caseItem, 'startDate', 'start_date')) || dateValue(value(employee, 'hireDate', 'hire_date'));
  const daysToStart = startDifference(startDate);
  const progress = percentage(caseItem.progress);
  const targetDate = dateValue(value(caseItem, 'targetDate', 'target_date'));
  const targetOverdue = Boolean(targetDate && targetDate.getTime() < Date.now() && status !== 'completed');
  const needsAction = ['blocked', 'at risk', 'at_risk', 'overdue'].includes(status) || targetOverdue || (progress < 50 && daysToStart !== null && daysToStart <= 7);
  const startingSoon = !needsAction && status !== 'completed' && daysToStart !== null && daysToStart >= 0 && daysToStart <= 7;
  const group: JourneyGroup = status === 'completed' ? 'completed' : needsAction ? 'needs_action' : startingSoon ? 'starting_soon' : 'on_track';
  const risk = group === 'needs_action' ? (progress < 35 || targetOverdue ? 'high' : 'medium') : group === 'starting_soon' && progress < 75 ? 'medium' : group === 'completed' ? 'none' : 'low';
  const phase = journeyPhase(daysToStart, status);
  const defaultNextAction = status === 'completed'
    ? 'No action needed'
    : group === 'needs_action'
      ? 'Review overdue tasks'
      : phase === 'Before start'
        ? 'Complete preboarding'
        : phase === 'First week'
          ? 'Review first-week tasks'
          : 'Continue onboarding';
  const nextAction = firstText(caseItem, [['nextAction', 'next_action']], defaultNextAction);
  const topBlocker = firstText(caseItem, [['topBlocker', 'top_blocker'], ['blocker']], group === 'needs_action'
    ? 'Overdue tasks require review'
    : group === 'starting_soon'
      ? 'Preparation due soon'
      : group === 'completed'
        ? 'Journey complete'
        : 'No blockers');
  const name = employeeName(employee, caseItem);

  return {
    caseItem,
    employee,
    employeeId,
    name,
    initials: initials(name),
    avatarUrl: firstText(employee, [['employeeAvatarUrl'], ['accountAvatarUrl'], ['avatarUrl']], '') || null,
    role: firstText(employee, [['jobTitle', 'job_title'], ['positionTitle', 'position_title']], 'Role not set'),
    department: firstText(employee, [['departmentName', 'department_name'], ['department']], 'Unassigned'),
    location: firstText(employee, [['locationName', 'location_name'], ['location']], 'Not set'),
    owner: firstText(caseItem, [['ownerRole', 'owner_role']], 'HR'),
    startDate,
    startDateLabel: formatDate(startDate),
    daysToStart,
    phase,
    progress,
    status,
    group,
    risk,
    topBlocker,
    nextAction,
  };
}

export function relativeStart(days: number | null) {
  if (days === null) return 'Date not set';
  if (days === 0) return 'Starts today';
  if (days === 1) return 'Starts tomorrow';
  if (days > 1) return `In ${days} days`;
  if (days === -1) return 'Started yesterday';
  return `Started ${Math.abs(days)} days ago`;
}
