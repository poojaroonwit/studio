import AsyncStorage from '@react-native-async-storage/async-storage'
import type { EssBootstrap } from './api'

const BOOTSTRAP_KEY = 'obsi.people.ess.bootstrap.v2'
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

type CacheEnvelope = {
  savedAt: number
  value: EssBootstrap
}

export async function saveBootstrapCache(value: EssBootstrap) {
  const envelope: CacheEnvelope = { savedAt: Date.now(), value }
  await AsyncStorage.setItem(BOOTSTRAP_KEY, JSON.stringify(envelope))
}

function normalizeCachedBootstrap(value: EssBootstrap): EssBootstrap {
  return {
    ...value,
    attendance: Array.isArray(value.attendance) ? value.attendance : [],
    attendanceCorrections: Array.isArray(value.attendanceCorrections) ? value.attendanceCorrections : [],
    leaveRequests: Array.isArray(value.leaveRequests) ? value.leaveRequests : [],
    leavePolicies: Array.isArray(value.leavePolicies) ? value.leavePolicies : [],
    documents: Array.isArray(value.documents) ? value.documents : [],
    notifications: Array.isArray(value.notifications) ? value.notifications : [],
    benefits: Array.isArray(value.benefits) ? value.benefits : [],
    emergencyContacts: Array.isArray(value.emergencyContacts) ? value.emergencyContacts : [],
    schedule: Array.isArray(value.schedule) ? value.schedule : [],
    announcements: Array.isArray(value.announcements) ? value.announcements : [],
    supportRequests: Array.isArray(value.supportRequests) ? value.supportRequests : [],
  }
}

export async function loadBootstrapCache(): Promise<{ value: EssBootstrap; stale: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(BOOTSTRAP_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEnvelope
    if (!parsed || typeof parsed.savedAt !== 'number' || !parsed.value?.employee) return null
    return {
      value: normalizeCachedBootstrap(parsed.value),
      stale: Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS,
    }
  } catch {
    return null
  }
}

export async function clearBootstrapCache() {
  await AsyncStorage.removeItem(BOOTSTRAP_KEY)
}
