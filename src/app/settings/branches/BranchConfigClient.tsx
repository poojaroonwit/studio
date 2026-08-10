"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Building2, Check, ExternalLink, Loader2, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface BranchConfigItem {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  phone: string;
  manager: string;
  latitude: number | null;
  longitude: number | null;
  geofenceRadiusKm: number;
  isDefault: boolean;
  isActive: boolean;
}

interface BranchConfigResponse {
  branches?: BranchConfigItem[];
  message?: string;
}

interface LocationSearchResult {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
}

const emptyBranch = (): BranchConfigItem => ({
  id: crypto.randomUUID(),
  name: '',
  code: '',
  address: '',
  city: '',
  country: '',
  timezone: 'Asia/Bangkok',
  phone: '',
  manager: '',
  latitude: null,
  longitude: null,
  geofenceRadiusKm: 0.5,
  isDefault: false,
  isActive: true,
});

const starterBranches: BranchConfigItem[] = [
  {
    id: 'branch-bkk-hq',
    name: 'Bangkok HQ',
    code: 'BKK-HQ',
    address: '',
    city: 'Bangkok',
    country: 'Thailand',
    timezone: 'Asia/Bangkok',
    phone: '',
    manager: '',
    latitude: null,
    longitude: null,
    geofenceRadiusKm: 0.5,
    isDefault: true,
    isActive: true,
  },
];

export function BranchConfigClient() {
  const [branches, setBranches] = useState<BranchConfigItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'invalid' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const lastSavedSnapshot = useRef('');
  const branchesRef = useRef(branches);
  branchesRef.current = branches;

  const selectedBranch = useMemo(
    () => branches.find(branch => branch.id === selectedId) || branches[0] || null,
    [branches, selectedId],
  );
  const activeCount = branches.filter(branch => branch.isActive).length;

  useEffect(() => {
    let isMounted = true;

    async function loadBranches() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/settings/branches', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({})) as BranchConfigResponse;
        if (!response.ok) throw new Error(payload.message || 'Failed to load branch config');

        const nextBranches = payload.branches?.length ? payload.branches : starterBranches;
        if (!isMounted) return;
        lastSavedSnapshot.current = JSON.stringify(nextBranches);
        setBranches(nextBranches);
        setSelectedId(nextBranches[0]?.id ?? null);
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load branch config');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const snapshot = JSON.stringify(branches);
    if (snapshot === lastSavedSnapshot.current) return;

    const invalidBranch = branches.find(branch => !branch.name.trim() || !branch.code.trim());
    if (invalidBranch) {
      setSaveStatus('invalid');
      return;
    }

    setSaveStatus('pending');
    setError(null);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const response = await fetch('/api/settings/branches', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branches }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({})) as BranchConfigResponse;
        if (!response.ok) throw new Error(payload.message || 'Failed to save branch config');

        lastSavedSnapshot.current = JSON.stringify(payload.branches || branches);
        if (JSON.stringify(branchesRef.current) === snapshot) setSaveStatus('saved');
      } catch (saveError) {
        if (controller.signal.aborted) return;
        setSaveStatus('error');
        setError(saveError instanceof Error ? saveError.message : 'Failed to save branch config');
      }
    }, 700);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [branches, isLoading]);

  function updateBranch(id: string, updates: Partial<BranchConfigItem>) {
    setBranches(current => current.map(branch => (
      branch.id === id ? { ...branch, ...updates } : branch
    )));
  }

  function addBranch() {
    const branch = emptyBranch();
    setBranches(current => [...current, branch]);
    setSelectedId(branch.id);
  }

  function removeBranch(id: string) {
    setBranches(current => {
      const remaining = current.filter(branch => branch.id !== id);
      if (remaining.length > 0 && !remaining.some(branch => branch.isDefault)) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      setSelectedId(remaining[0]?.id ?? null);
      return remaining;
    });
  }

  function setDefaultBranch(id: string) {
    setBranches(current => current.map(branch => ({
      ...branch,
      isDefault: branch.id === id,
      isActive: branch.id === id ? true : branch.isActive,
    })));
  }

  return (
    <main className="min-h-full bg-[#f5f6f9] p-4 text-[#20242c] dark:bg-zinc-950 dark:text-zinc-100 sm:p-5">
      <div className="w-full">
        {error && (
          <div className="mb-4 rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <section className="min-h-[calc(100vh-8rem)] overflow-hidden rounded-[6px] border border-[#dfe2e8] bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <aside className="border-b border-[#dfe2e8] bg-[#fbfbfc] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-[#dfe2e8] px-4 py-3 dark:border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold">Branches</h2>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-[#727782] dark:text-zinc-400">
                  <span>{activeCount} active of {branches.length}</span>
                  <AutoSaveStatus status={saveStatus} />
                </div>
              </div>
              <Button type="button" size="icon" variant="outline" aria-label="Add branch" onClick={addBranch}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-2 p-2 sm:grid-cols-2 xl:grid-cols-4">
              {isLoading ? (
                <div className="p-3 text-sm text-[#727782]">Loading branches...</div>
              ) : branches.length === 0 ? (
                <button type="button" className="w-full rounded-[6px] border border-dashed p-4 text-sm text-[#727782]" onClick={addBranch}>
                  Add your first branch
                </button>
              ) : (
                branches.map(branch => (
                  <button
                    key={branch.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[6px] border p-3 text-left transition",
                      selectedBranch?.id === branch.id
                        ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40"
                        : "border-transparent hover:border-[#dfe2e8] hover:bg-white dark:hover:border-zinc-800 dark:hover:bg-zinc-800",
                    )}
                    onClick={() => setSelectedId(branch.id)}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[5px] bg-white text-[#2563b6] shadow-sm dark:bg-zinc-800">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{branch.name || 'Untitled branch'}</span>
                      <span className="block truncate text-xs text-[#727782]">{branch.code || 'No code'} · {branch.city || 'No city'}</span>
                    </span>
                    {branch.isDefault && <Check className="h-4 w-4 text-emerald-600" />}
                  </button>
                ))
              )}
            </div>
          </aside>

          <div className="p-4 sm:p-6">
            {selectedBranch ? (
              <BranchForm
                branch={selectedBranch}
                canRemove={branches.length > 1}
                onChange={(updates) => updateBranch(selectedBranch.id, updates)}
                onRemove={() => removeBranch(selectedBranch.id)}
                onSetDefault={() => setDefaultBranch(selectedBranch.id)}
              />
            ) : (
              <div className="grid h-full min-h-[360px] place-items-center rounded-[6px] border border-dashed text-sm text-[#727782]">
                Select or add a branch to configure it.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function AutoSaveStatus({ status }: { status: 'idle' | 'pending' | 'saving' | 'saved' | 'invalid' | 'error' }) {
  if (status === 'idle') return null;

  const content = {
    pending: { icon: null, label: 'Unsaved changes', className: 'text-[#727782] dark:text-zinc-400' },
    saving: { icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Saving', className: 'text-[#2563b6] dark:text-blue-400' },
    saved: { icon: <Check className="h-3 w-3" />, label: 'Saved', className: 'text-emerald-600 dark:text-emerald-400' },
    invalid: { icon: <AlertCircle className="h-3 w-3" />, label: 'Name and code required', className: 'text-amber-700 dark:text-amber-400' },
    error: { icon: <AlertCircle className="h-3 w-3" />, label: 'Save failed', className: 'text-red-600 dark:text-red-400' },
  }[status];

  return (
    <span className={cn('inline-flex items-center gap-1', content.className)} aria-live="polite">
      {content.icon}
      {content.label}
    </span>
  );
}

function BranchForm({
  branch,
  canRemove,
  onChange,
  onRemove,
  onSetDefault,
}: {
  branch: BranchConfigItem;
  canRemove: boolean;
  onChange: (updates: Partial<BranchConfigItem>) => void;
  onRemove: () => void;
  onSetDefault: () => void;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [locationResults, setLocationResults] = useState<LocationSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    setLocationResults([]);
    setSearchError(null);
  }, [branch.id]);

  async function searchLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = [branch.address, branch.city, branch.country]
      .map(value => value.trim())
      .filter(Boolean)
      .join(', ');

    if (query.length < 3) {
      setSearchError('Enter a street, building, or place before searching.');
      setLocationResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(`/api/settings/branches/location-search?q=${encodeURIComponent(query)}`);
      const payload = await response.json().catch(() => ({})) as {
        message?: string;
        results?: LocationSearchResult[];
      };
      if (!response.ok) throw new Error(payload.message || 'Unable to search for this location.');

      const results = Array.isArray(payload.results) ? payload.results : [];
      setLocationResults(results);
      if (results.length === 0) setSearchError('No matching locations found. Try a more specific address.');
    } catch (locationError) {
      setLocationResults([]);
      setSearchError(locationError instanceof Error ? locationError.message : 'Unable to search for this location.');
    } finally {
      setIsSearching(false);
    }
  }

  function selectLocation(result: LocationSearchResult) {
    onChange({
      address: result.displayName,
      city: result.city || branch.city,
      country: result.country || branch.country,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setLocationResults([]);
    setSearchError(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-[#eef0f4] pb-4 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{branch.name || 'Untitled branch'}</h2>
            {branch.isDefault && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Default</Badge>}
            {!branch.isActive && <Badge variant="outline">Archived</Badge>}
          </div>
          <p className="text-xs text-[#727782] dark:text-zinc-400">Branch code {branch.code || 'not set'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onSetDefault} disabled={branch.isDefault}>
            Set default
          </Button>
          <Button type="button" variant="outline" className="gap-2 text-red-600 hover:text-red-700" onClick={onRemove} disabled={!canRemove}>
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Branch name" required>
          <Input value={branch.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Bangkok HQ" />
        </Field>
        <Field label="Branch code" required>
          <Input value={branch.code} onChange={(event) => onChange({ code: event.target.value.toUpperCase() })} placeholder="BKK-HQ" />
        </Field>
        <Field label="City">
          <Input value={branch.city} onChange={(event) => onChange({ city: event.target.value, latitude: null, longitude: null })} placeholder="Bangkok" />
        </Field>
        <Field label="Country">
          <Input value={branch.country} onChange={(event) => onChange({ country: event.target.value, latitude: null, longitude: null })} placeholder="Thailand" />
        </Field>
        <Field label="Timezone">
          <Input value={branch.timezone} onChange={(event) => onChange({ timezone: event.target.value })} placeholder="Asia/Bangkok" />
        </Field>
        <Field label="Phone">
          <Input value={branch.phone} onChange={(event) => onChange({ phone: event.target.value })} placeholder="+66..." />
        </Field>
        <Field label="Branch manager">
          <Input value={branch.manager} onChange={(event) => onChange({ manager: event.target.value })} placeholder="Office manager or HR owner" />
        </Field>
        <Field label="Attendance check-in radius (km)">
          <Input type="number" min="0.01" max="100" step="0.01" value={branch.geofenceRadiusKm} onChange={(event) => onChange({ geofenceRadiusKm: Number(event.target.value) })} />
          <p className="text-xs text-[#727782]">Employees must be within this distance of the mapped branch to check in or check out.</p>
        </Field>
        <div className="flex items-center justify-between rounded-[6px] border border-[#dfe2e8] px-3 py-2 dark:border-zinc-800">
          <div>
            <Label className="text-sm font-medium">Active branch</Label>
            <p className="text-xs text-[#727782]">Inactive branches are hidden from day-to-day selectors.</p>
          </div>
          <Switch
            checked={branch.isActive}
            disabled={branch.isDefault}
            onCheckedChange={(checked) => onChange({ isActive: checked })}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <div>
            <Label htmlFor="branch-address" className="text-sm font-medium">Address</Label>
            <p className="mt-0.5 text-xs text-[#727782] dark:text-zinc-400">
              Search for the branch location, then choose the best match to place it on the map.
            </p>
          </div>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={searchLocation}>
            <Input
              id="branch-address"
              value={branch.address}
              onChange={(event) => onChange({ address: event.target.value, latitude: null, longitude: null })}
              placeholder="Street, building, floor, or landmark"
              className="min-w-0 flex-1"
            />
            <Button type="submit" variant="outline" className="shrink-0 gap-2" disabled={isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isSearching ? 'Searching' : 'Search location'}
            </Button>
          </form>

          {searchError && (
            <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400" role="status">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {searchError}
            </p>
          )}

          {locationResults.length > 0 && (
            <div className="overflow-hidden rounded-[6px] border border-[#dfe2e8] bg-white dark:border-zinc-700 dark:bg-zinc-900">
              <div className="border-b border-[#eef0f4] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#727782] dark:border-zinc-800 dark:text-zinc-400">
                Choose a location
              </div>
              <div className="divide-y divide-[#eef0f4] dark:divide-zinc-800">
                {locationResults.map(result => (
                  <button
                    key={result.id}
                    type="button"
                    className="flex w-full items-start gap-3 px-3 py-3 text-left text-sm transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:hover:bg-blue-950/30"
                    onClick={() => selectLocation(result)}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563b6] dark:text-blue-400" />
                    <span>{result.displayName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-[#727782] dark:text-zinc-500">
            Search and map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[#2563b6]">OpenStreetMap contributors</a>.
          </p>
        </div>

        {branch.latitude !== null && branch.longitude !== null && (
          <BranchLocationMap
            branchName={branch.name}
            latitude={branch.latitude}
            longitude={branch.longitude}
          />
        )}
      </div>
    </div>
  );
}

function BranchLocationMap({
  branchName,
  latitude,
  longitude,
}: {
  branchName: string;
  latitude: number;
  longitude: number;
}) {
  const latitudeSpan = 0.008;
  const longitudeSpan = 0.015;
  const mapUrl = new URL('https://www.openstreetmap.org/export/embed.html');
  mapUrl.searchParams.set('bbox', [
    longitude - longitudeSpan,
    latitude - latitudeSpan,
    longitude + longitudeSpan,
    latitude + latitudeSpan,
  ].join(','));
  mapUrl.searchParams.set('layer', 'mapnik');
  mapUrl.searchParams.set('marker', `${latitude},${longitude}`);

  const openMapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;

  return (
    <div className="overflow-hidden rounded-[6px] border border-[#dfe2e8] bg-[#f8fafc] md:col-span-2 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3 border-b border-[#dfe2e8] px-3 py-2 dark:border-zinc-800">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-[#2563b6] dark:text-blue-400" />
          <span className="truncate text-sm font-medium">{branchName || 'Branch'} location</span>
        </div>
        <a
          href={openMapUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#2563b6] hover:underline dark:text-blue-400"
        >
          Open map
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <iframe
        title={`${branchName || 'Branch'} location map`}
        src={mapUrl.toString()}
        className="h-[320px] w-full border-0"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("space-y-1", className)}>
      <span className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
