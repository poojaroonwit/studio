import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  AppState,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { accountAuth } from './src/auth'
import { loadAccountApplicationIdentity, loadAccountIdentity, loadPublicAccountApplicationIdentity, type AccountApplicationIdentity, type AccountIdentity } from './src/account'
import { clearBootstrapCache, loadBootstrapCache, saveBootstrapCache } from './src/cache'
import { essApi, isAuthRequired, type EssBootstrap } from './src/api'
import { AccountScreen, DocumentsScreen, HomeScreen, RequestsScreen, TimeScreen } from './src/screens'
import { colors, controls, radii, spacing, typography } from './src/theme'
import { removePushRegistration, syncPushRegistration, watchPushTokenRefresh } from './src/push'

type Tab = 'home' | 'time' | 'requests' | 'documents' | 'account'
const BIOMETRIC_KEY = 'obsi.people.ess.biometric_lock'

const tabs: Array<{ id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'home', label: 'Home', icon: 'home-outline' },
  { id: 'time', label: 'Time', icon: 'time-outline' },
  { id: 'requests', label: 'Requests', icon: 'add-circle-outline' },
  { id: 'documents', label: 'Documents', icon: 'folder-open-outline' },
  { id: 'account', label: 'Account', icon: 'person-circle-outline' },
]

function AppText({ children, style, ...props }: React.ComponentProps<typeof Text>) {
  return <Text {...props} style={[s.text, style]}>{children}</Text>
}

function BrandLogo({ identity, size = 38 }: { identity?: AccountApplicationIdentity | null; size?: number }) {
  if (identity?.logoUrl) {
    return <Image source={{ uri: identity.logoUrl }} style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }} resizeMode="contain" />
  }
  return <View style={[s.logoFallback, { width: size, height: size, borderRadius: Math.round(size * 0.28) }]}><Ionicons name="people-outline" size={Math.round(size * 0.56)} color={colors.text} /></View>
}

function AccountAvatar({ account, data, size = 38 }: { account?: AccountIdentity | null; data?: EssBootstrap | null; size?: number }) {
  const name = account?.name || data?.employee.name || 'Account'
  const url = account?.imageUrl || data?.employee.avatarUrl
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceMuted }} />
  return <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}><AppText style={s.avatarText}>{(name.trim().slice(0, 1) || '?').toUpperCase()}</AppText></View>
}

function SkeletonScreen() {
  return <SafeAreaProvider><SafeAreaView style={s.root}><StatusBar style="dark" /><View style={s.skeletonHeader}><View style={[s.skeleton, { width: 38, height: 38, borderRadius: radii.md }]} /><View style={{ gap: 7, flex: 1 }}><View style={[s.skeleton, { width: 120, height: 15 }]} /><View style={[s.skeleton, { width: 82, height: 10 }]} /></View><View style={[s.skeleton, { width: 38, height: 38, borderRadius: radii.pill }]} /></View><View style={s.skeletonBody}><View style={[s.skeleton, { width: '62%', height: 34 }]} /><View style={[s.skeleton, { width: '44%', height: 14 }]} /><View style={s.skeletonGrid}>{[0,1,2,3].map((key) => <View key={key} style={[s.skeleton, { width: '48%', height: 104, borderRadius: radii.lg }]} />)}</View><View style={[s.skeleton, { width: '100%', height: 130, borderRadius: radii.lg, marginTop: 18 }]} /><View style={[s.skeleton, { width: '100%', height: 190, borderRadius: radii.lg }]} /></View></SafeAreaView></SafeAreaProvider>
}

export default function App() {
  const [data, setData] = useState<EssBootstrap | null>(null)
  const [account, setAccount] = useState<AccountIdentity | null>(null)
  const [appIdentity, setAppIdentity] = useState<AccountApplicationIdentity | null>({ name: 'Obsi People' })
  const [tab, setTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [locked, setLocked] = useState(false)
  const [loadMoreTick, setLoadMoreTick] = useState(0)
  const lastLoadMoreAt = useRef(0)
  const pushUnsubscribe = useRef<null | (() => void)>(null)

  const loadAccount = async () => {
    try {
      const identity = await loadAccountIdentity()
      setAccount(identity)
      setAppIdentity(await loadAccountApplicationIdentity(identity))
    } catch {
      setAccount(null)
      setAppIdentity((current) => current || { name: 'Obsi People' })
    }
  }

  const load = async ({ allowCache = true }: { allowCache?: boolean } = {}) => {
    setLoadError(null)
    try {
      const next = await essApi.bootstrap()
      setData(next)
      setOffline(false)
      void saveBootstrapCache(next).catch((error) => console.warn('Obsi People bootstrap cache write failed', error))
      void loadAccount()
    } catch (error) {
      if (isAuthRequired(error)) {
        setData(null)
        setAccount(null)
        setOffline(false)
        void clearBootstrapCache().catch((cacheError) => console.warn('Obsi People bootstrap cache clear failed', cacheError))
      } else {
        const message = error instanceof Error ? error.message : 'Unable to load employee data.'
        const token = await accountAuth.getToken()
        if (token && allowCache && !data) {
          const cached = await loadBootstrapCache()
          if (cached) {
            setData(cached.value)
            setOffline(true)
            setLoadError(`Offline data${cached.stale ? ' may be out of date' : ''}. ${message}`)
            void loadAccount()
          } else {
            setLoadError(message)
          }
        } else if (token) {
          setLoadError(message)
        } else {
          setData(null)
        }
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const unlock = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Obsi People',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    })
    if (result.success) {
      setLocked(false)
      setLoading(true)
      await load()
    }
  }

  const initialize = async () => {
    void loadPublicAccountApplicationIdentity()
      .then(setAppIdentity)
      .catch(() => undefined)

    try {
      try {
        const recovered = await accountAuth.recoverPendingRedirect()
        if (recovered) {
          setAuthError(null)
          await Promise.all([loadAccount(), load({ allowCache: false })])
          return
        }
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : 'Unable to complete Outborn Account sign-in.')
      }

      const token = await accountAuth.getToken()
      if (token) {
        try {
          const biometricEnabled = (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === '1'
          if (biometricEnabled) {
            const supported = await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync()
            if (supported) {
              setLocked(true)
              setLoading(false)
              return
            }
          }
        } catch (error) {
          console.warn('Obsi People biometric startup check unavailable', error)
        }
      }

      await load()
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to initialize Obsi People securely.')
      setLoading(false)
      setRefreshing(false)
    }
  }

  const signIn = async () => {
    if (authLoading) return
    setAuthLoading(true)
    setAuthError(null)
    setLoadError(null)
    try {
      const success = await accountAuth.signIn()
      if (!success) {
        setAuthError('Sign-in was cancelled or did not complete. Please try again.')
        return
      }
      setLoading(true)
      await Promise.all([load({ allowCache: false }), loadAccount()])
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to start Outborn Account sign-in.')
    } finally {
      setAuthLoading(false)
    }
  }

  const signOut = async () => {
    const token = await accountAuth.getToken().catch(() => null)
    pushUnsubscribe.current?.()
    pushUnsubscribe.current = null
    if (token) void removePushRegistration(token)

    let secureSignOutFailed = false
    try {
      await accountAuth.signOut()
    } catch (error) {
      secureSignOutFailed = true
      console.warn('Obsi People secure sign-out cleanup failed', error)
    }
    try {
      await clearBootstrapCache()
    } catch (error) {
      console.warn('Obsi People bootstrap cache clear failed', error)
    } finally {
      setData(null)
      setAccount(null)
      setOffline(false)
      setLoadError(null)
      setAuthError(secureSignOutFailed ? 'Secure sign-out could not be fully completed. Please sign in again before using employee data.' : null)
      setTab('home')
    }
  }

  useEffect(() => { void initialize() }, [])

  const authenticated = Boolean(data)
  useEffect(() => {
    let active = true

    if (!authenticated) {
      pushUnsubscribe.current?.()
      pushUnsubscribe.current = null
      return () => { active = false }
    }

    void (async () => {
      const token = await accountAuth.getToken().catch(() => null)
      if (!token || !active) return
      await syncPushRegistration(token)
      if (!active) return
      try {
        pushUnsubscribe.current?.()
        pushUnsubscribe.current = watchPushTokenRefresh(token)
      } catch (error) {
        console.warn('Obsi People push refresh listener unavailable', error)
      }
    })()

    return () => {
      active = false
      pushUnsubscribe.current?.()
      pushUnsubscribe.current = null
    }
  }, [authenticated])

  useEffect(() => {
    if (!authenticated) return
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'background') return
      void SecureStore.getItemAsync(BIOMETRIC_KEY)
        .then((value) => { if (value === '1') setLocked(true) })
        .catch((error) => console.warn('Obsi People biometric relock check unavailable', error))
    })
    return () => subscription.remove()
  }, [authenticated])

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 220
    if (!nearBottom) return
    const now = Date.now()
    if (now - lastLoadMoreAt.current < 550) return
    lastLoadMoreAt.current = now
    setLoadMoreTick((current) => current + 1)
  }

  if (loading) return <SkeletonScreen />

  if (locked) {
    return <SafeAreaProvider><SafeAreaView style={s.unlock}><StatusBar style="dark" /><BrandLogo identity={appIdentity} size={56} /><AppText style={s.unlockTitle}>Obsi People is locked</AppText><AppText style={s.mutedCenter}>Use your device biometrics to continue.</AppText><Pressable style={s.primaryAction} onPress={() => void unlock()}><Ionicons name="finger-print-outline" size={22} color={colors.primaryText} /><AppText style={s.primaryActionText}>Unlock</AppText></Pressable></SafeAreaView></SafeAreaProvider>
  }

  if (!data && loadError) {
    return <SafeAreaProvider><SafeAreaView style={s.center}><StatusBar style="dark" /><BrandLogo identity={appIdentity} size={52} /><Ionicons name="cloud-offline-outline" size={32} color={colors.textMuted} /><AppText style={s.errorTitle}>Unable to load Obsi People</AppText><AppText style={s.errorCopy}>{loadError}</AppText><View style={s.errorActions}><Pressable style={s.primarySmall} onPress={() => { setLoading(true); void load() }}><AppText style={s.primarySmallText}>Retry</AppText></Pressable><Pressable style={s.secondarySmall} onPress={() => void signOut()}><AppText style={s.secondarySmallText}>Sign out</AppText></Pressable></View></SafeAreaView></SafeAreaProvider>
  }

  if (!data) {
    return <SafeAreaProvider><SafeAreaView style={s.welcome}><StatusBar style="dark" />
      <View style={s.welcomeTop}>
        <View style={s.brandRow}><BrandLogo identity={appIdentity} size={40} /><View><AppText style={s.welcomeBrand}>{appIdentity?.name || 'Obsi People'}</AppText><AppText style={s.welcomeBrandSub}>Employee Self-Service</AppText></View></View>
      </View>
      <View style={s.welcomeContent}><AppText style={s.welcomeEyebrow}>YOUR WORK, SIMPLIFIED</AppText><AppText style={s.welcomeTitle}>Everything you need for work, in one place.</AppText><AppText style={s.welcomeCopy}>Time, requests, documents, profile, benefits and HR support — connected through your Outborn Account.</AppText></View>
      <View style={s.welcomeBottom}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: authLoading, busy: authLoading }} disabled={authLoading} style={({ pressed }) => [s.welcomeButton, (pressed || authLoading) && s.pressed]} onPress={() => void signIn()}>
          <View style={s.welcomeButtonIdentity}><View style={s.outbornMark}><View style={s.outbornDot} /></View><View><AppText style={s.welcomeButtonText}>{authLoading ? 'Opening Account…' : 'Get started'}</AppText><AppText style={s.welcomeButtonSubtext}>with Outborn Account</AppText></View></View>
          {authLoading ? <ActivityIndicator color={colors.text} /> : <Ionicons name="arrow-forward" size={21} color={colors.text} />}
        </Pressable>
        {authError ? <AppText style={s.authError}>{authError}</AppText> : null}
        <AppText style={s.welcomeFoot}>Development build · v0.2.0</AppText>
      </View>
    </SafeAreaView></SafeAreaProvider>
  }

  const screen = tab === 'home'
    ? <HomeScreen data={data} setTab={setTab} account={account} />
    : tab === 'time'
      ? <TimeScreen data={data} reload={load} loadMoreTick={loadMoreTick} />
      : tab === 'requests'
        ? <RequestsScreen data={data} reload={load} loadMoreTick={loadMoreTick} />
        : tab === 'documents'
          ? <DocumentsScreen data={data} loadMoreTick={loadMoreTick} />
          : <AccountScreen data={data} account={account} appIdentity={appIdentity} reload={load} loadMoreTick={loadMoreTick} onSignOut={() => void signOut()} />

  return <SafeAreaProvider><SafeAreaView style={s.root}><StatusBar style="dark" />
    <View style={s.header}>
      <View style={s.headerBrand}><BrandLogo identity={appIdentity} size={32} /><View><AppText style={s.brand}>{appIdentity?.name || 'Obsi People'}</AppText><AppText style={s.headerSub}>Employee Self-Service</AppText></View></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Open account" style={({ pressed }) => [s.headerAction, pressed && s.pressed]} onPress={() => setTab('account')}><AccountAvatar account={account} data={data} size={36} /></Pressable>
    </View>
    {loadError ? <View style={s.warning}><Ionicons name={offline ? 'cloud-offline-outline' : 'warning-outline'} size={16} color={colors.warning} /><AppText style={s.warningText}>{loadError}</AppText></View> : null}
    <ScrollView style={s.body} keyboardShouldPersistTaps="handled" scrollEventThrottle={80} onScroll={onScroll} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.text} onRefresh={() => { setRefreshing(true); void load({ allowCache: false }) }} />}>{screen}</ScrollView>
    <View style={s.tabs}>{tabs.map((item) => {
      const active = tab === item.id
      return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} key={item.id} style={({ pressed }) => [s.tab, pressed && s.tabPressed]} onPress={() => setTab(item.id)}>
        <Ionicons name={item.icon} size={21} color={active ? colors.primary : colors.textSubtle} />
        <AppText style={[s.tabText, active && s.tabTextActive]}>{item.label}</AppText>
      </Pressable>
    })}</View>
  </SafeAreaView></SafeAreaProvider>
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  text: { color: colors.text, fontSize: typography.base, lineHeight: 20 },
  welcome: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  welcomeTop: { paddingTop: spacing.sm },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoFallback: { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  welcomeBrand: { fontSize: typography.xl, lineHeight: 22, fontWeight: '600', letterSpacing: -0.3, color: colors.text },
  welcomeBrandSub: { fontSize: typography.sm, lineHeight: 17, color: colors.textMuted, marginTop: 1 },
  welcomeContent: { flex: 1, justifyContent: 'center', paddingBottom: spacing.lg },
  welcomeEyebrow: { fontSize: typography.xs, lineHeight: 15, fontWeight: '600', letterSpacing: 0.8, color: colors.primary, marginBottom: spacing.sm },
  welcomeTitle: { fontSize: 32, lineHeight: 36, fontWeight: '700', letterSpacing: -1, color: colors.text, maxWidth: 420 },
  welcomeCopy: { fontSize: typography.md, lineHeight: 23, color: colors.textMuted, marginTop: spacing.md, maxWidth: 420 },
  welcomeBottom: { paddingBottom: spacing.md, gap: spacing.sm },
  welcomeButton: { minHeight: 60, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  welcomeButtonIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  welcomeButtonText: { fontSize: typography.md, lineHeight: 20, fontWeight: '600', color: colors.text },
  welcomeButtonSubtext: { fontSize: typography.xs, lineHeight: 15, color: colors.textMuted, marginTop: 1 },
  outbornMark: { width: 32, height: 32, borderRadius: radii.sm, borderWidth: 2.5, borderColor: colors.primary, position: 'relative' },
  outbornDot: { position: 'absolute', width: 7, height: 7, borderRadius: radii.pill, backgroundColor: colors.primary, right: -5, top: -5 },
  welcomeFoot: { textAlign: 'center', fontSize: typography.xs, color: colors.textSubtle },
  authError: { color: colors.danger, textAlign: 'center', fontSize: typography.sm, lineHeight: 18 },
  pressed: { opacity: 0.66 },

  header: { minHeight: 58, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerAction: { width: controls.touch, height: controls.touch, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  brand: { fontWeight: '600', fontSize: typography.md, lineHeight: 19, letterSpacing: -0.2 },
  headerSub: { fontSize: typography.xs, lineHeight: 15, color: colors.textMuted },
  avatar: { backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '600', color: colors.text },
  body: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 14, paddingTop: spacing.sm, paddingBottom: spacing.lg },

  tabs: { minHeight: controls.nav, flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.xxs, paddingTop: spacing.xxs, paddingBottom: spacing.xs },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2, borderRadius: radii.sm },
  tabPressed: { backgroundColor: colors.hover },
  tabText: { fontSize: typography.xs, lineHeight: 14, color: colors.textSubtle, fontWeight: '500' },
  tabTextActive: { color: colors.primary, fontWeight: '600' },

  warning: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 9, backgroundColor: colors.warningSurface, borderBottomWidth: 1, borderBottomColor: colors.warningBorder },
  warningText: { flex: 1, fontSize: typography.sm, lineHeight: 18, color: colors.warning },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  unlock: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  unlockTitle: { fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
  mutedCenter: { color: colors.textMuted, lineHeight: 21, textAlign: 'center' },
  primaryAction: { minHeight: controls.button, paddingHorizontal: spacing.lg, borderRadius: radii.sm, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xs },
  primaryActionText: { color: colors.primaryText, fontWeight: '600' },
  errorTitle: { fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  errorCopy: { color: colors.textMuted, textAlign: 'center', lineHeight: 21, maxWidth: 360 },
  errorActions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  primarySmall: { minHeight: controls.touch, justifyContent: 'center', backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 9, borderRadius: radii.sm },
  primarySmallText: { color: colors.primaryText, fontWeight: '600' },
  secondarySmall: { minHeight: controls.touch, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: spacing.md, paddingVertical: 9, borderRadius: radii.sm },
  secondarySmallText: { color: colors.text, fontWeight: '600' },

  skeleton: { backgroundColor: colors.skeleton },
  skeletonHeader: { minHeight: 58, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  skeletonBody: { paddingHorizontal: 14, paddingTop: spacing.md, gap: spacing.sm },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.xs, marginTop: spacing.xxs },
})
