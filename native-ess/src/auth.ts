import * as AuthSession from 'expo-auth-session'
import * as SecureStore from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'
import Constants from 'expo-constants'

WebBrowser.maybeCompleteAuthSession()

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined
const accountUrl = extra?.accountUrl || 'https://account.outborn.co'
const clientId = extra?.accountClientId || 'obsi-people-ess-mobile'
const redirectUri = extra?.redirectUri || 'https://people.outborn.co/mobile/oauth/callback'
const nativeReturnUri = 'obsipeopleess://oauth/callback'
const TOKEN_KEY = 'obsi.people.ess.access_token'

async function discovery() {
  return AuthSession.fetchDiscoveryAsync(`${accountUrl}/api/auth/.well-known/openid-configuration`)
}

function callbackParams(url: string) {
  const query = url.split('?')[1]?.split('#')[0] || ''
  return new URLSearchParams(query)
}

export const accountAuth = {
  async getToken() {
    return SecureStore.getItemAsync(TOKEN_KEY)
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
    const result = await WebBrowser.openAuthSessionAsync(authUrl, nativeReturnUri)
    if (result.type !== 'success') return false

    const params = callbackParams(result.url)
    const error = params.get('error')
    if (error) {
      const description = params.get('error_description') || error
      throw new Error(`Outborn Account sign-in failed: ${description}`)
    }

    const code = params.get('code')
    const state = params.get('state')
    if (!code || !request.codeVerifier) return false
    if (state && state !== request.state) throw new Error('Outborn Account returned an invalid OAuth state')

    const token = await AuthSession.exchangeCodeAsync({
      clientId,
      code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier },
    }, config)
    if (!token.accessToken) throw new Error('Outborn Account did not return an access token')
    await SecureStore.setItemAsync(TOKEN_KEY, token.accessToken, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY })
    return true
  },
  async signOut() {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
  },
}
