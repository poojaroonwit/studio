import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, CircleDollarSign, Clock3, LockKeyhole, ShieldAlert } from 'lucide-react';
import { HrisEmptyState, hrisStatusTone } from '@/components/hris/HrisWorkspacePrimitives';
import { useLocalization } from '@/contexts/LocalizationContext';
import { cn } from '@/lib/utils';

export function PayrollStatus({ value }: { value: unknown }) {
  const status = String(value || 'unknown');
  const tone = ['approved','finalized','paid','reconciled','closed','released','active','ready'].includes(status)
    ? 'positive' : ['exceptions_pending','returned_for_correction','failed','rejected','exception_found','blocking'].includes(status)
      ? 'danger' : ['pending_approval','collecting_inputs','payment_processing','pending','queued'].includes(status)
        ? 'attention' : 'neutral';
  const Icon = tone === 'positive' ? CheckCircle2 : tone === 'danger' ? ShieldAlert : tone === 'attention' ? Clock3 : LockKeyhole;
  return (
    <span className={cn(
      'inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize leading-4',
      hrisStatusTone(status),
    )}>
      <Icon className="h-3 w-3" aria-hidden="true" />{status.replaceAll('_', ' ')}
    </span>
  );
}

export function Money({ value, currency = 'THB', masked = false }: { value: unknown; currency?: string; masked?: boolean }) {
  if (masked) return <span className="font-semibold tracking-[0.12em] text-slate-500">••••••</span>;
  return <span className="whitespace-nowrap font-semibold tabular-nums">{new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0))}</span>;
}

export function MetricStrip({ items }: { items: Array<{ label: string; value: ReactNode; intent?: 'default' | 'danger' | 'positive' }> }) {
  const { t } = useLocalization();
  return (
    <section className="grid border-y border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800 dark:bg-slate-950" aria-label={t('payroll.primitives.summaryAria', 'Payroll summary')}>
      {items.map((item, index) => (
        <div key={item.label} className={cn('min-w-0 px-4 py-4 sm:px-5', index > 0 && 'border-t border-slate-200 sm:border-l sm:border-t-0 dark:border-slate-800')}>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
          <div className={cn('mt-1 text-xl font-bold tracking-[-0.03em] tabular-nums text-slate-950 dark:text-slate-50', item.intent === 'danger' && 'text-rose-700 dark:text-rose-300', item.intent === 'positive' && 'text-emerald-700 dark:text-emerald-300')}>{item.value}</div>
        </div>
      ))}
    </section>
  );
}

export function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
      <div><h2 className="text-lg font-bold tracking-[-0.025em] text-slate-950 dark:text-slate-50">{title}</h2>{description && <p className="mt-1 max-w-[70ch] text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>}</div>
      {action}
    </div>
  );
}

export function PayrollEmpty({ title, description }: { title: string; description: string }) {
  return <div className="border-y border-dashed border-slate-300 dark:border-slate-700"><HrisEmptyState icon={CircleDollarSign} title={title} description={description}/></div>;
}

export function PayrollError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useLocalization();
  return <div role="alert" className="border-y border-rose-200 bg-rose-50 px-5 py-6 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0"/><div><h2 className="font-bold">{t('payroll.primitives.errorTitle', 'Payroll could not load')}</h2><p className="mt-1 text-sm">{message}</p><button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-md border border-current px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600">{t('payroll.primitives.tryAgain', 'Try again')}</button></div></div></div>;
}

export function PayrollSkeleton() {
  const { t } = useLocalization();
  return <div className="space-y-6 animate-pulse" aria-label={t('payroll.primitives.loading', 'Loading payroll')}><div className="h-24 bg-slate-100 dark:bg-slate-900"/><div className="grid gap-4 md:grid-cols-3">{[1,2,3].map(item => <div key={item} className="h-32 bg-slate-100 dark:bg-slate-900"/>)}</div><div className="h-80 bg-slate-100 dark:bg-slate-900"/></div>;
}
