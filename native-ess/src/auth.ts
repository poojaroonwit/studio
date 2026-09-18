import * as AuthSession from 'expo-auth-session'
import * as SecureStore from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import Constants from 'expo-constants'

WebBrowser.maybeCompleteAuthSession()

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined
const accountUrl = (extra?.accountUrl || 'https://account.outborn.co').replace(/\/$/, '')
const clientId = extra?.accountClientId || 'obsi-people-ess-mobile'
const redirectUri = extra?.redirectUri || 'https://people.outborn.co/mobile/oauth/callback'
const nativeReturnUri = 'obsipeopleess://oauth/callback'
const TOKEN_KEY = 'obsi.people.ess.access_token'
const PENDING_KEY = 'obsi.people.ess.oauth_pending'
const PENDING_MAX_AGE_MS = 10 * 60 * 1000

type PendingAuth = {
  state: string
  codeVerifier: string
  createdAt: number
}

async function discovery() {
  return AuthSession.fetchDiscoveryAsync(`${accountUrl}/api/auth`)
}

function callbackParams(url: string) {
  const query = url.split('?')[1]?.split('#')[0] || ''
  return new URLSearchParams(query)
}

function isNativeCallback(url?: string | null) {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol.toLowerCase() === 'obsipeopleess:'
      && parsed.hostname.toLowerCase() === 'oauth'
      && (parsed.pathname === '/callback' || parsed.pathname === '/callback/')
  } catch {
    return false
  }
}

async function readPending(): Promise<PendingAuth | null> {
  const raw = await SecureStore.getItemAsync(PENDING_KEY)
  if (!raw) return null
  try {
    const pending = JSON.parse(raw) as PendingAuth
    if (!pending.state || !pending.codeVerifier || !pending.createdAt) return null
    if (Date.now() - pending.createdAt > PENDING_MAX_AGE_MS) {
      await SecureStore.deleteItemAsync(PENDING_KEY)
      return null
    }
    return pending
  } catch {
    await SecureStore.deleteItemAsync(PENDING_KEY)
    return null
  }
}

async function completeRedirect(url: string) {
  if (!isNativeCallback(url)) return false
  const pending = await readPending()
  if (!pending) throw new Error('The sign-in session expired. Please start sign-in again.')

  const params = callbackParams(url)
  const error = params.get('error')
  if (error) {
    await SecureStore.deleteItemAsync(PENDING_KEY)
    const description = params.get('error_description') || error
    throw new Error(`Outborn Account sign-in failed: ${description}`)
  }

  const code = params.get('code')
  const state = params.get('state')
  if (!code || !state) {
    await SecureStore.deleteItemAsync(PENDING_KEY)
    throw new Error('Outborn Account returned an incomplete sign-in response. Please try again.')
  }
  if (state !== pending.state) {
    await SecureStore.deleteItemAsync(PENDING_KEY)
    throw new Error('Outborn Account returned an invalid OAuth state')
  }

  const config = await discovery()
  const token = await AuthSession.exchangeCodeAsync({
    clientId,
    code,
    redirectUri,
    extraParams: { code_verifier: pending.codeVerifier },
  }, config)
  if (!token.accessToken) throw new Error('Outborn Account did not return an access token')

  await SecureStore.setItemAsync(TOKEN_KEY, token.accessToken, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  })
  await SecureStore.deleteItemAsync(PENDING_KEY)
  try { await WebBrowser.dismissBrowser() } catch {}
  return true
}

export const accountAuth = {
  async getToken() {
    return SecureStore.getItemAsync(TOKEN_KEY)
  },

  async recoverPendingRedirect() {
    const initialUrl = await Linking.getInitialURL()
    if (!isNativeCallback(initialUrl)) return false
    return completeRedirect(initialUrl as string)
  },

  async handleRedirect(url: string) {
    return completeRedirect(url)
  },

  async signIn() {
    const config = await discovery()
    const request = new AuthSession.AuthRequest({
      clientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ['openid', 'profile', 'email', 'organizations'],
      usePKCE: true,
      codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
    })

    const authUrl = await request.makeAuthUrlAsync(config)
    if (!request.state || !request.codeVerifier) throw new Error('Unable to initialize secure Outborn Account sign-in.')

    await SecureStore.setItemAsync(PENDING_KEY, JSON.stringify({
      state: request.state,
      codeVerifier: request.codeVerifier,
      createdAt: Date.now(),
    } satisfies PendingAuth), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    })

    const result = await WebBrowser.openAuthSessionAsync(authUrl, nativeReturnUri, {
      enableBarCollapsing: true,
      showTitle: false,
    })

    if (result.type === 'success') {
      if (!isNativeCallback(result.url)) {
        await SecureStore.deleteItemAsync(PENDING_KEY)
        throw new Error('Outborn Account returned an invalid native callback. Please try again.')
      }
      return completeRedirect(result.url)
    }

    await SecureStore.deleteItemAsync(PENDING_KEY)
    return false
  },

  async signOut() {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(PENDING_KEY),
    ])
  },
}
