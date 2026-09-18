import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as LocalAuthentication from 'expo-local-authentication'
import * as Location from 'expo-location'
import * as SecureStore from 'expo-secure-store'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { essApi, type AttendanceRow, type EmergencyContact, type EssBootstrap } from './api'
import type { AccountApplicationIdentity, AccountIdentity } from './account'
import { colors, controls, radii, spacing, typography } from './theme'

type Tab = 'home' | 'time' | 'requests' | 'documents' | 'account'
type RequestKind = 'leave' | 'attendance' | 'general' | 'bank-tax' | 'emergency'
type AccountSection = 'menu' | 'profile' | 'hr-chat' | 'notifications' | 'benefits' | 'contacts' | 'calendar' | 'security'

const BIOMETRIC_KEY = 'obsi.people.ess.biometric_lock'

function AppText({ children, style, ...props }: React.ComponentProps<typeof Text>) {
  return <Text {...props} style={[s.text, style]}>{children}</Text>
}

function Muted({ children, style, ...props }: React.ComponentProps<typeof Text>) {
  return <Text {...props} style={[s.text, s.muted, style]}>{children}</Text>
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.card, style]}>{children}</View>
}

function Button({ title, onPress, secondary = false, busy = false, disabled = false, large = false, icon }: {
  title: string
  onPress: () => void
  secondary?: boolean
  busy?: boolean
  disabled?: boolean
  large?: boolean
  icon?: keyof typeof Ionicons.glyphMap
}) {
  return <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled: disabled || busy, busy }}
    disabled={disabled || busy}
    onPress={onPress}
    style={({ pressed }) => [s.button, secondary && s.secondaryButton, large && s.largeButton, (disabled || busy) && s.disabled, pressed && s.pressed]}
  >
    {busy ? <ActivityIndicator size="small" color={secondary ? colors.text : colors.primaryText} /> : <View style={s.buttonContent} pointerEvents="none">
      {icon ? <Ionicons name={icon} size={large ? 25 : 18} color={secondary ? colors.text : colors.primaryText} /> : null}
      <AppText style={[s.buttonText, secondary && s.secondaryButtonText, large && s.largeButtonText]}>{title}</AppText>
    </View>}
  </Pressable>
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function formatDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function bangkokDate() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const get = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function todayAttendance(data: EssBootstrap) {
  const today = bangkokDate()
  return data.attendance.find((row) => row.date === today)
}

function useProgressiveCount(total: number, loadMoreTick: number, pageSize = 12) {
  const [count, setCount] = useState(Math.min(pageSize, total))
  useEffect(() => setCount((current) => Math.min(total, Math.max(current, pageSize))), [pageSize, total])
  useEffect(() => {
    if (loadMoreTick > 0) setCount((current) => Math.min(total, current + pageSize))
  }, [loadMoreTick, pageSize, total])
  return count
}

function PaginationFooter({ visible, total }: { visible: number; total: number }) {
  if (visible >= total) return null
  return <View style={s.loadMore}><ActivityIndicator size="small" color={colors.textMuted} /><Muted>Loading more…</Muted></View>
}

export function HomeScreen({ data, setTab, account }: { data: EssBootstrap; setTab: (tab: Tab) => void; account?: AccountIdentity | null }) {
  const firstName = (account?.name || data.employee.name).trim().split(/\s+/)[0] || 'there'
  const recent = data.attendance.slice(0, 14)
  const present = recent.filter((item) => item.status === 'present' || item.status === 'late').length
  const attendanceRate = recent.length ? Math.round((present / recent.length) * 100) : 0
  const pending = data.leaveRequests.filter((item) => item.status === 'pending').length
  const leaveBalance = Math.max(0, Number(data.employee.leaveBalanceDays || 0))
  const leaveScale = Math.min(100, Math.round((leaveBalance / Math.max(leaveBalance + pending, 1)) * 100))
  const nextSchedule = data.schedule.find((item) => item.date >= bangkokDate())

  return <>
    <AppText style={s.kicker}>EMPLOYEE SELF-SERVICE</AppText>
    <AppText style={s.pageTitle}>Hi, {firstName}</AppText>
    <Muted>{data.employee.position} · {data.employee.department}</Muted>

    {data.announcements.length ? <View style={s.announcementWrap}>{data.announcements.slice(0, 2).map((item) => <Card key={item.id} style={s.announcementCard}>
      <View style={s.infoRow}><Ionicons name="megaphone-outline" size={20} color={colors.accent} /><View style={s.flexOne}><AppText style={s.cardTitle}>{item.title}</AppText><Muted numberOfLines={3}>{item.body}</Muted></View></View>
    </Card>)}</View> : null}

    <View style={s.grid}>
      <Quick icon="time-outline" label="Attendance" onPress={() => setTab('time')} />
      <Quick icon="add-circle-outline" label="New request" onPress={() => setTab('requests')} />
      <Quick icon="folder-open-outline" label="Documents" onPress={() => setTab('documents')} />
      <Quick icon="person-circle-outline" label="Account" onPress={() => setTab('account')} />
    </View>

    <AppText style={s.section}>Today</AppText>
    <Card><View style={s.between}><View style={s.flexOne}><AppText style={s.cardTitle}>{data.employee.shiftLabel || 'Schedule'}</AppText><Muted>{data.employee.nextShift || 'No shift scheduled'}</Muted>{nextSchedule?.location ? <Muted>{nextSchedule.location}</Muted> : null}</View><Ionicons name="calendar-outline" size={22} color={colors.textMuted} /></View></Card>

    <AppText style={s.section}>Overview</AppText>
    <Card>
      <View style={s.metricRow}>
        <View style={s.metricBlock}><AppText style={s.metric}>{leaveBalance}</AppText><Muted>leave days</Muted></View>
        <View style={s.metricBlock}><AppText style={s.metric}>{pending}</AppText><Muted>pending</Muted></View>
        <View style={s.metricBlock}><AppText style={s.metric}>{data.employee.unreadNotifications || 0}</AppText><Muted>unread</Muted></View>
      </View>
      <View style={s.chartGroup}><ChartBar label="Attendance · recent 14" value={attendanceRate} /><ChartBar label="Leave availability" value={leaveScale} /></View>
    </Card>
  </>
}

function ChartBar({ label, value }: { label: string; value: number }) {
  return <View style={s.chartItem}><View style={s.between}><Muted>{label}</Muted><AppText style={s.chartValue}>{value}%</AppText></View><View style={s.chartTrack}><View style={[s.chartFill, { width: `${Math.max(2, Math.min(100, value))}%` }]} /></View></View>
}

function Quick({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" style={({ pressed }) => [s.quick, pressed && s.pressed]} onPress={onPress}><Ionicons name={icon} size={24} color={colors.text} /><AppText style={s.quickLabel}>{label}</AppText></Pressable>
}

export function TimeScreen({ data, reload, loadMoreTick }: { data: EssBootstrap; reload: () => Promise<void>; loadMoreTick: number }) {
  const [busy, setBusy] = useState<'in' | 'out' | null>(null)
  const visible = useProgressiveCount(data.attendance.length, loadMoreTick, 14)
  const today = todayAttendance(data)
  const policy = data.attendancePolicy || {}
  const shiftDate = data.employee.shiftLabel && /^\d{4}-\d{2}-\d{2}$/.test(data.employee.shiftLabel) ? data.employee.shiftLabel : undefined
  const hasShiftToday = !policy.requireScheduledShift || shiftDate === bangkokDate()
  const canClockIn = hasShiftToday && !today?.checkIn
  const canClockOut = hasShiftToday && Boolean(today?.checkIn) && !today?.checkOut

  const clock = async (mode: 'in' | 'out') => {
    if (busy) return
    setBusy(mode)
    try {
      let lat: number | undefined
      let lng: number | undefined
      if (policy.locationRequired) {
        const permission = await Location.requestForegroundPermissionsAsync()
        if (permission.status !== 'granted') throw new Error('Location permission is required by your organization for attendance.')
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } else {
        const permission = await Location.getForegroundPermissionsAsync()
        if (permission.status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        }
      }
      if (mode === 'in') await essApi.clockIn(lat, lng)
      else await essApi.clockOut(lat, lng)
      await reload()
    } catch (error) {
      Alert.alert('Attendance', error instanceof Error ? error.message : 'Unable to update attendance')
    } finally { setBusy(null) }
  }

  return <>
    <AppText style={s.pageTitle}>Time & attendance</AppText>
    <Card style={s.shiftCard}>
      <View style={s.between}><View style={s.flexOne}><AppText style={s.cardTitle}>Your shift</AppText><Muted>{data.employee.shiftLabel || 'No scheduled shift'}</Muted><AppText>{data.employee.nextShift || 'No shift details available'}</AppText></View><Ionicons name="calendar-number-outline" size={24} color={colors.textMuted} /></View>
      {policy.locationRequired ? <View style={s.infoRow}><Ionicons name="location-outline" size={18} color={colors.accent} /><Muted style={s.flexOne}>Your organization requires location verification. Allowed locations come from active organization branches.</Muted></View> : null}
    </Card>

    {!hasShiftToday ? <Card><AppText style={s.cardTitle}>No clock action available</AppText><Muted>No active shift is assigned for today.</Muted></Card>
      : canClockIn ? <Button title="Clock in" icon="enter-outline" large busy={busy === 'in'} onPress={() => void clock('in')} />
        : canClockOut ? <Button title="Clock out" icon="exit-outline" large busy={busy === 'out'} onPress={() => void clock('out')} />
          : <Card style={s.successCard}><View style={s.infoRow}><Ionicons name="checkmark-circle" size={26} color={colors.success} /><View style={s.flexOne}><AppText style={s.cardTitle}>Attendance complete</AppText><Muted>Clock in {formatDateTime(today?.checkIn)} · Clock out {formatDateTime(today?.checkOut)}</Muted></View></View></Card>}

    <AppText style={s.section}>Recent attendance</AppText>
    {data.attendance.length === 0 ? <EmptyState icon="time-outline" title="No attendance yet" /> : data.attendance.slice(0, visible).map((row) => <AttendanceCard key={row.id} row={row} />)}
    <PaginationFooter visible={visible} total={data.attendance.length} />
  </>
}

function AttendanceCard({ row }: { row: AttendanceRow }) {
  return <Card><View style={s.between}><AppText style={s.cardTitle}>{row.date}</AppText><StatusPill value={row.status} /></View><Muted>{formatDateTime(row.checkIn)} → {formatDateTime(row.checkOut)}</Muted></Card>
}

function StatusPill({ value }: { value: string }) {
  return <View style={s.status}><AppText style={s.statusText}>{value}</AppText></View>
}


function BottomDrawer({ visible, title, subtitle, onClose, children }: {
  visible: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  return <Modal transparent visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
    <Pressable style={s.drawerBackdrop} onPress={onClose}>
      <SafeAreaView edges={['bottom']} style={s.drawerSafe}>
        <Pressable accessibilityRole="none" style={s.drawer} onPress={(event) => event.stopPropagation()}>
          <View style={s.drawerHandle} />
          <View style={s.drawerHeader}>
            <View style={s.flexOne}><AppText style={s.drawerTitle}>{title}</AppText>{subtitle ? <Muted>{subtitle}</Muted> : null}</View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" style={s.modalClose} onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView style={s.drawerScroll} contentContainerStyle={s.drawerContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Pressable>
      </SafeAreaView>
    </Pressable>
  </Modal>
}

function FullScreenTaskModal({ visible, contextLabel, onClose, children }: {
  visible: boolean
  contextLabel: string
  onClose: () => void
  children: React.ReactNode
}) {
  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
    <SafeAreaView style={s.modalPage}>
      <View style={s.modalHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Close ${contextLabel}`} style={s.modalClose} onPress={onClose}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <AppText style={s.modalContext} numberOfLines={1}>{contextLabel}</AppText>
        <View style={s.modalHeaderSpacer} />
      </View>
      <KeyboardAvoidingView style={s.modalFlex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.modalFlex} contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>
}

function DrawerOption({ icon, title, subtitle, selected = false, onPress }: {
  icon?: keyof typeof Ionicons.glyphMap
  title: string
  subtitle?: string
  selected?: boolean
  onPress: () => void
}) {
  return <Pressable accessibilityRole="button" style={({ pressed }) => [s.drawerOption, pressed && s.drawerOptionPressed]} onPress={onPress}>
    {icon ? <View style={s.drawerOptionIcon}><Ionicons name={icon} size={21} color={selected ? colors.primary : colors.text} /></View> : null}
    <View style={s.flexOne}><AppText style={[s.drawerOptionTitle, selected && s.drawerOptionTitleSelected]}>{title}</AppText>{subtitle ? <Muted>{subtitle}</Muted> : null}</View>
    {selected ? <Ionicons name="checkmark" size={21} color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />}
  </Pressable>
}

function SelectField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return <View style={s.field}>
    <Muted style={s.fieldLabel}>{label}</Muted>
    <Pressable accessibilityRole="button" style={({ pressed }) => [s.inputPressable, pressed && s.controlPressed]} onPress={onPress}>
      <AppText numberOfLines={1} style={s.flexOne}>{value}</AppText>
      <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
    </Pressable>
  </View>
}

const requestKinds: Array<{ id: RequestKind; title: string; description: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'leave', title: 'Leave', description: 'Annual, sick or other leave', icon: 'calendar-outline' },
  { id: 'attendance', title: 'Attendance correction', description: 'Correct missing or incorrect time', icon: 'time-outline' },
  { id: 'general', title: 'HR request', description: 'Payroll, benefits, policy or general support', icon: 'chatbubble-ellipses-outline' },
  { id: 'bank-tax', title: 'Bank & tax', description: 'Update payroll payment or tax details', icon: 'card-outline' },
  { id: 'emergency', title: 'Emergency contact', description: 'Add a contact for emergencies', icon: 'people-outline' },
]

export function RequestsScreen({ data, reload, loadMoreTick, onFullPageChange }: { data: EssBootstrap; reload: () => Promise<void>; loadMoreTick: number; onFullPageChange?: (active: boolean) => void }) {
  const [kind, setKind] = useState<RequestKind | null>(null)
  const [chooserOpen, setChooserOpen] = useState(false)
  const visible = useProgressiveCount(data.leaveRequests.length, loadMoreTick, 10)

  useEffect(() => {
    onFullPageChange?.(kind !== null)
    return () => onFullPageChange?.(false)
  }, [kind, onFullPageChange])

  useEffect(() => {
    if (!kind) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setKind(null)
      return true
    })
    return () => subscription.remove()
  }, [kind])

  const chooseKind = (next: RequestKind) => {
    setChooserOpen(false)
    setKind(next)
  }

  if (kind) return <><Back label="Requests" onPress={() => setKind(null)} /><RequestForm kind={kind} data={data} reload={reload} onDone={() => setKind(null)} /></>

  return <>
    <View style={s.pageHeadingRow}>
      <View style={s.flexOne}><AppText style={s.pageTitle}>Requests</AppText><Muted>Track submitted requests and start a new one.</Muted></View>
      <Pressable accessibilityRole="button" style={({ pressed }) => [s.newRequestButton, pressed && s.pressed]} onPress={() => setChooserOpen(true)}>
        <Ionicons name="add" size={19} color={colors.primaryText} />
        <AppText style={s.newRequestButtonText}>New</AppText>
      </Pressable>
    </View>

    <AppText style={s.section}>Recent leave requests</AppText>
    {data.leaveRequests.length === 0 ? <EmptyState icon="document-text-outline" title="No requests yet" subtitle="Create a request when you need leave, an attendance correction or HR support." /> : data.leaveRequests.slice(0, visible).map((request) => <LeaveRequestCard key={request.id} request={request} reload={reload} />)}
    <PaginationFooter visible={visible} total={data.leaveRequests.length} />

    <BottomDrawer visible={chooserOpen} title="New request" subtitle="Choose the request you want to create." onClose={() => setChooserOpen(false)}>
      {requestKinds.map((item) => <DrawerOption key={item.id} icon={item.icon} title={item.title} subtitle={item.description} onPress={() => chooseKind(item.id)} />)}
    </BottomDrawer>
  </>
}

function RequestForm({ kind, data, reload, onDone }: { kind: RequestKind; data: EssBootstrap; reload: () => Promise<void>; onDone: () => void }) {
  if (kind === 'leave') return <LeaveRequestForm reload={reload} onDone={onDone} />
  if (kind === 'attendance') return <AttendanceCorrectionForm data={data} onDone={onDone} />
  if (kind === 'bank-tax') return <BankTaxRequestForm reload={reload} onDone={onDone} />
  if (kind === 'emergency') return <EmergencyContactForm reload={reload} onDone={onDone} />
  return <GeneralRequestForm onDone={onDone} />
}

function DateField({ label, value, onChange }: { label: string; value: Date; onChange: (value: Date) => void }) {
  const [open, setOpen] = useState(false)
  return <View style={s.field}><Muted style={s.fieldLabel}>{label}</Muted><Pressable style={s.inputPressable} onPress={() => setOpen(true)}><AppText>{formatDate(value)}</AppText><Ionicons name="calendar-outline" size={18} color={colors.textMuted} /></Pressable>{open ? <DateTimePicker value={value} mode="date" onChange={(_, next) => { setOpen(false); if (next) onChange(next) }} /> : null}</View>
}

function LeaveRequestForm({ reload, onDone }: { reload: () => Promise<void>; onDone: () => void }) {
  const [type, setType] = useState('Annual leave'), [start, setStart] = useState(new Date()), [end, setEnd] = useState(new Date()), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [typeOpen, setTypeOpen] = useState(false)
  const leaveTypes = ['Annual leave', 'Sick leave', 'Personal leave', 'Unpaid leave']
  const submit = async () => {
    if (end < start) return Alert.alert('Leave request', 'End date cannot be before start date.')
    setBusy(true)
    try { await essApi.createLeave({ type, startDate: formatDate(start), endDate: formatDate(end), reason: reason.trim() }); await reload(); Alert.alert('Leave request', 'Submitted successfully.'); onDone() }
    catch (error) { Alert.alert('Leave request', error instanceof Error ? error.message : 'Unable to submit') }
    finally { setBusy(false) }
  }
  return <><AppText style={s.pageTitle}>Leave request</AppText><Card><SelectField label="Leave type" value={type} onPress={() => setTypeOpen(true)} /><DateField label="Start date" value={start} onChange={setStart} /><DateField label="End date" value={end} onChange={setEnd} /><Field label="Reason" value={reason} onChangeText={setReason} multiline placeholder="Optional reason" /><Button title="Submit request" busy={busy} onPress={() => void submit()} /></Card><BottomDrawer visible={typeOpen} title="Leave type" onClose={() => setTypeOpen(false)}>{leaveTypes.map((item) => <DrawerOption key={item} title={item} selected={type === item} onPress={() => { setType(item); setTypeOpen(false) }} />)}</BottomDrawer></>
}

function AttendanceCorrectionForm({ data, onDone }: { data: EssBootstrap; onDone: () => void }) {
  const [attendanceId, setAttendanceId] = useState(data.attendance[0]?.id || ''), [checkIn, setCheckIn] = useState(''), [checkOut, setCheckOut] = useState(''), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [recordOpen, setRecordOpen] = useState(false)
  const selected = data.attendance.find((row) => row.id === attendanceId)
  const submit = async () => {
    if (!attendanceId || !reason.trim()) return Alert.alert('Attendance correction', 'Choose an attendance record and enter a reason.')
    setBusy(true)
    try { await essApi.createAttendanceCorrection({ attendanceId, reason: reason.trim(), requestedCheckIn: checkIn.trim() || undefined, requestedCheckOut: checkOut.trim() || undefined }); Alert.alert('Attendance correction', 'Submitted for review.'); onDone() }
    catch (error) { Alert.alert('Attendance correction', error instanceof Error ? error.message : 'Unable to submit') }
    finally { setBusy(false) }
  }
  return <><AppText style={s.pageTitle}>Attendance correction</AppText><Card><SelectField label="Attendance record" value={selected?.date || 'Choose a record'} onPress={() => setRecordOpen(true)} /><Field label="Requested clock in" value={checkIn} onChangeText={setCheckIn} placeholder="e.g. 2026-09-17 09:00" /><Field label="Requested clock out" value={checkOut} onChangeText={setCheckOut} placeholder="e.g. 2026-09-17 18:00" /><Field label="Reason" value={reason} onChangeText={setReason} multiline placeholder="Why should this record be corrected?" /><Button title="Submit correction" busy={busy} onPress={() => void submit()} /></Card><BottomDrawer visible={recordOpen} title="Attendance record" subtitle="Choose the record that needs correction." onClose={() => setRecordOpen(false)}>{data.attendance.slice(0, 20).map((row) => <DrawerOption key={row.id} title={row.date} subtitle={`${formatDateTime(row.checkIn)} → ${formatDateTime(row.checkOut)}`} selected={attendanceId === row.id} onPress={() => { setAttendanceId(row.id); setRecordOpen(false) }} />)}</BottomDrawer></>
}

function GeneralRequestForm({ onDone }: { onDone: () => void }) {
  const [subject, setSubject] = useState(''), [message, setMessage] = useState(''), [category, setCategory] = useState('general'), [busy, setBusy] = useState(false), [categoryOpen, setCategoryOpen] = useState(false)
  const categories = ['general', 'payroll', 'benefits', 'policy', 'workplace']
  const submit = async () => {
    if (!subject.trim() || !message.trim()) return Alert.alert('HR request', 'Subject and details are required.')
    setBusy(true)
    try { await essApi.createHrTicket(subject.trim(), message.trim(), category); Alert.alert('HR request', 'Request submitted.'); onDone() }
    catch (error) { Alert.alert('HR request', error instanceof Error ? error.message : 'Unable to submit') }
    finally { setBusy(false) }
  }
  return <><AppText style={s.pageTitle}>HR request</AppText><Card><SelectField label="Category" value={category.charAt(0).toUpperCase() + category.slice(1)} onPress={() => setCategoryOpen(true)} /><Field label="Subject" value={subject} onChangeText={setSubject} placeholder="What do you need help with?" /><Field label="Details" value={message} onChangeText={setMessage} multiline placeholder="Add the information HR needs" /><Button title="Submit HR request" busy={busy} onPress={() => void submit()} /></Card><BottomDrawer visible={categoryOpen} title="Request category" onClose={() => setCategoryOpen(false)}>{categories.map((item) => <DrawerOption key={item} title={item.charAt(0).toUpperCase() + item.slice(1)} selected={category === item} onPress={() => { setCategory(item); setCategoryOpen(false) }} />)}</BottomDrawer></>
}

function BankTaxRequestForm({ reload, onDone }: { reload: () => Promise<void>; onDone: () => void }) {
  const [bankName, setBankName] = useState(''), [accountNumber, setAccountNumber] = useState(''), [taxId, setTaxId] = useState(''), [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!bankName.trim() && !accountNumber.trim() && !taxId.trim()) return Alert.alert('Bank & tax', 'Enter at least one value to update.')
    setBusy(true)
    try { await essApi.patchBankTax({ bankName: bankName.trim() || undefined, accountNumber: accountNumber.trim() || undefined, taxId: taxId.trim() || undefined }); await reload(); Alert.alert('Bank & tax', 'Information updated.'); onDone() }
    catch (error) { Alert.alert('Bank & tax', error instanceof Error ? error.message : 'Unable to update') }
    finally { setBusy(false) }
  }
  return <><AppText style={s.pageTitle}>Bank & tax</AppText><Card><Field label="Bank name" value={bankName} onChangeText={setBankName} /><Field label="Account number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="numeric" /><Field label="Tax ID" value={taxId} onChangeText={setTaxId} keyboardType="numeric" /><Button title="Update information" busy={busy} onPress={() => void submit()} /></Card></>
}

function EmergencyContactForm({ reload, onDone, contact }: { reload: () => Promise<void>; onDone: () => void; contact?: EmergencyContact }) {
  const [name, setName] = useState(contact?.name || ''), [relationship, setRelationship] = useState(contact?.relationship || ''), [phone, setPhone] = useState(contact?.phone || ''), [primary, setPrimary] = useState(contact?.primary === true), [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!name.trim() || !relationship.trim() || !phone.trim()) return Alert.alert('Emergency contact', 'Name, relationship and phone are required.')
    setBusy(true)
    try {
      const payload = { name: name.trim(), relationship: relationship.trim(), phone: phone.trim(), primary }
      if (contact) await essApi.updateEmergencyContact(contact.id, payload)
      else await essApi.createEmergencyContact(payload)
      await reload(); Alert.alert('Emergency contact', contact ? 'Contact updated.' : 'Contact added.'); onDone()
    } catch (error) { Alert.alert('Emergency contact', error instanceof Error ? error.message : 'Unable to save contact') }
    finally { setBusy(false) }
  }
  return <><AppText style={s.pageTitle}>{contact ? 'Edit emergency contact' : 'Emergency contact'}</AppText><Card><Field label="Name" value={name} onChangeText={setName} /><Field label="Relationship" value={relationship} onChangeText={setRelationship} /><Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /><View style={s.switchRow}><View style={s.flexOne}><AppText>Primary contact</AppText><Muted>Use as the first person to contact.</Muted></View><Switch value={primary} onValueChange={setPrimary} trackColor={{ false: colors.surfaceStrong, true: colors.primary }} thumbColor={colors.surface} /></View><Button title={contact ? 'Save contact' : 'Add contact'} busy={busy} onPress={() => void submit()} /></Card></>
}

function LeaveRequestCard({ request, reload }: { request: EssBootstrap['leaveRequests'][number]; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const cancel = () => Alert.alert('Cancel leave request', 'Are you sure?', [{ text: 'Keep', style: 'cancel' }, { text: 'Cancel request', style: 'destructive', onPress: () => void (async () => { setBusy(true); try { await essApi.cancelLeave(request.id); await reload() } catch (error) { Alert.alert('Leave request', error instanceof Error ? error.message : 'Unable to cancel') } finally { setBusy(false) } })() }])
  return <Card><View style={s.between}><AppText style={s.cardTitle}>{request.type}</AppText><StatusPill value={request.status} /></View><Muted>{request.startDate} – {request.endDate} · {request.days} day(s)</Muted>{['draft', 'pending'].includes(request.status) ? <Pressable disabled={busy} onPress={cancel}><AppText style={s.danger}>{busy ? 'Cancelling…' : 'Cancel request'}</AppText></Pressable> : null}</Card>
}

export function DocumentsScreen({ data, loadMoreTick }: { data: EssBootstrap; loadMoreTick: number }) {
  const [opening, setOpening] = useState<string | null>(null)
  const visible = useProgressiveCount(data.documents.length, loadMoreTick, 12)
  const open = async (id: string) => {
    if (opening) return
    setOpening(id)
    try { const { url } = await essApi.documentUrl(id); if (!/^https?:\/\//i.test(url) || !await Linking.canOpenURL(url)) throw new Error('The document cannot be opened on this device.'); await Linking.openURL(url) }
    catch (error) { Alert.alert('Document', error instanceof Error ? error.message : 'Unable to open') }
    finally { setOpening(null) }
  }
  return <><AppText style={s.pageTitle}>Documents</AppText><Muted>Payslips, tax documents, policies and employee files.</Muted><View style={s.spacer} />{data.documents.length === 0 ? <EmptyState icon="folder-open-outline" title="No documents available" /> : data.documents.slice(0, visible).map((document) => <Pressable key={document.id} accessibilityRole="button" disabled={Boolean(opening)} onPress={() => void open(document.id)}><Card><View style={s.between}><View style={s.flexOne}><AppText style={s.cardTitle}>{document.title}</AppText><Muted>{document.subtitle || document.kind} · {document.issuedAt}</Muted></View>{opening === document.id ? <ActivityIndicator /> : <Ionicons name="download-outline" size={22} color={colors.text} />}</View></Card></Pressable>)}<PaginationFooter visible={visible} total={data.documents.length} /></>
}

export function AccountScreen({ data, account, appIdentity, reload, onSignOut, loadMoreTick, onFullPageChange }: { data: EssBootstrap; account?: AccountIdentity | null; appIdentity?: AccountApplicationIdentity | null; reload: () => Promise<void>; onSignOut: () => void; loadMoreTick: number; onFullPageChange?: (active: boolean) => void }) {
  const [section, setSection] = useState<AccountSection>('menu')
  const confirmSignOut = () => Alert.alert('Sign out', 'Sign out of Obsi People on this device?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: onSignOut }])

  useEffect(() => {
    onFullPageChange?.(section !== 'menu')
    return () => onFullPageChange?.(false)
  }, [section, onFullPageChange])

  useEffect(() => {
    if (section === 'menu') return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSection('menu')
      return true
    })
    return () => subscription.remove()
  }, [section])

  if (section !== 'menu') return <AccountSubpage section={section} setSection={setSection} data={data} account={account} reload={reload} loadMoreTick={loadMoreTick} />
  const displayName = account?.name || data.employee.name
  return <>
    <AppText style={s.pageTitle}>Account</AppText>
    <Card style={s.accountHero}><View style={s.accountIdentityRow}><Avatar imageUrl={account?.imageUrl || data.employee.avatarUrl} name={displayName} size={58} /><View style={s.flexOne}><AppText style={s.accountName}>{displayName}</AppText><Muted>{account?.email || data.profile?.personalEmail || data.employee.employeeId}</Muted><Muted>{data.employee.position} · {data.employee.department}</Muted></View></View><Muted>Identity from Outborn Account · Employee data from {appIdentity?.name || 'Obsi People'}</Muted></Card>
    <View style={s.menuList}>
      <MenuItem icon="person-outline" title="My profile" subtitle="Personal and employee information" onPress={() => setSection('profile')} />
      <MenuItem icon="chatbubbles-outline" title="Talk to HR" subtitle="Open HR support chat" onPress={() => setSection('hr-chat')} />
      <MenuItem icon="calendar-outline" title="Calendar" subtitle="Shifts and upcoming work schedule" onPress={() => setSection('calendar')} />
      <MenuItem icon="notifications-outline" title="Notifications" subtitle={`${data.employee.unreadNotifications || 0} unread`} onPress={() => setSection('notifications')} />
      <MenuItem icon="heart-outline" title="Benefits" subtitle="Employee benefits and coverage" onPress={() => setSection('benefits')} />
      <MenuItem icon="people-outline" title="Emergency contacts" subtitle="Add, edit and remove contacts" onPress={() => setSection('contacts')} />
      <MenuItem icon="shield-checkmark-outline" title="Security" subtitle="Biometric app lock" onPress={() => setSection('security')} />
    </View>
    <Button title="Sign out" secondary onPress={confirmSignOut} />
    <Muted style={s.version}>Development build · v0.2.0</Muted>
  </>
}

function AccountSubpage({ section, setSection, data, account, reload, loadMoreTick }: { section: AccountSection; setSection: (value: AccountSection) => void; data: EssBootstrap; account?: AccountIdentity | null; reload: () => Promise<void>; loadMoreTick: number }) {
  return <><Back label="Account" onPress={() => setSection('menu')} />{section === 'profile' ? <ProfilePage data={data} account={account} reload={reload} /> : null}{section === 'hr-chat' ? <HrChatPage /> : null}{section === 'calendar' ? <CalendarPage data={data} loadMoreTick={loadMoreTick} /> : null}{section === 'notifications' ? <NotificationsPage data={data} reload={reload} loadMoreTick={loadMoreTick} /> : null}{section === 'benefits' ? <BenefitsPage data={data} /> : null}{section === 'contacts' ? <ContactsPage data={data} reload={reload} /> : null}{section === 'security' ? <SecurityPage /> : null}</>
}

function ProfilePage({ data, account, reload }: { data: EssBootstrap; account?: AccountIdentity | null; reload: () => Promise<void> }) {
  const [preferredName, setPreferredName] = useState(data.profile?.preferredName || ''), [personalEmail, setPersonalEmail] = useState(data.profile?.personalEmail || ''), [phone, setPhone] = useState(data.profile?.phone || ''), [address, setAddress] = useState(data.profile?.address || ''), [busy, setBusy] = useState(false)
  const submit = async () => { setBusy(true); try { await essApi.patchProfile({ preferredName: preferredName.trim(), personalEmail: personalEmail.trim(), phone: phone.trim(), address: address.trim() }); await reload(); Alert.alert('My profile', 'Profile updated.') } catch (error) { Alert.alert('My profile', error instanceof Error ? error.message : 'Unable to update profile') } finally { setBusy(false) } }
  return <><AppText style={s.pageTitle}>My profile</AppText><Card><Muted>Outborn Account</Muted><AppText style={s.cardTitle}>{account?.name || data.employee.name}</AppText><Muted>{account?.email || 'Account email unavailable'}</Muted></Card><Card><Field label="Preferred name" value={preferredName} onChangeText={setPreferredName} /><Field label="Personal email" value={personalEmail} onChangeText={setPersonalEmail} keyboardType="email-address" autoCapitalize="none" /><Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /><Field label="Address" value={address} onChangeText={setAddress} multiline /><Button title="Save profile" busy={busy} onPress={() => void submit()} /></Card><Card><AppText style={s.cardTitle}>Employee information</AppText><Muted>Employee ID · {data.employee.employeeId}</Muted><Muted>{data.employee.position} · {data.employee.department}</Muted></Card></>
}

function HrChatPage() {
  const [message, setMessage] = useState(''), [messages, setMessages] = useState<Array<{ id: string; body: string }>>([]), [busy, setBusy] = useState(false)
  const send = async () => { const body = message.trim(); if (!body) return; setBusy(true); try { await essApi.createHrTicket('ESS chat', body, 'chat'); setMessages((current) => [...current, { id: `${Date.now()}`, body }]); setMessage('') } catch (error) { Alert.alert('Talk to HR', error instanceof Error ? error.message : 'Unable to send') } finally { setBusy(false) } }
  return <><AppText style={s.pageTitle}>Talk to HR</AppText><Muted>Messages create tracked HR support requests.</Muted><View style={s.chatArea}>{messages.length === 0 ? <EmptyState icon="chatbubble-ellipses-outline" title="Start a conversation with HR" /> : messages.map((item) => <View key={item.id} style={s.chatBubble}><AppText>{item.body}</AppText></View>)}</View><Card><TextInput style={[s.input, s.multi]} value={message} onChangeText={setMessage} multiline placeholder="Message HR" placeholderTextColor={colors.textSubtle} /><Button title="Send" icon="send-outline" busy={busy} onPress={() => void send()} /></Card></>
}

function CalendarPage({ data, loadMoreTick }: { data: EssBootstrap; loadMoreTick: number }) {
  const visible = useProgressiveCount(data.schedule.length, loadMoreTick, 20)
  return <><AppText style={s.pageTitle}>Calendar</AppText><Muted>Your assigned shifts and work locations.</Muted><View style={s.spacer} />{data.schedule.length === 0 ? <EmptyState icon="calendar-outline" title="No schedule published" /> : data.schedule.slice(0, visible).map((item) => <Card key={item.id}><View style={s.between}><View style={s.flexOne}><AppText style={s.cardTitle}>{item.date}</AppText><Muted>{item.startTime || '—'} – {item.endTime || '—'}</Muted>{item.location ? <Muted>{item.location}</Muted> : null}</View><StatusPill value={item.status} /></View></Card>)}<PaginationFooter visible={visible} total={data.schedule.length} /></>
}

function NotificationsPage({ data, reload, loadMoreTick }: { data: EssBootstrap; reload: () => Promise<void>; loadMoreTick: number }) {
  const [busy, setBusy] = useState<string | null>(null)
  const visible = useProgressiveCount(data.notifications.length, loadMoreTick, 15)
  const read = async (id: string) => { setBusy(id); try { await essApi.markNotificationRead(id); await reload() } catch (error) { Alert.alert('Notifications', error instanceof Error ? error.message : 'Unable to update') } finally { setBusy(null) } }
  const readAll = async () => { setBusy('all'); try { await essApi.markAllNotificationsRead(); await reload() } catch (error) { Alert.alert('Notifications', error instanceof Error ? error.message : 'Unable to update') } finally { setBusy(null) } }
  return <><View style={s.between}><AppText style={s.pageTitle}>Notifications</AppText>{data.notifications.some((item) => !item.read) ? <Pressable disabled={Boolean(busy)} onPress={() => void readAll()}><AppText style={s.linkText}>Mark all read</AppText></Pressable> : null}</View>{data.notifications.length === 0 ? <EmptyState icon="notifications-outline" title="No notifications" /> : data.notifications.slice(0, visible).map((item) => <Pressable key={item.id} disabled={Boolean(busy) || item.read} onPress={() => void read(item.id)}><Card style={!item.read ? s.unreadCard : undefined}><View style={s.between}><View style={s.flexOne}><AppText style={s.cardTitle}>{item.title}</AppText>{item.body ? <Muted>{item.body}</Muted> : null}<Muted>{formatDateTime(item.createdAt)}</Muted></View>{busy === item.id ? <ActivityIndicator /> : !item.read ? <View style={s.unreadDot} /> : null}</View></Card></Pressable>)}<PaginationFooter visible={visible} total={data.notifications.length} /></>
}

function BenefitsPage({ data }: { data: EssBootstrap }) {
  const open = async (url: string) => {
    try {
      if (!/^https?:\/\//i.test(url) || !await Linking.canOpenURL(url)) throw new Error('This benefit link cannot be opened safely on this device.')
      await Linking.openURL(url)
    } catch (error) {
      Alert.alert('Benefits', error instanceof Error ? error.message : 'Unable to open benefit link')
    }
  }
  return <><AppText style={s.pageTitle}>Benefits</AppText>{data.benefits.length === 0 ? <EmptyState icon="heart-outline" title="No benefits published yet" subtitle="Benefits configured by HR will appear here." /> : data.benefits.map((item) => <Pressable key={item.id} disabled={!item.url} onPress={() => item.url ? void open(item.url) : undefined}><Card><View style={s.between}><View style={s.flexOne}><AppText style={s.cardTitle}>{item.name}</AppText>{item.description ? <Muted>{item.description}</Muted> : null}{item.provider ? <Muted>{item.provider}</Muted> : null}</View>{item.url ? <Ionicons name="open-outline" size={20} color={colors.textMuted} /> : <StatusPill value={item.status || 'available'} />}</View></Card></Pressable>)}</>
}

function ContactsPage({ data, reload }: { data: EssBootstrap; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<EmergencyContact | 'new' | null>(null)
  const remove = (contact: EmergencyContact) => Alert.alert('Remove contact', `Remove ${contact.name}?`, [{ text: 'Keep', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void (async () => { try { await essApi.deleteEmergencyContact(contact.id); await reload() } catch (error) { Alert.alert('Emergency contacts', error instanceof Error ? error.message : 'Unable to remove') } })() }])
  return <>
    <View style={s.between}><AppText style={s.pageTitle}>Emergency contacts</AppText><Pressable accessibilityRole="button" accessibilityLabel="Add emergency contact" style={({ pressed }) => [s.iconAction, pressed && s.controlPressed]} onPress={() => setEditing('new')}><Ionicons name="add" size={24} color={colors.text} /></Pressable></View>
    {data.emergencyContacts.length === 0 ? <EmptyState icon="people-outline" title="No emergency contacts" subtitle="Add at least one person HR can contact in an emergency." /> : data.emergencyContacts.map((contact) => <Card key={contact.id}><View style={s.between}><Pressable accessibilityRole="button" style={s.flexOne} onPress={() => setEditing(contact)}><AppText style={s.cardTitle}>{contact.name}{contact.primary ? ' · Primary' : ''}</AppText><Muted>{contact.relationship} · {contact.phone}</Muted></Pressable><View style={s.inlineActions}><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${contact.name}`} style={s.inlineIconAction} onPress={() => setEditing(contact)}><Ionicons name="create-outline" size={20} color={colors.text} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${contact.name}`} style={s.inlineIconAction} onPress={() => remove(contact)}><Ionicons name="trash-outline" size={20} color={colors.danger} /></Pressable></View></View></Card>)}
    <FullScreenTaskModal visible={editing !== null} contextLabel="Emergency contacts" onClose={() => setEditing(null)}>
      {editing ? <EmergencyContactForm contact={editing === 'new' ? undefined : editing} reload={reload} onDone={() => setEditing(null)} /> : null}
    </FullScreenTaskModal>
  </>
}

function SecurityPage() {
  const [supported, setSupported] = useState<boolean | null>(null), [enabled, setEnabled] = useState(false), [busy, setBusy] = useState(false)
  useEffect(() => {
    void (async () => {
      try {
        const available = await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync()
        setSupported(available)
        setEnabled((await SecureStore.getItemAsync(BIOMETRIC_KEY)) === '1')
      } catch (error) {
        console.warn('Obsi People biometric settings unavailable', error)
        setSupported(false)
      }
    })()
  }, [])
  const toggle = async (next: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      if (next) {
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable biometric lock for Obsi People' })
        if (!result.success) return
      }
      await SecureStore.setItemAsync(BIOMETRIC_KEY, next ? '1' : '0')
      setEnabled(next)
    } catch (error) {
      Alert.alert('Security', error instanceof Error ? error.message : 'Unable to update biometric lock')
    } finally {
      setBusy(false)
    }
  }
  return <><AppText style={s.pageTitle}>Security</AppText><Card><View style={s.switchRow}><View style={s.flexOne}><AppText style={s.cardTitle}>Biometric app lock</AppText><Muted>{supported === false ? 'Biometrics are not configured on this device.' : 'Require fingerprint or Face ID when opening the app.'}</Muted></View><Switch disabled={!supported || busy} value={enabled} onValueChange={(next) => void toggle(next)} trackColor={{ false: colors.surfaceStrong, true: colors.primary }} thumbColor={colors.surface} /></View></Card></>
}

function Back({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable accessibilityRole="button" style={s.back} onPress={onPress}><Ionicons name="arrow-back" size={18} color={colors.text} /><AppText>{label}</AppText></Pressable> }
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable style={[s.chip, active && s.chipActive]} onPress={onPress}><AppText style={[s.chipText, active && s.chipTextActive]}>{label}</AppText></Pressable> }
function Avatar({ imageUrl, name, size = 44 }: { imageUrl?: string; name: string; size?: number }) { const style = { width: size, height: size, borderRadius: size / 2 }; return imageUrl ? <Image source={{ uri: imageUrl }} style={[style, s.avatarImage]} /> : <View style={[style, s.avatarFallback]}><AppText style={s.avatarInitial}>{(name.trim().slice(0, 1) || '?').toUpperCase()}</AppText></View> }
function MenuItem({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) { return <Pressable accessibilityRole="button" style={({ pressed }) => [s.menuItem, pressed && s.pressed]} onPress={onPress}><View style={s.menuIcon}><Ionicons name={icon} size={22} color={colors.text} /></View><View style={s.flexOne}><AppText style={s.cardTitle}>{title}</AppText><Muted>{subtitle}</Muted></View><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></Pressable> }
function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, style, ...inputProps } = props; return <View style={s.field}><Muted style={s.fieldLabel}>{label}</Muted><TextInput {...inputProps} placeholderTextColor={colors.textSubtle} style={[s.input, inputProps.multiline && s.multi, style]} /></View> }
function EmptyState({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) { return <View style={s.empty}><Ionicons name={icon} size={30} color={colors.textMuted} /><AppText style={s.cardTitle}>{title}</AppText>{subtitle ? <Muted style={s.centerText}>{subtitle}</Muted> : null}</View> }

const s = StyleSheet.create({
  text: { color: colors.text, fontSize: typography.base, lineHeight: 20 },
  muted: { color: colors.textMuted, lineHeight: 20 },
  pageTitle: { color: colors.text, fontSize: typography.title, lineHeight: 33, fontWeight: '700', marginBottom: spacing.xxs, letterSpacing: -0.7 },
  kicker: { color: colors.primary, fontSize: typography.xs, lineHeight: 15, fontWeight: '600', letterSpacing: 0.8 },
  section: { color: colors.text, fontSize: typography.xl, lineHeight: 23, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.xs, letterSpacing: -0.25 },

  card: { backgroundColor: colors.surface, padding: 14, borderRadius: radii.md, gap: spacing.xs, marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border },
  cardTitle: { color: colors.text, fontSize: typography.md, lineHeight: 20, fontWeight: '600', letterSpacing: -0.15 },
  flexOne: { flex: 1, minWidth: 0 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  spacer: { height: spacing.sm },
  pressed: { opacity: 0.68 },
  disabled: { opacity: 0.5 },
  controlPressed: { backgroundColor: colors.hover },

  pageHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.xs },
  newRequestButton: { minHeight: controls.touch, paddingHorizontal: 13, borderRadius: radii.sm, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  newRequestButtonText: { color: colors.primaryText, fontSize: typography.sm, lineHeight: 16, fontWeight: '600' },

  drawerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  drawerSafe: { width: '100%', maxHeight: '86%', backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden' },
  drawer: { width: '100%', maxHeight: '100%', backgroundColor: colors.surface, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingTop: 9 },
  drawerHandle: { width: 38, height: 4, alignSelf: 'center', borderRadius: radii.pill, backgroundColor: colors.borderStrong, marginBottom: spacing.sm },
  drawerHeader: { minHeight: 56, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  drawerTitle: { fontSize: 20, lineHeight: 25, fontWeight: '700', letterSpacing: -0.4 },
  drawerScroll: { maxHeight: 520 },
  drawerContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  drawerOption: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  drawerOptionPressed: { backgroundColor: colors.hover },
  drawerOptionIcon: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  drawerOptionTitle: { color: colors.text, fontSize: typography.md, lineHeight: 20, fontWeight: '500' },
  drawerOptionTitleSelected: { color: colors.primary, fontWeight: '600' },

  modalPage: { flex: 1, backgroundColor: colors.background },
  modalFlex: { flex: 1 },
  modalHeader: { minHeight: 56, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalClose: { width: controls.touch, height: controls.touch, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.hover },
  modalContext: { maxWidth: '70%', fontSize: typography.md, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  modalHeaderSpacer: { width: controls.touch, height: controls.touch },
  modalContent: { paddingHorizontal: 14, paddingTop: spacing.md, paddingBottom: spacing.xl },
  inlineIconAction: { width: controls.touch, height: controls.touch, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },

  button: { minHeight: controls.button, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  largeButton: { minHeight: 58, borderRadius: radii.sm, marginVertical: spacing.xs },
  largeButtonText: { fontSize: typography.lg },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  buttonText: { color: colors.primaryText, fontSize: typography.base, lineHeight: 18, fontWeight: '600' },
  secondaryButtonText: { color: colors.text },

  announcementWrap: { marginTop: spacing.md },
  announcementCard: { backgroundColor: colors.infoSurface, borderColor: colors.infoBorder },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  quick: { width: '48%', minHeight: 96, backgroundColor: colors.surface, padding: 14, borderRadius: radii.md, justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border },
  quickLabel: { color: colors.text, fontSize: typography.base, lineHeight: 18, fontWeight: '600' },

  metricRow: { flexDirection: 'row', gap: spacing.xs },
  metricBlock: { flex: 1, backgroundColor: colors.surfaceMuted, padding: spacing.sm, borderRadius: radii.sm },
  metric: { color: colors.text, fontSize: 26, lineHeight: 31, fontWeight: '700', letterSpacing: -0.6 },
  chartGroup: { gap: spacing.sm, marginTop: spacing.xxs },
  chartItem: { gap: 6 },
  chartValue: { fontWeight: '600', fontSize: typography.sm },
  chartTrack: { height: 6, backgroundColor: colors.surfaceStrong, borderRadius: radii.pill, overflow: 'hidden' },
  chartFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radii.pill },

  shiftCard: { marginTop: spacing.xs },
  successCard: { backgroundColor: colors.successSurface, borderColor: colors.successBorder },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  status: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  statusText: { color: colors.textMuted, fontSize: typography.xs, lineHeight: 15, textTransform: 'capitalize', fontWeight: '600' },
  loadMore: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },

  requestGrid: { gap: 0, marginTop: spacing.md, marginBottom: spacing.xxs, backgroundColor: 'transparent' },
  requestCard: { minHeight: 74, backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 2, paddingVertical: spacing.sm, gap: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  requestIcon: { width: controls.touch, height: controls.touch, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  back: { minHeight: controls.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', marginBottom: spacing.xs, paddingRight: spacing.sm, borderRadius: radii.pill },

  field: { gap: 6, marginBottom: spacing.xs },
  fieldLabel: { fontSize: typography.sm, lineHeight: 16, fontWeight: '500', color: colors.textMuted },
  input: { minHeight: controls.input, color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm, paddingHorizontal: 11, paddingVertical: 10, fontSize: 16, lineHeight: 21 },
  inputPressable: { minHeight: controls.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  multi: { minHeight: 96, textAlignVertical: 'top' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.xs },
  chip: { minHeight: controls.touch, justifyContent: 'center', paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: typography.sm, lineHeight: 16, fontWeight: '500' },
  chipTextActive: { color: colors.primaryText, fontWeight: '600' },

  danger: { color: colors.danger, fontWeight: '600', paddingVertical: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  empty: { minHeight: 136, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surfaceMuted, borderRadius: radii.md, marginBottom: spacing.xs, padding: spacing.lg },
  centerText: { textAlign: 'center' },

  accountHero: { backgroundColor: colors.surface },
  accountIdentityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  accountName: { fontSize: typography.xl, lineHeight: 23, fontWeight: '700', letterSpacing: -0.3 },
  avatarImage: { backgroundColor: colors.surfaceMuted },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  avatarInitial: { color: colors.primaryText, fontWeight: '600', fontSize: typography.lg },

  menuList: { gap: 0, marginBottom: spacing.md, backgroundColor: 'transparent' },
  menuItem: { minHeight: 64, backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 2, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menuIcon: { width: 40, height: 40, borderRadius: radii.sm, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  version: { textAlign: 'center', fontSize: typography.xs, lineHeight: 15, color: colors.textSubtle, marginTop: spacing.xs },

  chatArea: { minHeight: 180, justifyContent: 'flex-end', gap: spacing.xs, marginVertical: spacing.sm },
  chatBubble: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.infoSurface, paddingHorizontal: spacing.sm, paddingVertical: 10, borderRadius: radii.lg },
  unreadCard: { backgroundColor: colors.infoSurface, borderColor: colors.infoBorder },
  unreadDot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.accent },
  linkText: { color: colors.accent, fontWeight: '600', fontSize: typography.sm, lineHeight: 16 },
  iconAction: { width: controls.touch, height: controls.touch, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  inlineActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
})
