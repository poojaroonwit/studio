import { PermissionsAndroid, Platform } from 'react-native'
import Constants from 'expo-constants'
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
} from '@react-native-firebase/messaging'
import * as SecureStore from 'expo-secure-store'

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined
const apiUrl = (extra?.apiUrl || 'https://people.outborn.co').replace(/\/$/, '')
const PUSH_TOKEN_KEY = 'obsi.people.ess.push_token'

function authorized(status: number) {
  return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = 10_000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function ensurePushPermission(instance: ReturnType<typeof getMessaging>) {
  if (Platform.OS === 'ios') {
    return authorized(await requestPermission(instance))
  }
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
    return result === PermissionsAndroid.RESULTS.GRANTED
  }
  return true
}

async function sendRegistration(accessToken: string, token: string) {
  const response = await fetchWithTimeout(`${apiUrl}/api/ess/mobile/push-token`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS,
      deviceName: Constants.deviceName || undefined,
      appVersion: Constants.expoConfig?.version || undefined,
    }),
  })
  if (!response.ok) throw new Error(`Push registration failed (${response.status})`)
}

export async function syncPushRegistration(accessToken: string) {
  if (!accessToken || !['android', 'ios'].includes(Platform.OS)) return null
  try {
    const instance = getMessaging()
    await registerDeviceForRemoteMessages(instance)
    if (!await ensurePushPermission(instance)) return null
    const token = await getToken(instance)
    if (!token) return null
    await sendRegistration(accessToken, token)
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token)
    return token
  } catch (error) {
    console.warn('Obsi People push registration unavailable', error)
    return null
  }
}

export function watchPushTokenRefresh(accessToken: string) {
  const instance = getMessaging()
  return onTokenRefresh(instance, (token: string) => {
    void sendRegistration(accessToken, token)
      .then(() => SecureStore.setItemAsync(PUSH_TOKEN_KEY, token))
      .catch((error) => console.warn('Obsi People push token refresh failed', error))
  })
}

export async function removePushRegistration(accessToken: string) {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
  if (!token || !accessToken) return
  try {
    await fetchWithTimeout(`${apiUrl}/api/ess/mobile/push-token`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })
  } catch (error) {
    console.warn('Obsi People push unregister failed', error)
  } finally {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY)
  }
}
