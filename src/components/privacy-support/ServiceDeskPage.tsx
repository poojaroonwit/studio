"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  History,
  FilePlus2,
  Inbox,
  Loader2,
  LockKeyhole,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Smile,
  XCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useServiceDeskCategories } from '@/hooks/use-service-desk-categories';
import { cn } from '@/lib/utils';
import {
  canHrAct,
  canRequesterReply,
  canRequesterWithdraw,
  isTerminalTicketStatus,
  type ServiceDeskAction,
  type ServiceDeskIntent,
  type SupportCreateInput,
} from '@/lib/service-desk-contract';
import { PrivacySupportShell, StatusPill } from './PrivacySupportShell';
import { ServiceDeskComposer } from './ServiceDeskComposer';

type TicketActivity = {
  id?: string;
  action: string;
  message: string | null;
  createdAt: string;
  actorId?: string | null;
  actor?: string | null;
};

type SupportTicket = {
  id: string;
  requestNumber: string;
  requester: string;
  requesterEmail?: string;
  assignee?: string | null;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  submittedAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  activities: TicketActivity[];
};

type ApiPayload = {
  message?: string;
  id?: string;
  requestNumber?: string;
  requests?: SupportTicket[];
  support?: SupportTicket[];
};

type StatusFilter = 'all' | 'open' | 'closed';
type PendingConfirmation = 'close' | 'withdraw' | null;

const designPreviewTickets: SupportTicket[] = [
  {
    id: 'preview-payroll', requestNumber: 'SD-1048', requester: 'Jamie Wilson', requesterEmail: 'jamie.wilson@hrive.com', category: 'payroll', subject: 'Payroll deduction discrepancy', description: 'Hi HR team,\n\nI noticed an extra health insurance deduction on my most recent paycheck. Can you please review and confirm?\n\nThanks,\nJamie', status: 'in_review', priority: 'normal', submittedAt: '2026-08-10T03:24:00.000Z', updatedAt: '2026-08-10T03:55:00.000Z', activities: [
      { id: 'preview-1', action: 'reply', message: 'Hi Jamie,\n\nThanks for reaching out. I’m happy to help look into this for you. Can you confirm which paycheck date this appeared on?\n\nBest,\nMorgan', createdAt: '2026-08-10T03:37:00.000Z', actor: 'Morgan Harper (HR)' },
      { id: 'preview-2', action: 'reply', message: 'Sure, it was on the 8/7/2026 paycheck.\n\nThanks!', createdAt: '2026-08-10T03:41:00.000Z', actor: 'Jamie Wilson' },
      { id: 'preview-3', action: 'reply', message: 'Thanks, Jamie. I’ve reviewed your deductions and identified the issue. I’ll have our payroll team correct it and issue a reimbursement. You’ll see it on your next paycheck.\n\nLet me know if you have any other questions.', createdAt: '2026-08-10T03:55:00.000Z', actor: 'Morgan Harper (HR)' },
    ],
  },
  { id: 'preview-bank', requestNumber: 'SD-1047', requester: 'Sam Patel', category: 'payroll', subject: 'Update bank information', description: 'I need help updating my direct deposit details.', status: 'action_required', priority: 'normal', submittedAt: '2026-08-10T02:12:00.000Z', updatedAt: '2026-08-10T02:12:00.000Z', activities: [] },
  { id: 'preview-benefits', requestNumber: 'SD-1046', requester: 'Maria Lopez', category: 'benefits', subject: '401(k) enrollment question', description: 'Could you clarify the next enrollment window?', status: 'in_review', priority: 'normal', submittedAt: '2026-08-09T09:30:00.000Z', updatedAt: '2026-08-09T09:30:00.000Z', activities: [] },
  { id: 'preview-dependent', requestNumber: 'SD-1045', requester: 'David Kim', category: 'benefits', subject: 'Add new dependent', description: 'I need to add a dependent after a qualifying life event.', status: 'submitted', priority: 'normal', submittedAt: '2026-08-09T06:10:00.000Z', updatedAt: '2026-08-09T06:10:00.000Z', activities: [] },
  { id: 'preview-timesheet', requestNumber: 'SD-1044', requester: 'Emma Brown', category: 'time_attendance', subject: 'Timesheet not showing hours', description: 'My Friday hours are missing from the current timesheet.', status: 'in_review', priority: 'normal', submittedAt: '2026-08-08T08:00:00.000Z', updatedAt: '2026-08-08T08:00:00.000Z', activities: [] },
  { id: 'preview-w2', requestNumber: 'SD-1043', requester: 'James Taylor', category: 'payroll', subject: 'W-2 reissue request', description: 'Please help me request a replacement W-2.', status: 'action_required', priority: 'normal', submittedAt: '2026-08-07T08:00:00.000Z', updatedAt: '2026-08-07T08:00:00.000Z', activities: [] },
  { id: 'preview-address', requestNumber: 'SD-1042', requester: 'Aisha Carter', category: 'personal_info', subject: 'Address change', description: 'I recently moved and need to update my home address.', status: 'in_review', priority: 'normal', submittedAt: '2026-08-07T07:00:00.000Z', updatedAt: '2026-08-07T07:00:00.000Z', activities: [] },
  { id: 'preview-timeoff', requestNumber: 'SD-1041', requester: 'Riley Lee', category: 'leave', subject: 'Paid time off balance', description: 'My PTO balance does not include the latest accrual.', status: 'submitted', priority: 'normal', submittedAt: '2026-08-06T05:00:00.000Z', updatedAt: '2026-08-06T05:00:00.000Z', activities: [] },
];

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatListDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?';
}

function avatarTone(value: string) {
  const tones = [
    'bg-teal-600 text-white',
    'bg-indigo-500 text-white',
    'bg-emerald-600 text-white',
    'bg-orange-500 text-white',
    'bg-blue-600 text-white',
    'bg-pink-500 text-white',
  ];
  return tones[[...value].reduce((total, character) => total + character.charCodeAt(0), 0) % tones.length];
}

function statusTone(status: string): 'neutral' | 'good' | 'warn' | 'bad' {
  if (status === 'closed' || status === 'resolved') return 'good';
  if (status === 'action_required') return 'warn';
  if (status === 'withdrawn') return 'bad';
  return 'neutral';
}

async function readPayload(response: Response): Promise<ApiPayload> {
  return response.json().catch(() => ({})) as Promise<ApiPayload>;
}

export function ServiceDeskPage({
  initialIntent = null,
  initialTicketId = null,
}: {
  initialIntent?: ServiceDeskIntent | null;
  initialTicketId?: string | null;
}) {
  const router = useRouter();
  const { locale, t } = useLocalization();
  const serviceDeskCategories = useServiceDeskCategories();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composeIntent, setComposeIntent] = useState<ServiceDeskIntent | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showHistorical, setShowHistorical] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isHr, setIsHr] = useState(false);
  const [roleResolved, setRoleResolved] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null);
  const loadController = useRef<AbortController | null>(null);

  const load = useCallback(async (preferredId?: string) => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true);
    try {
      const adminResponse = await fetch('/api/privacy-support/admin/requests', {
        cache: 'no-store',
        signal: controller.signal,
      });
      let data = await readPayload(adminResponse);
      let nextTickets: SupportTicket[];
      let nextIsHr: boolean;

      if (adminResponse.status === 403) {
        const employeeResponse = await fetch('/api/privacy-support/support', {
          cache: 'no-store',
          signal: controller.signal,
        });
        data = await readPayload(employeeResponse);
        if (!employeeResponse.ok) throw new Error(data.message || t('serviceDesk.error.load', 'Unable to load support tickets.'));
        nextIsHr = false;
        nextTickets = (data.requests || []).map(ticket => ({
          ...ticket,
          requester: t('serviceDesk.you', 'You'),
          description: ticket.description || '',
          priority: ticket.priority || 'normal',
          activities: ticket.activities || [],
        }));
      } else {
        if (!adminResponse.ok) throw new Error(data.message || t('serviceDesk.error.load', 'Unable to load support tickets.'));
        nextIsHr = true;
        nextTickets = (data.support || []).map(ticket => ({ ...ticket, activities: ticket.activities || [] }));
      }

      if (controller.signal.aborted) return;
      setIsHr(nextIsHr);
      setRoleResolved(true);
      setTickets(nextTickets);
      setActiveId(current => {
        const requested = preferredId || initialTicketId;
        if (requested && nextTickets.some(ticket => ticket.id === requested)) return requested;
        if (current && nextTickets.some(ticket => ticket.id === current)) return current;
        return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
          ? nextTickets[0]?.id || null
          : null;
      });
      setError('');
    } catch (loadError) {
      if (controller.signal.aborted) return;
      if (process.env.NODE_ENV !== 'production' && initialTicketId === '00000000-0000-0000-0000-000000000001') {
        setIsHr(true);
        setRoleResolved(true);
        setTickets(designPreviewTickets);
        setActiveId(designPreviewTickets[0].id);
        setError('');
        return;
      }
      setRoleResolved(true);
      setError(loadError instanceof Error ? loadError.message : t('serviceDesk.error.load', 'Unable to load support tickets.'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [initialTicketId, t]);

  useEffect(() => {
    void load();
    return () => loadController.current?.abort();
  }, [load]);

  useEffect(() => {
    if (!initialIntent || !roleResolved) return;
    setComposeIntent(initialIntent);
    setActiveId(null);
    setPendingConfirmation(null);
    router.replace('/service-desk', { scroll: false });
  }, [initialIntent, roleResolved, router]);

  useEffect(() => {
    setPendingConfirmation(null);
  }, [activeId]);

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase(locale);
    return tickets.filter(ticket => {
      if (showHistorical) {
        if (!isTerminalTicketStatus(ticket.status)) return false;
      } else {
        if (statusFilter === 'open' && isTerminalTicketStatus(ticket.status)) return false;
        if (statusFilter === 'closed' && !isTerminalTicketStatus(ticket.status)) return false;
      }
      if (!search) return true;
      return [ticket.requestNumber, ticket.requester, ticket.requesterEmail, ticket.subject, ticket.category]
        .some(value => value?.toLocaleLowerCase(locale).includes(search));
    });
  }, [locale, query, statusFilter, showHistorical, tickets]);

  const active = tickets.find(ticket => ticket.id === activeId) || null;
  const openCount = tickets.filter(ticket => !isTerminalTicketStatus(ticket.status)).length;
  const closedCount = tickets.filter(ticket => isTerminalTicketStatus(ticket.status)).length;
  const isHistoryMode = showHistorical || statusFilter === 'closed';
  const activeIsClosed = active ? isTerminalTicketStatus(active.status) : false;

  function openComposer(intent: ServiceDeskIntent = 'request') {
    setComposeIntent(intent);
    setActiveId(null);
    setPendingConfirmation(null);
    setError('');
    setNotice('');
    setShowHistorical(false);
    setStatusFilter('open');
  }

  function closeWorkspace() {
    setComposeIntent(null);
    setActiveId(null);
    setPendingConfirmation(null);
  }

  async function createTicket(input: SupportCreateInput) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/privacy-support/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await readPayload(response);
      if (!response.ok || !data.id) {
        setError(data.message || t('serviceDesk.error.create', 'Unable to create your request. Your draft has been preserved.'));
        return false;
      }
      setComposeIntent(null);
      setNotice(t('serviceDesk.notice.created', 'Your request was sent to the People team.'));
      await load(data.id);
      return true;
    } catch {
      setError(t('serviceDesk.error.network', 'The service desk could not be reached. Check your connection and try again.'));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function updateTicket(action: ServiceDeskAction, message?: string) {
    if (!active) return false;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(isHr ? '/api/privacy-support/admin/requests' : '/api/privacy-support/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: active.id, action, message }),
      });
      const data = await readPayload(response);
      if (!response.ok) {
        setError(data.message || t('serviceDesk.error.update', 'Unable to update this ticket.'));
        return false;
      }
      setPendingConfirmation(null);
      setNotice(action === 'reply'
        ? t('serviceDesk.notice.reply', 'Your reply was added to the ticket history.')
        : action === 'close'
          ? t('serviceDesk.notice.closed', 'The ticket was closed.')
          : t('serviceDesk.notice.withdrawn', 'The request was withdrawn.'));
      await load(active.id);
      return true;
    } catch {
      setError(t('serviceDesk.error.network', 'The service desk could not be reached. Check your connection and try again.'));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = String(new FormData(form).get('message') || '').trim();
    if (!message) return;
    if (await updateTicket('reply', message)) form.reset();
  }

  const canReply = active ? (isHr ? canHrAct(active.status) : canRequesterReply(active.status)) : false;
  const canWithdraw = Boolean(active && !isHr && canRequesterWithdraw(active.status));
  const canClose = Boolean(active && isHr && canHrAct(active.status));
  const displayStatus = (status: string) => t(
    `serviceDesk.status.${status}`,
    status === 'in_review'
      ? 'In progress'
      : status === 'action_required'
        ? (isHr ? 'Waiting on employee' : 'Action required')
        : status === 'submitted'
          ? (isHr ? 'Waiting on HR' : 'Submitted')
          : status.replaceAll('_', ' '),
  );

  return (
    <PrivacySupportShell
      eyebrow={t('serviceDesk.eyebrow', 'Support operations')}
      title={t('serviceDesk.title', 'Service Desk')}
      description={t('serviceDesk.description', 'Follow employee support tickets and retain a permanent activity history for every conversation.')}
      hideHeader
      fullPage
    >
      <section className="flex h-full min-h-[680px] w-full flex-col overflow-hidden bg-background">
        <header className="flex min-h-16 items-center border-b border-border bg-card px-5 sm:px-7">
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-foreground">{t('serviceDesk.title', 'Service Desk')}</h1>
        </header>
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(360px,34%)_minmax(0,1fr)]">
        <aside className={cn(
          'min-h-0 min-w-0 flex-col bg-card lg:flex lg:border-e lg:border-border',
          (active || composeIntent) ? 'hidden' : 'flex',
        )} aria-label={t('serviceDesk.ticketList', 'Support ticket list')}>
          <div className="border-b border-border px-4 pb-3 pt-4 sm:px-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold tracking-[-0.01em]">{isHr ? t('serviceDesk.inbox', 'Ticket inbox') : t('serviceDesk.yourTickets', 'Your tickets')}</h2>
              <p className="shrink-0 text-xs text-muted-foreground">
                {isHistoryMode
                  ? t('serviceDesk.closedCount', '{count} closed tickets').replace('{count}', String(closedCount))
                  : t('serviceDesk.openCount', '{count} open tickets').replace('{count}', String(openCount))}
              </p>
            </div>
            <label className="relative mt-3 block">
              <span className="sr-only">{t('serviceDesk.searchLabel', 'Search tickets')}</span>
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={event => setQuery(event.target.value)} className="h-10 bg-background ps-9 shadow-none" placeholder={t('serviceDesk.searchPlaceholder', 'Search tickets or employees')} />
            </label>
            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="relative block">
                <span className="sr-only">{t('serviceDesk.filterLabel', 'Filter tickets by status')}</span>
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as StatusFilter)} className="h-9 appearance-none rounded-md border border-input bg-background py-0 pe-9 ps-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="all">{t('serviceDesk.filter.all', 'All tickets')}</option>
                  <option value="open">{t('serviceDesk.filter.open', 'Open tickets')}</option>
                  <option value="closed">{t('serviceDesk.filter.closed', 'Closed and withdrawn')}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </label>
              <Button
                size="sm"
                variant={isHistoryMode ? 'default' : 'outline'}
                onClick={() => {
                  const next = !isHistoryMode;
                  setShowHistorical(next);
                  setStatusFilter(next ? 'closed' : 'open');
                }}
              >
                <History className="me-1.5 h-4 w-4" />
                {isHistoryMode ? t('serviceDesk.currentConversations', 'Current conversations') : t('serviceDesk.historicalConversations', 'Historical conversations')}
              </Button>
              {roleResolved
                ? <Button size="sm" onClick={() => openComposer('request')} className="min-w-32 shrink-0"><FilePlus2 className="me-1.5 h-4 w-4" />{t('serviceDesk.newRequest', 'New request')}</Button>
                : <Inbox className="h-5 w-5 shrink-0 text-muted-foreground" />}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {error && !active && !composeIntent && (
              <div role="alert" className="border-b border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-950 dark:bg-red-950/30 dark:text-red-200 lg:hidden">
                <p>{error}</p>
                <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => void load()}><RefreshCw className="me-1.5 h-4 w-4" />{t('common.retry', 'Try again')}</Button>
              </div>
            )}
            {loading && tickets.length === 0 && <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('serviceDesk.loading', 'Loading tickets…')}</div>}
            {!loading && filtered.length === 0 && (
              <div className="p-6 text-sm">
                <p className="font-medium">{query || statusFilter !== 'all' ? t('serviceDesk.noMatches', 'No tickets match these filters.') : t('serviceDesk.empty', 'No support tickets yet.')}</p>
                <p className="mt-1 leading-5 text-muted-foreground">{query || statusFilter !== 'all' ? t('serviceDesk.adjustFilters', 'Try another search or status.') : t('serviceDesk.emptyHint', 'Start a private conversation when you need help from the People team.')}</p>
                {!isHr && !query && statusFilter === 'all' && <Button variant="outline" size="sm" className="mt-4" onClick={() => openComposer('request')}>{t('serviceDesk.createFirst', 'Create your first request')}</Button>}
              </div>
            )}
            {isHistoryMode ? (
              <div className="overflow-x-auto border-y border-border">
                <table className="w-full min-w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-start sm:px-5">#</th>
                      <th className="px-4 py-3 text-start sm:px-5">{t('serviceDesk.ticketTitle', 'Subject')}</th>
                      <th className="px-4 py-3 text-start sm:px-5">{t('serviceDesk.requester', 'Requester')}</th>
                      <th className="px-4 py-3 text-start sm:px-5">{t('serviceDesk.category', 'Category')}</th>
                      <th className="px-4 py-3 text-start sm:px-5">{t('serviceDesk.updatedAt', 'Updated')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-sm text-muted-foreground sm:px-5" colSpan={5}>
                          <p className="font-medium">{query || statusFilter !== 'all' ? t('serviceDesk.noMatches', 'No tickets match these filters.') : t('serviceDesk.empty', 'No support tickets yet.')}</p>
                          <p className="mt-1 leading-5 text-muted-foreground">{query || statusFilter !== 'all' ? t('serviceDesk.adjustFilters', 'Try another search or status.') : t('serviceDesk.emptyHint', 'Start a private conversation when you need help from the People team.')}</p>
                        </td>
                      </tr>
                    ) : (
                      filtered.map(ticket => (
                        <tr
                          key={ticket.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => { setComposeIntent(null); setActiveId(ticket.id); }}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setComposeIntent(null);
                              setActiveId(ticket.id);
                            }
                          }}
                          className="cursor-pointer border-b border-border transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                          <td className="px-4 py-3 sm:px-5">{ticket.requestNumber}</td>
                          <td className="px-4 py-3 sm:px-5">
                            <span className="font-medium">{ticket.subject}</span>
                          </td>
                          <td className="px-4 py-3 sm:px-5"><span className="truncate">{ticket.requester}</span></td>
                          <td className="px-4 py-3 sm:px-5">{t(`serviceDesk.category.${ticket.category}`, serviceDeskCategories.find(category => category.key === ticket.category)?.label || ticket.category.replaceAll('_', ' '))}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground sm:px-5">{formatListDate(ticket.updatedAt, locale)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : filtered.map(ticket => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => { setComposeIntent(null); setActiveId(ticket.id); }}
                aria-current={activeId === ticket.id ? 'true' : undefined}
                className={cn(
                  'relative grid w-full grid-cols-[40px_minmax(0,1fr)_auto] gap-x-3 border-b border-border px-4 py-3 text-start transition-colors hover:bg-muted/45 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5',
                  activeId === ticket.id && 'bg-primary/[0.075] before:absolute before:inset-y-0 before:start-0 before:w-0.5 before:bg-primary',
                )}
              >
                <Avatar size="md" className="mt-0.5 rounded-full"><AvatarFallback className={cn('rounded-full text-[11px] font-semibold', avatarTone(ticket.requester))}>{initials(ticket.requester)}</AvatarFallback></Avatar>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{ticket.requester}</span><span className="mt-0.5 block truncate text-xs text-foreground/80">{ticket.subject}</span><span className="mt-1 block truncate text-[11px] text-muted-foreground">{ticket.requestNumber} <span aria-hidden>·</span> {t(`serviceDesk.category.${ticket.category}`, serviceDeskCategories.find(category => category.key === ticket.category)?.label || ticket.category.replaceAll('_', ' '))}</span></span>
                <span className="flex min-w-[94px] flex-col items-end gap-2"><time className="text-[11px] text-muted-foreground">{formatListDate(ticket.updatedAt, locale)}</time><span className="flex items-center gap-1.5"><StatusPill tone={statusTone(ticket.status)}>{displayStatus(ticket.status)}</StatusPill><ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></span></span>
              </button>
            ))}
          </div>
        </aside>

        {composeIntent ? (
          <ServiceDeskComposer key={composeIntent} intent={composeIntent} saving={saving} error={error} t={t} onCancel={closeWorkspace} onSubmit={createTicket} />
        ) : (
          <div className={cn(
            'min-h-0 min-w-0 flex-col bg-card lg:flex',
            active ? 'flex' : 'hidden',
          )}>
            <div className="sr-only" aria-live="polite">{notice}</div>
            {error && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800 dark:border-red-950 dark:bg-red-950/30 dark:text-red-200">
                <span>{error}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => void load(active?.id)}><RefreshCw className="me-1.5 h-4 w-4" />{t('common.retry', 'Try again')}</Button>
              </div>
            )}
            {notice && !error && <div role="status" className="border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div>}
            {!active && !loading && (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground" />
                <h2 className="mt-3 font-semibold">{t('serviceDesk.selectTicket', 'Select a ticket')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('serviceDesk.selectTicketHint', 'Choose a ticket to review its complete history.')}</p>
              </div>
            )}
            {active && <>
              <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
                <button type="button" onClick={closeWorkspace} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden">
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />{t('serviceDesk.backToTickets', 'Back to tickets')}
                </button>
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar size="lg" className="rounded-full"><AvatarFallback className={cn('rounded-full text-xs font-semibold', avatarTone(active.requester))}>{initials(active.requester)}</AvatarFallback></Avatar>
                  <div className="min-w-0 border-e border-border pe-5">
                    <p className="truncate text-sm font-semibold">{active.requester}</p>
                    {active.requesterEmail && <p className="mt-0.5 max-w-48 truncate text-[11px] text-muted-foreground">{active.requesterEmail}</p>}
                  </div>
                  <div className="min-w-0 flex-1 border-e border-border pe-5">
                    <div className="flex min-w-0 flex-wrap items-center gap-2"><h2 className="min-w-0 break-words font-semibold">{active.subject}</h2><StatusPill tone={statusTone(active.status)}>{displayStatus(active.status)}</StatusPill></div>
                    <p className="mt-1 break-words text-xs text-muted-foreground">{active.requestNumber} · {t(`serviceDesk.category.${active.category}`, serviceDeskCategories.find(category => category.key === active.category)?.label || active.category.replaceAll('_', ' '))}</p>
                  </div>
                  <div className="min-w-28"><p className="text-[10px] text-muted-foreground">{t('serviceDesk.submittedLabel', 'Submitted')}</p><p className="mt-1 text-xs font-medium">{formatListDate(active.submittedAt, locale)}</p></div>
                </div>
              </header>

              {pendingConfirmation && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  <p>{pendingConfirmation === 'close' ? t('serviceDesk.confirmClose', 'Close this ticket? Its history will remain available.') : t('serviceDesk.confirmWithdraw', 'Withdraw this request? HR will no longer act on it.')}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setPendingConfirmation(null)} disabled={saving}>{t('common.cancel', 'Cancel')}</Button>
                    <Button size="sm" onClick={() => void updateTicket(pendingConfirmation)} disabled={saving}>{saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{t('common.confirm', 'Confirm')}</Button>
                  </div>
                </div>
              )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-emerald-50/60 px-5 py-3 dark:bg-emerald-950/20 sm:px-6">
                  <p className="text-xs text-muted-foreground"><LockKeyhole className="me-2 inline h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" /><span className="font-semibold text-emerald-800 dark:text-emerald-200">{t('serviceDesk.privateConversation', 'Private conversation')}</span><span className="ms-2">{t('serviceDesk.historyNotice', 'Replies and status changes are saved permanently in the employee ticket history.')}</span></p>
                  {canClose && <Button variant="outline" size="sm" onClick={() => setPendingConfirmation('close')} disabled={saving}><CheckCircle2 className="me-2 h-4 w-4" />{t('serviceDesk.close', 'Close ticket')}</Button>}
                  {canWithdraw && <Button variant="outline" size="sm" onClick={() => setPendingConfirmation('withdraw')} disabled={saving}><XCircle className="me-2 h-4 w-4" />{t('serviceDesk.withdraw', 'Withdraw request')}</Button>}
                  {activeIsClosed && (
                    <Button size="sm" variant="outline" onClick={() => openComposer('request')} disabled={saving}>
                      <FilePlus2 className="me-2 h-4 w-4" />
                      {t('serviceDesk.startNewConversation', 'Start new conversation')}
                    </Button>
                  )}
                </div>
              <div className="border-b border-border bg-background px-5 py-5 sm:px-8">
                <div className="mx-auto grid max-w-4xl grid-cols-[40px_minmax(0,1fr)] gap-3">
                  <Avatar size="md" className="rounded-full"><AvatarFallback className={cn('rounded-full text-[11px] font-semibold', avatarTone(active.requester))}>{initials(active.requester)}</AvatarFallback></Avatar>
                  <div className="min-w-0"><div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold"><span className="break-words">{active.requester}</span>{active.requesterEmail && <span className="break-all text-[11px] font-normal text-muted-foreground">{active.requesterEmail}</span>}</div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/80 [overflow-wrap:anywhere]">{active.description}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{t('serviceDesk.submitted', 'Submitted')} {formatDate(active.submittedAt, locale)}</p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-background px-5 sm:px-8">
                <div className="mx-auto max-w-4xl">
                  {active.activities.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t('serviceDesk.noActivity', 'No activity has been recorded yet.')}</p>}
                  {active.activities.map((activity, index) => {
                    const actor = activity.actor || (activity.action === 'reply' ? t('serviceDesk.participant', 'Ticket participant') : t('serviceDesk.system', 'System'));
                    const splitAfter = activity.action === 'closed' || activity.action === 'withdrawn';
                    return (
                      <div key={activity.id || `${activity.createdAt}-${index}`} className="space-y-4 border-b border-border py-5">
                        <article className={cn('grid grid-cols-[40px_minmax(0,1fr)] gap-3', activity.action === 'closed' && 'text-emerald-800 dark:text-emerald-200')}>
                          <Avatar size="md" className="rounded-full"><AvatarFallback className={cn('rounded-full text-[11px] font-semibold', avatarTone(actor))}>{initials(actor)}</AvatarFallback></Avatar>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{actor}</p><time className="text-[11px] text-muted-foreground">{formatDate(activity.createdAt, locale)}</time></div>
                            {activity.message && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{activity.message}</p>}
                            {activity.action !== 'reply' && <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t(`serviceDesk.activity.${activity.action}`, activity.action.replaceAll('_', ' '))}</p>}
                          </div>
                        </article>
                        {splitAfter && (
                          <div className="pt-1">
                            <div className="relative mx-auto flex max-w-4xl items-center gap-3 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                              <span className="h-px flex-1 bg-border"></span>
                              <span className="px-2 text-center">{t('serviceDesk.conversationSplit', 'This conversation ended. Start a new request for a new ticket.')}</span>
                              <span className="h-px flex-1 bg-border"></span>
                            </div>
                            <p className="mt-3 text-center">
                              <Button type="button" size="sm" variant="outline" onClick={() => openComposer('request')} disabled={saving}>
                                <FilePlus2 className="me-2 h-3.5 w-3.5" />
                                {t('serviceDesk.startNewConversation', 'Start new conversation')}
                              </Button>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <form key={active.id} onSubmit={sendReply} className="border-t border-border bg-card px-4 py-3 sm:px-6 lg:pe-64">
                <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-md border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
                  <Textarea
                    name="message"
                    aria-label={t('serviceDesk.replyLabel', 'Reply to this ticket')}
                    className="min-h-16 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                    maxLength={3000}
                    required
                    disabled={saving || !canReply}
                    placeholder={canReply ? (isHr ? t('serviceDesk.hrReplyPlaceholder', 'Write an HR reply…') : t('serviceDesk.employeeReplyPlaceholder', 'Add information or reply to HR…')) : t('serviceDesk.terminalPlaceholder', 'This ticket is read-only.')}
                  />
                  <div className="flex shrink-0 items-center gap-1"><button type="button" className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t('serviceDesk.attach', 'Attach file')}><Paperclip className="h-4 w-4" /></button><button type="button" className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t('serviceDesk.emoji', 'Add emoji')}><Smile className="h-4 w-4" /></button><Button className="h-10 min-w-28" disabled={saving || !canReply}>{saving ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4" />}{t('serviceDesk.sendReply', 'Send reply')}</Button></div>
                </div>
                <p className="mx-auto mt-2 flex max-w-4xl items-center gap-1.5 text-[10px] text-muted-foreground"><Clock3 className="h-3 w-3" />{t('serviceDesk.replyVisibility', 'Everyone in this ticket can see this reply in the permanent history.')}</p>
              </form>
            </>}
          </div>
        )}
        </div>
      </section>
    </PrivacySupportShell>
  );
}

