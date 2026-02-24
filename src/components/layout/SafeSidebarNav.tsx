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
  if (item.href === '/interview') {
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

const SafeSidebarNavComponent = React.memo(() => {
  const [hasError, setHasError] = React.useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { open } = useSidebar();
  const { pendingCount } = usePendingCount();
  const { sidebar: sidebarPreferences } = useUserPreferences();
  const { hasPositions } = useHasAssignedPositions();

  if (hasError) return <FallbackNav />;

  const isAdmin = session?.user?.role === 'Admin';
  const modulePermissions = (session?.user as any)?.modulePermissions || [];

  const filteredGroups = sidebarConfig.map(group => ({
    ...group,
    items: group.items.filter(item => hasItemPermission(item, isAdmin, modulePermissions))
  })).filter(group => group.items.length > 0);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <SidebarMenu className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        {filteredGroups.map((group) => (
          <React.Fragment key={group.label}>
            {open && (
              <SidebarGroupLabel className="px-3 mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </SidebarGroupLabel>
            )}
            {group.items.map((item) => (
              <SidebarMenuItem key={item.href}>
                <MenuItemWithTooltip label={item.label}>
                  <OptimizedLink href={item.href} className="w-full">
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      className={open ? "w-full justify-start px-3" : "w-full justify-center"}
                      size="default"
                    >
                      <item.icon className="h-5 w-5" />
                      {open && <span className="truncate ml-3">{item.label}</span>}
                    </SidebarMenuButton>
                  </OptimizedLink>
                </MenuItemWithTooltip>
              </SidebarMenuItem>
            ))}
            <SidebarSeparator className="my-2 bg-border/50 mx-2" />
          </React.Fragment>
        ))}
        
        {open && sidebarPreferences?.showAssignedPositions && hasPositions && (
          <>
            <SidebarGroupLabel className="px-3 mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Job assigned
            </SidebarGroupLabel>
            <SidebarMenuItem>
              <div className="px-2 min-w-0">
                <AssignedPositionsSidebar variant="compact" />
              </div>
            </SidebarMenuItem>
          </>
        )}
      </SidebarMenu>

      <div className="mt-auto">
        <SidebarSeparator className="my-2 bg-border/50 mx-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <MenuItemWithTooltip label="Process queue">
              <OptimizedLink href="/process-queue" className="w-full">
                <SidebarMenuButton
                  isActive={pathname === '/process-queue'}
                  className={open ? "w-full justify-start px-3" : "w-full justify-center"}
                  size="default"
                >
                  <div className="relative flex items-center">
                    <UploadCloud className="h-5 w-5 text-sidebar-active-foreground" />
                    {open && <span className="truncate ml-3">Process queue</span>}
                    {pendingCount !== null && (
                      <Badge variant={pendingCount === 0 ? "zero" : "destructive"} className={open ? "ml-auto h-5 px-2 text-xs" : "absolute -top-1 -right-1 h-3 w-3 p-0 text-xs flex items-center justify-center min-w-[12px]"}>
                        {open ? (pendingCount > 99 ? '99+' : pendingCount) : (pendingCount > 99 ? '99+' : pendingCount)}
                      </Badge>
                    )}
                  </div>
                </SidebarMenuButton>
              </OptimizedLink>
            </MenuItemWithTooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
});

SafeSidebarNavComponent.displayName = 'SafeSidebarNavComponent';

export default SafeSidebarNavComponent;
