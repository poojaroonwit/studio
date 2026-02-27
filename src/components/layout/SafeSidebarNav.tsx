"use client"
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { sidebarConfig, iconMap } from "./SidebarNavConfig";
import { Badge } from "@/components/ui/badge";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
  useSidebar,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "next-auth/react";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useHasAssignedPositions } from "@/hooks/use-has-assigned-positions";
import { AssignedPositionsSidebar } from "./AssignedPositionsSidebar";
import {
  Squares2X2Icon as LayoutDashboard,
  UsersIcon as Users,
  BriefcaseIcon as Briefcase,
  Cog6ToothIcon as Settings,
  ClipboardDocumentListIcon as ListTodo,
  CloudArrowUpIcon as UploadCloud,
  ViewColumnsIcon as Kanban,
  ClipboardDocumentCheckIcon as ClipboardCheck
} from "@heroicons/react/24/outline";

// Real-time pending count hook with 1s polling and SSE integration
export const usePendingCount = () => {
  const [pendingCount, setPendingCount] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await fetch('/api/upload-queue/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const queued = Number(data?.queue_stats?.queued || 0);
          const inprocess = Number(data?.queue_stats?.inprocess || 0);
          setPendingCount(queued + inprocess);
          setHasPermission(true);
        } else if (response.status === 403) {
          setPendingCount(null);
          setHasPermission(false);
        } else {
          setPendingCount(null);
          setHasPermission(false);
        }
      } catch (error) {
        setPendingCount(null);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingCount();
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(fetchPendingCount, 30000);

    if (hasPermission !== false) {
      try {
        const eventSource = new EventSource('/api/sse');
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if ((data.type === 'upload_queue_update' || data.type === 'queue') && data.summary) {
              const { queued, inprocess } = data.summary;
              const newPendingCount = Number(queued || 0) + Number(inprocess || 0);
              setPendingCount(newPendingCount);
            }
          } catch (error) {}
        };

        eventSource.onerror = () => {};
      } catch (error) {}
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [hasPermission]);

  return { pendingCount, isLoading };
};

// Helper to check if user has permission for an item
const hasItemPermission = (item: any, isAdmin: boolean, modulePermissions: string[]) => {
  if (isAdmin) return true;
  if (item.adminOnly) return false;
  
  if (item.href === '/dashboard' || item.href === '/') {
    return modulePermissions.includes('DASHBOARD_VIEW');
  }
  if (item.href === '/my-tasks') {
    return modulePermissions.includes('TASK_BOARD_MANAGE_OWN') ||
           modulePermissions.includes('TASK_BOARD_VIEW') ||
           modulePermissions.includes('applicantS_VIEW');
  }
  if (item.href === '/positions') {
    return modulePermissions.includes('POSITIONS_VIEW');
  }
  if (item.href === '/calendar') {
    return modulePermissions.includes('EVALUATION_LINKS_VIEW') ||
           modulePermissions.includes('EVALUATION_LINKS_CREATE_OWN') ||
           modulePermissions.includes('EVALUATION_LINKS_CREATE_ALL') ||
           modulePermissions.includes('EVALUATION_LINKS_MANAGE_OWN') ||
           modulePermissions.includes('EVALUATION_LINKS_MANAGE_ALL');
  }
  if (item.href.startsWith('/settings/users')) {
    return modulePermissions.includes('USERS_MANAGE') || isAdmin;
  }
  if (item.href === '/settings/system-settings' || item.href === '/settings/system-preferences' || item.href === '/settings/system-prompts') {
    return modulePermissions.includes('SYSTEM_SETTINGS_VIEW') || isAdmin;
  }
  if (item.href === '/settings/data-configuration') {
    return modulePermissions.includes('RECRUITMENT_STAGES_VIEW') || isAdmin;
  }
  if (item.href === '/settings/webhooks') {
    return modulePermissions.includes('WEBHOOKS_EDIT') || isAdmin;
  }
  if (item.href === '/settings/logs') {
    return modulePermissions.includes('LOGS_VIEW') || isAdmin;
  }

  return true;
};

// Optimized Link component with minimal click protection
const OptimizedLink = React.memo(({ href, children, ...props }: { href: string; children: React.ReactNode;[key: string]: any }) => {
  const router = useRouter();
  const isNavigatingRef = React.useRef(false);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const handleClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!isMountedRef.current || isNavigatingRef.current) return;

    isNavigatingRef.current = true;
    setTimeout(() => { if (isMountedRef.current) isNavigatingRef.current = false; }, 300);

    try {
      router.push(href);
    } catch (error) {
      window.location.href = href;
    }
  }, [href, router]);

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
});

OptimizedLink.displayName = 'OptimizedLink';

/* ─────────────── Sidebar Rail ─────────────── */
export const SidebarRail = React.memo(({ 
  filteredGroups, 
  activeGroupLabel, 
  hoveredGroupLabel,
  onHubClick,
  onHubHover
}: { 
  filteredGroups: any[]; 
  activeGroupLabel: string | undefined; 
  hoveredGroupLabel: string | undefined;
  onHubClick: (label: string) => void;
  onHubHover: (label: string | undefined) => void;
}) => {
  return (
    <aside className="hidden lg:flex flex-col bg-white dark:bg-zinc-950 border-r border-gray-200/80 dark:border-zinc-800/80 z-40 flex-shrink-0 w-[68px]">
      {/* Spacer to align below header */}
      <div className="h-4" />

      {/* Hub Navigation */}
      <nav className="flex-1 py-4 flex flex-col items-center space-y-1.5">
        {filteredGroups.filter(g => g.label !== 'Settings').map((group) => {
          const isHubActive = activeGroupLabel === group.label;
          const isHubHovered = hoveredGroupLabel === group.label;
          const isEffectivelyActive = isHubHovered || (isHubActive && !hoveredGroupLabel);
          return (
            <TooltipProvider key={group.label} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onHubClick(group.label)}
                    onMouseEnter={() => onHubHover(group.label)}
                    className={cn(
                      "group relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-250",
                      isEffectivelyActive
                        ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-white shadow-sm"
                        : "text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                    )}
                  >
                    {/* Active indicator bar */}
                    {isEffectivelyActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full" />
                    )}
                    <group.icon className={cn(
                      "w-5 h-5 flex-shrink-0 transition-all duration-200",
                      isEffectivelyActive ? "text-blue-600 dark:text-white" : "group-hover:scale-105"
                    )} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="bg-slate-900/90 text-slate-50 backdrop-blur-xl border-slate-800/50 shadow-2xl px-3 py-1.5 rounded-xl">
                  <p className="font-bold text-[10px] uppercase tracking-widest">{group.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="py-4 flex flex-col items-center space-y-1.5 border-t border-gray-100 dark:border-zinc-800/80">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            {(() => {
              const isSettingsActive = activeGroupLabel === 'Settings';
              const isSettingsHovered = hoveredGroupLabel === 'Settings';
              const isEffectivelyActive = isSettingsHovered || (isSettingsActive && !hoveredGroupLabel);
              return (
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onHubClick('Settings')}
                    onMouseEnter={() => onHubHover('Settings')}
                    className={cn(
                      "group relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-250",
                      isEffectivelyActive
                        ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-white shadow-sm"
                        : "text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.08]"
                    )}
                  >
                    {/* Active indicator bar */}
                    {isEffectivelyActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-500 rounded-r-full" />
                    )}
                    <Settings className={cn(
                      "w-5 h-5 flex-shrink-0 transition-all duration-200",
                      isEffectivelyActive ? "text-blue-600 dark:text-white" : "group-hover:scale-105"
                    )} />
                  </button>
                </TooltipTrigger>
              );
            })()}
            <TooltipContent side="right" sideOffset={12} className="bg-slate-900/90 text-slate-50 backdrop-blur-xl border-slate-800/50 shadow-2xl px-3 py-1.5 rounded-xl">
              <p className="font-bold text-[10px] uppercase tracking-widest">Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
});

SidebarRail.displayName = 'SidebarRail';

/* ─────────────── Sidebar Menu ─────────────── */
export const SidebarMenuPanel = React.memo(({
  activeGroup,
  pathname,
  pendingCount,
  sidebarPreferences,
  hasPositions,
  activeGroupLabel,
}: {
  activeGroup: any;
  pathname: string;
  pendingCount: number | null;
  sidebarPreferences: any;
  hasPositions: boolean;
  activeGroupLabel: string | undefined;
}) => {
  if (!activeGroup) return null;

  return (
    <aside className="hidden lg:flex flex-col w-[260px] bg-white dark:bg-zinc-950 border-r border-gray-200/80 dark:border-zinc-800/80 z-30 flex-shrink-0">
      {/* Hub Label */}
      <div className="px-5 pt-7 pb-2 border-b border-gray-100 dark:border-zinc-800/80 mb-3">
        <h2 className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.08em]">
          {activeGroup.label}
        </h2>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
        {activeGroup.items.map((item: any) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <OptimizedLink key={item.href} href={item.href} className="block">
              <button
                className={cn(
                  "w-full flex items-center px-3 py-2 text-[13px] font-medium transition-all duration-150 rounded-lg group",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-800/60"
                )}
              >
                <span className={cn(
                  "w-5 h-5 mr-3 flex items-center justify-center transition-colors",
                  isActive
                    ? "text-blue-500 dark:text-blue-400"
                    : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-300"
                )}>
                  <item.icon className="w-[18px] h-[18px]" />
                </span>
                <span>{item.label}</span>
                {item.href === '/process-queue' && pendingCount !== null && pendingCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-auto min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] px-1 font-bold animate-pulse shadow-sm"
                  >
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </Badge>
                )}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </button>
            </OptimizedLink>
          );
        })}

        {activeGroupLabel === 'Hiring' && sidebarPreferences?.showAssignedPositions && hasPositions && (
          <div className="mt-8 pt-8 border-t border-gray-200/60 dark:border-zinc-800/60">
            <h3 className="px-3 mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-600">Job assigned</h3>
            <div className="px-1">
              <AssignedPositionsSidebar variant="compact" />
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
});

SidebarMenuPanel.displayName = 'SidebarMenuPanel';

/* ─────────────── Main Grouped Navigation ─────────────── */
const GroupedSidebarNav = React.memo(() => {
  const pathname = usePathname() || '';
  const { data: session, status } = useSession();
  const { pendingCount } = usePendingCount();
  const { sidebar: sidebarPreferences } = useUserPreferences();
  const { hasPositions } = useHasAssignedPositions() as { hasPositions: boolean };
  const router = useRouter();

  const isAdmin = session?.user?.role === 'Admin';
  const modulePermissions = (session?.user as any)?.modulePermissions || [];

  // Filter groups based on permissions
  const filteredGroups = React.useMemo(() => {
    return sidebarConfig.map(group => ({
      ...group,
      items: group.items.filter(item => hasItemPermission(item, isAdmin, modulePermissions))
    })).filter(group => group.items.length > 0);
  }, [isAdmin, modulePermissions]);

  // Find the initially active group based on the pathname
  const initialActiveGroupLabel = React.useMemo(() => {
    for (const group of filteredGroups) {
      if (group.items.some(item => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))) {
        return group.label;
      }
    }
    // Explicitly handle root settings path to avoid defaulting to first group
    if (pathname.startsWith('/settings')) {
      const settingsGroup = filteredGroups.find(g => g.label === 'Settings');
      if (settingsGroup) return 'Settings';
    }
    return filteredGroups[0]?.label;
  }, [filteredGroups, pathname]);

  const [activeGroupLabel, setActiveGroupLabel] = React.useState<string | undefined>(initialActiveGroupLabel);
  const [hoveredGroupLabel, setHoveredGroupLabel] = React.useState<string | undefined>(undefined);

  // Use hovered label for display if present, otherwise fallout to active label
  const displayedGroupLabel = hoveredGroupLabel || activeGroupLabel;

  // Update active group when pathname changes
  React.useEffect(() => {
    if (initialActiveGroupLabel && initialActiveGroupLabel !== activeGroupLabel) {
      setActiveGroupLabel(initialActiveGroupLabel);
    }
  }, [initialActiveGroupLabel, activeGroupLabel]);

  const activeGroup = filteredGroups.find(g => g.label === displayedGroupLabel) || filteredGroups[0];

  const handleHubClick = React.useCallback((label: string) => {
    setActiveGroupLabel(label);
    
    // If clicking Settings hub, also navigate to /settings grid page
    if (label === 'Settings') {
      router.push('/settings');
    }
  }, [router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  return (
    <div 
      className="flex h-full"
      onMouseLeave={() => setHoveredGroupLabel(undefined)}
    >
      <SidebarRail
        filteredGroups={filteredGroups}
        activeGroupLabel={activeGroupLabel}
        hoveredGroupLabel={hoveredGroupLabel}
        onHubClick={handleHubClick}
        onHubHover={setHoveredGroupLabel}
      />
      {pathname !== '/settings/users' && (
        <SidebarMenuPanel
          activeGroup={activeGroup}
          pathname={pathname}
          pendingCount={pendingCount}
          sidebarPreferences={sidebarPreferences}
          hasPositions={hasPositions}
          activeGroupLabel={displayedGroupLabel}
        />
      )}
    </div>
  );
});

GroupedSidebarNav.displayName = 'GroupedSidebarNav';

export default GroupedSidebarNav;
