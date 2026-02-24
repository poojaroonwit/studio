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
const usePendingCount = () => {
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

// Simple tooltip component
const MenuItemWithTooltip = React.memo(({ children, label }: { children: React.ReactNode; label: string }) => {
  const { open } = useSidebar();
  if (open) return <>{children}</>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="right">
          <span>{label}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

MenuItemWithTooltip.displayName = 'MenuItemWithTooltip';

// Fallback navigation component
const FallbackNav = React.memo(() => {
  const { open } = useSidebar();
  const { pendingCount } = usePendingCount();

  if (!open) {
    return (
      <div className="flex flex-col h-full">
        <SidebarMenu className="flex-1">
          <SidebarMenuItem>
            <Link href="/" className="w-full">
              <SidebarMenuButton className="w-full justify-center" size="default">
                <LayoutDashboard className="h-5 w-5" />
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/applicants" className="w-full">
              <SidebarMenuButton className="w-full justify-center" size="default">
                <Users className="h-5 w-5" />
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SidebarMenu className="flex-1">
        <SidebarGroupLabel>General</SidebarGroupLabel>
        <SidebarMenuItem>
          <Link href="/" className="w-full">
            <SidebarMenuButton className="w-full justify-start" size="default">
              <LayoutDashboard className="h-5 w-5" />
              <span className="truncate">Dashboard</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
});

FallbackNav.displayName = 'FallbackNav';

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
           modulePermissions.includes('Applicants_VIEW');
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
    return modulePermissions.includes('USERS_MANAGE') || modulePermissions.includes('ADMIN');
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

const GroupedSidebarNav = React.memo(() => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { open, setOpen } = useSidebar();
  const { pendingCount } = usePendingCount();
  const { sidebar: sidebarPreferences } = useUserPreferences();
  const { hasPositions } = useHasAssignedPositions();

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
    return filteredGroups[0]?.label;
  }, [filteredGroups, pathname]);

  const [activeGroupLabel, setActiveGroupLabel] = React.useState<string | undefined>(initialActiveGroupLabel);

  // Update active group when pathname changes (e.g. if navigated from elsewhere)
  React.useEffect(() => {
    if (initialActiveGroupLabel && initialActiveGroupLabel !== activeGroupLabel) {
      setActiveGroupLabel(initialActiveGroupLabel);
    }
  }, [initialActiveGroupLabel]);

  const activeGroup = filteredGroups.find(g => g.label === activeGroupLabel) || filteredGroups[0];

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Primary Sidebar - Icon only, always semi-expanded/minimized */}
      <div className="flex w-[80px] flex-col border-r border-border/50 bg-sidebar-primary/5 py-4 items-center gap-4">
        {filteredGroups.map((group) => (
          <TooltipProvider key={group.label} delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setActiveGroupLabel(group.label);
                    if (!open) setOpen(true);
                  }}
                  className={cn(
                    "relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200",
                    activeGroupLabel === group.label
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <group.icon className="h-6 w-6" />
                  {activeGroupLabel === group.label && (
                    <div className="absolute -left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                <p className="font-medium">{group.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        <div className="mt-auto pt-4 border-t border-border/50 w-full flex flex-col items-center gap-4">
           <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <OptimizedLink href="/process-queue" className="relative flex h-12 w-12 items-center justify-center rounded-xl text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all">
                    <UploadCloud className="h-6 w-6" />
                    {pendingCount !== null && pendingCount > 0 && (
                      <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] border-2 border-background">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </Badge>
                    )}
                  </OptimizedLink>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Process queue</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
        </div>
      </div>

      {/* Secondary Sidebar - Item details */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300",
        open ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
      )}>
        <div className="px-4 py-6 border-b border-border/50 bg-sidebar/50 backdrop-blur-sm">
          <h2 className="text-lg font-bold tracking-tight text-foreground truncate">{activeGroupLabel}</h2>
          <p className="text-xs text-muted-foreground truncate opacity-70">Navigation items for {activeGroupLabel}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1 custom-scrollbar">
          {activeGroup?.items.map((item) => (
            <SidebarMenuItem key={item.href} className="list-none">
              <OptimizedLink href={item.href} className="w-full">
                <SidebarMenuButton
                  isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                  className="w-full justify-start px-3 h-10 rounded-lg"
                  size="default"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="ml-3 font-medium text-sm truncate">{item.label}</span>
                </SidebarMenuButton>
              </OptimizedLink>
            </SidebarMenuItem>
          ))}

          {activeGroupLabel === 'Hiring' && sidebarPreferences?.showAssignedPositions && hasPositions && (
            <div className="mt-6 pt-6 border-t border-border/40">
              <h3 className="px-3 mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">Job assigned</h3>
              <AssignedPositionsSidebar variant="compact" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

GroupedSidebarNav.displayName = 'GroupedSidebarNav';

export default GroupedSidebarNav;

