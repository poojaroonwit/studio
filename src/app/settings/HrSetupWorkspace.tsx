"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ListChecks,
  Maximize2,
  Minus,
  Network,
  Plus,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';

import type { PlatformSetupFeatureStatus } from '@/lib/admin-platform-setup';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { buildEmbeddedSettingsHref } from './admin-center-config-drawer-utils';
import { buildAdminCenterItemHref } from './admin-center-overview-model';
import {
  getDefaultHrSetupItem,
  getHrSetupItemsByLabels,
  getHrSetupReadiness,
  getUniqueHrSetupItems,
  hrSetupMapColumns,
  hrSetupMilestones,
  type HrSetupReadiness,
  type HrSetupView,
} from './hr-setup-workspace-model';
import { getHrSetupRelationships, setupIcons } from './hr-setup-workspace-config';
import type { SettingsPageItem } from './settings-page-model';
import { HrSetupExampleDataControls } from './HrSetupExampleDataControls';

interface SetupStatusResponse {
  features: PlatformSetupFeatureStatus[];
  progress: { completed: number; total: number; percentage: number };
}

export function HrSetupWorkspace({
  items,
  requestedItem,
}: {
  items: SettingsPageItem[];
  requestedItem: SettingsPageItem | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uniqueItems = useMemo(() => getUniqueHrSetupItems(items), [items]);
  const [statuses, setStatuses] = useState<PlatformSetupFeatureStatus[]>([]);
  const [progress, setProgress] = useState<SetupStatusResponse['progress']>();
  const [statusLoading, setStatusLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SettingsPageItem | null>(
    requestedItem ?? getDefaultHrSetupItem(uniqueItems),
  );
  const requestedView = searchParams.get('setupView');
  const view: HrSetupView = requestedView === 'map' ? 'map' : 'guided';

  useEffect(() => {
    if (requestedItem) setSelectedItem(requestedItem);
  }, [requestedItem]);

  const loadSetupStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const response = await fetch('/api/settings/platform-setup/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load setup readiness');
      const payload = await response.json() as SetupStatusResponse;
      setStatuses(payload.features);
      setProgress(payload.progress);
    } catch {
      setProgress(undefined);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetch('/api/settings/platform-setup/status', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load setup readiness');
        return response.json() as Promise<SetupStatusResponse>;
      })
      .then(payload => {
        if (!active) return;
        setStatuses(payload.features);
        setProgress(payload.progress);
      })
      .catch(() => {
        if (active) setProgress(undefined);
      })
      .finally(() => {
        if (active) setStatusLoading(false);
      });
    return () => { active = false; };
  }, []);

  const setView = (nextView: HrSetupView) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('adminTab', 'hr-setup');
    if (nextView === 'map') params.set('setupView', 'map');
    else params.delete('setupView');
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  };

  const selectAndGuide = (item: SettingsPageItem) => {
    setSelectedItem(item);
    setView('guided');
  };

  if (!selectedItem || uniqueItems.length === 0) {
    return <div className="grid min-h-full place-items-center bg-background p-8 text-sm text-muted-foreground">No HR Setup configurations are available for this account.</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card px-4 py-2.5 sm:px-6 lg:px-7">
        <div className="flex w-full flex-col justify-between gap-2.5 md:flex-row md:items-center">
          <div>
            <h1 className="text-lg font-semibold tracking-[-0.02em] text-foreground">HR Setup</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Prepare your HR workspace for launch.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HrSetupExampleDataControls statuses={statuses} onApplied={loadSetupStatus} />
            <div className="flex rounded-md border border-border bg-background p-0.5" aria-label="HR Setup view">
              <ViewButton active={view === 'guided'} icon={ListChecks} onClick={() => setView('guided')}>Guided</ViewButton>
              <ViewButton active={view === 'map'} icon={Network} onClick={() => setView('map')}>Map</ViewButton>
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-0 w-full flex-1">
        {view === 'guided' ? (
          <GuidedSetupView
            items={uniqueItems}
            statuses={statuses}
            progress={progress}
            progressLoading={statusLoading}
            selectedItem={selectedItem}
            onSelect={setSelectedItem}
          />
        ) : (
          <SetupMapView
            items={uniqueItems}
            statuses={statuses}
            selectedItem={selectedItem}
            onSelect={setSelectedItem}
            onConfigure={selectAndGuide}
          />
        )}
      </main>
    </div>
  );
}

function ViewButton({ active, icon: Icon, onClick, children }: { active: boolean; icon: typeof ListChecks; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:text-white'}`}>
      <Icon className="h-3 w-3" /> {children}
    </button>
  );
}

function GuidedSetupView({ items, statuses, progress, progressLoading, selectedItem, onSelect }: { items: SettingsPageItem[]; statuses: PlatformSetupFeatureStatus[]; progress?: SetupStatusResponse['progress']; progressLoading: boolean; selectedItem: SettingsPageItem; onSelect: (item: SettingsPageItem) => void }) {
  const [expandedMilestones, setExpandedMilestones] = useState(() => new Set(hrSetupMilestones.map((_, index) => index)));
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();

  useEffect(() => {
    const activeMilestoneIndex = hrSetupMilestones.findIndex(milestone =>
      (milestone.itemLabels as readonly string[]).includes(selectedItem.label),
    );

    if (activeMilestoneIndex >= 0) {
      setExpandedMilestones(previous => {
        if (previous.has(activeMilestoneIndex)) return previous;
        const next = new Set(previous);
        next.add(activeMilestoneIndex);
        return next;
      });
    }
  }, [selectedItem.label]);

  const toggleMilestone = (index: number) => {
    setExpandedMilestones(previous => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="grid h-full min-h-0 overflow-hidden bg-card lg:grid-cols-[268px_minmax(0,1fr)]">
      <aside className="flex max-h-[38dvh] w-full shrink-0 flex-col overflow-hidden border-b border-border bg-muted/20 dark:border-border dark:bg-background lg:max-h-none lg:w-[268px] lg:border-b-0 lg:border-r">
        <div className="shrink-0 px-3 pb-2 pt-3">
          <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground dark:text-muted-foreground">Configuration</p>
          <label htmlFor="hr-setup-navigation-search" className="sr-only">Search HR setup configuration</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              id="hr-setup-navigation-search"
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search configuration"
              className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-border dark:bg-card"
            />
          </div>
        </div>
        <div className="hidden">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">Launch checklist</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {progressLoading ? 'Checking required tasks…' : progress ? `${progress.completed} of ${progress.total} required tasks complete` : 'Complete one configuration at a time.'}
            </p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-color:rgb(113_113_122)_transparent] [scrollbar-width:thin]">
          <div className="space-y-0">
          {hrSetupMilestones.map((milestone, index) => {
            const milestoneItems = getHrSetupItemsByLabels(items, milestone.itemLabels).filter(item =>
              !normalizedQuery || `${milestone.label} ${item.label} ${item.description}`.toLocaleLowerCase().includes(normalizedQuery),
            );
            if (milestoneItems.length === 0) return null;
            const isExpanded = expandedMilestones.has(index);
            return (
              <section key={milestone.label} className="pb-3">
                <button
                  type="button"
                  onClick={() => toggleMilestone(index)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center px-2 pb-1.5 text-left text-[11px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-muted-foreground"
                >
                  <span className="min-w-0 flex-1 truncate">{milestone.label}</span>
                  <ChevronDown className={cn('hidden h-3 w-3 transition-transform', isExpanded ? 'rotate-180' : '')} />
                </button>
                {isExpanded && (
                  <div className="space-y-0.5">
                    {milestoneItems.map(item => (
                      <ChecklistItem key={`${item.label}-${item.href}`} item={item} readiness={getHrSetupReadiness(item, statuses)} active={item.label === selectedItem.label} onClick={() => onSelect(item)} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          {normalizedQuery && !hrSetupMilestones.some(milestone =>
            getHrSetupItemsByLabels(items, milestone.itemLabels).some(item =>
              `${milestone.label} ${item.label} ${item.description}`.toLocaleLowerCase().includes(normalizedQuery),
            ),
          ) && <p className="px-2 py-8 text-center text-xs text-muted-foreground">No configurations found.</p>}
          </div>
        </div>
        <div className="hidden">
          <div className="flex items-start gap-2.5"><BookOpen className="mt-0.5 h-4 w-4 text-info" /><div><Link href="/settings/overview" className="inline-flex items-center gap-1 text-[10px] text-info hover:text-info">Review Admin Center <ArrowRight className="h-3 w-3" /></Link></div></div>
        </div>
      </aside>
      <ConfigurationWorkbench item={selectedItem} />
    </div>
  );
}

function ChecklistItem({ item, readiness, active, onClick }: { item: SettingsPageItem; readiness: HrSetupReadiness; active: boolean; onClick: () => void }) {
  void readiness;
  const Icon = setupIcons[item.label] ?? Settings2;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex min-h-10 w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary/10 text-primary dark:bg-blue-950/60 dark:text-blue-200'
          : 'text-foreground hover:bg-muted dark:text-foreground/80 dark:hover:bg-card',
      )}
    >
      <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-md border transition-colors', active ? 'border-primary/20 bg-white/70 text-primary dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300' : 'border-border bg-white text-muted-foreground group-hover:text-primary dark:border-input dark:bg-card dark:text-muted-foreground')}>
        <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium leading-5">{item.label}</span>
      <ChevronRight className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-primary dark:text-blue-300' : 'text-muted-foreground/70')} />
    </button>
  );
}

function ConfigurationWorkbench({ item }: { item: SettingsPageItem }) {
  const embeddedHref = buildEmbeddedSettingsHref(item.href);
  const [loading, setLoading] = useState(true);
  useEffect(() => setLoading(true), [embeddedHref]);
  return (
    <section className="flex min-h-0 min-w-0 flex-col bg-card">
      <div className="relative min-h-0 flex-1 bg-background">
        {loading && <ConfigurationWorkbenchSkeleton label={item.label} />}
        <iframe key={embeddedHref} src={embeddedHref} title={`${item.label} configuration`} onLoad={() => setLoading(false)} className={`absolute inset-0 h-full w-full border-0 bg-background transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`} />
      </div>
    </section>
  );
}

function ConfigurationWorkbenchSkeleton({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 bg-background p-5" aria-busy="true" aria-label={`Loading ${label.toLowerCase()} configuration`}>
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="space-y-2"><Skeleton className="h-4 w-44 rounded-md bg-muted" /><Skeleton className="h-3 w-72 max-w-full rounded-md bg-muted/50" /></div>
          <Skeleton className="h-8 w-24 rounded-md bg-muted" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2 rounded-md border border-border bg-card p-3">
            <Skeleton className="h-3 w-24 rounded-md bg-muted" />
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className={`h-9 rounded-md bg-muted ${index === 1 ? 'w-[88%]' : 'w-full'}`} />)}
          </div>
          <div className="space-y-4 rounded-md border border-border bg-card p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2 border-b border-border pb-4 last:border-b-0"><Skeleton className="h-3 w-36 rounded-md bg-muted" /><Skeleton className="h-3 w-64 max-w-full rounded-md bg-muted/50" /><Skeleton className="h-9 w-full rounded-md bg-muted" /></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupMapView({ items, statuses, selectedItem, onSelect, onConfigure }: { items: SettingsPageItem[]; statuses: PlatformSetupFeatureStatus[]; selectedItem: SettingsPageItem; onSelect: (item: SettingsPageItem) => void; onConfigure: (item: SettingsPageItem) => void }) {
  const [query, setQuery] = useState('');
  const [dialogItem, setDialogItem] = useState<SettingsPageItem | null>(null);
  const ready = items.filter(item => getHrSetupReadiness(item, statuses) === 'ready').length;
  const attention = items.filter(item => getHrSetupReadiness(item, statuses) === 'attention').length;
  const available = items.length - ready - attention;
  const openConfiguration = (item: SettingsPageItem) => { onSelect(item); setDialogItem(item); };
  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <label className="relative block w-full sm:max-w-[430px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={event => setQuery(event.target.value)} aria-label="Search HR setup" placeholder="Search HR setup" className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-info focus:ring-1 focus:ring-info" />
        </label>
        <div className="flex items-center gap-5 text-[11px] text-muted-foreground"><span className="mr-1 text-muted-foreground">Legend</span><LegendDot color="#55cc75" label="Ready" /><LegendDot color="#f0b54e" label="Needs review" /><LegendDot color="#7e8b9d" label="Available" /></div>
      </div>
      <div className="grid min-h-[610px] gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div><h2 className="text-sm font-semibold text-foreground">HR configuration map</h2><p className="mt-0.5 text-[10px] text-muted-foreground">Dependencies and downstream impact across your HR workspace</p></div>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground"><span>{items.length} configurations</span><span>{ready} ready</span><span>{attention} need review</span><span>{available} available</span></div>
          </div>
          <div className="relative flex-1 overflow-x-auto bg-background">
            <div className="grid min-h-[500px] min-w-[860px] grid-cols-4">
              {hrSetupMapColumns.map((column, columnIndex) => {
                const columnItems = getHrSetupItemsByLabels(items, column.itemLabels).filter(item => item.label.toLowerCase().includes(query.trim().toLowerCase()));
                return (
                  <section key={column.label} className={`relative px-4 py-5 ${columnIndex ? 'border-l border-border' : ''}`}>
                    <div className="mb-6 flex h-5 items-center gap-2"><MapColumnIcon index={columnIndex} /><h3 className="text-xs font-semibold text-foreground">{column.label}</h3></div>
                    <div className="relative space-y-4">
                      {columnItems.map((item, itemIndex) => (
                        <div key={`${item.label}-${item.href}`} className="relative">
                          {columnIndex > 0 && itemIndex === 0 && <span className="absolute -left-[31px] top-1/2 hidden h-px w-7 -translate-y-1/2 bg-muted-foreground/50 lg:block" />}
                          {columnIndex < hrSetupMapColumns.length - 1 && itemIndex === Math.min(1, columnItems.length - 1) && <span className="absolute -right-[31px] top-1/2 z-10 hidden items-center lg:flex"><span className="h-px w-5 bg-muted-foreground/50" /><ChevronRight className="-ml-1 h-3.5 w-3.5 text-muted-foreground" /></span>}
                          <MapNode item={item} readiness={getHrSetupReadiness(item, statuses)} active={item.label === selectedItem.label} onClick={() => openConfiguration(item)} />
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
          <div className="flex h-12 shrink-0 items-center justify-between border-t border-border bg-card px-3">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><span>View by:</span><button type="button" className="inline-flex h-7 items-center gap-2 rounded border border-border bg-card px-2.5 text-foreground/80">Dependencies <ChevronDown className="h-3 w-3" /></button></div>
            <div className="flex items-center"><MapToolButton label="Zoom out" icon={Minus} /><span className="grid h-7 min-w-11 place-items-center border-y border-border text-[10px] tabular-nums text-muted-foreground">100%</span><MapToolButton label="Zoom in" icon={Plus} /><button type="button" className="ml-2 inline-flex h-7 items-center gap-1.5 rounded border border-border px-2.5 text-[10px] text-muted-foreground"><Maximize2 className="h-3 w-3" />Fit to view</button></div>
          </div>
        </section>
        <MapDetail item={selectedItem} items={items} statuses={statuses} readiness={getHrSetupReadiness(selectedItem, statuses)} onSelect={onSelect} onConfigure={() => onConfigure(selectedItem)} />
      </div>
      <MapConfigurationDialog item={dialogItem} readiness={dialogItem ? getHrSetupReadiness(dialogItem, statuses) : 'available'} onOpenChange={open => { if (!open) setDialogItem(null); }} />
    </div>
  );
}

function MapConfigurationDialog({ item, readiness, onOpenChange }: { item: SettingsPageItem | null; readiness: HrSetupReadiness; onOpenChange: (open: boolean) => void }) {
  const [loading, setLoading] = useState(true);
  const embeddedHref = item ? buildEmbeddedSettingsHref(item.href) : '';
  const Icon = item ? setupIcons[item.label] ?? Settings2 : Settings2;
  useEffect(() => setLoading(true), [embeddedHref]);
  return (
    <Dialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(820px,88vh)] max-w-[1120px] flex-col gap-0 overflow-hidden border-border bg-card p-0 text-foreground sm:max-w-[min(1120px,94vw)]">
        {item && (
          <>
            <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-14 text-left">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-info/10 text-info"><Icon className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><DialogTitle className="text-base text-foreground">Configure {item.label}</DialogTitle><StatusLabel readiness={readiness} /></div><DialogDescription className="mt-1 max-w-2xl text-[11px] leading-5 text-muted-foreground">{item.description}</DialogDescription></div>
                </div>
                <Link href={buildAdminCenterItemHref(item)} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border px-3 text-[11px] font-semibold text-info hover:bg-info/10">Open full page <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            </DialogHeader>
            <div className="relative min-h-0 flex-1 bg-background">
              {loading && <ConfigurationWorkbenchSkeleton label={item.label} />}
              <iframe key={embeddedHref} src={embeddedHref} title={`${item.label} configuration dialog`} onLoad={() => setLoading(false)} className={`absolute inset-0 h-full w-full border-0 bg-background transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MapColumnIcon({ index }: { index: number }) {
  const Icon = [Building2, UsersRound, ShieldCheck, BriefcaseBusiness][index] ?? Network;
  return <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.6} />;
}

function MapToolButton({ label, icon: Icon }: { label: string; icon: typeof Minus }) {
  return <button type="button" aria-label={label} className="grid h-7 w-7 place-items-center border border-border text-muted-foreground"><Icon className="h-3 w-3" /></button>;
}

function MapNode({ item, readiness, active, onClick }: { item: SettingsPageItem; readiness: HrSetupReadiness; active: boolean; onClick: () => void }) {
  const Icon = setupIcons[item.label] ?? Settings2;
  return (
    <button type="button" onClick={onClick} className={`min-h-[72px] w-full rounded-md border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info ${active ? 'border-info bg-info/10' : readiness === 'available' ? 'border-dashed border-border bg-muted/50 hover:border-info' : 'border-border bg-card hover:border-info hover:bg-muted'}`}>
      <div className="flex items-center gap-2.5"><Icon className={`h-4 w-4 shrink-0 ${active ? 'text-info' : 'text-muted-foreground'}`} strokeWidth={1.7} /><span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">{item.label}</span></div>
      <div className="mt-2 pl-6"><StatusLabel readiness={readiness} compact /></div>
    </button>
  );
}

function MapDetail({ item, items, statuses, readiness, onSelect, onConfigure }: { item: SettingsPageItem; items: SettingsPageItem[]; statuses: PlatformSetupFeatureStatus[]; readiness: HrSetupReadiness; onSelect: (item: SettingsPageItem) => void; onConfigure: () => void }) {
  const Icon = setupIcons[item.label] ?? Settings2;
  const relationships = getHrSetupRelationships(item.label);
  const relatedItems = items.filter(candidate => relationships.related.includes(candidate.label)).slice(0, 2);
  return (
    <aside className="flex min-h-[610px] flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4"><div className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 text-info" strokeWidth={1.7} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-foreground">{item.label}</h2><StatusLabel readiness={readiness} /></div><p className="mt-2 text-[11px] leading-5 text-muted-foreground">{item.description}</p></div></div></div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <section><h3 className="text-[11px] font-semibold text-foreground">Dependencies</h3><p className="mt-1 text-[10px] text-muted-foreground">This configuration depends on:</p><div className="mt-2 space-y-2">{relatedItems.length ? relatedItems.map(related => <RelationshipCard key={related.label} item={related} readiness={getHrSetupReadiness(related, statuses)} onClick={() => onSelect(related)} />) : <p className="rounded border border-border p-3 text-[10px] text-muted-foreground">{relationships.dependsOn}</p>}</div></section>
        <section className="border-t border-border pt-4"><h3 className="text-[11px] font-semibold text-foreground">Downstream use</h3><p className="mt-1 text-[10px] text-muted-foreground">Used by the following configurations:</p><div className="mt-2"><RelationshipCard item={item} readiness={readiness} labelOverride={relationships.usedBy} onClick={onConfigure} /></div></section>
        <section className="border-t border-border pt-4"><div className="flex items-center gap-2"><h3 className="text-[11px] font-semibold text-foreground">Status</h3><StatusLabel readiness={readiness} compact /></div><p className="mt-2 text-[10px] leading-4 text-muted-foreground">{readiness === 'ready' ? 'Configuration checks are complete and connected workflows can use this setup.' : readiness === 'attention' ? 'Review this setup and its connected rules before launch.' : 'This setup is available and has no automated readiness signal yet.'}</p><p className="mt-3 text-[9px] text-muted-foreground">Last reviewed&nbsp;&nbsp; 11 Aug 2026 by Admin User</p></section>
      </div>
      <div className="border-t border-border p-4"><button type="button" onClick={onConfigure} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-[11px] font-semibold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Save className="h-3.5 w-3.5" />Review {item.label.toLowerCase()} setup <ChevronRight className="h-3.5 w-3.5" /></button><Link href={buildAdminCenterItemHref(item)} className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border text-[10px] font-semibold text-muted-foreground hover:bg-muted">View change history</Link></div>
    </aside>
  );
}

function RelationshipCard({ item, readiness, onClick, labelOverride }: { item: SettingsPageItem; readiness: HrSetupReadiness; onClick: () => void; labelOverride?: string }) {
  const Icon = setupIcons[item.label] ?? Settings2;
  return <button type="button" onClick={onClick} className="flex min-h-10 w-full items-center gap-2 rounded border border-border bg-card px-3 text-left hover:border-info"><Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-[10px] font-medium text-foreground/80">{labelOverride ?? item.label}</span><StatusLabel readiness={readiness} compact /><ChevronRight className="h-3 w-3 text-muted-foreground" /></button>;
}

function ReadinessIcon({ readiness }: { readiness: HrSetupReadiness }) {
  if (readiness === 'ready') return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />;
  if (readiness === 'attention') return <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

function StatusLabel({ readiness, compact = false }: { readiness: HrSetupReadiness; compact?: boolean }) {
  const content = readiness === 'ready' ? { label: 'Ready', className: 'text-success' } : readiness === 'attention' ? { label: 'Needs review', className: 'text-warning' } : { label: 'Available', className: 'text-muted-foreground' };
  return <span className={`${compact ? 'text-[10px]' : 'rounded border border-current px-1.5 py-0.5 text-[9px]'} whitespace-nowrap font-semibold ${content.className}`}>{content.label}</span>;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>;
}
