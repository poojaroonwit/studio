import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { accountAuth } from './src/auth'
import { essApi, type EssBootstrap } from './src/api'
import { HomeScreen, TimeScreen, RequestsScreen, DocumentsScreen, MeScreen } from './src/screens'

type Tab = 'home' | 'time' | 'requests' | 'documents' | 'me'
const tabs: Array<{ id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'home', label: 'Home', icon: 'home-outline' },
  { id: 'time', label: 'Time', icon: 'time-outline' },
  { id: 'requests', label: 'Requests', icon: 'document-text-outline' },
  { id: 'documents', label: 'Documents', icon: 'folder-open-outline' },
  { id: 'me', label: 'Me', icon: 'person-outline' },
]

function OutbornAccountMark() {
  return (
    <View style={s.accountMark} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={s.accountMarkDot} pointerEvents="none" />
    </View>
  )
}

export default function App() {
  const [data, setData] = useState<EssBootstrap | null>(null)
  const [tab, setTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const load = async () => {
    try { setData(await essApi.bootstrap()) }
    catch { setData(null) }
    finally { setLoading(false); setRefreshing(false) }
  }

  const signIn = async () => {
    if (authLoading) return
    setAuthLoading(true)
    setAuthError(null)
    try {
      const success = await accountAuth.signIn()
      if (!success) {
        setAuthError('Sign-in was cancelled or did not complete. Please try again.')
        return
      }
      setLoading(true)
      await load()
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to start Outborn Account sign-in.')
    } finally {
      setAuthLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  if (loading) return <SafeAreaProvider><SafeAreaView style={s.center}><ActivityIndicator /><Text>Loading ESS…</Text></SafeAreaView></SafeAreaProvider>

  if (!data) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={s.welcome}>
          <StatusBar style="light" />
          <View style={s.welcomeTop} pointerEvents="none">
            <View style={s.welcomeBrandRow}>
              <View style={s.peopleMark}><Ionicons name="people-outline" size={20} color="#fff" /></View>
              <Text style={s.welcomeBrand}>Obsi People</Text>
            </View>
          </View>

          <View style={s.welcomeContent} pointerEvents="none">
            <Text style={s.welcomeEyebrow}>EMPLOYEE SELF-SERVICE</Text>
            <Text style={s.welcomeTitle}>Work life,{"\n"}in one place.</Text>
            <Text style={s.welcomeCopy}>Access your time, requests, documents and employee profile from the native Obsi People experience.</Text>
          </View>

          <View style={s.welcomeBottom}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Get start with Outborn Account"
              accessibilityState={{ disabled: authLoading, busy: authLoading }}
              disabled={authLoading}
              hitSlop={8}
              android_ripple={{ color: '#E5E7EB' }}
              style={({ pressed }) => [s.welcomeButton, (pressed || authLoading) && s.welcomeButtonPressed]}
              onPress={() => void signIn()}
            >
              <View style={s.welcomeButtonIdentity} pointerEvents="none">
                <OutbornAccountMark />
                <View pointerEvents="none">
                  <Text style={s.welcomeButtonText}>{authLoading ? 'Opening Account…' : 'Get start'}</Text>
                  <Text style={s.welcomeButtonSubtext}>with Outborn Account</Text>
                </View>
              </View>
              {authLoading ? <ActivityIndicator size="small" color="#111317" /> : <Ionicons name="arrow-forward" size={20} color="#111317" />}
            </Pressable>
            {authError ? <Text style={s.authError} accessibilityLiveRegion="polite">{authError}</Text> : null}
            <Text style={s.welcomeFoot}>One identity · Every Outborn product</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    )
  }

  const screen = tab === 'home' ? <HomeScreen data={data} setTab={setTab} /> : tab === 'time' ? <TimeScreen data={data} reload={load} /> : tab === 'requests' ? <RequestsScreen data={data} reload={load} /> : tab === 'documents' ? <DocumentsScreen data={data} /> : <MeScreen data={data} onSignOut={() => void (async () => { await accountAuth.signOut(); setData(null) })()} />

  return <SafeAreaProvider><SafeAreaView style={s.root}><StatusBar style="dark" /><View style={s.header}><View><Text style={s.brand}>Obsi People</Text><Text style={s.muted}>Employee Self-Service</Text></View><View style={s.avatar}><Text style={s.avatarText}>{data.employee.name.slice(0,1).toUpperCase()}</Text></View></View><ScrollView style={s.body} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />}>{screen}</ScrollView><View style={s.tabs}>{tabs.map(item => <Pressable key={item.id} style={s.tab} onPress={() => setTab(item.id)}><Ionicons name={item.icon} size={22} color={tab === item.id ? '#111827' : '#9CA3AF'} /><Text style={[s.tabText, tab === item.id && s.active]}>{item.label}</Text></Pressable>)}</View></SafeAreaView></SafeAreaProvider>
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#F5F6F8'},
  center:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:16,backgroundColor:'#F5F6F8'},
  welcome:{flex:1,backgroundColor:'#0B0D10',paddingHorizontal:24,paddingTop:12,paddingBottom:22,justifyContent:'space-between'},
  welcomeTop:{alignItems:'flex-start'},
  welcomeBrandRow:{flexDirection:'row',alignItems:'center',gap:10},
  peopleMark:{width:34,height:34,borderRadius:11,borderWidth:1,borderColor:'#2A2E34',backgroundColor:'#15181D',alignItems:'center',justifyContent:'center'},
  welcomeBrand:{color:'#fff',fontSize:17,fontWeight:'700',letterSpacing:-0.2},
  welcomeContent:{alignItems:'flex-start',maxWidth:360},
  welcomeEyebrow:{color:'#8F96A3',fontSize:11,fontWeight:'700',letterSpacing:1.4,marginBottom:14},
  welcomeTitle:{color:'#fff',fontSize:44,lineHeight:48,fontWeight:'700',letterSpacing:-1.4,textAlign:'left'},
  welcomeCopy:{color:'#A7ADB8',fontSize:15,lineHeight:23,marginTop:18,maxWidth:340,textAlign:'left'},
  welcomeBottom:{alignItems:'stretch',gap:14},
  welcomeButton:{minHeight:72,backgroundColor:'#fff',borderRadius:18,paddingHorizontal:18,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',overflow:'hidden'},
  welcomeButtonPressed:{opacity:0.78,transform:[{scale:0.99}]},
  welcomeButtonIdentity:{flexDirection:'row',alignItems:'center',gap:12},
  welcomeButtonText:{color:'#111317',fontSize:16,fontWeight:'700',letterSpacing:-0.2},
  welcomeButtonSubtext:{color:'#6B7280',fontSize:11,fontWeight:'500',marginTop:2},
  accountMark:{width:30,height:30,borderWidth:7,borderColor:'#111317',borderRadius:15,position:'relative'},
  accountMarkDot:{position:'absolute',width:7,height:7,borderRadius:4,backgroundColor:'#111317',right:-7,top:-6},
  authError:{color:'#FCA5A5',fontSize:12,lineHeight:18},
  welcomeFoot:{color:'#686F7A',fontSize:11,textAlign:'left'},
  muted:{color:'#6B7280'},
  header:{paddingHorizontal:20,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  brand:{fontSize:18,fontWeight:'700'},
  avatar:{width:38,height:38,borderRadius:19,backgroundColor:'#111827',alignItems:'center',justifyContent:'center'},
  avatarText:{color:'#fff',fontWeight:'700'},
  body:{flex:1},
  content:{padding:18,paddingBottom:28},
  tabs:{flexDirection:'row',backgroundColor:'#fff',borderTopWidth:1,borderTopColor:'#E5E7EB',paddingVertical:8},
  tab:{flex:1,alignItems:'center',gap:4},
  tabText:{fontSize:11,color:'#9CA3AF'},
  active:{color:'#111827',fontWeight:'600'},
})
