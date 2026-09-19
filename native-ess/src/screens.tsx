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
import { appBuildLabel } from './runtime'

type Tab = 'home' | 'time' | 'requests' | 'documents' | 'account'
type RequestKind = 'leave' | 'attendance' | 'general'
export type AccountSection = 'menu' | 'profile' | 'bank-tax' | 'hr-chat' | 'notifications' | 'benefits' | 'contacts' | 'calendar' | 'security'

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

function normalizeStatus(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function displayStatus(value?: string | null) {
  const normalized = String(value || 'pending').trim().replace(/[_-]+/g, ' ').toLowerCase()
  return normalized.replace(/\b\w/g, (character) => character.toUpperCase())
}

function isActiveRequestStatus(value?: string | null) {
  return ['draft', 'pending', 'submitted', 'pending_approval', 'returned_for_revision', 'waiting', 'processing'].includes(normalizeStatus(value))
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

function attendanceForDate(data: EssBootstrap, date: string) {
  return data.attendance.find((row) => row.date === date)
}

function bangkokDateOffset(days: number) {
  const anchor = new Date(`${bangkokDate()}T12:00:00+07:00`)
  anchor.setUTCDate(anchor.getUTCDate() + days)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(anchor)
  const get = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function shiftWindow(shift: EssBootstrap['schedule'][number], policy: EssBootstrap['attendancePolicy']) {
  const startText = /^\d{2}:\d{2}(?::\d{2})?$/.test(shift.startTime || '') ? shift.startTime : '00:00:00'
  const endText = /^\d{2}:\d{2}(?::\d{2})?$/.test(shift.endTime || '') ? shift.endTime : '23:59:59'
  const start = new Date(`${shift.date}T${startText}+07:00`)
  let end = new Date(`${shift.date}T${endText}+07:00`)
  if (end <= start) end = new Date(end.getTime() + 86_400_000)
  return {
    shift,
    opensAt: new Date(start.getTime() - Number(policy?.earlyClockInMinutes || 0) * 60_000),
    closesAt: new Date(end.getTime() + Number(policy?.lateClockOutMinutes || 0) * 60_000),
  }
}

function formatBangkokTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })
}

function shiftSummary(shift?: EssBootstrap['schedule'][number]) {
  if (!shift) return 'No scheduled shift'
  const time = `${(shift.startTime || '').slice(0, 5) || '—'}–${(shift.endTime || '').slice(0, 5) || '—'}`
  return `${time}${shift.location ? ` · ${shift.location}` : ''}`
}

function elapsedSince(value: string | null | undefined, now: number) {
  if (!value) return ''
  const started = new Date(value).getTime()
  if (!Number.isFinite(started) || now <= started) return ''
  const minutes = Math.floor((now - started) / 60_000)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours}h ${rest}m elapsed` : `${rest}m elapsed`
}

function useAttendanceAction(data: EssBootstrap, reload: () => Promise<void>, offline = false) {
  const [busy, setBusy] = useState<'in' | 'out' | 'sync' | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const policy = data.attendancePolicy || {}
  const policyAvailable = data.attendancePolicyAvailable !== false
  const relevantDates = new Set([bangkokDateOffset(-1), bangkokDate(), bangkokDateOffset(1)])
  const windows = data.schedule
    .filter((shift) => relevantDates.has(shift.date) && !['cancelled', 'deleted'].includes((shift.status || '').toLowerCase()))
    .map((shift) => shiftWindow(shift, policy))
    .sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime())

  const activeWindow = windows.find((entry) => now >= entry.opensAt.getTime() && now <= entry.closesAt.getTime())
  const upcomingWindow = windows.find((entry) => now < entry.opensAt.getTime())
  const todayShift = data.schedule.find((shift) => shift.date === bangkokDate() && !['cancelled', 'deleted'].includes((shift.status || '').toLowerCase()))
  const displayShift = activeWindow?.shift || todayShift || upcomingWindow?.shift
  const workDate = activeWindow?.shift.date || bangkokDate()
  const attendance = attendanceForDate(data, workDate)
  const requiresShift = policy.requireScheduledShift === true
  const hasActionWindow = policyAvailable && (!requiresShift || Boolean(activeWindow))
  const waitingForWindow = requiresShift && !activeWindow && Boolean(upcomingWindow)
  const windowClosed = requiresShift && !activeWindow && !upcomingWindow && windows.length > 0
  const canClockIn = !offline && hasActionWindow && !attendance?.checkIn
  const canClockOut = !offline && hasActionWindow && Boolean(attendance?.checkIn) && !attendance?.checkOut
  const complete = Boolean(attendance?.checkIn && attendance?.checkOut)
  const branchNames = (policy.locations || []).map((location) => location.name).filter(Boolean)

  const clock = async (mode: 'in' | 'out') => {
    if (busy || offline) return
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
      Alert.alert('Attendance', mode === 'in' ? 'Clock in recorded successfully.' : 'Clock out recorded successfully.')
    } catch (error) {
      Alert.alert('Attendance', error instanceof Error ? error.message : 'Unable to update attendance')
    } finally {
      setBusy(null)
    }
  }

  const reconnect = async () => {
    if (busy) return
    setBusy('sync')
    try {
      await reload()
    } finally {
      setBusy(null)
    }
  }

  return {
    attendance,
    policy,
    policyAvailable,
    displayShift,
    activeWindow,
    upcomingWindow,
    waitingForWindow,
    windowClosed,
    requiresShift,
    hasActionWindow,
    canClockIn,
    canClockOut,
    complete,
    branchNames,
    busy,
    now,
    clock,
    reconnect,
  }
}

function AttendanceActionCard({ data, reload, offline = false, onViewAttendance }: {
  data: EssBootstrap
  reload: () => Promise<void>
  offline?: boolean
  onViewAttendance?: () => void
}) {
  const action = useAttendanceAction(data, reload, offline)
  const elapsed = elapsedSince(action.attendance?.checkIn, action.now)
  const blocked = !action.hasActionWindow || action.waitingForWindow || action.windowClosed
  const cardStyle = action.complete ? s.successCard : offline || blocked ? s.warningCard : undefined

  const title = !action.policyAvailable
    ? 'Attendance policy unavailable'
    : offline
      ? action.complete ? 'Attendance complete · offline' : action.attendance?.checkIn && !action.attendance?.checkOut ? 'Reconnect to clock out' : 'Reconnect to clock in'
    : action.canClockIn ? 'Clock in'
      : action.canClockOut ? 'Clock out'
        : action.complete ? 'Attendance complete'
          : action.waitingForWindow ? 'Clock action available later'
            : action.windowClosed ? 'Attendance window closed'
              : action.requiresShift ? 'No clock action available'
                : 'Attendance'

  const detail = !action.policyAvailable
    ? 'Refresh attendance policy before recording a clock action.'
    : offline
      ? 'Attendance data is cached. Reconnect before recording a clock action.'
    : action.canClockIn ? 'Start your workday when you are ready.'
      : action.canClockOut ? `Clocked in ${formatBangkokTime(action.attendance?.checkIn || '')}${elapsed ? ` · ${elapsed}` : ''}`
        : action.complete ? `Clock in ${formatBangkokTime(action.attendance?.checkIn || '')} · Clock out ${formatBangkokTime(action.attendance?.checkOut || '')}`
          : action.waitingForWindow && action.upcomingWindow ? `Available from ${action.upcomingWindow.shift.date} at ${formatBangkokTime(action.upcomingWindow.opensAt)}.`
            : action.windowClosed ? 'The allowed attendance window for the assigned shift has ended.'
              : 'No active shift is assigned for the current attendance window.'

  const icon: keyof typeof Ionicons.glyphMap = offline ? 'cloud-offline-outline'
    : action.canClockIn ? 'enter-outline'
      : action.canClockOut ? 'exit-outline'
        : action.complete ? 'checkmark-circle-outline'
          : 'time-outline'

  return <Card style={[s.attendanceHero, cardStyle]}>
    <View style={s.between}>
      <View style={s.flexOne}><AppText style={s.attendanceTitle}>{title}</AppText><Muted>{detail}</Muted></View>
      <View style={[s.attendanceIconWrap, action.complete ? s.attendanceIconSuccess : offline || blocked ? s.attendanceIconWarning : s.attendanceIconDefault]}>
        <Ionicons name={icon} size={23} color={action.complete ? colors.success : offline || blocked ? colors.warning : colors.primary} />
      </View>
    </View>

    {action.displayShift ? <View style={s.infoRow}>
      <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
      <Muted style={s.flexOne}>{action.displayShift.date} · {shiftSummary(action.displayShift)}</Muted>
    </View> : null}

    {action.policy.locationRequired ? <View style={s.infoRow}>
      <Ionicons name="location-outline" size={18} color={colors.accent} />
      <Muted style={s.flexOne}>{action.branchNames.length ? `Location verification required · ${action.branchNames.slice(0, 2).join(', ')}${action.branchNames.length > 2 ? ` +${action.branchNames.length - 2} more` : ''}` : 'Location verification is required, but no active branch location is configured.'}</Muted>
    </View> : null}

    {!action.policyAvailable ? <Button title="Retry policy" icon="refresh-outline" secondary busy={action.busy === 'sync'} onPress={() => void action.reconnect()} />
      : offline ? <Button title="Reconnect" icon="refresh-outline" secondary busy={action.busy === 'sync'} onPress={() => void action.reconnect()} />
      : action.canClockIn ? <Button title="Clock in" icon="enter-outline" large busy={action.busy === 'in'} onPress={() => void action.clock('in')} />
        : action.canClockOut ? <Button title="Clock out" icon="exit-outline" large busy={action.busy === 'out'} onPress={() => void action.clock('out')} />
          : onViewAttendance ? <Button title="View attendance" icon="time-outline" secondary onPress={onViewAttendance} /> : null}
  </Card>
}

function useProgressiveCount(total: number, loadMoreTick: number, pageSize = 12) {
  const [count, setCount] = useState(Math.min(pageSize, total))
  useEffect(() => setCount((current) => Math.min(total, Math.max(current, pageSize))), [pageSize, total])
  useEffect(() => {
    if (loadMoreTick > 0) setCount((current) => Math.min(total, current + pageSize))
  }, [loadMoreTick, pageSize, total])
  const loadMore = () => setCount((current) => Math.min(total, current + pageSize))
  return { count, loadMore }
}

function PaginationFooter({ visible, total, onLoadMore }: { visible: number; total: number; onLoadMore: () => void }) {
  if (visible >= total) return null
  return <Pressable accessibilityRole="button" style={({ pressed }) => [s.loadMore, pressed && s.controlPressed]} onPress={onLoadMore}>
    <AppText style={s.linkText}>Load more</AppText>
    <Ionicons name="chevron-down" size={17} color={colors.accent} />
  </Pressable>
}

export function HomeScreen({ data, setTab, openNewRequest, openNotifications, account, reload, offline = false }: { data: EssBootstrap; setTab: (tab: Tab) => void; openNewRequest?: () => void; openNotifications?: () => void; account?: AccountIdentity | null; reload: () => Promise<void>; offline?: boolean }) {
  const firstName = (account?.name || data.employee.name).trim().split(/\s+/)[0] || 'there'
  const recent = data.attendance.slice(0, 14)
  const present = recent.filter((item) => item.status === 'present' || item.status === 'late').length
  const attendanceRate = recent.length ? Math.round((present / recent.length) * 100) : 0
  const pending = [
    ...data.leaveRequests,
    ...data.attendanceCorrections,
    ...data.profileChangeRequests,
    ...data.supportRequests,
  ].filter((item) => isActiveRequestStatus(item.status)).length
  const unread = Math.max(0, Number(data.employee.unreadNotifications || 0))
  const leaveBalance = Math.max(0, Number(data.employee.leaveBalanceDays || 0))

  return <>
    <AppText style={s.pageTitle}>Hi, {firstName}</AppText>
    <Muted>{data.employee.position} · {data.employee.department}</Muted>

    <AppText style={s.section}>Today</AppText>
    <AttendanceActionCard data={data} reload={reload} offline={offline} onViewAttendance={() => setTab('time')} />

    {pending > 0 ? <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pending} active request${pending === 1 ? '' : 's'}`}
      style={({ pressed }) => [s.attentionCard, pressed && s.controlPressed]}
      onPress={() => setTab('requests')}
    >
      <View style={s.attentionIcon}><Ionicons name="clipboard-outline" size={20} color={colors.primary} /></View>
      <View style={s.flexOne}>
        <AppText style={s.cardTitle}>Request activity</AppText>
        <Muted>{`${pending} request${pending === 1 ? '' : 's'} in progress or awaiting action`}</Muted>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable> : null}

    {unread > 0 ? <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread} unread notification${unread === 1 ? '' : 's'}`}
      style={({ pressed }) => [s.attentionCard, pressed && s.controlPressed]}
      onPress={() => openNotifications ? openNotifications() : setTab('account')}
    >
      <View style={s.attentionIcon}><Ionicons name="notifications-outline" size={20} color={colors.primary} /></View>
      <View style={s.flexOne}>
        <AppText style={s.cardTitle}>Unread notifications</AppText>
        <Muted>{`${unread} notification${unread === 1 ? '' : 's'} waiting to be read`}</Muted>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable> : null}

    {data.announcements.length ? <>
      <AppText style={s.section}>Updates</AppText>
      <View style={s.announcementWrap}>{data.announcements.slice(0, 2).map((item) => <Card key={item.id} style={s.announcementCard}>
        <View style={s.infoRow}><Ionicons name="megaphone-outline" size={20} color={colors.accent} /><View style={s.flexOne}><AppText style={s.cardTitle}>{item.title}</AppText><Muted numberOfLines={3}>{item.body}</Muted></View></View>
      </Card>)}</View>
    </> : null}

    <AppText style={s.section}>Quick actions</AppText>
    <View style={s.grid}>
      <Quick icon="time-outline" label="Attendance" onPress={() => setTab('time')} />
      <Quick icon="add-circle-outline" label="New request" onPress={openNewRequest || (() => setTab('requests'))} />
      <Quick icon="folder-open-outline" label="Documents" onPress={() => setTab('documents')} />
      <Quick icon="person-circle-outline" label="Account" onPress={() => setTab('account')} />
    </View>

    <AppText style={s.section}>Overview</AppText>
    <Card>
      <View style={s.metricRow}>
        <View style={s.metricBlock}><AppText style={s.metric}>{leaveBalance}</AppText><Muted>leave days</Muted></View>
        <View style={s.metricBlock}><AppText style={s.metric}>{pending}</AppText><Muted>pending leave</Muted></View>
        <View style={s.metricBlock}><AppText style={s.metric}>{data.employee.unreadNotifications || 0}</AppText><Muted>unread</Muted></View>
      </View>
      <View style={s.chartGroup}><ChartBar label="Attendance · recent 14" value={attendanceRate} /></View>
    </Card>
  </>
}

function ChartBar({ label, value }: { label: string; value: number }) {
  return <View style={s.chartItem}><View style={s.between}><Muted>{label}</Muted><AppText style={s.chartValue}>{value}%</AppText></View><View style={s.chartTrack}><View style={[s.chartFill, { width: `${Math.max(2, Math.min(100, value))}%` }]} /></View></View>
}

function Quick({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" style={({ pressed }) => [s.quick, pressed && s.controlPressed]} onPress={onPress}>
    <View style={s.quickTop}><View style={s.quickIcon}><Ionicons name={icon} size={20} color={colors.primary} /></View><Ionicons name="chevron-forward" size={16} color={colors.textSubtle} /></View>
    <AppText style={s.quickLabel}>{label}</AppText>
  </Pressable>
}

export function TimeScreen({ data, reload, loadMoreTick, offline = false, onFullPageChange }: { data: EssBootstrap; reload: () => Promise<void>; loadMoreTick: number; offline?: boolean; onFullPageChange?: (active: boolean) => void }) {
  const attendancePage = useProgressiveCount(data.attendance.length, loadMoreTick, 14)
  const visible = attendancePage.count
  const [correctionId, setCorrectionId] = useState<string | null>(null)

  const openCorrection = (id: string) => {
    onFullPageChange?.(true)
    setCorrectionId(id)
  }

  const closeCorrection = () => {
    onFullPageChange?.(false)
    setCorrectionId(null)
  }

  useEffect(() => {
    onFullPageChange?.(Boolean(correctionId))
  }, [correctionId, onFullPageChange])

  useEffect(() => {
    if (!correctionId) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeCorrection()
      return true
    })
    return () => subscription.remove()
  }, [correctionId])

  useEffect(() => () => onFullPageChange?.(false), [onFullPageChange])

  if (correctionId) {
    return <>
      <Back label="Time & attendance" onPress={closeCorrection} />
      <AttendanceCorrectionForm data={data} reload={reload} initialAttendanceId={correctionId} onDone={closeCorrection} />
    </>
  }

  return <>
    <AppText style={s.pageTitle}>Time & attendance</AppText>
    <AttendanceActionCard data={data} reload={reload} offline={offline} />

    <AppText style={s.section}>Recent attendance</AppText>
    {data.attendance.length === 0 ? <EmptyState icon="time-outline" title="No attendance yet" /> : data.attendance.slice(0, visible).map((row) => <AttendanceCard key={row.id} row={row} onCorrect={() => openCorrection(row.id)} />)}
    <PaginationFooter visible={visible} total={data.attendance.length} onLoadMore={attendancePage.loadMore} />
  </>
}

function AttendanceCard({ row, onCorrect }: { row: AttendanceRow; onCorrect?: () => void }) {
  return <Card>
    <View style={s.between}><AppText style={s.cardTitle}>{row.date}</AppText><StatusPill value={row.status} /></View>
    <Muted>{formatDateTime(row.checkIn)} → {formatDateTime(row.checkOut)}</Muted>
    {onCorrect ? <Pressable accessibilityRole="button" style={({ pressed }) => [s.inlineCorrection, pressed && s.pressed]} onPress={onCorrect}><Ionicons name="create-outline" size={16} color={colors.accent} /><AppText style={s.linkText}>Correct attendance</AppText></Pressable> : null}
  </Card>
}

function StatusPill({ value }: { value: string }) {
  const normalized = normalizeStatus(value)
  const success = ['approved', 'present', 'completed', 'complete', 'active', 'available', 'success'].includes(normalized)
  const warning = ['pending', 'pending_approval', 'submitted', 'processing', 'late', 'draft', 'waiting', 'scheduled', 'returned_for_revision', 'withdrawn'].includes(normalized)
  const danger = ['rejected', 'cancelled', 'canceled', 'absent', 'failed', 'declined'].includes(normalized)
  return <View style={[s.status, success && s.statusSuccess, warning && s.statusWarning, danger && s.statusDanger]}>
    <AppText style={[s.statusText, success && s.statusTextSuccess, warning && s.statusTextWarning, danger && s.statusTextDanger]}>{displayStatus(value)}</AppText>
  </View>
}


function BottomDrawer({ visible, title, subtitle, onClose, children }: {
  visible: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  return <Modal transparent visible={visible} animationType="slide" statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
    <View style={s.drawerBackdrop}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Close ${title}`}
        style={s.drawerBackdropDismiss}
        onPress={onClose}
      />
      <SafeAreaView pointerEvents="auto" edges={['bottom']} style={s.drawerSafe}>
        <View style={s.drawer}>
          <View style={s.drawerHandle} />
          <View style={s.drawerHeader}>
            <View style={s.flexOne}><AppText style={s.drawerTitle}>{title}</AppText>{subtitle ? <Muted>{subtitle}</Muted> : null}</View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" style={s.modalClose} onPress={onClose}>
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView style={s.drawerScroll} contentContainerStyle={s.drawerContent} keyboardShouldPersistTaps="always">
            {children}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
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
        <AppText style={s.modalContext} numberOfLines={1}>{contextLabel}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={`Close ${contextLabel}`} style={s.modalClose} onPress={onClose}>
          <Ionicons name="close" size={18} color={colors.text} />
        </Pressable>
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
]

export function RequestsScreen({ data, reload, loadMoreTick, onFullPageChange, openNewRequest = false, onNewRequestOpened }: { data: EssBootstrap; reload: () => Promise<void>; loadMoreTick: number; onFullPageChange?: (active: boolean) => void; openNewRequest?: boolean; onNewRequestOpened?: () => void }) {
  const [kind, setKind] = useState<RequestKind | null>(null)
  const [chooserOpen, setChooserOpen] = useState(openNewRequest)
  const [leaveRequestId, setLeaveRequestId] = useState<string | null>(null)
  const [correctionRequestId, setCorrectionRequestId] = useState<string | null>(null)
  const [profileRequestId, setProfileRequestId] = useState<string | null>(null)
  const [supportRequestId, setSupportRequestId] = useState<string | null>(null)
  const leavePage = useProgressiveCount(data.leaveRequests.length, loadMoreTick, 10)
  const correctionPage = useProgressiveCount(data.attendanceCorrections.length, loadMoreTick, 10)
  const profilePage = useProgressiveCount(data.profileChangeRequests.length, loadMoreTick, 10)
  const supportPage = useProgressiveCount(data.supportRequests.length, loadMoreTick, 10)
  const visible = leavePage.count
  const correctionVisible = correctionPage.count
  const profileVisible = profilePage.count
  const supportVisible = supportPage.count
  const leaveRequest = leaveRequestId ? data.leaveRequests.find(item => item.id === leaveRequestId) : undefined
  const correctionRequest = correctionRequestId ? data.attendanceCorrections.find(item => item.id === correctionRequestId) : undefined
  const profileRequest = profileRequestId ? data.profileChangeRequests.find(item => item.id === profileRequestId) : undefined
  const supportRequest = supportRequestId ? data.supportRequests.find(item => item.id === supportRequestId) : undefined

  useEffect(() => {
    if (!openNewRequest) return
    setChooserOpen(true)
    onNewRequestOpened?.()
  }, [openNewRequest, onNewRequestOpened])

  const openChooser = () => {
    setKind(null)
    setChooserOpen(true)
  }

  useEffect(() => {
    onFullPageChange?.(kind !== null)
  }, [kind, onFullPageChange])
  useEffect(() => () => onFullPageChange?.(false), [onFullPageChange])

  const closeRequest = () => {
    onFullPageChange?.(false)
    setKind(null)
  }

  useEffect(() => {
    if (!kind) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRequest()
      return true
    })
    return () => subscription.remove()
  }, [kind])

  const chooseKind = (next: RequestKind) => {
    // Close the native Modal first, then transition into the full-page form.
    // On Android, changing the underlying screen in the same press frame can
    // leave the drawer/backdrop owning the gesture and make the option appear inert.
    setChooserOpen(false)
    requestAnimationFrame(() => {
      setKind(next)
      onFullPageChange?.(true)
    })
  }

  if (kind) return <><Back label="Requests" onPress={closeRequest} /><RequestForm kind={kind} data={data} reload={reload} onDone={closeRequest} /></>

  return <>
    <View style={s.pageHeadingRow}>
      <View style={s.flexOne}><AppText style={s.pageTitle}>Requests</AppText><Muted>Track submitted requests and start a new one.</Muted></View>
      <Pressable accessibilityRole="button" style={({ pressed }) => [s.newRequestButton, pressed && s.pressed]} onPress={openChooser}>
        <Ionicons name="add" size={19} color={colors.primaryText} />
        <AppText style={s.newRequestButtonText}>New</AppText>
      </Pressable>
    </View>

    <AppText style={s.section}>Recent leave requests</AppText>
    {data.leaveRequests.length === 0 ? <EmptyState icon="document-text-outline" title="No leave requests yet" subtitle="Submitted leave requests and their latest status will appear here." /> : data.leaveRequests.slice(0, visible).map((request) => <LeaveRequestCard key={request.id} request={request} onPress={() => setLeaveRequestId(request.id)} />)}
    <PaginationFooter visible={visible} total={data.leaveRequests.length} onLoadMore={leavePage.loadMore} />

    <AppText style={s.section}>Attendance corrections</AppText>
    {data.attendanceCorrections.length === 0
      ? <EmptyState icon="time-outline" title="No attendance corrections yet" subtitle="Corrections you submit will remain visible here while HR reviews them." />
      : data.attendanceCorrections.slice(0, correctionVisible).map((request) => <AttendanceCorrectionCard key={request.id} request={request} onPress={() => setCorrectionRequestId(request.id)} />)}
    <PaginationFooter visible={correctionVisible} total={data.attendanceCorrections.length} onLoadMore={correctionPage.loadMore} />

    <AppText style={s.section}>Account changes</AppText>
    {data.profileChangeRequests.length === 0
      ? <EmptyState icon="person-outline" title="No account change requests yet" subtitle="Profile, bank, and tax changes submitted from Account will appear here." />
      : data.profileChangeRequests.slice(0, profileVisible).map((request) => <ProfileChangeRequestSummaryCard key={request.id} request={request} onPress={() => setProfileRequestId(request.id)} />)}
    <PaginationFooter visible={profileVisible} total={data.profileChangeRequests.length} onLoadMore={profilePage.loadMore} />

    <AppText style={s.section}>Recent HR requests</AppText>
    {data.supportRequests.length === 0
      ? <EmptyState icon="chatbubble-ellipses-outline" title="No HR requests yet" subtitle="Requests you submit to HR will remain visible here with their latest status." />
      : data.supportRequests.slice(0, supportVisible).map((request) => <SupportRequestCard key={request.id} request={request} onPress={() => setSupportRequestId(request.id)} />)}
    <PaginationFooter visible={supportVisible} total={data.supportRequests.length} onLoadMore={supportPage.loadMore} />

    <FullScreenTaskModal visible={Boolean(leaveRequest)} contextLabel="Leave request" onClose={() => setLeaveRequestId(null)}>
      {leaveRequest ? <LeaveRequestDetail request={leaveRequest} reload={reload} onClose={() => setLeaveRequestId(null)} /> : null}
    </FullScreenTaskModal>

    <FullScreenTaskModal visible={Boolean(correctionRequest)} contextLabel="Attendance correction" onClose={() => setCorrectionRequestId(null)}>
      {correctionRequest ? <AttendanceCorrectionDetail request={correctionRequest} /> : null}
    </FullScreenTaskModal>

    <FullScreenTaskModal visible={Boolean(profileRequest)} contextLabel="Account change" onClose={() => setProfileRequestId(null)}>
      {profileRequest ? <ProfileChangeRequestDetail request={profileRequest} /> : null}
    </FullScreenTaskModal>

    <FullScreenTaskModal visible={Boolean(supportRequest)} contextLabel="HR request" onClose={() => setSupportRequestId(null)}>
      {supportRequest ? <SupportRequestDetail request={supportRequest} reload={reload} /> : null}
    </FullScreenTaskModal>

    <BottomDrawer visible={chooserOpen} title="New request" subtitle="Choose the request you want to create." onClose={() => setChooserOpen(false)}>
      {requestKinds.map((item) => <DrawerOption key={item.id} icon={item.icon} title={item.title} subtitle={item.description} onPress={() => chooseKind(item.id)} />)}
    </BottomDrawer>
  </>
}

function RequestForm({ kind, data, reload, onDone }: { kind: RequestKind; data: EssBootstrap; reload: () => Promise<void>; onDone: () => void }) {
  if (kind === 'leave') return <LeaveRequestForm data={data} reload={reload} onDone={onDone} />
  if (kind === 'attendance') return <AttendanceCorrectionForm data={data} reload={reload} onDone={onDone} />
  return <GeneralRequestForm reload={reload} onDone={onDone} />
}

function DateField({ label, value, onChange }: { label: string; value: Date; onChange: (value: Date) => void }) {
  const [open, setOpen] = useState(false)
  return <View style={s.field}><Muted style={s.fieldLabel}>{label}</Muted><Pressable accessibilityRole="button" style={s.inputPressable} onPress={() => setOpen(true)}><AppText>{formatDate(value)}</AppText><Ionicons name="calendar-outline" size={18} color={colors.textMuted} /></Pressable>{open ? <DateTimePicker value={value} mode="date" onChange={(_, next) => { setOpen(false); if (next) onChange(next) }} /> : null}</View>
}

function TimeField({ label, value, fallback, onChange }: { label: string; value: Date | null; fallback?: string | null; onChange: (value: Date) => void }) {
  const [open, setOpen] = useState(false)
  const pickerValue = value || (fallback ? new Date(fallback) : new Date())
  const display = value ? value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : fallback ? formatBangkokTime(fallback) : 'Choose time'
  return <View style={s.field}><Muted style={s.fieldLabel}>{label}</Muted><Pressable accessibilityRole="button" style={s.inputPressable} onPress={() => setOpen(true)}><AppText>{display}</AppText><Ionicons name="time-outline" size={18} color={colors.textMuted} /></Pressable>{open ? <DateTimePicker value={Number.isNaN(pickerValue.getTime()) ? new Date() : pickerValue} mode="time" onChange={(_, next) => { setOpen(false); if (next) onChange(next) }} /> : null}</View>
}

function offsetAttendanceDate(date: string, days: number) {
  const anchor = new Date(`${date}T12:00:00+07:00`)
  if (Number.isNaN(anchor.getTime())) return date
  anchor.setUTCDate(anchor.getUTCDate() + days)
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(anchor)
  const get = (type: string) => parts.find(part => part.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function attendanceTimestamp(date: string, value: Date | null, dayOffset = 0) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  return `${offsetAttendanceDate(date, dayOffset)}T${hours}:${minutes}:00+07:00`
}

function sameAttendanceMinute(left?: string | null, right?: string | null) {
  if (!left && !right) return true
  if (!left || !right) return false
  const leftDate = new Date(left)
  const rightDate = new Date(right)
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) return false
  return Math.floor(leftDate.getTime() / 60_000) === Math.floor(rightDate.getTime() / 60_000)
}

function LeaveRequestForm({ data, reload, onDone }: { data: EssBootstrap; reload: () => Promise<void>; onDone: () => void }) {
  const [start, setStart] = useState(new Date())
  const [end, setEnd] = useState(new Date())
  const availablePolicies = data.leavePolicies.filter(item => item.year === start.getFullYear())
  const [policyId, setPolicyId] = useState(availablePolicies[0]?.id || '')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const primaryContact = data.emergencyContacts.find(item => item.primary) || data.emergencyContacts[0]
  const [contactId, setContactId] = useState(primaryContact?.id || '')
  const [contactOpen, setContactOpen] = useState(false)
  const policy = availablePolicies.find(item => item.id === policyId)
  const contact = data.emergencyContacts.find(item => item.id === contactId)

  useEffect(() => {
    if (policyId && data.leavePolicies.some(item => item.id === policyId && item.year === start.getFullYear())) return
    setPolicyId(data.leavePolicies.find(item => item.year === start.getFullYear())?.id || '')
  }, [data.leavePolicies, policyId, start])

  useEffect(() => {
    if (contactId && data.emergencyContacts.some(item => item.id === contactId)) return
    const next = data.emergencyContacts.find(item => item.primary) || data.emergencyContacts[0]
    setContactId(next?.id || '')
  }, [contactId, data.emergencyContacts])

  const submit = async () => {
    if (!policyId) return Alert.alert('Leave request', 'No leave policy is currently available for your account.')
    if (!contact) return Alert.alert('Leave request', 'Add an emergency contact in Account before submitting leave.')
    if (end < start) return Alert.alert('Leave request', 'End date cannot be before start date.')
    const emergencyContact = JSON.stringify({ name: contact.name, relationship: contact.relationship, phone: contact.phone })
    setBusy(true)
    try {
      await essApi.createLeave({ policyId, startDate: formatDate(start), endDate: formatDate(end), reason: reason.trim(), emergencyContact })
      await reload()
      Alert.alert('Leave request', 'Submitted successfully.')
      onDone()
    } catch (error) {
      Alert.alert('Leave request', error instanceof Error ? error.message : 'Unable to submit')
    } finally {
      setBusy(false)
    }
  }

  return <><AppText style={s.pageTitle}>Leave request</AppText><Card>
    {availablePolicies.length > 0
      ? <SelectField label="Leave policy" value={policy ? `${policy.name} · ${policy.balance.toFixed(1)} days available` : 'Choose a policy'} onPress={() => setPolicyOpen(true)} />
      : <View style={s.inlineNotice}><Ionicons name="information-circle-outline" size={19} color={colors.warning} /><Muted style={s.flexOne}>{`No assigned leave balance is published for ${start.getFullYear()}. Choose dates in a year with an available policy.`}</Muted></View>}
    {data.emergencyContacts.length > 0
      ? <SelectField label="Emergency contact" value={contact ? `${contact.name} · ${contact.relationship}` : 'Choose a contact'} onPress={() => setContactOpen(true)} />
      : <View style={s.inlineNotice}><Ionicons name="people-outline" size={19} color={colors.warning} /><Muted style={s.flexOne}>Add an emergency contact from Account → Emergency contacts before requesting leave.</Muted></View>}
    <DateField label="Start date" value={start} onChange={(next) => { setStart(next); if (end < next) setEnd(next) }} />
    <DateField label="End date" value={end} onChange={setEnd} />
    <Field label="Reason" value={reason} onChangeText={setReason} multiline placeholder="Optional reason" />
    <Button title="Submit request" busy={busy} disabled={!policyId || availablePolicies.length === 0 || !contact} onPress={() => void submit()} />
  </Card><BottomDrawer visible={policyOpen && availablePolicies.length > 0} title="Leave policy" subtitle="Only policies assigned to you are shown." onClose={() => setPolicyOpen(false)}>
    {availablePolicies.map((item) => <DrawerOption key={item.id} title={item.name} subtitle={`${item.balance.toFixed(1)} days available · ${item.year}`} selected={policyId === item.id} onPress={() => { setPolicyId(item.id); setPolicyOpen(false) }} />)}
  </BottomDrawer><BottomDrawer visible={contactOpen && data.emergencyContacts.length > 0} title="Emergency contact" subtitle="Choose who HR can contact if needed during your leave." onClose={() => setContactOpen(false)}>
    {data.emergencyContacts.map((item) => <DrawerOption key={item.id} title={item.name} subtitle={`${item.relationship} · ${item.phone}${item.primary ? ' · Primary' : ''}`} selected={contactId === item.id} onPress={() => { setContactId(item.id); setContactOpen(false) }} />)}
  </BottomDrawer></>
}

function AttendanceCorrectionForm({ data, reload, onDone, initialAttendanceId, showTitle = true }: { data: EssBootstrap; reload?: () => Promise<void>; onDone: () => void; initialAttendanceId?: string; showTitle?: boolean }) {
  const initialId = initialAttendanceId || data.attendance[0]?.id || ''
  const initialRecord = data.attendance.find(row => row.id === initialId)
  const defaultTarget = initialRecord?.checkIn ? (initialRecord?.checkOut ? 'check_in' : 'check_out') : 'check_in'
  const [attendanceId, setAttendanceId] = useState(initialId)
  const [target, setTarget] = useState<'check_in' | 'check_out'>(defaultTarget)
  const [checkIn, setCheckIn] = useState<Date | null>(() => initialRecord?.checkIn ? new Date(initialRecord.checkIn) : null)
  const [checkOut, setCheckOut] = useState<Date | null>(() => initialRecord?.checkOut ? new Date(initialRecord.checkOut) : null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [recordOpen, setRecordOpen] = useState(false)
  const [targetOpen, setTargetOpen] = useState(false)
  const selected = data.attendance.find((row) => row.id === attendanceId)

  const chooseRecord = (row: AttendanceRow) => {
    setAttendanceId(row.id)
    setCheckIn(row.checkIn ? new Date(row.checkIn) : null)
    setCheckOut(row.checkOut ? new Date(row.checkOut) : null)
    setTarget(row.checkIn ? (row.checkOut ? 'check_in' : 'check_out') : 'check_in')
    setRecordOpen(false)
  }

  const submit = async () => {
    if (!attendanceId || !selected || !reason.trim()) return Alert.alert('Attendance correction', 'Choose an attendance record and enter a reason.')

    const checkInMinutes = checkIn ? checkIn.getHours() * 60 + checkIn.getMinutes() : null
    const checkOutMinutes = checkOut ? checkOut.getHours() * 60 + checkOut.getMinutes() : null
    const overnight = checkInMinutes !== null && checkOutMinutes !== null && checkOutMinutes <= checkInMinutes
    const requestedCheckIn = attendanceTimestamp(selected.date, checkIn)
    const requestedCheckOut = attendanceTimestamp(selected.date, checkOut, overnight ? 1 : 0)
    const requestedValue = target === 'check_in' ? requestedCheckIn : requestedCheckOut
    const currentValue = target === 'check_in' ? selected.checkIn : selected.checkOut

    if (!requestedValue) {
      return Alert.alert('Attendance correction', `Choose the requested ${target === 'check_in' ? 'clock-in' : 'clock-out'} time.`)
    }
    if (sameAttendanceMinute(requestedValue, currentValue)) {
      return Alert.alert('Attendance correction', `Change the requested ${target === 'check_in' ? 'clock-in' : 'clock-out'} time before submitting.`)
    }

    const correctionType = target === 'check_in'
      ? selected.checkIn ? 'incorrect_check_in' : 'missing_check_in'
      : selected.checkOut ? 'incorrect_check_out' : 'missing_check_out'

    setBusy(true)
    try {
      await essApi.createAttendanceCorrection({
        attendanceId,
        workDate: selected.date,
        correctionType,
        reason: reason.trim(),
        requestedCheckIn: target === 'check_in' ? requestedCheckIn : undefined,
        requestedCheckOut: target === 'check_out' ? requestedCheckOut : undefined,
      })
      if (reload) await reload()
      Alert.alert('Attendance correction', 'Submitted for approval.')
      onDone()
    } catch (error) {
      Alert.alert('Attendance correction', error instanceof Error ? error.message : 'Unable to submit')
    } finally {
      setBusy(false)
    }
  }

  return <>{showTitle ? <AppText style={s.pageTitle}>Attendance correction</AppText> : null}<Card>
    <View style={s.inlineNotice}><Ionicons name="shield-checkmark-outline" size={19} color={colors.textMuted} /><Muted style={s.flexOne}>Corrections are submitted as tracked requests and may require approval before the attendance record changes.</Muted></View>
    <SelectField label="Attendance record" value={selected?.date || 'Choose a record'} onPress={() => setRecordOpen(true)} />
    <SelectField label="Correct" value={target === 'check_in' ? 'Clock in' : 'Clock out'} onPress={() => setTargetOpen(true)} />
    {target === 'check_in'
      ? <TimeField label="Requested clock in" value={checkIn} fallback={selected?.checkIn} onChange={setCheckIn} />
      : <TimeField label="Requested clock out" value={checkOut} fallback={selected?.checkOut} onChange={setCheckOut} />}
    <Field label="Reason" value={reason} onChangeText={setReason} multiline placeholder="Why should this record be corrected?" />
    <Button title="Submit for approval" busy={busy} disabled={!selected || !reason.trim()} onPress={() => void submit()} />
  </Card>
  <BottomDrawer visible={recordOpen} title="Attendance record" subtitle="Choose the record that needs correction." onClose={() => setRecordOpen(false)}>
    {data.attendance.slice(0, 20).map((row) => <DrawerOption key={row.id} title={row.date} subtitle={`${formatDateTime(row.checkIn)} → ${formatDateTime(row.checkOut)}`} selected={attendanceId === row.id} onPress={() => chooseRecord(row)} />)}
  </BottomDrawer>
  <BottomDrawer visible={targetOpen} title="Correction field" subtitle="Submit one corrected time per request." onClose={() => setTargetOpen(false)}>
    <DrawerOption title="Clock in" subtitle={selected?.checkIn ? `Current · ${formatDateTime(selected.checkIn)}` : 'Currently missing'} selected={target === 'check_in'} onPress={() => { setTarget('check_in'); setTargetOpen(false) }} />
    <DrawerOption title="Clock out" subtitle={selected?.checkOut ? `Current · ${formatDateTime(selected.checkOut)}` : 'Currently missing'} selected={target === 'check_out'} onPress={() => { setTarget('check_out'); setTargetOpen(false) }} />
  </BottomDrawer></>
}

function GeneralRequestForm({ reload, onDone }: { reload: () => Promise<void>; onDone: () => void }) {
  const [subject, setSubject] = useState(''), [message, setMessage] = useState(''), [category, setCategory] = useState('general'), [busy, setBusy] = useState(false), [categoryOpen, setCategoryOpen] = useState(false)
  const categories = ['general', 'payroll', 'benefits', 'policy', 'workplace']
  const submit = async () => {
    if (!subject.trim() || !message.trim()) return Alert.alert('HR request', 'Subject and details are required.')
    setBusy(true)
    try { await essApi.createHrTicket(subject.trim(), message.trim(), category); await reload(); Alert.alert('HR request', 'Request submitted.'); onDone() }
    catch (error) { Alert.alert('HR request', error instanceof Error ? error.message : 'Unable to submit') }
    finally { setBusy(false) }
  }
  return <><AppText style={s.pageTitle}>HR request</AppText><Card><SelectField label="Category" value={category.charAt(0).toUpperCase() + category.slice(1)} onPress={() => setCategoryOpen(true)} /><Field label="Subject" value={subject} onChangeText={setSubject} placeholder="What do you need help with?" /><Field label="Details" value={message} onChangeText={setMessage} multiline placeholder="Add the information HR needs" /><Button title="Submit HR request" busy={busy} onPress={() => void submit()} /></Card><BottomDrawer visible={categoryOpen} title="Request category" onClose={() => setCategoryOpen(false)}>{categories.map((item) => <DrawerOption key={item} title={item.charAt(0).toUpperCase() + item.slice(1)} selected={category === item} onPress={() => { setCategory(item); setCategoryOpen(false) }} />)}</BottomDrawer></>
}

function BankTaxRequestForm({ data, reload }: { data: EssBootstrap; reload: () => Promise<void> }) {
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [taxId, setTaxId] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const history = data.profileChangeRequests.filter(item => item.requestedFields.includes('bankInformation') || item.requestedFields.includes('taxInformation'))

  const submit = async () => {
    const bankValue = {
      ...(bankName.trim() ? { bankName: bankName.trim() } : {}),
      ...(accountNumber.trim() ? { accountNumber: accountNumber.trim() } : {}),
    }
    const taxValue = taxId.trim() ? { taxId: taxId.trim() } : null
    const changeCount = (Object.keys(bankValue).length > 0 ? 1 : 0) + (taxValue ? 1 : 0)

    if (!changeCount) return Alert.alert('Bank & tax', 'Enter at least one bank or tax value to change.')
    if (reason.trim().length < 3) return Alert.alert('Bank & tax', 'Add a short reason for this change request.')

    setBusy(true)
    try {
      await essApi.createProfileChangeRequest({
        changes: {
          ...(Object.keys(bankValue).length > 0 ? { bankInformation: bankValue } : {}),
          ...(taxValue ? { taxInformation: taxValue } : {}),
        },
        reason: reason.trim(),
      })
      setBankName('')
      setAccountNumber('')
      setTaxId('')
      setReason('')
      await reload()
      Alert.alert('Bank & tax', 'Change request submitted for approval.')
    } catch (error) {
      Alert.alert('Bank & tax', error instanceof Error ? error.message : 'Unable to submit change request')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <AppText style={s.pageTitle}>Bank & tax</AppText>
    <Card>
      <AppText style={s.cardTitle}>Current information</AppText>
      <Muted>Bank · {data.bankTax?.bankName || 'Not set'}</Muted>
      <Muted>Account · {data.bankTax?.accountLast4 ? `•••• ${data.bankTax.accountLast4}` : 'Not set'}</Muted>
      <Muted>Tax ID · {data.bankTax?.taxIdMasked || 'Not set'}</Muted>
    </Card>
    <Card>
      <View style={s.inlineNotice}><Ionicons name="shield-checkmark-outline" size={19} color={colors.textMuted} /><Muted style={s.flexOne}>Bank and tax changes are tracked requests. Current payroll data changes only after approval.</Muted></View>
      <Field label="New bank name" value={bankName} onChangeText={setBankName} />
      <Field label="New account number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="numeric" />
      <Field label="New tax ID" value={taxId} onChangeText={setTaxId} keyboardType="numeric" />
      <Field label="Reason" value={reason} onChangeText={setReason} multiline placeholder="Why is this change needed?" />
      <Button title="Submit change request" busy={busy} disabled={reason.trim().length < 3 || (!bankName.trim() && !accountNumber.trim() && !taxId.trim())} onPress={() => void submit()} />
    </Card>
    <ProfileChangeHistory items={history} empty="No bank or tax change requests yet." />
  </>
}

function EmergencyContactForm({ reload, onDone, contact, showTitle = true }: { reload: () => Promise<void>; onDone: () => void; contact?: EmergencyContact; showTitle?: boolean }) {
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
  return <>{showTitle ? <AppText style={s.pageTitle}>{contact ? 'Edit emergency contact' : 'Emergency contact'}</AppText> : null}<Card><Field label="Name" value={name} onChangeText={setName} /><Field label="Relationship" value={relationship} onChangeText={setRelationship} /><Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /><View style={s.switchRow}><View style={s.flexOne}><AppText>Primary contact</AppText><Muted>Use as the first person to contact.</Muted></View><Switch value={primary} onValueChange={setPrimary} trackColor={{ false: colors.surfaceStrong, true: colors.primary }} thumbColor={colors.surface} /></View><Button title={contact ? 'Save contact' : 'Add contact'} busy={busy} onPress={() => void submit()} /></Card></>
}

function LeaveRequestCard({ request, onPress }: { request: EssBootstrap['leaveRequests'][number]; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed && s.pressed]}>
    <Card>
      <View style={s.between}><View style={s.flexOne}><AppText style={s.cardTitle}>{request.type}</AppText><Muted>{request.startDate} – {request.endDate} · {request.days} day(s)</Muted></View><StatusPill value={request.status} /></View>
      <View style={s.infoRow}><AppText style={s.linkText}>View request</AppText><Ionicons name="chevron-forward" size={16} color={colors.accent} /></View>
    </Card>
  </Pressable>
}

function LeaveRequestDetail({ request, reload, onClose }: { request: EssBootstrap['leaveRequests'][number]; reload: () => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const canCancel = ['pending', 'submitted', 'pending_approval', 'approved'].includes(normalizeStatus(request.status))
  const cancel = () => Alert.alert('Cancel leave request', 'This will stop the current request. Continue?', [
    { text: 'Keep request', style: 'cancel' },
    {
      text: 'Cancel request',
      style: 'destructive',
      onPress: () => void (async () => {
        setBusy(true)
        try {
          await essApi.cancelLeave(request.id)
          await reload()
          onClose()
        } catch (error) {
          Alert.alert('Leave request', error instanceof Error ? error.message : 'Unable to cancel')
        } finally {
          setBusy(false)
        }
      })(),
    },
  ])
  return <>
    <View style={s.between}><View style={s.flexOne}><AppText style={s.pageTitle}>{request.type}</AppText><Muted>{request.startDate} – {request.endDate}</Muted></View><StatusPill value={request.status} /></View>
    <Card>
      <DetailRow label="Duration" value={`${request.days} day(s)`} />
      <DetailRow label="Start date" value={request.startDate} />
      <DetailRow label="End date" value={request.endDate} />
      <DetailRow label="Status" value={displayStatus(request.status)} last />
    </Card>
    {canCancel ? <Button title="Cancel request" secondary busy={busy} onPress={cancel} /> : null}
  </>
}

function AttendanceCorrectionCard({ request, onPress }: { request: EssBootstrap['attendanceCorrections'][number]; onPress: () => void }) {
  const requested = [
    request.requestedCheckIn ? `In ${formatDateTime(request.requestedCheckIn)}` : null,
    request.requestedCheckOut ? `Out ${formatDateTime(request.requestedCheckOut)}` : null,
  ].filter(Boolean).join(' · ')
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed && s.pressed]}>
    <Card>
      <View style={s.between}>
        <View style={s.flexOne}>
          <AppText style={s.cardTitle}>{request.workDate || 'Attendance correction'}</AppText>
          <Muted>{requested || 'Requested time correction'}</Muted>
        </View>
        <StatusPill value={request.status} />
      </View>
      {request.reason ? <Muted numberOfLines={2}>Reason · {request.reason}</Muted> : null}
      <View style={s.infoRow}><AppText style={s.linkText}>View request</AppText><Ionicons name="chevron-forward" size={16} color={colors.accent} /></View>
    </Card>
  </Pressable>
}

function AttendanceCorrectionDetail({ request }: { request: EssBootstrap['attendanceCorrections'][number] }) {
  return <>
    <View style={s.between}><View style={s.flexOne}><AppText style={s.pageTitle}>{request.workDate || 'Attendance correction'}</AppText><Muted>Submitted {formatDateTime(request.submittedAt)}</Muted></View><StatusPill value={request.status} /></View>
    <Card>
      <DetailRow label="Original clock in" value={formatDateTime(request.originalCheckIn)} />
      <DetailRow label="Requested clock in" value={formatDateTime(request.requestedCheckIn)} />
      <DetailRow label="Original clock out" value={formatDateTime(request.originalCheckOut)} />
      <DetailRow label="Requested clock out" value={formatDateTime(request.requestedCheckOut)} />
      <DetailRow label="Reason" value={request.reason || '—'} />
      <DetailRow label="Reviewer comment" value={request.reviewerComment || '—'} />
      <DetailRow label="Reviewed" value={formatDateTime(request.reviewedAt)} last />
    </Card>
  </>
}

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <View style={[s.detailRow, last && s.detailRowLast]}><Muted style={s.detailLabel}>{label}</Muted><AppText style={s.detailValue}>{value}</AppText></View>
}

function ProfileChangeRequestSummaryCard({ request, onPress }: { request: EssBootstrap['profileChangeRequests'][number]; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed && s.pressed]}>
    <Card>
      <View style={s.between}>
        <View style={s.flexOne}>
          <AppText style={s.cardTitle}>{request.title}</AppText>
          <Muted>{request.requestNumber || 'Request'} · {formatDateTime(request.submittedAt)}</Muted>
        </View>
        <StatusPill value={request.status} />
      </View>
      {request.reason ? <Muted numberOfLines={2}>Reason · {request.reason}</Muted> : null}
      <View style={s.infoRow}><AppText style={s.linkText}>View request</AppText><Ionicons name="chevron-forward" size={16} color={colors.accent} /></View>
    </Card>
  </Pressable>
}

function ProfileChangeRequestDetail({ request }: { request: EssBootstrap['profileChangeRequests'][number] }) {
  return <>
    <View style={s.between}>
      <View style={s.flexOne}>
        <AppText style={s.pageTitle}>{request.title}</AppText>
        <Muted>{request.requestNumber || 'Request'} · {formatDateTime(request.submittedAt)}</Muted>
      </View>
      <StatusPill value={request.status} />
    </View>
    <Card>
      <DetailRow label="Requested fields" value={request.requestedFields.length ? request.requestedFields.map(displayStatus).join(', ') : '—'} />
      <DetailRow label="Reason" value={request.reason || '—'} />
      <DetailRow label="Reviewer comment" value={request.reviewerComment || '—'} />
      <DetailRow label="Reviewed" value={formatDateTime(request.reviewedAt)} last />
    </Card>
  </>
}

function SupportRequestCard({ request, onPress }: { request: EssBootstrap['supportRequests'][number]; onPress?: () => void }) {
  const category = request.category ? request.category.charAt(0).toUpperCase() + request.category.slice(1) : 'General'
  const content = <Card>
    <View style={s.between}><View style={s.flexOne}><AppText style={s.cardTitle}>{request.subject}</AppText><Muted>{request.requestNumber || 'HR request'} · {category}{request.submittedAt ? ` · ${formatDateTime(request.submittedAt)}` : ''}</Muted></View><StatusPill value={request.status} /></View>
    {request.description ? <Muted numberOfLines={3}>{request.description}</Muted> : null}
    {onPress ? <View style={s.infoRow}><AppText style={s.linkText}>View request</AppText><Ionicons name="chevron-forward" size={16} color={colors.accent} /></View> : null}
  </Card>
  return onPress
    ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed && s.pressed]}>{content}</Pressable>
    : <View>{content}</View>
}

function SupportRequestDetail({ request, reload }: { request: EssBootstrap['supportRequests'][number]; reload: () => Promise<void> }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const closed = ['resolved', 'closed', 'cancelled', 'canceled'].includes(normalizeStatus(request.status))
  const reply = async () => {
    const body = message.trim()
    if (!body || busy || closed) return
    setBusy(true)
    try {
      await essApi.replyHrTicket(request.id, body)
      setMessage('')
      await reload()
    } catch (error) {
      Alert.alert('HR request', error instanceof Error ? error.message : 'Unable to send reply')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <View style={s.between}><View style={s.flexOne}><AppText style={s.pageTitle}>{request.subject}</AppText><Muted>{request.requestNumber} · {formatDateTime(request.submittedAt)}</Muted></View><StatusPill value={request.status} /></View>
    <View style={s.chatArea}>
      <View style={[s.chatBubble, s.chatBubbleOwn]}><AppText>{request.description || request.subject}</AppText><Muted>Submitted</Muted></View>
      {(request.activities || []).map(activity => {
        const own = normalizeStatus(activity.action).includes('requester')
        return <View key={activity.id} style={[s.chatBubble, own ? s.chatBubbleOwn : s.chatBubbleHr]}>
          {activity.message ? <AppText>{activity.message}</AppText> : <AppText>{displayStatus(activity.action)}</AppText>}
          <Muted>{own ? 'You' : 'HR'}{activity.createdAt ? ` · ${formatDateTime(activity.createdAt)}` : ''}</Muted>
        </View>
      })}
    </View>
    {closed ? <Card><Muted>This request is closed. Start a new HR request if you need more help.</Muted></Card> : <Card>
      <TextInput style={[s.input, s.multi]} value={message} onChangeText={setMessage} multiline placeholder="Reply to HR" placeholderTextColor={colors.textSubtle} />
      <Button title="Send reply" icon="send-outline" busy={busy} disabled={!message.trim()} onPress={() => void reply()} />
    </Card>}
  </>
}

export function DocumentsScreen({ data, loadMoreTick, reload }: { data: EssBootstrap; loadMoreTick: number; reload?: () => Promise<void> }) {
  const [opening, setOpening] = useState<string | null>(null)
  const [acknowledging, setAcknowledging] = useState<string | null>(null)
  const documentPage = useProgressiveCount(data.documents.length, loadMoreTick, 12)
  const visible = documentPage.count

  const open = async (id: string) => {
    if (opening || acknowledging) return
    setOpening(id)
    try {
      const { url } = await essApi.documentUrl(id)
      if (!/^https?:\/\//i.test(url) || !await Linking.canOpenURL(url)) throw new Error('The document cannot be opened on this device.')
      await Linking.openURL(url)
    } catch (error) {
      Alert.alert('Document', error instanceof Error ? error.message : 'Unable to open')
    } finally {
      setOpening(null)
    }
  }

  const acknowledge = (document: EssBootstrap['documents'][number]) => {
    if (acknowledging || opening) return
    Alert.alert(
      'Acknowledge document',
      'Confirm only after you have reviewed this document. Your acknowledgment will be recorded.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Acknowledge',
          onPress: () => void (async () => {
            setAcknowledging(document.id)
            try {
              await essApi.acknowledgeDocument(document.id)
              if (reload) await reload()
              Alert.alert('Document', 'Acknowledgment recorded.')
            } catch (error) {
              Alert.alert('Document', error instanceof Error ? error.message : 'Unable to acknowledge')
            } finally {
              setAcknowledging(null)
            }
          })(),
        },
      ],
    )
  }

  return <>
    <AppText style={s.pageTitle}>Documents</AppText>
    <Muted>Payslips, tax documents, policies and employee files.</Muted>
    <View style={s.spacer} />
    {data.documents.length === 0 ? <EmptyState icon="folder-open-outline" title="No documents available" /> : data.documents.slice(0, visible).map((document) => {
      const requiresAck = Boolean(document.requiresAcknowledgment && !document.acknowledgedAt)
      return <Card key={document.id}>
        <View style={s.between}>
          <View style={s.flexOne}>
            <AppText style={s.cardTitle}>{document.title}</AppText>
            <Muted>{document.subtitle || document.kind} · {document.issuedAt}</Muted>
            {requiresAck ? <AppText style={s.warningText}>Acknowledgment required</AppText> : document.acknowledgedAt ? <Muted>Acknowledged · {formatDateTime(document.acknowledgedAt)}</Muted> : null}
          </View>
          {opening === document.id || acknowledging === document.id ? <ActivityIndicator /> : <Ionicons name={requiresAck ? "alert-circle-outline" : "document-text-outline"} size={22} color={requiresAck ? colors.warning : colors.text} />}
        </View>
        <View style={s.documentActions}>
          <Button title="Open document" icon="open-outline" secondary disabled={Boolean(opening || acknowledging)} busy={opening === document.id} onPress={() => void open(document.id)} />
          {requiresAck ? <Button title="Acknowledge" icon="checkmark-circle-outline" disabled={Boolean(opening || acknowledging)} busy={acknowledging === document.id} onPress={() => acknowledge(document)} /> : null}
        </View>
      </Card>
    })}
    <PaginationFooter visible={visible} total={data.documents.length} onLoadMore={documentPage.loadMore} />
  </>
}

export function AccountScreen({ data, account, appIdentity, reload, onSignOut, loadMoreTick, section, onSectionChange, onFullPageChange }: { data: EssBootstrap; account?: AccountIdentity | null; appIdentity?: AccountApplicationIdentity | null; reload: () => Promise<void>; onSignOut: () => void; loadMoreTick: number; section: AccountSection; onSectionChange: (section: AccountSection) => void; onFullPageChange?: (active: boolean) => void }) {
  const confirmSignOut = () => Alert.alert('Sign out', 'Sign out of Obsi People on this device?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: onSignOut }])

  useEffect(() => {
    onFullPageChange?.(section !== 'menu')
  }, [section, onFullPageChange])

  const openSection = (next: AccountSection) => {
    onFullPageChange?.(next !== 'menu')
    onSectionChange(next)
  }

  useEffect(() => {
    if (section === 'menu') return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      openSection('menu')
      return true
    })
    return () => subscription.remove()
  }, [section])

  if (section !== 'menu') return <AccountSubpage section={section} setSection={openSection} data={data} account={account} reload={reload} loadMoreTick={loadMoreTick} />
  const displayName = account?.name || data.employee.name
  return <>
    <AppText style={s.pageTitle}>Account</AppText>
    <Card style={s.accountHero}><View style={s.accountIdentityRow}><Avatar imageUrl={account?.imageUrl || data.employee.avatarUrl} name={displayName} size={58} /><View style={s.flexOne}><AppText style={s.accountName}>{displayName}</AppText><Muted>{account?.email || data.profile?.personalEmail || data.employee.employeeId}</Muted><Muted>{data.employee.position} · {data.employee.department}</Muted></View></View><Muted>Identity from Outborn Account · Employee data from {appIdentity?.name || 'Obsi People'}</Muted></Card>
    <View style={s.menuList}>
      <MenuItem icon="person-outline" title="My profile" subtitle="Personal and employee information" onPress={() => openSection('profile')} />
      <MenuItem icon="card-outline" title="Bank & tax" subtitle="Bank account and tax identification" onPress={() => openSection('bank-tax')} />
      <MenuItem icon="chatbubbles-outline" title="Talk to HR" subtitle="Open HR support chat" onPress={() => openSection('hr-chat')} />
      <MenuItem icon="calendar-outline" title="Calendar" subtitle="Shifts and upcoming work schedule" onPress={() => openSection('calendar')} />
      <MenuItem icon="notifications-outline" title="Notifications" subtitle={`${data.employee.unreadNotifications || 0} unread`} onPress={() => openSection('notifications')} />
      <MenuItem icon="heart-outline" title="Benefits" subtitle="Employee benefits and coverage" onPress={() => openSection('benefits')} />
      <MenuItem icon="people-outline" title="Emergency contacts" subtitle="Add, edit and remove contacts" onPress={() => openSection('contacts')} />
      <MenuItem icon="shield-checkmark-outline" title="Security" subtitle="Biometric app lock" onPress={() => openSection('security')} />
    </View>
    <Button title="Sign out" icon="log-out-outline" secondary onPress={confirmSignOut} />
    <Muted style={s.version}>{appBuildLabel}</Muted>
  </>
}

function AccountSubpage({ section, setSection, data, account, reload, loadMoreTick }: { section: AccountSection; setSection: (value: AccountSection) => void; data: EssBootstrap; account?: AccountIdentity | null; reload: () => Promise<void>; loadMoreTick: number }) {
  return <><Back label="Account" onPress={() => setSection('menu')} />{section === 'profile' ? <ProfilePage data={data} account={account} reload={reload} /> : null}{section === 'bank-tax' ? <BankTaxRequestForm data={data} reload={reload} /> : null}{section === 'hr-chat' ? <HrChatPage data={data} reload={reload} /> : null}{section === 'calendar' ? <CalendarPage data={data} loadMoreTick={loadMoreTick} /> : null}{section === 'notifications' ? <NotificationsPage data={data} reload={reload} loadMoreTick={loadMoreTick} /> : null}{section === 'benefits' ? <BenefitsPage data={data} /> : null}{section === 'contacts' ? <ContactsPage data={data} reload={reload} /> : null}{section === 'security' ? <SecurityPage /> : null}</>
}

function ProfilePage({ data, account, reload }: { data: EssBootstrap; account?: AccountIdentity | null; reload: () => Promise<void> }) {
  const [preferredName, setPreferredName] = useState(data.profile?.preferredName || '')
  const [phone, setPhone] = useState(data.profile?.phone || '')
  const [address, setAddress] = useState(data.profile?.address || '')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const history = data.profileChangeRequests.filter(item => item.requestedFields.some(field => ['preferredName', 'phone', 'address'].includes(field)))
  const changed = preferredName.trim() !== (data.profile?.preferredName || '').trim()
    || phone.trim() !== (data.profile?.phone || '').trim()
    || address.trim() !== (data.profile?.address || '').trim()

  const submit = async () => {
    if (!changed) return Alert.alert('My profile', 'Change at least one profile field before submitting.')
    if (reason.trim().length < 3) return Alert.alert('My profile', 'Add a short reason for this change request.')

    const changes: Parameters<typeof essApi.createProfileChangeRequest>[0]['changes'] = {}
    if (preferredName.trim() !== (data.profile?.preferredName || '').trim()) {
      changes.preferredName = preferredName.trim()
    }
    if (phone.trim() !== (data.profile?.phone || '').trim()) {
      changes.phone = phone.trim()
    }
    if (address.trim() !== (data.profile?.address || '').trim()) {
      changes.address = { formatted: address.trim() }
    }

    setBusy(true)
    try {
      await essApi.createProfileChangeRequest({ changes, reason: reason.trim() })
      setPreferredName(data.profile?.preferredName || '')
      setPhone(data.profile?.phone || '')
      setAddress(data.profile?.address || '')
      setReason('')
      await reload()
      Alert.alert('My profile', 'Change request submitted for approval.')
    } catch (error) {
      Alert.alert('My profile', error instanceof Error ? error.message : 'Unable to submit profile change request')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <AppText style={s.pageTitle}>My profile</AppText>
    <Card>
      <Muted>Outborn Account</Muted>
      <AppText style={s.cardTitle}>{account?.name || data.employee.name}</AppText>
      <Muted>{account?.email || 'Account email unavailable'}</Muted>
      <Muted>Account email is managed by Outborn Account.</Muted>
    </Card>
    <Card>
      <View style={s.inlineNotice}><Ionicons name="shield-checkmark-outline" size={19} color={colors.textMuted} /><Muted style={s.flexOne}>These profile changes are submitted for approval and stay visible in change history.</Muted></View>
      <Field label="Preferred name" value={preferredName} onChangeText={setPreferredName} />
      <Field label="Personal phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Address" value={address} onChangeText={setAddress} multiline />
      <Field label="Reason" value={reason} onChangeText={setReason} multiline placeholder="Why is this change needed?" />
      <Button title="Submit change request" busy={busy} disabled={!changed || reason.trim().length < 3} onPress={() => void submit()} />
    </Card>
    <Card><AppText style={s.cardTitle}>Employee information</AppText><Muted>Employee ID · {data.employee.employeeId}</Muted><Muted>{data.employee.position} · {data.employee.department}</Muted></Card>
    <ProfileChangeHistory items={history} empty="No profile change requests yet." />
  </>
}

function ProfileChangeHistory({ items, empty }: { items: EssBootstrap['profileChangeRequests']; empty: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? items.find(item => item.id === selectedId) : undefined

  if (items.length === 0) return <Card><AppText style={s.cardTitle}>Change history</AppText><Muted>{empty}</Muted></Card>
  return <>
    <Card>
      <AppText style={s.cardTitle}>Change history</AppText>
      {items.slice(0, 8).map(item => <Pressable key={item.id} accessibilityRole="button" style={({ pressed }) => [s.historyRow, pressed && s.controlPressed]} onPress={() => setSelectedId(item.id)}>
        <View style={s.flexOne}>
          <AppText>{item.title}</AppText>
          <Muted>{item.requestNumber || 'Request'} · {formatDateTime(item.submittedAt)}</Muted>
          {item.reviewerComment ? <Muted>Reviewer · {item.reviewerComment}</Muted> : null}
        </View>
        <View style={s.historyAction}>
          <StatusPill value={item.status} />
          <Ionicons name="chevron-forward" size={17} color={colors.textSubtle} />
        </View>
      </Pressable>)}
    </Card>
    <FullScreenTaskModal visible={Boolean(selected)} contextLabel="Account change" onClose={() => setSelectedId(null)}>
      {selected ? <ProfileChangeRequestDetail request={selected} /> : null}
    </FullScreenTaskModal>
  </>
}

function HrChatPage({ data, reload }: { data: EssBootstrap; reload: () => Promise<void> }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const history = data.supportRequests.filter((item) => item.category === 'chat').slice(0, 20)
  const selected = selectedId ? history.find(item => item.id === selectedId) : undefined

  const send = async () => {
    const body = message.trim()
    if (!body) return
    setBusy(true)
    try {
      await essApi.createHrTicket('ESS chat', body, 'chat')
      setMessage('')
      await reload()
    } catch (error) {
      Alert.alert('Talk to HR', error instanceof Error ? error.message : 'Unable to send')
    } finally {
      setBusy(false)
    }
  }

  return <><AppText style={s.pageTitle}>Talk to HR</AppText><Muted>Start a tracked conversation or open an existing request to continue it.</Muted>
    <View style={s.spacer} />
    {history.length === 0 ? <EmptyState icon="chatbubble-ellipses-outline" title="No HR conversations yet" subtitle="Send a message below to start one." /> : history.map(item => <SupportRequestCard key={item.id} request={item} onPress={() => setSelectedId(item.id)} />)}
    <Card><AppText style={s.cardTitle}>New conversation</AppText><TextInput style={[s.input, s.multi]} value={message} onChangeText={setMessage} multiline placeholder="Message HR" placeholderTextColor={colors.textSubtle} /><Button title="Send" icon="send-outline" busy={busy} disabled={!message.trim()} onPress={() => void send()} /></Card>
    <FullScreenTaskModal visible={Boolean(selected)} contextLabel="Talk to HR" onClose={() => setSelectedId(null)}>
      {selected ? <SupportRequestDetail request={selected} reload={reload} /> : null}
    </FullScreenTaskModal>
  </>
}

function CalendarPage({ data, loadMoreTick }: { data: EssBootstrap; loadMoreTick: number }) {
  const schedulePage = useProgressiveCount(data.schedule.length, loadMoreTick, 20)
  const visible = schedulePage.count
  return <><AppText style={s.pageTitle}>Calendar</AppText><Muted>Your assigned shifts and work locations.</Muted><View style={s.spacer} />{data.schedule.length === 0 ? <EmptyState icon="calendar-outline" title="No schedule published" /> : data.schedule.slice(0, visible).map((item) => <Card key={item.id}><View style={s.between}><View style={s.flexOne}><AppText style={s.cardTitle}>{item.date}</AppText><Muted>{item.startTime || '—'} – {item.endTime || '—'}</Muted>{item.location ? <Muted>{item.location}</Muted> : null}</View><StatusPill value={item.status} /></View></Card>)}<PaginationFooter visible={visible} total={data.schedule.length} onLoadMore={schedulePage.loadMore} /></>
}

function NotificationsPage({ data, reload, loadMoreTick }: { data: EssBootstrap; reload: () => Promise<void>; loadMoreTick: number }) {
  const [busy, setBusy] = useState<string | null>(null)
  const notificationPage = useProgressiveCount(data.notifications.length, loadMoreTick, 15)
  const visible = notificationPage.count
  const read = async (id: string) => { setBusy(id); try { await essApi.markNotificationRead(id); await reload() } catch (error) { Alert.alert('Notifications', error instanceof Error ? error.message : 'Unable to update') } finally { setBusy(null) } }
  const readAll = async () => { setBusy('all'); try { await essApi.markAllNotificationsRead(); await reload() } catch (error) { Alert.alert('Notifications', error instanceof Error ? error.message : 'Unable to update') } finally { setBusy(null) } }

  return <>
    <View style={s.between}>
      <AppText style={s.pageTitle}>Notifications</AppText>
      {data.notifications.some((item) => !item.read) ? <Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={() => void readAll()}><AppText style={s.linkText}>Mark all read</AppText></Pressable> : null}
    </View>
    {data.notifications.length === 0 ? <EmptyState icon="notifications-outline" title="No notifications" /> : data.notifications.slice(0, visible).map((item) => {
      const content = <Card style={!item.read ? s.unreadCard : undefined}>
        <View style={s.between}>
          <View style={s.flexOne}><AppText style={s.cardTitle}>{item.title}</AppText>{item.body ? <Muted>{item.body}</Muted> : null}<Muted>{formatDateTime(item.createdAt)}</Muted></View>
          {busy === item.id ? <ActivityIndicator /> : !item.read ? <View style={s.unreadDot} /> : <Ionicons name="checkmark" size={18} color={colors.textSubtle} />}
        </View>
      </Card>
      return item.read
        ? <View key={item.id}>{content}</View>
        : <Pressable key={item.id} accessibilityRole="button" disabled={Boolean(busy)} onPress={() => void read(item.id)}>{content}</Pressable>
    })}
    <PaginationFooter visible={visible} total={data.notifications.length} onLoadMore={notificationPage.loadMore} />
  </>
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

  const content = (item: EssBootstrap['benefits'][number]) => <Card>
    <View style={s.between}>
      <View style={s.flexOne}>
        <AppText style={s.cardTitle}>{item.name}</AppText>
        {item.description ? <Muted>{item.description}</Muted> : null}
        {item.provider ? <Muted>{item.provider}</Muted> : null}
        {!item.url ? <Muted>No external benefit link has been provided.</Muted> : null}
      </View>
      {item.url ? <Ionicons name="open-outline" size={20} color={colors.textMuted} /> : <StatusPill value={item.status || 'available'} />}
    </View>
  </Card>

  return <><AppText style={s.pageTitle}>Benefits</AppText>{data.benefits.length === 0 ? <EmptyState icon="heart-outline" title="No benefits published yet" subtitle="Benefits configured by HR will appear here." /> : data.benefits.map((item) => item.url ? <Pressable key={item.id} accessibilityRole="link" onPress={() => void open(item.url!)}>{content(item)}</Pressable> : <View key={item.id}>{content(item)}</View>)}</>
}

function ContactsPage({ data, reload }: { data: EssBootstrap; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<EmergencyContact | 'new' | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const remove = (contact: EmergencyContact) => {
    if (busyId) return
    Alert.alert('Remove contact', `Remove ${contact.name}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void (async () => {
          setBusyId(contact.id)
          try {
            await essApi.deleteEmergencyContact(contact.id)
            await reload()
          } catch (error) {
            Alert.alert('Emergency contacts', error instanceof Error ? error.message : 'Unable to remove')
          } finally {
            setBusyId(null)
          }
        })(),
      },
    ])
  }
  return <>
    <View style={s.between}><AppText style={s.pageTitle}>Emergency contacts</AppText><Pressable accessibilityRole="button" accessibilityLabel="Add emergency contact" style={({ pressed }) => [s.iconAction, pressed && s.controlPressed]} onPress={() => setEditing('new')}><Ionicons name="add" size={24} color={colors.text} /></Pressable></View>
    {data.emergencyContacts.length === 0 ? <EmptyState icon="people-outline" title="No emergency contacts" subtitle="Add at least one person HR can contact in an emergency." /> : data.emergencyContacts.map((contact) => <Card key={contact.id}><View style={s.between}><Pressable accessibilityRole="button" disabled={Boolean(busyId)} style={s.flexOne} onPress={() => setEditing(contact)}><AppText style={s.cardTitle}>{contact.name}{contact.primary ? ' · Primary' : ''}</AppText><Muted>{contact.relationship} · {contact.phone}</Muted></Pressable><View style={s.inlineActions}><Pressable accessibilityRole="button" accessibilityLabel={`Edit ${contact.name}`} disabled={Boolean(busyId)} style={s.inlineIconAction} onPress={() => setEditing(contact)}><Ionicons name="create-outline" size={20} color={colors.text} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${contact.name}`} disabled={Boolean(busyId)} style={s.inlineIconAction} onPress={() => remove(contact)}>{busyId === contact.id ? <ActivityIndicator size="small" color={colors.danger} /> : <Ionicons name="trash-outline" size={20} color={colors.danger} />}</Pressable></View></View></Card>)}
    <FullScreenTaskModal visible={editing !== null} contextLabel="Emergency contacts" onClose={() => setEditing(null)}>
      {editing ? <EmergencyContactForm contact={editing === 'new' ? undefined : editing} reload={reload} showTitle={false} onDone={() => setEditing(null)} /> : null}
    </FullScreenTaskModal>
  </>
}

function SecurityPage() {
  const [supported, setSupported] = useState<boolean | null>(null), [enabled, setEnabled] = useState(false), [busy, setBusy] = useState(false)
  useEffect(() => {
    void (async () => {
      try {
        const available = await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync()
        const storedEnabled = (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === '1'
        if (!available && storedEnabled) await SecureStore.deleteItemAsync(BIOMETRIC_KEY)
        setSupported(available)
        setEnabled(available && storedEnabled)
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
function Avatar({ imageUrl, name, size = 44 }: { imageUrl?: string; name: string; size?: number }) { const style = { width: size, height: size, borderRadius: size / 2 }; return imageUrl ? <Image source={{ uri: imageUrl }} style={[style, s.avatarImage]} /> : <View style={[style, s.avatarFallback]}><AppText style={s.avatarInitial}>{(name.trim().slice(0, 1) || '?').toUpperCase()}</AppText></View> }
function MenuItem({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) { return <Pressable accessibilityRole="button" style={({ pressed }) => [s.menuItem, pressed && s.pressed]} onPress={onPress}><View style={s.menuIcon}><Ionicons name={icon} size={22} color={colors.text} /></View><View style={s.flexOne}><AppText style={s.cardTitle}>{title}</AppText><Muted>{subtitle}</Muted></View><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></Pressable> }
function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) { const { label, style, ...inputProps } = props; return <View style={s.field}><Muted style={s.fieldLabel}>{label}</Muted><TextInput {...inputProps} placeholderTextColor={colors.textSubtle} style={[s.input, inputProps.multiline && s.multi, style]} /></View> }
function EmptyState({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) { return <View style={s.empty}><Ionicons name={icon} size={30} color={colors.textMuted} /><AppText style={s.cardTitle}>{title}</AppText>{subtitle ? <Muted style={s.centerText}>{subtitle}</Muted> : null}</View> }

const s = StyleSheet.create({
  text: { color: colors.text, fontSize: typography.base, lineHeight: 20 },
  muted: { color: colors.textMuted, lineHeight: 20 },
  pageTitle: { color: colors.text, fontSize: typography.title, lineHeight: 33, fontWeight: '700', marginBottom: spacing.xxs, letterSpacing: -0.7 },
  kicker: { color: colors.primary, fontSize: typography.xs, lineHeight: 15, fontWeight: '600', letterSpacing: 0.8 },
  section: { color: colors.text, fontSize: typography.xl, lineHeight: 23, fontWeight: '600', marginTop: 20, marginBottom: spacing.xs, letterSpacing: -0.25 },

  card: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radii.lg, gap: spacing.xs, marginBottom: spacing.xs },
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

  drawerBackdrop: { flex: 1, backgroundColor: colors.overlay },
  // Keep the dismiss target physically above the sheet instead of layering an
  // absolute Pressable behind it. This prevents Android hit-testing from
  // swallowing taps on DrawerOption rows.
  drawerBackdropDismiss: { flex: 1, width: '100%' },
  drawerSafe: { width: '100%', maxHeight: '88%', backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden', elevation: 8 },
  drawer: { width: '100%', maxHeight: '100%', backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingTop: 10 },
  drawerHandle: { width: 36, height: 4, alignSelf: 'center', borderRadius: radii.pill, backgroundColor: colors.borderStrong, marginBottom: spacing.xs },
  drawerHeader: { minHeight: 54, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
  modalHeader: { minHeight: 60, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, backgroundColor: colors.surface },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  modalContext: { flex: 1, minWidth: 0, fontSize: typography.xl, lineHeight: 23, fontWeight: '700', letterSpacing: -0.3, textAlign: 'left' },
  modalHeaderSpacer: { width: 36, height: 36 },
  modalContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },
  inlineIconAction: { width: controls.touch, height: controls.touch, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },

  button: { minHeight: controls.button, backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  largeButton: { minHeight: 58, borderRadius: radii.sm, marginVertical: spacing.xs },
  largeButtonText: { fontSize: typography.lg },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  buttonText: { color: colors.primaryText, fontSize: typography.base, lineHeight: 18, fontWeight: '600' },
  secondaryButtonText: { color: colors.text },

  attentionCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.infoSurface, borderWidth: 1, borderColor: colors.infoBorder, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.xs },
  attentionIcon: { width: 42, height: 42, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.selected },
  announcementWrap: { gap: spacing.xs },
  announcementCard: { backgroundColor: colors.infoSurface },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  quick: { flexBasis: '48%', flexGrow: 1, minHeight: 82, backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radii.lg, justifyContent: 'space-between', gap: spacing.sm },
  quickTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickIcon: { width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.selected },
  quickLabel: { color: colors.text, fontSize: typography.base, lineHeight: 18, fontWeight: '600' },

  metricRow: { flexDirection: 'row', gap: spacing.xs },
  metricBlock: { flex: 1, backgroundColor: colors.surfaceMuted, padding: spacing.sm, borderRadius: radii.sm },
  metric: { color: colors.text, fontSize: 26, lineHeight: 31, fontWeight: '700', letterSpacing: -0.6 },
  chartGroup: { gap: spacing.sm, marginTop: spacing.xxs },
  chartItem: { gap: 6 },
  chartValue: { fontWeight: '600', fontSize: typography.sm },
  chartTrack: { height: 6, backgroundColor: colors.surfaceStrong, borderRadius: radii.pill, overflow: 'hidden' },
  chartFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radii.pill },

  attendanceHero: { padding: spacing.md, borderRadius: radii.lg },
  attendanceTitle: { color: colors.text, fontSize: typography.lg, lineHeight: 22, fontWeight: '700', letterSpacing: -0.2 },
  attendanceIconWrap: { width: 42, height: 42, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  attendanceIconDefault: { backgroundColor: colors.selected },
  attendanceIconSuccess: { backgroundColor: colors.successSurface },
  attendanceIconWarning: { backgroundColor: colors.warningSurface },
  shiftCard: { marginTop: spacing.xs },
  successCard: { backgroundColor: colors.successSurface },
  warningCard: { backgroundColor: colors.warningSurface },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  inlineNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, padding: spacing.sm, borderRadius: radii.sm, backgroundColor: colors.warningSurface, marginBottom: spacing.xs },
  documentActions: { marginTop: spacing.sm, gap: spacing.xs },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, borderRadius: radii.sm, paddingHorizontal: spacing.xs },
  historyAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  warningText: { color: colors.warning, fontSize: typography.sm, lineHeight: 18, fontWeight: '600', marginTop: 4 },
  status: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  statusSuccess: { backgroundColor: colors.successSurface },
  statusWarning: { backgroundColor: colors.warningSurface },
  statusDanger: { backgroundColor: colors.dangerSurface },
  statusText: { color: colors.textMuted, fontSize: typography.xs, lineHeight: 15, textTransform: 'capitalize', fontWeight: '600' },
  statusTextSuccess: { color: colors.success },
  statusTextWarning: { color: colors.warning },
  statusTextDanger: { color: colors.danger },
  loadMore: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },

  back: { minHeight: controls.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', marginBottom: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },

  field: { gap: 6, marginBottom: spacing.xs },
  fieldLabel: { fontSize: typography.sm, lineHeight: 16, fontWeight: '500', color: colors.textMuted },
  input: { minHeight: controls.input, color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm, paddingHorizontal: 11, paddingVertical: 10, fontSize: 16, lineHeight: 21 },
  inputPressable: { minHeight: controls.input, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  multi: { minHeight: 96, textAlignVertical: 'top' },

  danger: { color: colors.danger, fontWeight: '600', paddingVertical: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  empty: { minHeight: 136, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radii.lg, marginBottom: spacing.xs, padding: spacing.lg },
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
  chatBubble: { maxWidth: '88%', paddingHorizontal: spacing.sm, paddingVertical: 10, borderRadius: radii.lg },
  chatBubbleOwn: { alignSelf: 'flex-end', backgroundColor: colors.infoSurface },
  chatBubbleHr: { alignSelf: 'flex-start', backgroundColor: colors.surfaceMuted },
  unreadCard: { backgroundColor: colors.infoSurface, borderColor: colors.infoBorder },
  unreadDot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.accent },
  linkText: { color: colors.accent, fontWeight: '600', fontSize: typography.sm, lineHeight: 16 },
  inlineCorrection: { minHeight: controls.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', marginTop: spacing.xxs },
  detailRow: { minHeight: 52, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { fontSize: typography.xs, lineHeight: 15, fontWeight: '600' },
  detailValue: { marginTop: 3, fontSize: typography.base, lineHeight: 20, fontWeight: '500' },
  iconAction: { width: controls.touch, height: controls.touch, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  inlineActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
})
