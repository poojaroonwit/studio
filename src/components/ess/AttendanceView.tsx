"use client";

import * as React from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coffee,
  Home,
  LogOut,
  MapPin,
  TimerReset,
  TriangleAlert,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState, Section, StatusBadge } from './EssShared';
import type { EssDashboard } from './ess-types';
import { dateValue, statusLabel, stringValue, timeValue } from './ess-types';

function localDateKey(value = new Date()) {
  return value.toLocaleDateString('en-CA');
}

export function AttendanceView({
  mode,
  data,
  submitting,
  mutate,
}: {
  mode: 'history' | 'check-in';
  data: EssDashboard;
  submitting: boolean;
  mutate: (url: string, method: 'POST' | 'PATCH', body: unknown, successMessage: string) => Promise<unknown>;
}) {
  const today = data.attendance.find(row => String(row.work_date || '').slice(0, 10) === localDateKey()) || null;
  const clockedIn = Boolean(today?.clock_in && !today?.clock_out);
  const onBreak = Boolean(today?.open_break_started_at);
  const complete = Boolean(today?.clock_in && today?.clock_out);
  const todayShift = data.shifts.find(row => String(row.shift_date || '').slice(0, 10) === localDateKey());
  const [workLocation, setWorkLocation] = React.useState<'office' | 'remote' | 'field'>('office');
  const [note, setNote] = React.useState('');
  const [currentTime, setCurrentTime] = React.useState(() => new Date());
  const [checkInOpen, setCheckInOpen] = React.useState(false);
  const [locationError, setLocationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const liveWorkedHours = React.useMemo(() => {
    if (!today?.clock_in) return Number(today?.hours_worked || 0);
    const end = today.clock_out ? new Date(String(today.clock_out)) : currentTime;
    const elapsed = Math.max(0, end.getTime() - new Date(String(today.clock_in)).getTime()) / 3_600_000;
    return Math.max(0, elapsed - Number(today.break_minutes || 0) / 60);
  }, [currentTime, today]);

  const nextAction = complete
    ? null
    : !clockedIn
      ? 'clock_in' as const
      : onBreak
        ? 'end_break' as const
        : 'start_break' as const;

  const attendanceAction = async (action: 'clock_in' | 'clock_out' | 'start_break' | 'end_break') => {
    setLocationError(null);
    const body: Record<string, unknown> = {
      action,
      workLocation,
      note: note || null,
      idempotencyKey: crypto.randomUUID(),
    };
    if (action === 'clock_in' || action === 'clock_out') {
      if (!navigator.geolocation) {
        setLocationError('This device does not support GPS location. Use a supported device to check in or out.');
        return;
      }
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }));
        body.latitude = position.coords.latitude;
        body.longitude = position.coords.longitude;
        body.locationAccuracyMeters = position.coords.accuracy;
      } catch {
        setLocationError('Unable to get your GPS location. Enable precise location access and try again.');
        return;
      }
    }
    const result = await mutate('/api/ess/attendance', 'POST', body, `${action.replace(/_/g, ' ')} recorded.`);
    if (result) setNote('');
  };

  const stateLabel = complete
    ? 'Workday complete'
    : onBreak
      ? 'Break in progress'
      : clockedIn
        ? 'You are working'
        : 'Ready to begin';
  const nextLabel = nextAction === 'clock_in' ? 'Check in' : nextAction === 'start_break' ? 'Start break' : 'End break';

  if (mode === 'history') {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Section title="My attendance" description="Review your recorded attendance, working hours, and exceptions.">
          {data.attendance.length ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Check in</th>
                    <th className="px-4 py-3 font-semibold">Check out</th>
                    <th className="px-4 py-3 font-semibold">Worked</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.attendance.map(row => (
                    <tr key={String(row.id)} className="hover:bg-muted/25">
                      <td className="px-4 py-3 font-medium">{dateValue(row.work_date)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 tabular-nums">{timeValue(row.clock_in)}</td>
                      <td className="px-4 py-3 tabular-nums">{timeValue(row.clock_out)}</td>
                      <td className="px-4 py-3 tabular-nums">{Number(row.hours_worked || 0).toFixed(2)}h</td>
                      <td className="px-4 py-3">{statusLabel(row.work_location || 'Not recorded')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No attendance records" description="Your completed and in-progress workdays will appear here after you check in." />
          )}
        </Section>

        <Section title="Upcoming schedule" description="Your assigned shifts for the coming days.">
          {data.shifts.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {data.shifts.slice(0, 8).map(shift => (
                <div key={String(shift.id)} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{dateValue(shift.shift_date)}</p><StatusBadge status={shift.status} /></div>
                  <p className="mt-2 text-xs text-muted-foreground">{stringValue(shift.start_time)}–{stringValue(shift.end_time)}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{stringValue(shift.schedule_name, 'Assigned shift')}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No assigned shifts" description="Contact your manager if a schedule is expected." />
          )}
        </Section>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setCheckInOpen(true)}>Open check-in</Button>
          <Button asChild variant="link"><a href="/ess/attendance-corrections">Request a correction</a></Button>
        </div>

        <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
          <DialogContent className="max-h-[92dvh] max-w-6xl gap-0 overflow-hidden p-0">
            <DialogHeader className="border-b border-border px-5 py-4 pr-14 sm:px-6">
              <DialogTitle>My check-in</DialogTitle>
              <DialogDescription>Record today&apos;s attendance without leaving your attendance history.</DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto p-4 sm:p-6">
              <AttendanceView mode="check-in" data={data} submitting={submitting} mutate={mutate} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.65fr]">
        <Section title="Today" description="The server records the authoritative timestamp for every action.">
          <div className="rounded-lg border border-border bg-gradient-to-br from-indigo-50/80 to-background p-4 sm:p-5 dark:from-indigo-950/25">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
                  {currentTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </p>
                <h3 className="mt-3 text-xl font-semibold">{stateLabel}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {todayShift
                    ? `${stringValue(todayShift.start_time)}–${stringValue(todayShift.end_time)} · ${stringValue(todayShift.schedule_name, 'Assigned shift')}`
                    : 'No assigned shift is visible for today.'}
                </p>
              </div>
              <StatusBadge status={today?.status || (clockedIn ? 'present' : 'not_started')} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-indigo-100 pt-4 sm:grid-cols-4 dark:border-indigo-900/50">
              <MiniMetric label="Check in" value={timeValue(today?.clock_in)} />
              <MiniMetric label="Check out" value={timeValue(today?.clock_out)} />
              <MiniMetric label="Worked" value={`${liveWorkedHours.toFixed(2)}h`} />
              <MiniMetric label="Location" value={statusLabel(today?.work_location || workLocation)} />
            </div>
          </div>

          {!clockedIn && !complete && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="attendance-location">Work location</Label>
                <select id="attendance-location" value={workLocation} onChange={event => setWorkLocation(event.target.value as typeof workLocation)} className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="office">Office</option><option value="remote">Work from home</option><option value="field">Field / off-site</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="attendance-note">Note (optional)</Label>
                <Input id="attendance-note" value={note} onChange={event => setNote(event.target.value)} placeholder="Add context for today" />
              </div>
            </div>
          )}

          <div className="sticky bottom-16 mt-4 rounded-lg border border-border bg-background/95 p-3 shadow-sm backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            {locationError && <div role="alert" className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{locationError}</div>}
            {complete ? (
              <div className="flex min-h-12 items-center justify-center rounded-md bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                <CheckCircle2 className="mr-2 h-5 w-5" />Checked out at {timeValue(today?.clock_out)}
              </div>
            ) : nextAction ? (
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Button size="lg" className="min-h-12 text-base" disabled={submitting} onClick={() => void attendanceAction(nextAction)}>
                  {nextAction === 'clock_in' ? <MapPin className="mr-2 h-5 w-5" /> : <Coffee className="mr-2 h-5 w-5" />}
                  {nextLabel}<ArrowRight className="ml-auto h-5 w-5" />
                </Button>
                {clockedIn && !onBreak && (
                  <Button size="lg" variant="outline" className="min-h-12" disabled={submitting} onClick={() => void attendanceAction('clock_out')}>
                    <LogOut className="mr-2 h-4 w-4" />Check out
                  </Button>
                )}
              </div>
            ) : null}
          </div>

          {!complete && todayShift && !today?.clock_in && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Check in only from your own account and approved location. Location is captured for this event only; continuous tracking is not used.
            </div>
          )}
        </Section>

        <Section title="Today’s timeline" description="Current shift and recorded milestones.">
          <ol className="border-l border-border pl-5">
            <TimelineMilestone label="Scheduled start" value={todayShift ? stringValue(todayShift.start_time) : 'No shift'} active={!today?.clock_in} icon={CalendarDays} />
            {Boolean(today?.clock_in) && <TimelineMilestone label="Checked in" value={timeValue(today?.clock_in)} active={clockedIn && !onBreak} icon={MapPin} />}
            {Number(today?.break_minutes || 0) > 0 && <TimelineMilestone label="Break time" value={`${Number(today?.break_minutes || 0)} minutes`} icon={Coffee} />}
            {onBreak && <TimelineMilestone label="Break started" value={timeValue(today?.open_break_started_at)} active icon={Coffee} />}
            {Boolean(today?.clock_out) && <TimelineMilestone label="Checked out" value={timeValue(today?.clock_out)} active icon={LogOut} />}
            {!today?.clock_out && <TimelineMilestone label="Scheduled end" value={todayShift ? stringValue(todayShift.end_time) : 'Not set'} icon={Clock} />}
          </ol>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <MiniMetric label="Breaks" value={`${Number(today?.break_minutes || 0)}m`} />
            <MiniMetric label="Overtime" value={`${Number(today?.overtime_hours || 0).toFixed(2)}h`} />
          </div>
        </Section>
      </div>

      <Section title="Upcoming schedule" description="Roster planning and schedule changes remain in the Shift module.">
        {data.shifts.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {data.shifts.slice(0, 8).map(shift => (
              <div key={String(shift.id)} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{dateValue(shift.shift_date)}</p><StatusBadge status={shift.status} /></div>
                <p className="mt-2 text-xs text-muted-foreground">{stringValue(shift.start_time)}–{stringValue(shift.end_time)}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{stringValue(shift.schedule_name, 'Assigned shift')}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No assigned shifts" description="Contact your manager if a schedule is expected." action={<Button asChild variant="outline"><a href="/workforce/attendance?view=roster">View roster</a></Button>} />
        )}
      </Section>

      <div className="flex justify-end">
        <Button asChild variant="link" className="text-sm">
          <a href="/workforce/attendance?view=requests">Need to correct a record? Open Attendance Request</a>
        </Button>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{value}</p></div>;
}

function TimelineMilestone({
  label,
  value,
  active,
  icon: Icon,
}: {
  label: string;
  value: string;
  active?: boolean;
  icon: React.ElementType;
}) {
  return (
    <li className="relative pb-5 last:pb-0">
      <span className={`absolute -left-[1.92rem] top-0 flex h-6 w-6 items-center justify-center rounded-full border ${active ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950' : 'border-border bg-background text-muted-foreground'}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex items-center justify-between gap-4"><span className="text-sm font-medium">{label}</span><span className="text-sm tabular-nums text-muted-foreground">{value}</span></div>
    </li>
  );
}
