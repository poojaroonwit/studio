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
import { loadAccountApplicationIdentity, loadAccountIdentity, type AccountApplicationIdentity, type AccountIdentity } from './src/account'
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
  text: { color: colors.text, fontSize: 14 },
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14, backgroundColor: colors.background },
  unlock: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14, backgroundColor: colors.background },
  unlockTitle: { fontSize: 22, fontWeight: '700' },
  mutedCenter: { color: colors.textMuted, textAlign: 'center' },
  primaryAction: { minHeight: 52, paddingHorizontal: 24, backgroundColor: colors.primary, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  primaryActionText: { color: colors.primaryText, fontWeight: '700' },
  errorTitle: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  errorCopy: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  errorActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primarySmall: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radii.sm },
  primarySmallText: { color: colors.primaryText, fontWeight: '700' },
  secondarySmall: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radii.sm },
  secondarySmallText: { color: colors.text, fontWeight: '700' },
  logoFallback: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  welcome: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 22, justifyContent: 'space-between' },
  welcomeTop: { alignItems: 'flex-start' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  welcomeBrand: { color: colors.text, fontSize: 17, fontWeight: '700' },
  welcomeBrandSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  welcomeContent: { alignItems: 'flex-start', maxWidth: 380 },
  welcomeEyebrow: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginBottom: 13 },
  welcomeTitle: { color: colors.text, fontSize: 42, lineHeight: 47, fontWeight: '700', letterSpacing: -1.3 },
  welcomeCopy: { color: colors.textMuted, fontSize: 15, lineHeight: 23, marginTop: 18, maxWidth: 350 },
  welcomeBottom: { alignItems: 'stretch', gap: 13 },
  welcomeButton: { minHeight: 76, backgroundColor: colors.surfaceMuted, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  welcomeButtonIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  welcomeButtonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  welcomeButtonSubtext: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  outbornMark: { width: 30, height: 30, borderWidth: 7, borderColor: colors.text, borderRadius: 15, position: 'relative' },
  outbornDot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: colors.text, right: -7, top: -6 },
  authError: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  welcomeFoot: { color: colors.textSubtle, fontSize: 11 },
  pressed: { opacity: 0.7 },
  header: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { color: colors.text, fontSize: 17, fontWeight: '700' },
  headerSub: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  avatar: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primaryText, fontWeight: '700' },
  warning: { marginHorizontal: 18, marginBottom: 4, padding: 10, borderRadius: radii.sm, backgroundColor: colors.warningSurface, flexDirection: 'row', gap: 8, alignItems: 'center' },
  warningText: { color: colors.warning, fontSize: 12, flex: 1 },
  body: { flex: 1 },
  content: { padding: 18, paddingBottom: 34 },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 6 },
  tab: { flex: 1, alignItems: 'center', gap: 3, minHeight: 48, justifyContent: 'center' },
  tabText: { color: colors.textSubtle, fontSize: 10 },
  tabTextActive: { color: colors.text, fontWeight: '700' },
  skeletonHeader: { paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  skeletonBody: { padding: 18, gap: 14 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skeleton: { backgroundColor: colors.skeleton, borderRadius: 7 },
})
