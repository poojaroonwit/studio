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

export default function App() {
  const [data, setData] = useState<EssBootstrap | null>(null)
  const [tab, setTab] = useState<Tab>('home')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try { setData(await essApi.bootstrap()) }
    catch { setData(null) }
    finally { setLoading(false); setRefreshing(false) }
  }
  useEffect(() => { void load() }, [])

  if (loading) return <SafeAreaProvider><SafeAreaView style={s.center}><ActivityIndicator /><Text>Loading ESS…</Text></SafeAreaView></SafeAreaProvider>
  if (!data) return <SafeAreaProvider><SafeAreaView style={s.center}><View style={s.mark}><Ionicons name="people-outline" size={32} /></View><Text style={s.title}>Obsi People ESS</Text><Text style={s.muted}>Native employee self-service</Text><Pressable style={s.primary} onPress={() => void (async () => { if (await accountAuth.signIn()) { setLoading(true); await load() } })()}><Text style={s.primaryText}>Sign in with Outborn Account</Text></Pressable></SafeAreaView></SafeAreaProvider>

  const screen = tab === 'home' ? <HomeScreen data={data} setTab={setTab} /> : tab === 'time' ? <TimeScreen data={data} reload={load} /> : tab === 'requests' ? <RequestsScreen data={data} reload={load} /> : tab === 'documents' ? <DocumentsScreen data={data} /> : <MeScreen data={data} onSignOut={() => void (async () => { await accountAuth.signOut(); setData(null) })()} />

  return <SafeAreaProvider><SafeAreaView style={s.root}><StatusBar style="dark" /><View style={s.header}><View><Text style={s.brand}>Obsi People</Text><Text style={s.muted}>Employee Self-Service</Text></View><View style={s.avatar}><Text style={s.avatarText}>{data.employee.name.slice(0,1).toUpperCase()}</Text></View></View><ScrollView style={s.body} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} />}>{screen}</ScrollView><View style={s.tabs}>{tabs.map(item => <Pressable key={item.id} style={s.tab} onPress={() => setTab(item.id)}><Ionicons name={item.icon} size={22} color={tab === item.id ? '#111827' : '#9CA3AF'} /><Text style={[s.tabText, tab === item.id && s.active]}>{item.label}</Text></Pressable>)}</View></SafeAreaView></SafeAreaProvider>
}

const s = StyleSheet.create({root:{flex:1,backgroundColor:'#F5F6F8'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:16,backgroundColor:'#F5F6F8'},mark:{width:64,height:64,borderRadius:20,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},title:{fontSize:28,fontWeight:'700'},muted:{color:'#6B7280'},primary:{backgroundColor:'#111827',paddingHorizontal:20,paddingVertical:14,borderRadius:14},primaryText:{color:'#fff',fontWeight:'600'},header:{paddingHorizontal:20,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},brand:{fontSize:18,fontWeight:'700'},avatar:{width:38,height:38,borderRadius:19,backgroundColor:'#111827',alignItems:'center',justifyContent:'center'},avatarText:{color:'#fff',fontWeight:'700'},body:{flex:1},content:{padding:18,paddingBottom:28},tabs:{flexDirection:'row',backgroundColor:'#fff',borderTopWidth:1,borderTopColor:'#E5E7EB',paddingVertical:8},tab:{flex:1,alignItems:'center',gap:4},tabText:{fontSize:11,color:'#9CA3AF'},active:{color:'#111827',fontWeight:'600'}})
