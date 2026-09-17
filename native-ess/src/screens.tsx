import { useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { essApi, type EssBootstrap } from './api'

type Tab = 'home' | 'time' | 'requests' | 'documents' | 'me'
const Card = ({children}:{children:React.ReactNode}) => <View style={s.card}>{children}</View>
const Button = ({title,onPress,secondary=false,busy=false,disabled=false}:{title:string;onPress:()=>void;secondary?:boolean;busy?:boolean;disabled?:boolean}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled: disabled || busy, busy }}
    disabled={disabled || busy}
    style={({pressed})=>[s.button,secondary&&s.secondary,(disabled||busy)&&s.buttonDisabled,pressed&&s.buttonPressed]}
    onPress={onPress}
  >
    {busy ? <ActivityIndicator size="small" color={secondary?'#111827':'#fff'} /> : <Text style={[s.buttonText,secondary&&s.secondaryText]}>{title}</Text>}
  </Pressable>
)

function isIsoDate(value:string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value
}

function formatDateTime(value?:string|null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString([], { dateStyle:'medium', timeStyle:'short' })
}

export function HomeScreen({data,setTab}:{data:EssBootstrap;setTab:(tab:Tab)=>void}) {
  const firstName = data.employee.name.trim().split(/\s+/)[0] || 'there'
  return <>
    <Text style={s.kicker}>EMPLOYEE SELF-SERVICE</Text>
    <Text style={s.pageTitle}>Hi, {firstName}</Text>
    <Text style={s.muted}>{data.employee.position} · {data.employee.department}</Text>
    <View style={s.grid}>
      <Quick icon="time-outline" label="Attendance" onPress={()=>setTab('time')}/>
      <Quick icon="calendar-outline" label="Leave" onPress={()=>setTab('requests')}/>
      <Quick icon="folder-open-outline" label="Documents" onPress={()=>setTab('documents')}/>
      <Quick icon="person-outline" label="My profile" onPress={()=>setTab('me')}/>
    </View>
    <Text style={s.section}>Today</Text>
    <Card><Text style={s.cardTitle}>{data.employee.shiftLabel||'Schedule'}</Text><Text style={s.muted}>{data.employee.nextShift||'No shift scheduled'}</Text></Card>
    <Text style={s.section}>Overview</Text>
    <Card><Text style={s.metric}>{data.employee.leaveBalanceDays??0}</Text><Text style={s.muted}>leave days available</Text><Text>{data.leaveRequests.filter(x=>x.status==='pending').length} pending leave requests</Text><Text>{data.employee.unreadNotifications??0} unread notifications</Text></Card>
  </>
}

function Quick({icon,label,onPress}:{icon:keyof typeof Ionicons.glyphMap;label:string;onPress:()=>void}) {
  return <Pressable accessibilityRole="button" style={({pressed})=>[s.quick,pressed&&s.quickPressed]} onPress={onPress}><Ionicons name={icon} size={24}/><Text>{label}</Text></Pressable>
}

export function TimeScreen({data,reload}:{data:EssBootstrap;reload:()=>Promise<void>}) {
  const [busy,setBusy]=useState<'in'|'out'|null>(null)
  const clock=async(mode:'in'|'out')=>{
    if (busy) return
    setBusy(mode)
    try {
      const permission=await Location.requestForegroundPermissionsAsync()
      let lat: number | undefined
      let lng: number | undefined
      if(permission.status==='granted'){
        const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced})
        lat=pos.coords.latitude
        lng=pos.coords.longitude
      }
      if(mode==='in') await essApi.clockIn(lat,lng)
      else await essApi.clockOut(lat,lng)
      await reload()
    } catch(e) {
      Alert.alert('Attendance',e instanceof Error?e.message:'Unable to update attendance')
    } finally {
      setBusy(null)
    }
  }
  return <>
    <Text style={s.pageTitle}>Time & attendance</Text>
    <View style={s.row}><Button title="Clock in" busy={busy==='in'} disabled={busy!==null} onPress={()=>void clock('in')}/><Button title="Clock out" secondary busy={busy==='out'} disabled={busy!==null} onPress={()=>void clock('out')}/></View>
    <Text style={s.section}>Recent attendance</Text>
    {data.attendance.length===0 ? <Text style={s.empty}>No attendance records yet.</Text> : data.attendance.map(x=><Card key={x.id}><Text style={s.cardTitle}>{x.date}</Text><Text style={s.muted}>{formatDateTime(x.checkIn)} → {formatDateTime(x.checkOut)}</Text><Text style={s.status}>{x.status}</Text></Card>)}
  </>
}

export function RequestsScreen({data,reload}:{data:EssBootstrap;reload:()=>Promise<void>}) {
  const [type,setType]=useState('Annual leave')
  const [start,setStart]=useState('')
  const [end,setEnd]=useState('')
  const [reason,setReason]=useState('')
  const [submitting,setSubmitting]=useState(false)
  const [cancelling,setCancelling]=useState<string|null>(null)

  const submit=async()=>{
    if (submitting) return
    const cleanType=type.trim()
    const cleanStart=start.trim()
    const cleanEnd=end.trim()
    if (!cleanType) return Alert.alert('Leave request','Leave type is required.')
    if (!isIsoDate(cleanStart) || !isIsoDate(cleanEnd)) return Alert.alert('Leave request','Enter valid dates in YYYY-MM-DD format.')
    if (cleanEnd < cleanStart) return Alert.alert('Leave request','End date cannot be before start date.')
    setSubmitting(true)
    try {
      await essApi.createLeave({type:cleanType,startDate:cleanStart,endDate:cleanEnd,reason:reason.trim()})
      setStart('');setEnd('');setReason('')
      await reload()
      Alert.alert('Leave request','Submitted successfully.')
    } catch(e) {
      Alert.alert('Leave request',e instanceof Error?e.message:'Unable to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const cancel=async(id:string)=>{
    if (cancelling) return
    setCancelling(id)
    try { await essApi.cancelLeave(id); await reload() }
    catch(e){ Alert.alert('Leave request',e instanceof Error?e.message:'Unable to cancel request') }
    finally { setCancelling(null) }
  }

  const confirmCancel=(id:string)=>Alert.alert('Cancel leave request','Are you sure you want to cancel this request?',[{text:'Keep',style:'cancel'},{text:'Cancel request',style:'destructive',onPress:()=>void cancel(id)}])

  return <>
    <Text style={s.pageTitle}>Requests</Text>
    <Card>
      <TextInput style={s.input} value={type} onChangeText={setType} placeholder="Leave type" autoCapitalize="words"/>
      <TextInput style={s.input} value={start} onChangeText={setStart} placeholder="Start YYYY-MM-DD" autoCapitalize="none"/>
      <TextInput style={s.input} value={end} onChangeText={setEnd} placeholder="End YYYY-MM-DD" autoCapitalize="none"/>
      <TextInput style={s.input} value={reason} onChangeText={setReason} placeholder="Reason"/>
      <Button title="Submit leave request" busy={submitting} onPress={()=>void submit()}/>
    </Card>
    <Text style={s.section}>My requests</Text>
    {data.leaveRequests.length===0 ? <Text style={s.empty}>No leave requests yet.</Text> : data.leaveRequests.map(x=><Card key={x.id}><Text style={s.cardTitle}>{x.type}</Text><Text style={s.muted}>{x.startDate} – {x.endDate} · {x.days} day(s)</Text><Text style={s.status}>{x.status}</Text>{['draft','pending'].includes(x.status)&&<Pressable disabled={cancelling!==null} onPress={()=>confirmCancel(x.id)}><Text style={[s.danger,cancelling===x.id&&s.muted]}>{cancelling===x.id?'Cancelling…':'Cancel request'}</Text></Pressable>}</Card>)}
  </>
}

export function DocumentsScreen({data}:{data:EssBootstrap}) {
  const [opening,setOpening]=useState<string|null>(null)
  const open=async(id:string)=>{
    if (opening) return
    setOpening(id)
    try {
      const {url}=await essApi.documentUrl(id)
      if (!/^https?:\/\//i.test(url)) throw new Error('The document link is invalid.')
      const supported=await Linking.canOpenURL(url)
      if (!supported) throw new Error('No app is available to open this document.')
      await Linking.openURL(url)
    } catch(e) {
      Alert.alert('Document',e instanceof Error?e.message:'Unable to open')
    } finally {
      setOpening(null)
    }
  }
  return <>
    <Text style={s.pageTitle}>Documents</Text>
    {data.documents.length===0 ? <Text style={s.empty}>No documents available.</Text> : data.documents.map(x=><Pressable accessibilityRole="button" disabled={opening!==null} key={x.id} onPress={()=>void open(x.id)}><Card><View style={s.between}><View style={s.documentText}><Text style={s.cardTitle}>{x.title}</Text><Text style={s.muted}>{x.subtitle||x.kind} · {x.issuedAt}</Text></View>{opening===x.id?<ActivityIndicator size="small"/>:<Ionicons name="download-outline" size={22}/>}</View></Card></Pressable>)}
  </>
}

export function MeScreen({data,onSignOut}:{data:EssBootstrap;onSignOut:()=>void}) {
  const [subject,setSubject]=useState('')
  const [message,setMessage]=useState('')
  const [sending,setSending]=useState(false)
  const send=async()=>{
    if (sending) return
    const cleanSubject=subject.trim()
    const cleanMessage=message.trim()
    if (!cleanSubject || !cleanMessage) return Alert.alert('Talk to HR','Subject and message are required.')
    setSending(true)
    try {
      await essApi.createHrTicket(cleanSubject,cleanMessage)
      setSubject('');setMessage('')
      Alert.alert('Talk to HR','Sent successfully.')
    } catch(e) {
      Alert.alert('Talk to HR',e instanceof Error?e.message:'Unable to send')
    } finally {
      setSending(false)
    }
  }
  return <>
    <Text style={s.pageTitle}>Me</Text>
    <Card><Text style={s.cardTitle}>{data.employee.name}</Text><Text style={s.muted}>{data.employee.employeeId}</Text><Text>{data.employee.position}</Text><Text>{data.employee.department}</Text></Card>
    <Text style={s.section}>Talk to HR</Text>
    <Card><TextInput style={s.input} value={subject} onChangeText={setSubject} placeholder="Subject"/><TextInput style={[s.input,s.multi]} value={message} onChangeText={setMessage} multiline placeholder="Message"/><Button title="Send to HR" busy={sending} onPress={()=>void send()}/></Card>
    <Button title="Sign out" secondary onPress={onSignOut}/>
  </>
}

const s=StyleSheet.create({
  pageTitle:{fontSize:28,fontWeight:'700',marginBottom:6},kicker:{fontSize:11,fontWeight:'700',letterSpacing:1.3,color:'#6B7280'},muted:{color:'#6B7280'},section:{fontSize:16,fontWeight:'700',marginTop:18,marginBottom:8},card:{backgroundColor:'#fff',padding:16,borderRadius:18,gap:8,marginBottom:10},cardTitle:{fontSize:16,fontWeight:'600'},metric:{fontSize:34,fontWeight:'700'},grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:18},quick:{width:'48%',backgroundColor:'#fff',padding:16,borderRadius:18,gap:10},quickPressed:{opacity:0.75},row:{flexDirection:'row',gap:10,marginVertical:12},button:{flex:1,minHeight:46,backgroundColor:'#111827',paddingHorizontal:18,paddingVertical:13,borderRadius:14,alignItems:'center',justifyContent:'center'},buttonPressed:{opacity:0.78},buttonDisabled:{opacity:0.55},secondary:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D1D5DB'},buttonText:{color:'#fff',fontWeight:'600'},secondaryText:{color:'#111827'},status:{alignSelf:'flex-start',backgroundColor:'#F3F4F6',paddingHorizontal:10,paddingVertical:5,borderRadius:999,textTransform:'capitalize'},input:{backgroundColor:'#F9FAFB',borderWidth:1,borderColor:'#E5E7EB',padding:12,borderRadius:12},multi:{minHeight:90,textAlignVertical:'top'},danger:{color:'#B91C1C',fontWeight:'600',paddingVertical:6},between:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},documentText:{flex:1,minWidth:0},empty:{color:'#6B7280',paddingVertical:10}
})
