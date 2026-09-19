import type { EssRow } from './ess-types';

export type LeaveSegment = {
  policyId: string;
  startDate: string;
  endDate: string;
  requestUnit: 'full_day' | 'half_day' | 'hourly';
  halfDayPeriod: 'morning' | 'afternoon';
  requestedHours: string;
};

export type LeaveForm = {
  segments: LeaveSegment[];
  reason: string;
  emergencyContact: string;
  handoverInformation: string;
  actingEmployeeId: string;
  saveAsDraft: boolean;
};

export const emptyLeaveForm: LeaveForm = {
  segments: [{
    policyId: '',
    startDate: '',
    endDate: '',
    requestUnit: 'full_day',
    halfDayPeriod: 'morning',
    requestedHours: '',
  }],
  reason: '',
  emergencyContact: '',
  handoverInformation: '',
  actingEmployeeId: '',
  saveAsDraft: false,
};

export function calculateCalendarDays(start: string, end: string, unit: LeaveSegment['requestUnit'], hours: string) {
  if (unit === 'half_day') return 0.5;
  if (unit === 'hourly') return Number(hours || 0) / 8;
  if (!start || !end) return 0;
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return 0;
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

export function emergencyContactOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((contact, index) => {
    if (!contact || typeof contact !== 'object') {
      const text = String(contact || '').trim();
      return text ? { value: text, label: text } : null;
    }
    const record = contact as Record<string, unknown>;
    const name = String(record.name || record.fullName || record.contactName || `Emergency contact ${index + 1}`);
    const relationship = String(record.relationship || record.relation || '').trim();
    const phone = String(record.phone || record.phoneNumber || record.mobile || '').trim();
    const label = [name, relationship, phone].filter(Boolean).join(' · ');
    const snapshot = JSON.stringify({ name, relationship: relationship || undefined, phone: phone || undefined });
    return { value: snapshot.slice(0, 500), label };
  }).filter((option): option is { value: string; label: string } => Boolean(option));
}

export type RequestFilter = 'all' | 'pending' | 'approved' | 'draft';

export function balanceAvailable(balance: EssRow | undefined) {
  if (!balance) return 0;
  return Number(balance.allocated || 0) + Number(balance.accrued || 0) + Number(balance.carry_forward || 0)
    - Number(balance.used || 0) - Number(balance.pending || 0) - Number(balance.reserved || 0);
}

export function requestFilterGroup(status: unknown): RequestFilter | 'other' {
  const normalized = String(status || '').toLowerCase();
  if (['pending', 'submitted', 'pending_approval', 'returned_for_revision'].includes(normalized)) return 'pending';
  if (normalized === 'approved') return 'approved';
  if (normalized === 'draft') return 'draft';
  return 'other';
}

export function dateYear(value: unknown) {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? '' : String(date.getFullYear());
}

export type LeaveRequestAction = 'submit' | 'withdraw' | 'resubmit' | 'cancel';

export const leaveRequestSuccessMessage: Record<LeaveRequestAction, string> = {
  submit: 'Leave request submitted.',
  withdraw: 'Leave request withdrawn.',
  resubmit: 'Leave request resubmitted.',
  cancel: 'Leave request cancelled.',
};

export function availableRequestAction(request: EssRow): LeaveRequestAction | null {
  if (request.status === 'draft') return 'submit';
  if (['pending', 'submitted', 'pending_approval', 'returned_for_revision'].includes(String(request.status))) return 'withdraw';
  if (request.status === 'withdrawn') return 'resubmit';
  if (request.status === 'approved') return 'cancel';
  return null;
}
