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

export async function loadBootstrapCache(): Promise<{ value: EssBootstrap; stale: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(BOOTSTRAP_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEnvelope
    if (!parsed || typeof parsed.savedAt !== 'number' || !parsed.value?.employee) return null
    return {
      value: parsed.value,
      stale: Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS,
    }
  } catch {
    return null
  }
}

export async function clearBootstrapCache() {
  await AsyncStorage.removeItem(BOOTSTRAP_KEY)
}
