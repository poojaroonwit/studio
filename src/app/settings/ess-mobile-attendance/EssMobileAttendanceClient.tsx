'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Loader2, LocateFixed, MapPin, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';

type Branch = {
  id?: string;
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusKm?: number;
  isActive?: boolean;
};

type Policy = {
  locationRequired: boolean;
  requireScheduledShift: boolean;
  earlyClockInMinutes: number;
  lateClockOutMinutes: number;
};

type Payload = { policy: Policy; branches: Branch[]; message?: string };

const fallbackPolicy: Policy = {
  locationRequired: false,
  requireScheduledShift: true,
  earlyClockInMinutes: 120,
  lateClockOutMinutes: 240,
};

export function EssMobileAttendanceClient() {
  const [policy, setPolicy] = useState<Policy>(fallbackPolicy);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const geofencedBranches = useMemo(
    () => branches.filter(branch => Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude)),
    [branches],
  );

  useEffect(() => {
    let current = true;
    void fetch('/api/settings/ess-mobile-attendance', { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json() as Payload;
        if (!response.ok) throw new Error(payload.message || 'Unable to load mobile attendance settings.');
        if (!current) return;
        setPolicy(payload.policy);
        setBranches(payload.branches || []);
      })
      .catch(cause => { if (current) setError(cause instanceof Error ? cause.message : 'Unable to load mobile attendance settings.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const response = await fetch('/api/settings/ess-mobile-attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      });
      const payload = await response.json() as Payload;
      if (!response.ok) throw new Error(payload.message || 'Unable to save mobile attendance settings.');
      setPolicy(payload.policy);
      setBranches(payload.branches || []);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save mobile attendance settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex min-h-[420px] items-center justify-center bg-background"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;

  return (
    <main className="min-h-full bg-background p-4 text-foreground sm:p-5">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div> : null}

        <section className="rounded-lg border bg-card p-4 sm:p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> Mobile attendance policy</div>
              <p className="max-w-2xl text-sm text-muted-foreground">Controls native ESS clock actions. Shift and location rules are enforced again on the server so they cannot be bypassed by the mobile UI.</p>
            </div>
            <Button onClick={() => void save()} disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving</> : saved ? <><CheckCircle2 className="mr-2 h-4 w-4" />Saved</> : 'Save policy'}</Button>
          </div>

          <div className="divide-y rounded-md border">
            <PolicyToggle
              title="Require assigned shift"
              description="Only allow clock in/out when the employee has an active shift for the current Bangkok work date."
              checked={policy.requireScheduledShift}
              onChange={checked => setPolicy(current => ({ ...current, requireScheduledShift: checked }))}
            />
            <PolicyToggle
              title="Require organization / branch location"
              description="Require device location and only allow attendance inside an active branch geofence."
              checked={policy.locationRequired}
              onChange={checked => setPolicy(current => ({ ...current, locationRequired: checked }))}
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <NumberField label="Early clock-in allowance" suffix="minutes" value={policy.earlyClockInMinutes} onChange={value => setPolicy(current => ({ ...current, earlyClockInMinutes: value }))} />
            <NumberField label="Late clock-out allowance" suffix="minutes" value={policy.lateClockOutMinutes} onChange={value => setPolicy(current => ({ ...current, lateClockOutMinutes: value }))} />
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-md bg-muted"><LocateFixed className="h-4 w-4" /></div><div><h2 className="text-sm font-semibold">Allowed attendance locations</h2><p className="text-sm text-muted-foreground">Locations are reused from Admin Center → Branch. Update address, coordinates, and geofence radius there; the native app receives the same configuration automatically.</p></div></div>
          {branches.length === 0 ? <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">No active branches are configured.</div> : <div className="grid gap-3 md:grid-cols-2">{branches.map((branch, index) => {
            const ready = Number.isFinite(branch.latitude) && Number.isFinite(branch.longitude);
            return <div key={branch.id || index} className="rounded-md border p-3"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-md bg-muted"><Building2 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="font-medium">{branch.name || `Branch ${index + 1}`}</div><div className="mt-0.5 text-xs text-muted-foreground">{[branch.address, branch.city, branch.country].filter(Boolean).join(' · ') || 'No address'}</div><div className={`mt-2 flex items-center gap-1.5 text-xs ${ready ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}><MapPin className="h-3.5 w-3.5" />{ready ? `${branch.latitude}, ${branch.longitude} · ${branch.geofenceRadiusKm || 0.5} km radius` : 'Coordinates required before location enforcement can be used'}</div></div></div></div>;
          })}</div>}
          {policy.locationRequired && geofencedBranches.length === 0 ? <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Location enforcement is enabled, but no active branch has valid coordinates. Mobile clock actions will be blocked until a branch geofence is configured.</div> : null}
        </section>
      </div>
    </main>
  );
}

function PolicyToggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 p-4"><span><span className="block text-sm font-medium">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span><input className="h-4 w-4 shrink-0 accent-foreground" type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /></label>;
}

function NumberField({ label, suffix, value, onChange }: { label: string; suffix: string; value: number; onChange: (value: number) => void }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span><div className="flex items-center rounded-md border bg-background"><input className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none" type="number" min={0} max={720} step={5} value={value} onChange={event => onChange(Math.min(720, Math.max(0, Number(event.target.value) || 0)))} /><span className="border-l px-3 text-xs text-muted-foreground">{suffix}</span></div></label>;
}
