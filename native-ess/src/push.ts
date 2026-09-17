import { Platform } from 'react-native'
import Constants from 'expo-constants'
import messaging from '@react-native-firebase/messaging'
import * as SecureStore from 'expo-secure-store'

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined
const apiUrl = (extra?.apiUrl || 'https://people.outborn.co').replace(/\/$/, '')
const PUSH_TOKEN_KEY = 'obsi.people.ess.push_token'

function authorized(status: number) {
  const auth = messaging.AuthorizationStatus
  return status === auth.AUTHORIZED || status === auth.PROVISIONAL
}

async function sendRegistration(accessToken: string, token: string) {
  const response = await fetch(`${apiUrl}/api/ess/mobile/push-token`, {
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
    await messaging().registerDeviceForRemoteMessages()
    const permission = await messaging().requestPermission()
    if (!authorized(permission) && Platform.OS === 'ios') return null
    const token = await messaging().getToken()
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
  return messaging().onTokenRefresh((token) => {
    void sendRegistration(accessToken, token)
      .then(() => SecureStore.setItemAsync(PUSH_TOKEN_KEY, token))
      .catch((error) => console.warn('Obsi People push token refresh failed', error))
  })
}

export async function removePushRegistration(accessToken: string) {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY)
  if (!token || !accessToken) return
  try {
    await fetch(`${apiUrl}/api/ess/mobile/push-token`, {
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
