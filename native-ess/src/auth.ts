import * as AuthSession from 'expo-auth-session'
import * as SecureStore from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'
import Constants from 'expo-constants'

WebBrowser.maybeCompleteAuthSession()

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined
const accountUrl = extra?.accountUrl || 'https://account.outborn.co'
const clientId = extra?.accountClientId || 'obsi-people-ess-mobile'
const redirectUri = extra?.redirectUri || 'https://people.outborn.co/mobile/oauth/callback'
const TOKEN_KEY = 'obsi.people.ess.access_token'

async function discovery() {
  return AuthSession.fetchDiscoveryAsync(`${accountUrl}/api/auth`)
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
    const result = await request.promptAsync(config)
    if (result.type !== 'success' || !result.params.code || !request.codeVerifier) return false
    const token = await AuthSession.exchangeCodeAsync({
      clientId,
      code: result.params.code,
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
