"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Gauge,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type {
  CoreBillingPreferences,
  CoreEntitlement,
  CoreInvoice,
  CoreSubscription,
  CoreSubscriptionItem,
  HriveCommercialOverview,
} from '@/lib/outborn-core/commercial-types';
import { cn } from '@/lib/utils';

type BillingTab = 'overview' | 'plan' | 'usage' | 'invoices' | 'details';

const tabs: Array<{ id: BillingTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'plan', label: 'Plan' },
  { id: 'usage', label: 'Usage' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'details', label: 'Billing details' },
];

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function formatMoney(amount = 0, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function entitlementValue(entitlement: CoreEntitlement) {
  const value = entitlement.value ?? entitlement.booleanValue ?? entitlement.numberValue ?? entitlement.stringValue;
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
  if (value === null || value === undefined) return '—';
  return String(value);
}

function entitlementLabel(key: string) {
  return key.replace(/^hrive\./, '').replace(/[._-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function hriveSubscription(billing: HriveCommercialOverview['billing']): CoreSubscription | undefined {
  return billing?.subscriptions?.find(subscription => subscription.items?.some(item => item.price?.key?.startsWith('hrive.')));
}

function hriveItems(subscription?: CoreSubscription): CoreSubscriptionItem[] {
  return subscription?.items?.filter(item => item.price?.key?.startsWith('hrive.')) ?? [];
}

export function BillingWorkspace() {
  const [tab, setTab] = useState<BillingTab>('overview');
  const [overview, setOverview] = useState<HriveCommercialOverview | null>(null);
  const [draft, setDraft] = useState<CoreBillingPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/outborn-core/commercial', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({})) as HriveCommercialOverview & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Unable to load billing.');
      setOverview(payload);
      setDraft(payload.preferences);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load billing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const subscription = useMemo(() => hriveSubscription(overview?.billing ?? null), [overview]);
  const planItems = useMemo(() => hriveItems(subscription), [subscription]);
  const canManageBilling = ['owner', 'admin', 'billing_admin'].includes(overview?.organizationRole?.toLowerCase() ?? '');
  const dirty = Boolean(draft && overview && JSON.stringify(draft) !== JSON.stringify(overview.preferences));

  const updateDraft = <K extends keyof CoreBillingPreferences>(key: K, value: CoreBillingPreferences[K]) => {
    setDraft(current => current ? { ...current, [key]: value } : current);
  };

  const savePreferences = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const response = await fetch('/api/outborn-core/commercial/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({})) as CoreBillingPreferences & { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Unable to save billing details.');
      setDraft(payload);
      setOverview(current => current ? { ...current, preferences: payload } : current);
      toast.success('Billing details saved in Outborn Core.');
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Unable to save billing details.');
    } finally {
      setSaving(false);
    }
  };

  const openPortal = async () => {
    setOpeningPortal(true);
    try {
      const response = await fetch('/api/outborn-core/commercial/portal', { method: 'POST' });
      const payload = await response.json().catch(() => ({})) as { url?: string; message?: string };
      if (!response.ok || !payload.url) throw new Error(payload.message || 'Billing portal is unavailable.');
      window.location.assign(payload.url);
    } catch (portalError) {
      toast.error(portalError instanceof Error ? portalError.message : 'Billing portal is unavailable.');
      setOpeningPortal(false);
    }
  };

  if (loading) {
    return <div className="grid h-full min-h-[520px] place-items-center bg-[#f5f7fa] dark:bg-[#0b1118]"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>;
  }

  if (error || !overview || !draft) {
    return (
      <div className="grid h-full min-h-[520px] place-items-center bg-[#f5f7fa] p-6 dark:bg-[#0b1118]">
        <div className="max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <CreditCard className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold">Commercial services are not available</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error || 'Unable to load Outborn Core.'}</p>
          <Button className="mt-4" variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <main className="h-full min-h-0 overflow-y-auto bg-[#f5f7fa] text-slate-950 dark:bg-[#0b1118] dark:text-zinc-100">
      <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 dark:border-zinc-800 lg:flex-row lg:items-start">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300"><CreditCard className="h-5 w-5" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-[-0.02em]">Billing & plan</h1>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">Outborn Core</span>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600 dark:text-zinc-400">
                {overview.organizationName || 'Your organization'} · plan, limits, usage and invoices are managed by the shared Outborn commercial platform.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-1.5 h-4 w-4" />Refresh</Button>
            {canManageBilling && (
              <Button size="sm" disabled={openingPortal || !overview.billing} onClick={() => void openPortal()}>
                {openingPortal ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-1.5 h-4 w-4" />}Manage billing
              </Button>
            )}
          </div>
        </header>

        <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-zinc-800" aria-label="Billing sections">
          {tabs.map(item => (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              tab === item.id ? 'border-blue-600 text-blue-700 dark:text-blue-300' : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100',
            )}>{item.label}</button>
          ))}
        </nav>

        {tab === 'overview' && <OverviewPanel overview={overview} subscription={subscription} planItems={planItems} />}
        {tab === 'plan' && <PlanPanel subscription={subscription} items={planItems} entitlements={overview.entitlements} />}
        {tab === 'usage' && <UsagePanel overview={overview} />}
        {tab === 'invoices' && <InvoicesPanel invoices={overview.billing?.invoices ?? []} />}
        {tab === 'details' && (
          <BillingDetailsPanel
            value={draft}
            dirty={dirty}
            saving={saving}
            canManage={canManageBilling}
            onChange={updateDraft}
            onReset={() => setDraft(overview.preferences)}
            onSave={() => void savePreferences()}
          />
        )}
      </div>
    </main>
  );
}

function OverviewPanel({ overview, subscription, planItems }: { overview: HriveCommercialOverview; subscription?: CoreSubscription; planItems: CoreSubscriptionItem[] }) {
  const primaryPlan = planItems[0]?.price?.plan?.name || planItems[0]?.price?.plan?.key || 'No Hrive plan';
  const activeFeatures = overview.entitlements.filter(item => item.value !== false).length;
  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Sparkles} label="Hrive plan" value={primaryPlan} detail={subscription?.status ? String(subscription.status).replaceAll('_', ' ') : 'Not activated'} />
        <SummaryCard icon={ShieldCheck} label="Capabilities" value={String(activeFeatures)} detail="Hrive entitlements from Core" />
        <SummaryCard icon={Gauge} label="Usage metrics" value={String(overview.usage.length)} detail="Last 30 days" />
        <SummaryCard icon={FileText} label="Invoices" value={String(overview.billing?.invoices?.length ?? 0)} detail={overview.billing ? 'Suite billing history' : 'No billing account yet'} />
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Commercial status</h2>
            <p className="mt-1 text-xs text-muted-foreground">Core remains authoritative; Hrive does not store a second subscription record.</p>
          </div>
          {subscription?.status && <StatusPill status={subscription.status} />}
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Current plan" value={primaryPlan} />
          <Fact label="Period start" value={formatDate(subscription?.currentPeriodStart)} />
          <Fact label="Renews / ends" value={formatDate(subscription?.currentPeriodEnd)} />
          <Fact label="Billing contact" value={overview.preferences.billingEmail || 'Not configured'} />
        </dl>
      </section>
    </div>
  );
}

function PlanPanel({ subscription, items, entitlements }: { subscription?: CoreSubscription; items: CoreSubscriptionItem[]; entitlements: CoreEntitlement[] }) {
  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
      <section className="rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-zinc-800"><h2 className="text-sm font-semibold">Hrive subscription</h2><p className="mt-1 text-xs text-muted-foreground">Plan items are read from the shared Outborn subscription.</p></div>
        <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          {items.length ? items.map((item, index) => (
            <div key={item.id || index} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div><p className="text-sm font-medium">{item.price?.plan?.name || item.price?.plan?.key || item.price?.key || 'Hrive plan'}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.price?.billingInterval || 'Billing interval managed in Core'} · quantity {item.quantity ?? 1}</p></div>
              <StatusPill status={subscription?.status || 'inactive'} />
            </div>
          )) : <EmptyRow title="No Hrive plan is active" description="Configure the Hrive catalog/price in Outborn Core, then activate it for this organization." />}
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-zinc-800"><h2 className="text-sm font-semibold">Included capabilities</h2><p className="mt-1 text-xs text-muted-foreground">Resolved Hrive entitlements.</p></div>
        <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          {entitlements.length ? entitlements.map(item => <div key={item.key} className="flex items-center justify-between gap-4 px-5 py-3"><span className="text-sm">{entitlementLabel(item.key)}</span><span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">{entitlementValue(item)}</span></div>) : <EmptyRow title="No Hrive entitlements" description="Entitlements will appear after a Hrive plan, trial or override is granted in Core." />}
        </div>
      </section>
    </div>
  );
}

function UsagePanel({ overview }: { overview: HriveCommercialOverview }) {
  return <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
    <div className="border-b border-slate-200 px-5 py-4 dark:border-zinc-800"><h2 className="text-sm font-semibold">Hrive usage</h2><p className="mt-1 text-xs text-muted-foreground">Core aggregation for the last 30 days.</p></div>
    {overview.usage.length ? <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3 dark:bg-zinc-800">{overview.usage.map(metric => <div key={metric.key} className="bg-white p-5 dark:bg-zinc-900"><p className="text-xs font-medium text-muted-foreground">{entitlementLabel(metric.key)}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{metric.value.toLocaleString()}</p><p className="mt-1 text-xs text-muted-foreground">{metric.unit} · {metric.aggregation}</p></div>)}</div> : <EmptyRow title="No Hrive usage metrics yet" description="Usage appears here when Hrive publishes metrics registered in Outborn Core." />}
  </section>;
}

function InvoicesPanel({ invoices }: { invoices: CoreInvoice[] }) {
  return <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
    <div className="border-b border-slate-200 px-5 py-4 dark:border-zinc-800"><h2 className="text-sm font-semibold">Invoices</h2><p className="mt-1 text-xs text-muted-foreground">Shared Outborn organization invoice history from Core.</p></div>
    {invoices.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-zinc-900/80 dark:text-zinc-400"><tr><th className="px-5 py-3 font-medium">Invoice</th><th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Amount</th><th className="px-5 py-3 font-medium text-right">Document</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-zinc-800">{invoices.map(invoice => <InvoiceRow key={invoice.id || invoice.number || invoice.createdAt} invoice={invoice} />)}</tbody></table></div> : <EmptyRow title="No invoices yet" description="Invoices synchronized by Outborn Core will appear here." />}
  </section>;
}

function InvoiceRow({ invoice }: { invoice: CoreInvoice }) {
  const href = invoice.hostedInvoiceUrl || invoice.invoicePdf;
  return <tr><td className="px-5 py-3.5 font-medium">{invoice.number || 'Invoice'}</td><td className="px-5 py-3.5 text-muted-foreground">{formatDate(invoice.stripeCreatedAt || invoice.createdAt)}</td><td className="px-5 py-3.5"><StatusPill status={invoice.status || 'unknown'} /></td><td className="px-5 py-3.5 tabular-nums">{formatMoney(invoice.amountDue, invoice.currency)}</td><td className="px-5 py-3.5 text-right">{href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-300">Open <ExternalLink className="h-3.5 w-3.5" /></a> : '—'}</td></tr>;
}

function BillingDetailsPanel({ value, dirty, saving, canManage, onChange, onReset, onSave }: { value: CoreBillingPreferences; dirty: boolean; saving: boolean; canManage: boolean; onChange: <K extends keyof CoreBillingPreferences>(key: K, value: CoreBillingPreferences[K]) => void; onReset: () => void; onSave: () => void }) {
  return <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-zinc-800"><div><h2 className="text-sm font-semibold">Billing details</h2><p className="mt-1 text-xs text-muted-foreground">Saved centrally in Outborn Core and shared across the suite.</p></div>{!dirty && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Saved</span>}</div>
    <div className="grid gap-4 p-5 md:grid-cols-2">
      <Field label="Billing email"><Input type="email" value={value.billingEmail} disabled={!canManage} onChange={event => onChange('billingEmail', event.target.value)} /></Field>
      <Field label="Finance contact"><Input type="email" value={value.financeContactEmail} disabled={!canManage} onChange={event => onChange('financeContactEmail', event.target.value)} /></Field>
      <Field label="Invoice currency"><Input maxLength={3} value={value.invoiceCurrency} disabled={!canManage} onChange={event => onChange('invoiceCurrency', event.target.value.toUpperCase())} /></Field>
      <Field label="Invoice delivery"><select value={value.invoiceDelivery} disabled={!canManage} onChange={event => onChange('invoiceDelivery', event.target.value as CoreBillingPreferences['invoiceDelivery'])} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="email">Email</option><option value="portal">Portal only</option><option value="both">Email and portal</option></select></Field>
      <Field label="Purchase order number"><Input value={value.purchaseOrderNumber} disabled={!canManage} onChange={event => onChange('purchaseOrderNumber', event.target.value)} /></Field>
      <Field label="Tax registration number"><Input value={value.taxRegistrationNumber} disabled={!canManage} onChange={event => onChange('taxRegistrationNumber', event.target.value)} /></Field>
      <Field label="Renewal notice (days)"><Input type="number" min={1} max={365} value={value.renewalNoticeDays} disabled={!canManage} onChange={event => onChange('renewalNoticeDays', Math.max(1, Math.min(365, Number(event.target.value) || 1)))} /></Field>
      <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"><div><p className="text-sm font-medium">Purchase order required</p><p className="text-xs text-muted-foreground">Require a PO reference for billing.</p></div><Switch checked={value.purchaseOrderRequired} disabled={!canManage} onCheckedChange={checked => onChange('purchaseOrderRequired', checked)} /></div>
    </div>
    <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/70"><Button variant="outline" size="sm" disabled={!dirty || saving} onClick={onReset}>Discard</Button><Button size="sm" disabled={!canManage || !dirty || saving} onClick={onSave}>{saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}Save changes</Button></div>
  </section>;
}

function SummaryCard({ icon: Icon, label, value, detail }: { icon: typeof CreditCard; label: string; value: string; detail: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400"><Icon className="h-4 w-4" />{label}</div><p className="mt-2 truncate text-xl font-semibold">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p></div>;
}

function Fact({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>; }
function EmptyRow({ title, description }: { title: string; description: string }) { return <div className="px-5 py-8 text-center"><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>; }
function StatusPill({ status }: { status: string }) { const normalized = status.toLowerCase(); const positive = ['active', 'paid', 'trialing'].includes(normalized); return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize', positive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300')}>{status.replaceAll('_', ' ')}</span>; }
