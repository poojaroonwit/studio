import Constants from 'expo-constants'
import { accountAuth } from './auth'

export type EssBootstrap = {
  employee: { employeeId: string; name: string; position: string; department: string; shiftLabel?: string; nextShift?: string; leaveBalanceDays?: number; unreadNotifications?: number }
  attendance: Array<{ id: string; date: string; checkIn?: string | null; checkOut?: string | null; status: string }>
  leaveRequests: Array<{ id: string; type: string; startDate: string; endDate: string; days: number; status: string }>
  documents: Array<{ id: string; title: string; subtitle?: string; kind: string; issuedAt: string }>
  notifications: Array<{ id: string; title: string; body?: string; read?: boolean; createdAt?: string }>
  benefits: unknown[]
  emergencyContacts: unknown[]
  profile?: Record<string, unknown>
  bankTax?: Record<string, unknown>
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
  try {
    const res = await fetch(`${apiUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers || {}),
      },
    })
    if (res.status === 401) {
      await accountAuth.signOut()
      throw new EssApiError('Your session has expired. Please sign in again.', 401, 'AUTH_REQUIRED')
    }
    if (!res.ok) {
      let message = `Request failed (${res.status})`
      try { const body = await res.json(); message = body?.error || body?.message || message } catch {}
      throw new EssApiError(message, res.status, 'HTTP_ERROR')
    }
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  } catch (error) {
    if (error instanceof EssApiError) throw error
    if (error instanceof Error && error.name === 'AbortError') throw new EssApiError('Request timed out. Check your connection and try again.', 0, 'NETWORK')
    throw new EssApiError('Unable to reach Obsi People. Check your connection and try again.', 0, 'NETWORK')
  } finally {
    clearTimeout(timeout)
  }
}

export const essApi = {
  bootstrap: () => request<EssBootstrap>('/api/ess/mobile/bootstrap'),
  clockIn: (latitude?: number, longitude?: number) => request('/api/ess/attendance/clock-in', { method: 'POST', body: JSON.stringify({ latitude, longitude }) }),
  clockOut: (latitude?: number, longitude?: number) => request('/api/ess/attendance/clock-out', { method: 'POST', body: JSON.stringify({ latitude, longitude }) }),
  createLeave: (payload: { type: string; startDate: string; endDate: string; reason?: string }) => request('/api/ess/leave/requests', { method: 'POST', body: JSON.stringify(payload) }),
  cancelLeave: (id: string) => request(`/api/ess/leave/requests/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
  documentUrl: (id: string) => request<{ url: string }>(`/api/ess/documents/${encodeURIComponent(id)}/download`),
  markNotificationRead: (id: string) => request(`/api/ess/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  createHrTicket: (subject: string, message: string) => request('/api/ess/hr-support/tickets', { method: 'POST', body: JSON.stringify({ subject, message }) }),
}
