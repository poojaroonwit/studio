'use client';

import * as React from 'react';
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

import { HrisOperationsWorkspace } from '@/components/hr/HrisOperationsWorkspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Plan = {
  id: string;
  name?: string | null;
  scenario?: string | null;
  status?: string | null;
  planningPeriodStart?: string | null;
  planningPeriodEnd?: string | null;
  assumptions?: Record<string, unknown> | string | null;
  demand?: Array<Record<string, unknown>> | string | null;
  supply?: Array<Record<string, unknown>> | string | null;
  costForecast?: Record<string, unknown> | string | null;
  version?: number;
};

type Summary = {
  demand: number | null;
  supply: number | null;
  gap: number | null;
  cost: number | null;
  assumptions: number;
};

function objectValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function arrayValue(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>>
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function firstNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function workforceTotal(value: unknown) {
  const records = arrayValue(value);
  if (!records.length) return null;
  let found = false;
  const total = records.reduce((sum, row) => {
    const number = firstNumber(row, [
      'fte',
      'headcount',
      'requiredHeadcount',
      'required_headcount',
      'plannedHeadcount',
      'planned_headcount',
      'quantity',
      'count',
      'employees',
      'value',
    ]);
    if (number === null) return sum;
    found = true;
    return sum + number;
  }, 0);
  return found ? total : null;
}

function costTotal(value: unknown) {
  const object = objectValue(value);
  const direct = firstNumber(object, [
    'totalCost',
    'total_cost',
    'annualCost',
    'annual_cost',
    'forecastCost',
    'forecast_cost',
    'budget',
    'total',
  ]);
  if (direct !== null) return direct;

  const numbers = Object.entries(object)
    .filter(([key, item]) => /cost|budget|salary|compensation|total/i.test(key) && Number.isFinite(Number(item)))
    .map(([, item]) => Number(item));
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) : null;
}

function summarize(plan: Plan): Summary {
  const demand = workforceTotal(plan.demand);
  const supply = workforceTotal(plan.supply);
  return {
    demand,
    supply,
    gap: demand !== null && supply !== null ? supply - demand : null,
    cost: costTotal(plan.costForecast),
    assumptions: Object.keys(objectValue(plan.assumptions)).length,
  };
}

function numberLabel(value: number | null, fraction = 0) {
  return value === null
    ? '—'
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: fraction }).format(value);
}

function moneyLabel(value: number | null) {
  return value === null
    ? '—'
    : new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'THB',
        maximumFractionDigits: 0,
      }).format(value);
}

function dateLabel(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

export function WorkforcePlanningWorkspace({ canManage }: { canManage: boolean }) {
  const [view, setView] = React.useState<'scenarios' | 'manage'>('scenarios');
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');
  const [leftId, setLeftId] = React.useState('');
  const [rightId, setRightId] = React.useState('');

  const load = React.useCallback(async (background = false) => {
    background ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/hr/v1/workforce-plans?pageSize=100', {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({})) as {
        data?: Plan[];
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(body.error?.message || 'Unable to load workforce plans.');
      const next = body.data || [];
      setPlans(next);
      setLeftId(current => current && next.some(plan => plan.id === current) ? current : next[0]?.id || '');
      setRightId(current => {
        if (current && next.some(plan => plan.id === current)) return current;
        return next.find(plan => plan.id !== next[0]?.id)?.id || '';
      });
    } catch (cause) {
      setPlans([]);
      setError(cause instanceof Error ? cause.message : 'Unable to load workforce plans.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  if (view === 'manage') {
    return (
      <div className="min-h-full bg-background">
        <PlanningTabs view={view} setView={setView} />
        <HrisOperationsWorkspace resources={[{ key: 'workforce-plans', canManage }]} />
      </div>
    );
  }

  const left = plans.find(plan => plan.id === leftId) || null;
  const right = plans.find(plan => plan.id === rightId) || null;

  return (
    <main className="min-h-full bg-muted/10 text-foreground">
      <PlanningTabs view={view} setView={setView} />

      <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Workforce · Planning</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Scenario planning</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Compare workforce demand, available supply, capacity gaps, assumptions, and forecast cost before approving a plan.
            </p>
          </div>
          <Button variant="outline" disabled={refreshing} onClick={() => void load(true)}>
            <ArrowPathIcon className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </header>

        {error ? (
          <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : plans.length === 0 ? (
          <section className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
            <ChartBarIcon className="mx-auto h-9 w-9 text-muted-foreground" />
            <h2 className="mt-3 font-semibold">No workforce scenarios yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create a workforce plan to compare demand, supply, and cost.</p>
            {canManage ? <Button className="mt-4" onClick={() => setView('manage')}>Create a plan</Button> : null}
          </section>
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-2">
              <PlanPanel
                label="Scenario A"
                plans={plans}
                selectedId={leftId}
                onSelect={setLeftId}
                plan={left}
              />
              <PlanPanel
                label="Scenario B"
                plans={plans}
                selectedId={rightId}
                onSelect={setRightId}
                plan={right}
              />
            </section>

            <ScenarioComparison left={left} right={right} />

            <section className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-4">
                <h2 className="font-semibold">All scenarios</h2>
                <p className="mt-1 text-sm text-muted-foreground">Use this register to compare scenario posture before moving a plan to approved status.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/35 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Scenario</th>
                      <th className="px-4 py-3">Period</th>
                      <th className="px-4 py-3 text-right">Demand</th>
                      <th className="px-4 py-3 text-right">Supply</th>
                      <th className="px-4 py-3 text-right">Gap</th>
                      <th className="px-4 py-3 text-right">Forecast cost</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {plans.map(plan => {
                      const summary = summarize(plan);
                      return (
                        <tr key={plan.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-semibold">{plan.name || 'Unnamed plan'}</td>
                          <td className="px-4 py-3 capitalize">{String(plan.scenario || 'baseline').replaceAll('_', ' ')}</td>
                          <td className="px-4 py-3 text-muted-foreground">{dateLabel(plan.planningPeriodStart)} → {dateLabel(plan.planningPeriodEnd)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{numberLabel(summary.demand, 1)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{numberLabel(summary.supply, 1)}</td>
                          <td className={cn('px-4 py-3 text-right font-semibold tabular-nums', summary.gap !== null && summary.gap < 0 && 'text-destructive')}>{numberLabel(summary.gap, 1)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{moneyLabel(summary.cost)}</td>
                          <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{plan.status || 'draft'}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function PlanningTabs({
  view,
  setView,
}: {
  view: 'scenarios' | 'manage';
  setView: (view: 'scenarios' | 'manage') => void;
}) {
  return (
    <nav className="flex min-h-12 items-end gap-6 overflow-x-auto border-b border-border bg-background px-5 sm:px-6" aria-label="Workforce planning views">
      {([
        ['scenarios', 'Scenario comparison'],
        ['manage', 'Plan register'],
      ] as const).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setView(key)}
          aria-current={view === key ? 'page' : undefined}
          className={cn(
            'relative min-h-12 shrink-0 px-1 text-sm font-semibold text-muted-foreground transition hover:text-foreground',
            view === key && 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function PlanPanel({
  label,
  plans,
  selectedId,
  onSelect,
  plan,
}: {
  label: string;
  plans: Plan[];
  selectedId: string;
  onSelect: (id: string) => void;
  plan: Plan | null;
}) {
  const summary = plan ? summarize(plan) : null;
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <h2 className="mt-1 font-semibold">{plan?.name || 'Select a scenario'}</h2>
        </div>
        <select
          value={selectedId}
          onChange={event => onSelect(event.target.value)}
          aria-label={label}
          className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Select plan</option>
          {plans.map(item => <option key={item.id} value={item.id}>{item.name || item.scenario || item.id}</option>)}
        </select>
      </div>

      {plan && summary ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="capitalize">{String(plan.scenario || 'baseline').replaceAll('_', ' ')}</Badge>
            <Badge variant="outline" className="capitalize">{plan.status || 'draft'}</Badge>
            <span>{dateLabel(plan.planningPeriodStart)} → {dateLabel(plan.planningPeriodEnd)}</span>
          </div>
          <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
            <Metric icon={UserGroupIcon} label="Demand" value={numberLabel(summary.demand, 1)} />
            <Metric icon={UserGroupIcon} label="Supply" value={numberLabel(summary.supply, 1)} />
            <Metric icon={ScaleIcon} label="Capacity gap" value={numberLabel(summary.gap, 1)} negative={summary.gap !== null && summary.gap < 0} />
            <Metric icon={CurrencyDollarIcon} label="Forecast cost" value={moneyLabel(summary.cost)} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{summary.assumptions} documented assumption{summary.assumptions === 1 ? '' : 's'}.</p>
        </>
      ) : null}
    </section>
  );
}

function ScenarioComparison({ left, right }: { left: Plan | null; right: Plan | null }) {
  if (!left || !right || left.id === right.id) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
        <ArrowsRightLeftIcon className="mx-auto h-7 w-7 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">Choose two different plans to compare scenario deltas.</p>
      </section>
    );
  }
  const a = summarize(left);
  const b = summarize(right);
  const delta = (one: number | null, two: number | null) => one === null || two === null ? null : two - one;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <ArrowsRightLeftIcon className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-semibold">Scenario delta · B versus A</h2>
          <p className="text-xs text-muted-foreground">{right.name || 'Scenario B'} compared with {left.name || 'Scenario A'}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Demand change" value={signed(delta(a.demand, b.demand))} />
        <Metric label="Supply change" value={signed(delta(a.supply, b.supply))} />
        <Metric label="Gap change" value={signed(delta(a.gap, b.gap))} negative={(delta(a.gap, b.gap) ?? 0) < 0} />
        <Metric label="Cost change" value={moneyDelta(delta(a.cost, b.cost))} />
      </div>
    </section>
  );
}

function signed(value: number | null) {
  if (value === null) return '—';
  return `${value > 0 ? '+' : ''}${numberLabel(value, 1)}`;
}

function moneyDelta(value: number | null) {
  if (value === null) return '—';
  const absolute = moneyLabel(Math.abs(value));
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${absolute}`;
}

function Metric({
  label,
  value,
  icon: Icon,
  negative = false,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  negative?: boolean;
}) {
  return (
    <div className="bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
      <p className={cn('mt-1 text-xl font-semibold tabular-nums', negative && 'text-destructive')}>{value}</p>
    </div>
  );
}
