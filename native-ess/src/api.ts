import Constants from 'expo-constants'
import { accountAuth } from './auth'

export type AttendanceRow = {
  id: string
  date: string
  checkIn?: string | null
  checkOut?: string | null
  status: string
}

export type AttendanceCorrectionRow = {
  id: string
  requestNumber?: string
  attendanceId: string
  correctionType?: string
  workDate: string
  originalCheckIn?: string
  originalCheckOut?: string
  requestedCheckIn?: string
  requestedCheckOut?: string
  reason?: string
  status: string
  reviewerComment?: string
  reviewedAt?: string
  submittedAt?: string
  updatedAt?: string
}

export type ProfileChangeRequestRow = {
  id: string
  requestNumber?: string
  title: string
  reason?: string
  status: string
  requestedFields: string[]
  reviewerComment?: string
  reviewedAt?: string
  submittedAt?: string
  updatedAt?: string
}

export type LeaveRequestRow = {
  id: string
  type: string
  startDate: string
  endDate: string
  days: number
  status: string
}

export type LeavePolicyOption = {
  id: string
  name: string
  leaveType: string
  balance: number
  allowHalfDay?: boolean
  allowHourly?: boolean
  minimumRequestUnits?: number
  year: number
}

export type EssDocument = {
  id: string
  title: string
  subtitle?: string
  kind: string
  issuedAt: string
  requiresAcknowledgment?: boolean
  acknowledgedAt?: string
}

export type EssNotification = {
  id: string
  title: string
  body?: string
  read?: boolean
  createdAt?: string
}

export type SupportAttachmentRow = {
  id: string
  name: string
  mimeType?: string
  size?: number
  kind?: 'image' | 'file'
}

export type SupportActivityRow = {
  id: string
  action: string
  message?: string
  createdAt?: string
  attachment?: SupportAttachmentRow
}

export type HrAttachmentUpload = {
  uri: string
  name: string
  mimeType: string
  size?: number
}

export type SupportRequestRow = {
  id: string
  requestNumber: string
  category: string
  subject: string
  description?: string
  status: string
  priority: string
  submittedAt?: string
  updatedAt?: string
  activities?: SupportActivityRow[]
}

export type EmergencyContact = {
  id: string
  name: string
  relationship: string
  phone: string
  primary?: boolean
}

export type EssProfile = {
  preferredName?: string
  personalEmail?: string
  phone?: string
  address?: string
}

export type BankTaxProfile = {
  bankName?: string
  accountLast4?: string
  taxIdMasked?: string
  withholdingLabel?: string
}

export type AttendanceLocation = {
  id?: string
  name: string
  address?: string
  latitude: number
  longitude: number
  radiusMeters: number
}

export type AttendancePolicy = {
  locationRequired?: boolean
  requireScheduledShift?: boolean
  earlyClockInMinutes?: number
  lateClockOutMinutes?: number
  locations?: AttendanceLocation[]
}

export type EssScheduleItem = {
  id: string
  date: string
  startTime: string
  endTime: string
  location?: string
  status: string
}

export type EssAnnouncement = {
  id: string
  title: string
  body: string
  priority: string
  ctaLabel?: string
  createdAt?: string
  expiresAt?: string
}

export type EssBenefit = {
  id: string
  name: string
  description?: string
  status?: string
  provider?: string
  url?: string
}

export type EssBootstrap = {
  employee: {
    employeeId: string
    name: string
    position: string
    department: string
    avatarUrl?: string
    shiftLabel?: string
    nextShift?: string
    leaveBalanceDays?: number
    unreadNotifications?: number
  }
  attendance: AttendanceRow[]
  attendanceCorrections: AttendanceCorrectionRow[]
  profileChangeRequests: ProfileChangeRequestRow[]
  leaveRequests: LeaveRequestRow[]
  leavePolicies: LeavePolicyOption[]
  documents: EssDocument[]
  notifications: EssNotification[]
  benefits: EssBenefit[]
  emergencyContacts: EmergencyContact[]
  profile?: EssProfile
  bankTax?: BankTaxProfile
  attendancePolicy?: AttendancePolicy
  attendancePolicyAvailable?: boolean
  schedule: EssScheduleItem[]
  announcements: EssAnnouncement[]
  supportRequests: SupportRequestRow[]
  extrasAvailable?: boolean
}

type EssExtras = {
  attendanceCorrections?: AttendanceCorrectionRow[]
  profileChangeRequests?: ProfileChangeRequestRow[]
  schedule?: EssScheduleItem[]
  announcements?: EssAnnouncement[]
  benefits?: EssBenefit[]
  supportRequests?: SupportRequestRow[]
}

export class EssApiError extends Error {
  constructor(message: string, public status = 0, public code: 'AUTH_REQUIRED' | 'HTTP_ERROR' | 'NETWORK' = 'HTTP_ERROR') {
    super(message)
    this.name = 'EssApiError'
  }
}

export function isAuthRequired(error: unknown) {
  return error instanceof EssApiError && error.code === 'AUTH_REQUIRED'
}

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined
const apiUrl = (extra?.apiUrl || 'https://people.outborn.co').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await accountAuth.getToken()
  if (!token) throw new EssApiError('Sign in is required', 401, 'AUTH_REQUIRED')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  const isFormDataBody = typeof FormData !== 'undefined' && init?.body instanceof FormData
  try {
    const res = await fetch(`${apiUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(init?.body && !isFormDataBody ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {}),
      },
    })
    if (res.status === 401) {
      await accountAuth.signOut()
      throw new EssApiError('Your session has expired. Please sign in again.', 401, 'AUTH_REQUIRED')
    }
    if (!res.ok) {
      let message = `Request failed (${res.status})`
      try {
        const body = await res.json()
        message = body?.error || body?.message || message
      } catch {}
      throw new EssApiError(message, res.status, 'HTTP_ERROR')
    }
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  } catch (error) {
    if (error instanceof EssApiError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new EssApiError('Request timed out. Check your connection and try again.', 0, 'NETWORK')
    }
    throw new EssApiError('Unable to reach Obsi People. Check your connection and try again.', 0, 'NETWORK')
  } finally {
    clearTimeout(timeout)
  }
}


async function optionalRequestResult<T>(path: string, fallback: T): Promise<{ value: T; available: boolean }> {
  try {
    return { value: await request<T>(path), available: true }
  } catch (error) {
    if (isAuthRequired(error)) throw error
    console.warn(`Optional ESS endpoint unavailable: ${path}`, error)
    return { value: fallback, available: false }
  }
}


export const essApi = {
  bootstrap: async () => {
    const [data, attendancePolicyResult, extrasResult] = await Promise.all([
      request<EssBootstrap>('/api/ess/mobile/bootstrap'),
      optionalRequestResult<AttendancePolicy>('/api/ess/mobile/attendance-policy', {}),
      optionalRequestResult<EssExtras>('/api/ess/mobile/extras', {}),
    ])
    const attendancePolicy = attendancePolicyResult.value
    const extras = extrasResult.value
    return {
      ...data,
      attendancePolicyAvailable: attendancePolicyResult.available,
      extrasAvailable: extrasResult.available,
      attendance: Array.isArray(data.attendance) ? data.attendance : [],
      attendanceCorrections: Array.isArray(extras.attendanceCorrections)
        ? extras.attendanceCorrections
        : Array.isArray(data.attendanceCorrections) ? data.attendanceCorrections : [],
      profileChangeRequests: Array.isArray(extras.profileChangeRequests)
        ? extras.profileChangeRequests
        : Array.isArray(data.profileChangeRequests) ? data.profileChangeRequests : [],
      leaveRequests: Array.isArray(data.leaveRequests) ? data.leaveRequests : [],
      leavePolicies: Array.isArray(data.leavePolicies) ? data.leavePolicies : [],
      documents: Array.isArray(data.documents) ? data.documents : [],
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
      emergencyContacts: Array.isArray(data.emergencyContacts) ? data.emergencyContacts : [],
      benefits: Array.isArray(extras.benefits)
        ? extras.benefits
        : Array.isArray(data.benefits) ? data.benefits : [],
      attendancePolicy: attendancePolicy || {},
      schedule: Array.isArray(extras.schedule)
        ? extras.schedule
        : Array.isArray(data.schedule) ? data.schedule : [],
      announcements: Array.isArray(extras.announcements)
        ? extras.announcements
        : Array.isArray(data.announcements) ? data.announcements : [],
      supportRequests: Array.isArray(extras.supportRequests)
        ? extras.supportRequests
        : Array.isArray(data.supportRequests) ? data.supportRequests : [],
    }
  },

  clockIn: (latitude?: number, longitude?: number) => request('/api/ess/attendance/clock-in', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
  }),
  clockOut: (latitude?: number, longitude?: number) => request('/api/ess/attendance/clock-out', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
  }),
  createAttendanceCorrection: (payload: {
    attendanceId: string
    workDate: string
    correctionType: 'missing_check_in' | 'incorrect_check_in' | 'missing_check_out' | 'incorrect_check_out'
    reason: string
    requestedCheckIn?: string
    requestedCheckOut?: string
  }) => request('/api/ess/attendance/corrections', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  createLeave: (payload: { policyId: string; startDate: string; endDate: string; reason?: string; emergencyContact: string }) => request('/api/ess/leave/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  cancelLeave: (id: string) => request(`/api/ess/leave/requests/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),

  patchProfile: (payload: EssProfile) => request('/api/ess/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  patchBankTax: (payload: { bankName?: string; accountNumber?: string; taxId?: string }) => request('/api/ess/bank-tax', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),

  createProfileChangeRequest: (payload: {
    changes: Partial<Record<'preferredName' | 'phone' | 'address' | 'bankInformation' | 'taxInformation', unknown>>
    reason: string
  }) => request('/api/ess/profile-change-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  createEmergencyContact: (payload: Omit<EmergencyContact, 'id'>) => request<EmergencyContact>('/api/ess/emergency-contacts', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateEmergencyContact: (id: string, payload: Partial<Omit<EmergencyContact, 'id'>>) => request<EmergencyContact>(`/api/ess/emergency-contacts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  deleteEmergencyContact: (id: string) => request(`/api/ess/emergency-contacts/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  documentUrl: (id: string) => request<{ url: string }>(`/api/ess/documents/${encodeURIComponent(id)}/download`),

  acknowledgeDocument: (id: string) => request(`/api/ess/documents/${encodeURIComponent(id)}/acknowledge`, { method: 'POST' }),

  markNotificationRead: (id: string) => request(`/api/ess/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/api/ess/notifications/read-all', { method: 'POST' }),

  createHrTicket: (subject: string, message: string, category = 'general') => request<{ id: string; status: string }>('/api/ess/hr-support/tickets', {
    method: 'POST',
    body: JSON.stringify({ subject, message, category }),
  }),
  replyHrTicket: (id: string, message: string) => request<{ success: boolean }>(`/api/ess/hr-support/tickets/${encodeURIComponent(id)}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
  uploadHrTicketAttachment: (id: string, attachment: HrAttachmentUpload) => {
    const formData = new FormData()
    formData.append('file', {
      uri: attachment.uri,
      name: attachment.name,
      type: attachment.mimeType,
    } as unknown as Blob)
    return request<{ activity: SupportActivityRow }>(`/api/ess/hr-support/tickets/${encodeURIComponent(id)}/attachments`, {
      method: 'POST',
      body: formData,
    })
  },
  hrTicketAttachmentUrl: (ticketId: string, activityId: string) => request<{ url: string }>(
    `/api/ess/hr-support/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(activityId)}`,
  ),
}

export const peopleApiUrl = apiUrl