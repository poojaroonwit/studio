"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  BadgeCheck,
  Bell,
  Blocks,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CalendarOff,
  ChevronRight,
  ClipboardCheck,
  CircleDollarSign,
  CreditCard,
  DoorOpen,
  DownloadCloud,
  Files,
  GitBranch,
  History,
  Database,
  Images,
  KeyRound,
  Languages,
  ListPlus,
  Lock,
  LockKeyhole,
  LogIn,
  Logs,
  Mail,
  MapPin,
  MessageSquareCode,
  Network,
  Palette,
  PanelsTopLeft,
  Plus,
  ScrollText,
  Settings,
  ShieldCheck,
  Tags,
  ToggleRight,
  UserRoundCog,
  Users,
  UsersRound,
  Webhook,
} from 'lucide-react';

import {
  getAdminCenterTabFromSlug,
  type AdminCenterTab,
  type SettingsPageItem,
} from './settings-page-model';
import { buildEmbeddedSettingsHref } from './admin-center-config-drawer-utils';
import { OPEN_FIELD_CREATION_EVENT } from './field-management/field-management-events';
import {
  CREATE_APPLICANT_SOURCE_EVENT,
  LOAD_APPLICANT_SOURCES_EVENT,
} from './applicant-sources/applicant-sources-events';
import { OPEN_SYSTEM_API_KEY_CREATION_EVENT } from '../../components/settings/system-api-key-events';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/utils';

export function SettingsPageView({
  accessibleItems,
  isLoading,
}: {
  accessibleItems: SettingsPageItem[];
  isLoading: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedSystemTab = searchParams.get('systemTab');
  const requestedConfig = searchParams.get('config');
  const requestedSystemItem = requestedSystemTab
    ? accessibleItems.find(item => (
        item.href.startsWith('/settings/system-settings')
        && new URL(item.href, 'https://admin.local').searchParams.get('tab') === requestedSystemTab
      ))
    : null;
  const requestedConfigItem = requestedConfig
    ? accessibleItems.find(item => item.href.split('?', 1)[0] === `/settings/${requestedConfig}`)
    : null;
  const activeTab = searchParams.has('adminTab')
    ? getAdminCenterTabFromSlug(searchParams.get('adminTab'))
    : requestedSystemItem?.tab ?? requestedConfigItem?.tab ?? getAdminCenterTabFromSlug(null);
  const [selectedItemKey, setSelectedItemKey] = useState('');
  const sections = useMemo(
    () => buildSettingsSections(accessibleItems.filter(item => item.tab === activeTab)),
    [accessibleItems, activeTab],
  );
  const visibleItems = useMemo(
    () => sections.flatMap(section => section.items),
    [sections],
  );
  const selectedItem = visibleItems.find(item => getSettingsItemKey(item) === selectedItemKey)
    ?? (requestedSystemItem?.tab === activeTab ? requestedSystemItem : null)
    ?? (requestedConfigItem?.tab === activeTab ? requestedConfigItem : null)
    ?? visibleItems[0]
    ?? null;
  useEffect(() => {
    if (requestedConfigItem?.tab === activeTab) {
      setSelectedItemKey(getSettingsItemKey(requestedConfigItem));
    }
  }, [activeTab, requestedConfigItem]);

  useEffect(() => {
    if (isLoading || visibleItems.length === 0) return;

    const prefetchVisibleItems = () => {
      visibleItems.forEach(item => {
        router.prefetch(buildEmbeddedSettingsHref(item.href));
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(prefetchVisibleItems, { timeout: 1500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(prefetchVisibleItems, 300);
    return () => globalThis.clearTimeout(timeoutId);
  }, [isLoading, router, visibleItems]);

  if (isLoading) {
    return <SettingsPageLoadingState />;
  }

  return (
    <div className="settings-page-grid flex h-full min-h-0 flex-col text-[#20242c] dark:text-zinc-100">
      <header className="shrink-0 border-b border-[#d9dde5] bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5">
        <div>
          <h1 className="text-base font-semibold tracking-[-0.01em]">Admin Center</h1>
          <p className="mt-0.5 text-xs text-[#777c86] dark:text-zinc-400">
            Manage organization settings, access, integrations, and platform behavior.
          </p>
        </div>
      </header>

      {accessibleItems.length === 0 ? (
        <SettingsPageEmptyState />
      ) : sections.length === 0 || !selectedItem ? (
        <SettingsTabEmptyState tab={activeTab} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <SettingsConfigurationSidebar
            activeItem={selectedItem}
            sections={sections}
            onPrefetchItem={(item) => router.prefetch(buildEmbeddedSettingsHref(item.href))}
            onSelectItem={(item) => setSelectedItemKey(getSettingsItemKey(item))}
          />
          <main className="min-h-[560px] min-w-0 flex-1 overflow-hidden lg:min-h-0">
            <InlineAdminCenterConfig item={selectedItem} flush />
          </main>
        </div>
      )}
    </div>
  );
}

function SettingsConfigurationSidebar({
  activeItem,
  sections,
  onPrefetchItem,
  onSelectItem,
}: {
  activeItem: SettingsPageItem;
  sections: ReturnType<typeof buildSettingsSections>;
  onPrefetchItem: (item: SettingsPageItem) => void;
  onSelectItem: (item: SettingsPageItem) => void;
}) {
  return (
    <aside className="max-h-[38dvh] w-full shrink-0 overflow-y-auto border-b border-[#d9dde5] bg-[#fbfbfc] px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950 lg:max-h-none lg:w-[268px] lg:border-b-0 lg:border-r">
      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a909b] dark:text-zinc-500">
        Configuration
      </p>
      <div className="space-y-4">
        {sections.map(section => (
          <section key={section.label}>
            <h2 className="px-2 pb-1.5 text-[11px] font-medium text-[#777c86] dark:text-zinc-400">
              {section.label}
            </h2>
            <div className="space-y-0.5">
              {section.items.map(item => (
                <SettingsSidebarItem
                  key={`${item.tab}-${item.section}-${item.label}`}
                  item={item}
                  active={getSettingsItemKey(item) === getSettingsItemKey(activeItem)}
                  onPrefetchItem={onPrefetchItem}
                  onSelectItem={onSelectItem}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

function InlineAdminCenterConfig({
  item,
  flush = false,
}: {
  item: SettingsPageItem;
  flush?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const embeddedHref = useMemo(() => buildEmbeddedSettingsHref(item.href), [item.href]);
  const ItemIcon = getSettingsItemIcon(item.label);
  const isFieldManagement = item.href.split('?', 1)[0] === '/settings/field-management';
  const isApplicantSources = item.href.split('?', 1)[0] === '/settings/applicant-sources';
  const isSystemApiKeys = item.href.startsWith('/settings/system-settings')
    && new URL(item.href, 'https://admin.local').searchParams.get('tab') === 'system-api-keys';

  useEffect(() => {
    setIsLoading(true);
  }, [embeddedHref]);

  const openFieldCreationForm = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: OPEN_FIELD_CREATION_EVENT },
      window.location.origin,
    );
  };

  const openSystemApiKeyCreationDialog = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: OPEN_SYSTEM_API_KEY_CREATION_EVENT },
      window.location.origin,
    );
  };

  const sendApplicantSourcesEvent = (
    type: typeof CREATE_APPLICANT_SOURCE_EVENT | typeof LOAD_APPLICANT_SOURCES_EVENT,
    environment?: 'development' | 'production',
  ) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type, environment },
      window.location.origin,
    );
  };

  return (
    <section
      className={cn(
        "flex min-h-[520px] flex-col overflow-hidden bg-white dark:bg-zinc-900",
        flush
          ? "h-full min-h-0"
          : "h-[calc(100dvh-170px)] rounded-[4px] border border-[#dfe2e8] shadow-[0_1px_3px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:shadow-none",
      )}
    >
      <div className="shrink-0 border-b border-[#dfe2e8] bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] border border-[#e1e6ed] bg-[#f7f9fc] text-[#55709a] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <ItemIcon className="h-4 w-4" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[13px] font-semibold leading-4 tracking-normal">{item.label}</h2>
              <p className="mt-0.5 truncate text-xs leading-4 text-[#777c86] dark:text-zinc-400">
                {item.description}
              </p>
            </div>
          </div>
          {isFieldManagement && (
            <Button className="shrink-0" size="sm" disabled={isLoading} onClick={openFieldCreationForm}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Field
            </Button>
          )}
          {isSystemApiKeys && (
            <Button className="shrink-0" size="sm" disabled={isLoading} onClick={openSystemApiKeyCreationDialog}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create API Key
            </Button>
          )}
          {isApplicantSources && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => sendApplicantSourcesEvent(LOAD_APPLICANT_SOURCES_EVENT, 'development')}
              >
                <DownloadCloud className="mr-1.5 h-4 w-4" />
                Load development settings
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => sendApplicantSourcesEvent(LOAD_APPLICANT_SOURCES_EVENT, 'production')}
              >
                <DownloadCloud className="mr-1.5 h-4 w-4" />
                Load live settings
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isLoading}
                onClick={() => sendApplicantSourcesEvent(CREATE_APPLICANT_SOURCE_EVENT)}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Source
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-[#f5f6f9] dark:bg-zinc-950">
        {isLoading && <InlineAdminCenterConfigSkeleton />}
        <iframe
          ref={iframeRef}
          key={embeddedHref}
          src={embeddedHref}
          title={`${item.label} configuration`}
          className={cn(
            "absolute inset-0 block h-full w-full border-0 bg-background transition-opacity",
            isLoading ? "opacity-0" : "opacity-100",
          )}
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </section>
  );
}

function InlineAdminCenterConfigSkeleton() {
  return (
    <div className="absolute inset-0 z-10 bg-[#f5f6f9] p-4 dark:bg-zinc-950" aria-busy="true" aria-label="Loading branding configuration">
      <div className="mx-auto h-full max-w-[1040px] space-y-4">
        <section className="rounded-[6px] border border-[#dfe2e8] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Skeleton className="h-4 w-44 rounded-[4px]" />
          <Skeleton className="mt-2 h-3 w-80 max-w-full rounded-[4px]" />
        </section>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden rounded-[6px] border border-[#dfe2e8] bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 lg:block">
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className={index % 2 === 0 ? "h-9 w-full rounded-[4px]" : "h-9 w-[84%] rounded-[4px]"} />
              ))}
            </div>
          </aside>

          <main className="space-y-3 rounded-[6px] border border-[#dfe2e8] bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid gap-3 rounded-[4px] border border-[#eef0f4] p-3 dark:border-zinc-800 md:grid-cols-[minmax(0,1fr)_240px]">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-36 rounded-[4px]" />
                  <Skeleton className="h-3 w-64 max-w-full rounded-[4px]" />
                </div>
                <Skeleton className="h-9 rounded-[4px]" />
              </div>
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}

function SettingsPageLoadingState() {
  return (
    <div className="settings-page-grid flex min-h-full flex-col bg-[#f5f6f9] px-4 py-5 dark:bg-zinc-950 sm:px-5" aria-busy="true" aria-label="Loading settings">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32 rounded-[4px]" />
        <Skeleton className="h-3 w-72 max-w-full rounded-[4px]" />
      </div>
      <main className="mt-5 space-y-4">
        {Array.from({ length: 3 }).map((_, sectionIndex) => (
          <section key={sectionIndex} className="overflow-hidden rounded-[4px] border border-[#dfe2e8] bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-[#dfe2e8] bg-[#fbfbfc] px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <Skeleton className="h-4 w-36 rounded-[4px]" />
            </div>
            <div>
              {Array.from({ length: sectionIndex === 0 ? 4 : 3 }).map((__, rowIndex) => (
                <div key={rowIndex} className="flex min-h-[64px] items-center gap-3 border-b border-[#eceef2] px-4 py-3 last:border-b-0 dark:border-zinc-800">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-[4px]" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3 w-40 rounded-[4px]" />
                    <Skeleton className="h-3 w-72 max-w-full rounded-[4px]" />
                  </div>
                  <Skeleton className="h-7 w-20 rounded-[3px]" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function SettingsSidebarItem({
  item,
  active,
  onPrefetchItem,
  onSelectItem,
}: {
  item: SettingsPageItem;
  active: boolean;
  onPrefetchItem: (item: SettingsPageItem) => void;
  onSelectItem: (item: SettingsPageItem) => void;
}) {
  const ItemIcon = getSettingsItemIcon(item.label);

  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      className={cn(
        "group flex min-h-10 w-full items-center gap-2.5 rounded-[4px] px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        active
          ? "bg-[#eaf1fa] text-[#245b9e] dark:bg-blue-950/60 dark:text-blue-200"
          : "text-[#3d424b] hover:bg-[#eef1f5] dark:text-zinc-300 dark:hover:bg-zinc-900",
      )}
      onFocus={() => onPrefetchItem(item)}
      onMouseEnter={() => onPrefetchItem(item)}
      onClick={() => onSelectItem(item)}
    >
      <span className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded-[4px] border transition-colors",
        active
          ? "border-[#cbdaf0] bg-white/70 text-[#2f6db2] dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
          : "border-[#e1e6ed] bg-white text-[#69778b] group-hover:text-[#315f9f] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
      )}>
        <ItemIcon className="h-3.5 w-3.5" strokeWidth={1.7} />
      </span>

      <span className="min-w-0 flex-1 truncate text-[12px] font-medium leading-5">
        {item.label}
      </span>
      <ChevronRight className={cn("h-3.5 w-3.5 shrink-0", active ? "text-[#2f6db2] dark:text-blue-300" : "text-[#a1a7b0]")} />
    </button>
  );
}

type SettingsItemIcon = ComponentType<{
  className?: string;
  strokeWidth?: number | string;
}>;

const settingsItemIcons: Record<string, SettingsItemIcon> = {
  'Company Info': Building2,
  Department: Network,
  Designation: BriefcaseBusiness,
  Branch: MapPin,
  'Leave Policies': CalendarDays,
  'Policy Documents': Files,
  'Onboarding Checklist': ClipboardCheck,
  'Service Desk Categories': UsersRound,
  'Company References': Building2,
  'Cost Centers & Projects': CircleDollarSign,
  'Platform Defaults': Settings,
  'Dropdown Options': ListPlus,
  'Course Categories': Tags,
  'Headcount Types': UsersRound,
  'Headcount Approval Paths': GitBranch,
  Grades: BadgeCheck,
  'Position Levels': ListPlus,
  'Holiday List': CalendarDays,
  'Leave Block List': CalendarOff,
  'Employee Document': Files,
  'Active Users': Users,
  'Roles & Permissions': ShieldCheck,
  'User Teams': UsersRound,
  'Default User Role': UserRoundCog,
  'Employee Account Role': UserRoundCog,
  'Job Portal Workspace': PanelsTopLeft,
  'Portal CMS': Files,
  'Portal Builder': Blocks,
  'Portal Assets': Images,
  'Publish History': History,
  Branding: Images,
  'General Preferences': Settings,
  Appearance: Palette,
  'Sidebar Theme': PanelsTopLeft,
  'Evaluation Theme': ClipboardCheck,
  Localization: Languages,
  'PWA Settings': PanelsTopLeft,
  'Field Management': ListPlus,
  'Recruitment Stages': GitBranch,
  'Applicant Sources': Tags,
  'Evaluation Configuration': ClipboardCheck,
  'Notification Settings': Bell,
  'Broadcast Channels': Bell,
  'Email Server': Mail,
  'Email Templates': Files,
  Webhooks: Webhook,
  'Meeting Rooms': DoorOpen,
  'AI Prompt Library': MessageSquareCode,
  'AI Processing': Bot,
  'Match Criteria': ClipboardCheck,
  'AI Search': Bot,
  'AI API Keys': KeyRound,
  'AI Processing Prompts': MessageSquareCode,
  'Digital Footprint Screening': ShieldCheck,
  'Knowledge Base': Database,
  'Position Auto-Close': CalendarOff,
  'Azure Integration': LogIn,
  'Login Methods': LogIn,
  'Domain Verification': BadgeCheck,
  'Security Controls': LockKeyhole,
  'Security Logs': ScrollText,
  'Feature Flags': ToggleRight,
  Billing: CreditCard,
  'API Documentation': BookOpen,
  'API Keys': KeyRound,
  'Application Logs': Logs,
  'System Monitoring': Activity,
  'System Status': ShieldCheck,
};

export function getSettingsItemIcon(label: string): SettingsItemIcon {
  return settingsItemIcons[label] ?? Settings;
}

export function hasSettingsItemIcon(label: string) {
  return Object.hasOwn(settingsItemIcons, label);
}

export function getSettingsItemKey(item: SettingsPageItem) {
  return `${item.tab}:${item.section}:${item.label}:${item.href}`;
}

function SettingsPageEmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
      <Lock className="h-7 w-7 text-slate-400" />
      <h2 className="mt-3 text-sm font-semibold">No settings available</h2>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[#777c86]">
        You do not have permission to access Admin Center settings.
      </p>
    </div>
  );
}

function SettingsTabEmptyState({ tab }: { tab: AdminCenterTab }) {
  return (
    <section className="rounded-[4px] border border-[#dfe2e8] bg-white px-5 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold">{tab}</h2>
      <p className="mt-1 text-xs text-[#777c86] dark:text-zinc-400">
        No settings in this category are available for your role.
      </p>
    </section>
  );
}

function buildSettingsSections(items: SettingsPageItem[]) {
  const sectionOrder = new Map<string, number>();

  items.forEach(item => {
    if (!sectionOrder.has(item.section)) {
      sectionOrder.set(item.section, sectionOrder.size);
    }
  });

  return Array.from(sectionOrder.keys()).map(label => ({
    label,
    items: items.filter(item => item.section === label),
  }));
}
