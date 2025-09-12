"use client"
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Briefcase, Settings, ListTodo, UploadCloud, Kanban } from "lucide-react";
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

// Completely isolated navigation items - no external dependencies
const NAV_ITEMS = {
  dashboard: { href: "/", label: "Dashboard", icon: LayoutDashboard },
  myTasks: { href: "/my-tasks", label: "My Task Board", icon: ListTodo },
  candidates: { href: "/candidates", label: "Candidates", icon: Users },
  positions: { href: "/positions", label: "Positions", icon: Briefcase },
  processQueue: { href: "/process-queue", label: "Process queue", icon: UploadCloud },
  settings: { href: "/settings", label: "Settings", icon: Settings }
};

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
        // Avoid toggling loading state on every 1s poll to prevent UI flicker
        const response = await fetch('/api/upload-queue/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Compute queued + inprocess from health endpoint
          const queued = Number(data?.queue_stats?.queued || 0);
          const inprocess = Number(data?.queue_stats?.inprocess || 0);
          setPendingCount(queued + inprocess);
          // Health endpoint is public in our API; treat as allowed
          setHasPermission(true);
        } else if (response.status === 403) {
          // User doesn't have permission to view process queue data
          // This is expected behavior, not an error
          setPendingCount(null);
          setHasPermission(false);
        } else {
          // Only log warnings for actual errors, not permission issues
          console.warn('Failed to fetch pending count:', response.status);
          setPendingCount(null);
          setHasPermission(false);
        }
      } catch (error) {
        console.error('Error fetching pending count:', error);
        setPendingCount(null);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchPendingCount();
    // Start 1s polling for realtime updates
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(fetchPendingCount, 1000);

    // Only set up SSE connection if user has permission
    if (hasPermission !== false) {
      // Set up SSE connection for real-time updates
      try {
        const eventSource = new EventSource('/api/sse');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Listen for upload queue updates
            if (data.type === 'upload_queue_update' && data.summary) {
              const { queued, inprocess } = data.summary;
              const newPendingCount = Number(queued || 0) + Number(inprocess || 0);
              setPendingCount(newPendingCount);
            }
            
            // Listen for general queue updates
            if (data.type === 'queue' && data.summary) {
              const { queued, inprocess } = data.summary;
              const newPendingCount = Number(queued || 0) + Number(inprocess || 0);
              setPendingCount(newPendingCount);
            }
          } catch (error) {
          }
        };

        eventSource.onerror = (error) => {
          // Provide more specific error information
          if (eventSource.readyState === EventSource.CONNECTING) {
          } else if (eventSource.readyState === EventSource.CLOSED) {
          } else {
          }
          // Polling is already active at 1s; nothing else to do here
        };

      } catch (error) {
        // Polling is already active at 1s; nothing else to do here
      }
    }

    // Cleanup function
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
  }, [hasPermission]); // Add hasPermission to dependency array to re-run effect when permissions change

  return { pendingCount, isLoading };
};

// Simple tooltip component
const MenuItemWithTooltip = React.memo(({ children, label }: { children: React.ReactNode; label: string }) => {
  const { open } = useSidebar();
  
  if (open) {
    return <>{children}</>;
  }
  
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
            <Link href="/candidates" className="w-full">
              <SidebarMenuButton className="w-full justify-center" size="default">
                <Users className="h-5 w-5" />
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/positions" className="w-full">
              <SidebarMenuButton className="w-full justify-center" size="default">
                <Briefcase className="h-5 w-5" />
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/process-queue" className="w-full">
              <SidebarMenuButton className="w-full justify-center relative" size="default">
                       <div className="relative">
                         <UploadCloud className="h-5 w-5 text-sidebar-active-foreground" />
                         {pendingCount !== null && (
                           <Badge 
                             variant={pendingCount === 0 ? "zero" : "destructive"} 
                             className="fixed h-3 w-3 p-0 text-xs flex items-center justify-center min-w-[12px] z-[9999]"
                             style={{
                               top: 'calc(var(--sidebar-width-icon) - 8px)',
                               left: 'calc(var(--sidebar-width-icon) - 8px)'
                             }}
                           >
                             {pendingCount > 99 ? '99+' : pendingCount}
                           </Badge>
                         )}
                       </div>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="mt-auto">
          <SidebarSeparator className="my-2 bg-border/50" />
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/process-queue" className="w-full">
                <SidebarMenuButton className="w-full justify-center relative" size="default">
                 <div className="relative">
                   <UploadCloud className="h-5 w-5 text-sidebar-active-foreground" />
                   {pendingCount !== null && (
                     <Badge 
                       variant={pendingCount === 0 ? "zero" : "destructive"} 
                       className="fixed h-3 w-3 p-0 text-xs flex items-center justify-center min-w-[12px] z-[9999]"
                       style={{
                         top: 'calc(var(--sidebar-width-icon) - 8px)',
                         left: 'calc(var(--sidebar-width-icon) - 8px)'
                       }}
                     >
                       {pendingCount > 99 ? '99+' : pendingCount}
                     </Badge>
                   )}
                 </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/settings" className="w-full">
                <SidebarMenuButton className="w-full justify-center" size="default">
                  <Settings className="h-5 w-5" />
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
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
        <SidebarMenuItem>
          <Link href="/candidates" className="w-full">
            <SidebarMenuButton className="w-full justify-start" size="default">
              <Users className="h-5 w-5" />
              <span className="truncate">Candidates</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <Link href="/my-tasks" className="w-full">
            <SidebarMenuButton className="w-full justify-start" size="default">
              <Kanban className="h-5 w-5" />
              <span className="truncate">My Task Board</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <Link href="/positions" className="w-full">
            <SidebarMenuButton className="w-full justify-start" size="default">
              <Briefcase className="h-5 w-5" />
              <span className="truncate">Positions</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
              <div className="mt-auto">
          <SidebarSeparator className="my-2 bg-border/50" />
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/process-queue" className="w-full">
                <SidebarMenuButton className="w-full justify-start" size="default">
                       <UploadCloud className="h-5 w-5 text-sidebar-active-foreground" />
                  <span className="truncate">Process queue</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/settings" className="w-full">
                <SidebarMenuButton className="w-full justify-start" size="default">
                  <Settings className="h-5 w-5" />
                  <span className="truncate">Settings</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
    </div>
  );
});

FallbackNav.displayName = 'FallbackNav';

// Safe navigation items generator
const getSafeNavigationItems = (canAccessMyTasks: boolean) => {
  try {
    const items = [
      NAV_ITEMS.dashboard,
      NAV_ITEMS.candidates,
      NAV_ITEMS.positions
    ];
    
    // Only add My Tasks if user has permission
    if (canAccessMyTasks) {
      items.splice(1, 0, NAV_ITEMS.myTasks);
    }
    
    return items;
  } catch (error) {
    console.error('Error generating navigation items:', error);
    return [NAV_ITEMS.dashboard, NAV_ITEMS.candidates, NAV_ITEMS.positions];
  }
};

// Safe session checker
const getSafeSessionInfo = (session: any) => {
  try {
    if (!session?.user) {
      return { canAccessMyTasks: false, modulePermissions: [] };
    }

    const modulePermissions = session.user.modulePermissions || [];
    const canAccessMyTasks = modulePermissions.includes('TASK_BOARD_MANAGE_OWN') || 
                            modulePermissions.includes('TASK_BOARD_VIEW') || 
                            modulePermissions.includes('CANDIDATES_VIEW');

    return { canAccessMyTasks, modulePermissions };
  } catch (error) {
    console.error('Error getting session info:', error);
    return { canAccessMyTasks: false, modulePermissions: [] };
  }
};

// Optimized Link component with minimal click protection
const OptimizedLink = React.memo(({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: any }) => {
  const router = useRouter();
  const isNavigatingRef = React.useRef(false);
  const navigationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // Check if component is still mounted
    if (!isMountedRef.current) {
      return;
    }
    
    // Prevent navigation if already navigating
    if (isNavigatingRef.current) {
      return;
    }
    
    isNavigatingRef.current = true;
    
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    
    // Reset navigation state after a short delay
    navigationTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        isNavigatingRef.current = false;
      }
    }, 300);
    
    try {
      router.push(href);
    } catch (error) {
      console.error("Navigation error:", error);
      if (isMountedRef.current) {
        isNavigatingRef.current = false;
      }
      // Fallback to window.location
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
  
  // Move all hooks to the top level - never call hooks conditionally or inside try-catch
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { open } = useSidebar();
  const { pendingCount, isLoading } = usePendingCount();
  const { sidebar: sidebarPreferences } = useUserPreferences();
  const { hasPositions } = useHasAssignedPositions();
  
  if (hasError) {
    return <FallbackNav />;
  }

  // Get safe session info
  const { canAccessMyTasks } = getSafeSessionInfo(session);

  // Generate safe navigation items
  const navigationItems = React.useMemo(() => {
    return getSafeNavigationItems(canAccessMyTasks);
  }, [canAccessMyTasks]);

  try {

    // Simple loading state
    if (status === 'loading') {
      return (
        <div className="flex items-center justify-center p-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      );
    }

    // Collapsed mode
    if (!open) {
      return (
        <div className="flex flex-col h-full">
          <SidebarMenu className="flex-1">
            {navigationItems.map((item, index) => (
              <React.Fragment key={item.href}>
                <SidebarMenuItem>
                  <MenuItemWithTooltip label={item.label}>
                    <OptimizedLink href={item.href} className="w-full">
                      <SidebarMenuButton
                        isActive={pathname === item.href}
                        className="w-full justify-center"
                        size="default"
                      >
                        <item.icon className="h-5 w-5" />
                      </SidebarMenuButton>
                    </OptimizedLink>
                  </MenuItemWithTooltip>
                </SidebarMenuItem>
                {/* Add separator between My Task Board and Candidates */}
                {canAccessMyTasks && item.href === '/my-tasks' && (
                  <SidebarSeparator className="my-2 bg-border/50" />
                )}
              </React.Fragment>
            ))}
          </SidebarMenu>

          <div className="mt-auto">
            <SidebarSeparator className="my-2 bg-border/50" />
            <SidebarMenu>
              <SidebarMenuItem>
                <MenuItemWithTooltip label="Process queue">
                  <OptimizedLink href="/process-queue" className="w-full">
                    <SidebarMenuButton
                      isActive={pathname === '/process-queue'}
                      className="w-full justify-center relative"
                      size="default"
                    >
                       <div className="relative">
                         <UploadCloud className="h-5 w-5 text-sidebar-active-foreground" />
                         {pendingCount !== null && (
                           <Badge 
                             variant={pendingCount === 0 ? "zero" : "destructive"} 
                             className="fixed h-3 w-3 p-0 text-xs flex items-center justify-center min-w-[12px] z-[9999]"
                             style={{
                               top: 'calc(var(--sidebar-width-icon) - 8px)',
                               left: 'calc(var(--sidebar-width-icon) - 8px)'
                             }}
                           >
                             {pendingCount > 99 ? '99+' : pendingCount}
                           </Badge>
                         )}
                       </div>
                    </SidebarMenuButton>
                  </OptimizedLink>
                </MenuItemWithTooltip>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <MenuItemWithTooltip label="Settings">
                  <OptimizedLink href="/settings" className="w-full">
                    <SidebarMenuButton
                      isActive={pathname === '/settings'}
                      className="w-full justify-center"
                      size="default"
                    >
                      <Settings className="h-5 w-5" />
                    </SidebarMenuButton>
                  </OptimizedLink>
                </MenuItemWithTooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </div>
      );
    }

    // Expanded mode
    return (
      <div className="flex flex-col h-full">
        <SidebarMenu className="flex-1">
        <SidebarSeparator className="my-2 bg-border/50" />
          <SidebarGroupLabel>General</SidebarGroupLabel>
          {navigationItems.map((item, index) => (
            <React.Fragment key={item.href}>
              <SidebarMenuItem>
                <MenuItemWithTooltip label={item.label}>
                  <OptimizedLink href={item.href} className="w-full">
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      className="w-full justify-start"
                      size="default"
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="truncate">{item.label}</span>
                    </SidebarMenuButton>
                  </OptimizedLink>
                </MenuItemWithTooltip>
              </SidebarMenuItem>
              {/* Add separator between My Task Board and Candidates */}
              {canAccessMyTasks && item.href === '/my-tasks' && (
                <SidebarSeparator className="my-2 bg-border/50" />
              )}
            </React.Fragment>
          ))}
          {/* Assigned positions inside the SidebarMenu list */}
          {sidebarPreferences?.showAssignedPositions && hasPositions && (
            <>
              <SidebarGroupLabel>Job assigned</SidebarGroupLabel>
              <SidebarMenuItem>
                <div className="px-2 min-w-0">
                  <AssignedPositionsSidebar variant="compact" />
                </div>
              </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
        
        
        <div className="mt-auto">
          <SidebarSeparator className="my-2 bg-border/50" />
          <SidebarMenu>
            <SidebarMenuItem>
              <MenuItemWithTooltip label="Process queue">
                <OptimizedLink href="/process-queue" className="w-full">
                  <SidebarMenuButton
                    isActive={pathname === '/process-queue'}
                    className="w-full justify-start"
                    size="default"
                  >
                       <UploadCloud className="h-5 w-5 text-sidebar-active-foreground" />
                    <span className="truncate">Process queue</span>
                    {pendingCount !== null && (
                      <Badge variant={pendingCount === 0 ? "zero" : "destructive"} className="ml-auto h-5 px-2 text-xs">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </OptimizedLink>
              </MenuItemWithTooltip>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <MenuItemWithTooltip label="Settings">
                <OptimizedLink href="/settings" className="w-full">
                  <SidebarMenuButton
                    isActive={pathname === '/settings'}
                    className="w-full justify-start"
                    size="default"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="truncate">Settings</span>
                  </SidebarMenuButton>
                </OptimizedLink>
              </MenuItemWithTooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </div>
    );
  } catch (error) {
    console.error('SafeSidebarNav error:', error);
    setHasError(true);
    return <FallbackNav />;
  }
});

SafeSidebarNavComponent.displayName = 'SafeSidebarNavComponent';

export default SafeSidebarNavComponent;
