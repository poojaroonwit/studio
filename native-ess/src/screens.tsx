import { useState } from 'react'
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { essApi, type EssBootstrap } from './api'

type Tab = 'home' | 'time' | 'requests' | 'documents' | 'me'
const Card = ({children}:{children:React.ReactNode}) => <View style={s.card}>{children}</View>
const Button = ({title,onPress,secondary=false}:{title:string;onPress:()=>void;secondary?:boolean}) => <Pressable style={[s.button,secondary&&s.secondary]} onPress={onPress}><Text style={[s.buttonText,secondary&&s.secondaryText]}>{title}</Text></Pressable>

export function HomeScreen({data,setTab}:{data:EssBootstrap;setTab:(tab:Tab)=>void}) {
  return <><Text style={s.kicker}>EMPLOYEE SELF-SERVICE</Text><Text style={s.pageTitle}>Hi, {data.employee.name.split(' ')[0]}</Text><Text style={s.muted}>{data.employee.position} · {data.employee.department}</Text><View style={s.grid}><Quick icon="time-outline" label="Attendance" onPress={()=>setTab('time')}/><Quick icon="calendar-outline" label="Leave" onPress={()=>setTab('requests')}/><Quick icon="folder-open-outline" label="Documents" onPress={()=>setTab('documents')}/><Quick icon="person-outline" label="My profile" onPress={()=>setTab('me')}/></View><Text style={s.section}>Today</Text><Card><Text style={s.cardTitle}>{data.employee.shiftLabel||'Schedule'}</Text><Text style={s.muted}>{data.employee.nextShift||'No shift scheduled'}</Text></Card><Text style={s.section}>Overview</Text><Card><Text style={s.metric}>{data.employee.leaveBalanceDays??0}</Text><Text style={s.muted}>leave days available</Text><Text>{data.leaveRequests.filter(x=>x.status==='pending').length} pending leave requests</Text><Text>{data.employee.unreadNotifications??0} unread notifications</Text></Card></>
}

function Quick({icon,label,onPress}:{icon:keyof typeof Ionicons.glyphMap;label:string;onPress:()=>void}) { return <Pressable style={s.quick} onPress={onPress}><Ionicons name={icon} size={24}/><Text>{label}</Text></Pressable> }

export function TimeScreen({data,reload}:{data:EssBootstrap;reload:()=>Promise<void>}) {
  const clock=async(mode:'in'|'out')=>{try{const p=await Location.requestForegroundPermissionsAsync();let lat,lng;if(p.status==='granted'){const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});lat=pos.coords.latitude;lng=pos.coords.longitude}if(mode==='in')await essApi.clockIn(lat,lng);else await essApi.clockOut(lat,lng);await reload()}catch(e){Alert.alert('Attendance',e instanceof Error?e.message:'Unable to update attendance')}}
  return <><Text style={s.pageTitle}>Time & attendance</Text><View style={s.row}><Button title="Clock in" onPress={()=>void clock('in')}/><Button title="Clock out" secondary onPress={()=>void clock('out')}/></View><Text style={s.section}>Recent attendance</Text>{data.attendance.map(x=><Card key={x.id}><Text style={s.cardTitle}>{x.date}</Text><Text style={s.muted}>{x.checkIn||'—'} → {x.checkOut||'—'}</Text><Text style={s.status}>{x.status}</Text></Card>)}</>
}

export function RequestsScreen({data,reload}:{data:EssBootstrap;reload:()=>Promise<void>}) {
  const [type,setType]=useState('Annual leave'),[start,setStart]=useState(''),[end,setEnd]=useState(''),[reason,setReason]=useState('')
  const submit=async()=>{try{await essApi.createLeave({type,startDate:start,endDate:end,reason});setStart('');setEnd('');setReason('');await reload()}catch(e){Alert.alert('Leave request',e instanceof Error?e.message:'Unable to submit')}}
  return <><Text style={s.pageTitle}>Requests</Text><Card><TextInput style={s.input} value={type} onChangeText={setType} placeholder="Leave type"/><TextInput style={s.input} value={start} onChangeText={setStart} placeholder="Start YYYY-MM-DD"/><TextInput style={s.input} value={end} onChangeText={setEnd} placeholder="End YYYY-MM-DD"/><TextInput style={s.input} value={reason} onChangeText={setReason} placeholder="Reason"/><Button title="Submit leave request" onPress={()=>void submit()}/></Card><Text style={s.section}>My requests</Text>{data.leaveRequests.map(x=><Card key={x.id}><Text style={s.cardTitle}>{x.type}</Text><Text style={s.muted}>{x.startDate} – {x.endDate} · {x.days} day(s)</Text><Text style={s.status}>{x.status}</Text>{['draft','pending'].includes(x.status)&&<Pressable onPress={()=>void(async()=>{await essApi.cancelLeave(x.id);await reload()})()}><Text style={s.danger}>Cancel request</Text></Pressable>}</Card>)}</>
}

export function DocumentsScreen({data}:{data:EssBootstrap}) {
  const open=async(id:string)=>{try{const {url}=await essApi.documentUrl(id);await Linking.openURL(url)}catch(e){Alert.alert('Document',e instanceof Error?e.message:'Unable to open')}}
  return <><Text style={s.pageTitle}>Documents</Text>{data.documents.map(x=><Pressable key={x.id} onPress={()=>void open(x.id)}><Card><View style={s.between}><View><Text style={s.cardTitle}>{x.title}</Text><Text style={s.muted}>{x.subtitle||x.kind} · {x.issuedAt}</Text></View><Ionicons name="download-outline" size={22}/></View></Card></Pressable>)}</>
}

export function MeScreen({data,onSignOut}:{data:EssBootstrap;onSignOut:()=>void}) {
  const [subject,setSubject]=useState(''),[message,setMessage]=useState('')
  return <><Text style={s.pageTitle}>Me</Text><Card><Text style={s.cardTitle}>{data.employee.name}</Text><Text style={s.muted}>{data.employee.employeeId}</Text><Text>{data.employee.position}</Text><Text>{data.employee.department}</Text></Card><Text style={s.section}>Talk to HR</Text><Card><TextInput style={s.input} value={subject} onChangeText={setSubject} placeholder="Subject"/><TextInput style={[s.input,s.multi]} value={message} onChangeText={setMessage} multiline placeholder="Message"/><Button title="Send to HR" onPress={()=>void(async()=>{try{await essApi.createHrTicket(subject,message);setSubject('');setMessage('');Alert.alert('Talk to HR','Sent')}catch(e){Alert.alert('Talk to HR',e instanceof Error?e.message:'Unable to send')}})()}/></Card><Button title="Sign out" secondary onPress={onSignOut}/></>
}

const s=StyleSheet.create({pageTitle:{fontSize:28,fontWeight:'700',marginBottom:6},kicker:{fontSize:11,fontWeight:'700',letterSpacing:1.3,color:'#6B7280'},muted:{color:'#6B7280'},section:{fontSize:16,fontWeight:'700',marginTop:18,marginBottom:8},card:{backgroundColor:'#fff',padding:16,borderRadius:18,gap:8,marginBottom:10},cardTitle:{fontSize:16,fontWeight:'600'},metric:{fontSize:34,fontWeight:'700'},grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:18},quick:{width:'48%',backgroundColor:'#fff',padding:16,borderRadius:18,gap:10},row:{flexDirection:'row',gap:10,marginVertical:12},button:{backgroundColor:'#111827',paddingHorizontal:18,paddingVertical:13,borderRadius:14,alignItems:'center'},secondary:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D1D5DB'},buttonText:{color:'#fff',fontWeight:'600'},secondaryText:{color:'#111827'},status:{alignSelf:'flex-start',backgroundColor:'#F3F4F6',paddingHorizontal:10,paddingVertical:5,borderRadius:999,textTransform:'capitalize'},input:{backgroundColor:'#F9FAFB',borderWidth:1,borderColor:'#E5E7EB',padding:12,borderRadius:12},multi:{minHeight:90,textAlignVertical:'top'},danger:{color:'#B91C1C',fontWeight:'600'},between:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12}})
