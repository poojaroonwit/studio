import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
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
import { colors, radii } from './src/theme'

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
  return <SafeAreaProvider><SafeAreaView style={s.root}><StatusBar style="dark" /><View style={s.skeletonHeader}><View style={[s.skeleton, { width: 38, height: 38, borderRadius: 12 }]} /><View style={{ gap: 7, flex: 1 }}><View style={[s.skeleton, { width: 120, height: 15 }]} /><View style={[s.skeleton, { width: 82, height: 10 }]} /></View><View style={[s.skeleton, { width: 38, height: 38, borderRadius: 19 }]} /></View><View style={s.skeletonBody}><View style={[s.skeleton, { width: '62%', height: 34 }]} /><View style={[s.skeleton, { width: '44%', height: 14 }]} /><View style={s.skeletonGrid}>{[0,1,2,3].map((key) => <View key={key} style={[s.skeleton, { width: '48%', height: 104, borderRadius: radii.lg }]} />)}</View><View style={[s.skeleton, { width: '100%', height: 130, borderRadius: radii.lg, marginTop: 18 }]} /><View style={[s.skeleton, { width: '100%', height: 190, borderRadius: radii.lg }]} /></View></SafeAreaView></SafeAreaProvider>
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
      void saveBootstrapCache(next)
      void loadAccount()
    } catch (error) {
      if (isAuthRequired(error)) {
        setData(null)
        setAccount(null)
        setOffline(false)
        void clearBootstrapCache()
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
    setAppIdentity(await loadPublicAccountApplicationIdentity())
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
    if (token && (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === '1') {
      const supported = await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync()
      if (supported) {
        setLocked(true)
        setLoading(false)
        return
      }
    }
    await load()
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
    await accountAuth.signOut()
    await clearBootstrapCache()
    setData(null)
    setAccount(null)
    setOffline(false)
    setLoadError(null)
    setAuthError(null)
    setTab('home')
  }

  useEffect(() => { void initialize() }, [])

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
      <View style={s.headerBrand}><BrandLogo identity={appIdentity} size={36} /><View><AppText style={s.brand}>{appIdentity?.name || 'Obsi People'}</AppText><AppText style={s.headerSub}>Employee Self-Service</AppText></View></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Open account" onPress={() => setTab('account')}><AccountAvatar account={account} data={data} /></Pressable>
    </View>
    {loadError ? <View style={s.warning}><Ionicons name={offline ? 'cloud-offline-outline' : 'warning-outline'} size={16} color={colors.warning} /><AppText style={s.warningText}>{loadError}</AppText></View> : null}
    <ScrollView style={s.body} keyboardShouldPersistTaps="handled" scrollEventThrottle={80} onScroll={onScroll} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.text} onRefresh={() => { setRefreshing(true); void load({ allowCache: false }) }} />}>{screen}</ScrollView>
    <View style={s.tabs}>{tabs.map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: tab === item.id }} key={item.id} style={s.tab} onPress={() => setTab(item.id)}><Ionicons name={item.icon} size={22} color={tab === item.id ? colors.text : colors.textSubtle} /><AppText style={[s.tabText, tab === item.id && s.tabTextActive]}>{item.label}</AppText></Pressable>)}</View>
  </SafeAreaView></SafeAreaProvider>
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  text: { color: colors.text },
  welcome: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 24 },
  welcomeTop: { paddingTop: 18 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoFallback: { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  welcomeBrand: { fontSize: 18, fontWeight: '700', color: colors.text },
  welcomeBrandSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  welcomeContent: { flex: 1, justifyContent: 'center', paddingBottom: 36 },
  welcomeEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, color: colors.textMuted, marginBottom: 14 },
  welcomeTitle: { fontSize: 36, lineHeight: 42, fontWeight: '700', letterSpacing: -1.2, color: colors.text },
  welcomeCopy: { fontSize: 16, lineHeight: 24, color: colors.textMuted, marginTop: 18, maxWidth: 420 },
  welcomeBottom: { paddingBottom: 18, gap: 12 },
  welcomeButton: { minHeight: 68, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  welcomeButtonIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  welcomeButtonText: { fontSize: 16, fontWeight: '700', color: colors.text },
  welcomeButtonSubtext: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  outbornMark: { width: 34, height: 34, borderRadius: 12, borderWidth: 3, borderColor: colors.text, position: 'relative' },
  outbornDot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: colors.text, right: -5, top: -5 },
  welcomeFoot: { textAlign: 'center', fontSize: 11, color: colors.textSubtle },
  authError: { color: colors.danger, textAlign: 'center', fontSize: 12 },
  pressed: { opacity: 0.72 },
  header: { minHeight: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { fontWeight: '700', fontSize: 15 },
  headerSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  avatar: { backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', color: colors.text },
  body: { flex: 1 },
  content: { padding: 18, paddingBottom: 36 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingVertical: 8 },
  tab: { flex: 1, alignItems: 'center', gap: 3, minHeight: 48, justifyContent: 'center' },
  tabText: { fontSize: 10, color: colors.textSubtle },
  tabTextActive: { color: colors.text, fontWeight: '700' },
  warning: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, backgroundColor: colors.warningSurface },
  warningText: { flex: 1, fontSize: 12, color: colors.warning },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 14 },
  unlock: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 14 },
  unlockTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  mutedCenter: { color: colors.textMuted, textAlign: 'center' },
  primaryAction: { minHeight: 54, paddingHorizontal: 24, borderRadius: radii.md, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  primaryActionText: { color: colors.primaryText, fontWeight: '700' },
  errorTitle: { fontSize: 21, fontWeight: '700', textAlign: 'center' },
  errorCopy: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  errorActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  primarySmall: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 11, borderRadius: radii.md },
  primarySmallText: { color: colors.primaryText, fontWeight: '700' },
  secondarySmall: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18, paddingVertical: 11, borderRadius: radii.md },
  secondarySmallText: { color: colors.text, fontWeight: '700' },
  skeleton: { backgroundColor: colors.skeleton },
  skeletonHeader: { height: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.surface },
  skeletonBody: { padding: 18, gap: 13 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginTop: 8 },
})