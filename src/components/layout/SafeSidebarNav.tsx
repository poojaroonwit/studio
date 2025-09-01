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

// Completely isolated navigation items - no external dependencies
const NAV_ITEMS = {
  dashboard: { href: "/", label: "Dashboard", icon: LayoutDashboard },
  myTasks: { href: "/my-tasks", label: "My Task Board", icon: ListTodo },
  candidates: { href: "/candidates", label: "Candidates", icon: Users },
  positions: { href: "/positions", label: "Positions", icon: Briefcase },
  bulkUpload: { href: "/process-queue", label: "Process queue", icon: UploadCloud },
  settings: { href: "/settings", label: "Settings", icon: Settings }
};

// Optimized pending count hook with reduced frequency
const usePendingCount = () => {
  const [pendingCount, setPendingCount] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const lastFetchTime = React.useRef<number>(0);
  const fetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/process-queue/pending-count', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPendingCount(data.count || 0);
          lastFetchTime.current = Date.now();
        } else {
          console.warn('Failed to fetch pending count:', response.status);
          setPendingCount(null);
        }
      } catch (error) {
        console.error('Error fetching pending count:', error);
        setPendingCount(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if we haven't fetched recently (within 60 seconds - increased from 30)
    const now = Date.now();
    if (now - lastFetchTime.current > 60000) {
      fetchPendingCount();
    }

    // Set up periodic refresh every 60 seconds (increased from 30)
    fetchTimeoutRef.current = setTimeout(fetchPendingCount, 60000);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

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
            <Link href="/my-tasks" className="w-full">
              <SidebarMenuButton className="w-full justify-center" size="default">
                <Kanban className="h-5 w-5" />
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
        </SidebarMenu>
        <div className="mt-auto">
          <SidebarMenu>
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
        <SidebarMenu>
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
                            session.user.role === 'admin' || 
                            session.user.role === 'super_admin';

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
  
  if (hasError) {
    return <FallbackNav />;
  }

  try {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const { open } = useSidebar();
    const { pendingCount, isLoading } = usePendingCount();

    // Get safe session info
    const { canAccessMyTasks } = getSafeSessionInfo(session);

    // Generate safe navigation items
    const navigationItems = React.useMemo(() => {
      return getSafeNavigationItems(canAccessMyTasks);
    }, [canAccessMyTasks]);

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
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.href}>
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
            ))}
          </SidebarMenu>
          
          <div className="mt-auto">
            <SidebarMenu>
              <SidebarMenuItem>
                <MenuItemWithTooltip label={NAV_ITEMS.bulkUpload.label}>
                  <OptimizedLink href={NAV_ITEMS.bulkUpload.href} className="w-full">
                    <SidebarMenuButton
                      isActive={pathname === NAV_ITEMS.bulkUpload.href}
                      className="w-full justify-center relative"
                      size="default"
                    >
                      <NAV_ITEMS.bulkUpload.icon className="h-5 w-5" />
                      {pendingCount !== null && (
                        <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center group-data-[collapsible=icon]:-top-0.5 group-data-[collapsible=icon]:-right-0.5">
                          {isLoading ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                          ) : (
                            pendingCount
                          )}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </OptimizedLink>
                </MenuItemWithTooltip>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <MenuItemWithTooltip label={NAV_ITEMS.settings.label}>
                  <OptimizedLink href={NAV_ITEMS.settings.href} className="w-full">
                    <SidebarMenuButton
                      isActive={pathname.startsWith(NAV_ITEMS.settings.href)}
                      className="w-full justify-center"
                      size="default"
                    >
                      <NAV_ITEMS.settings.icon className="h-5 w-5" />
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
        </SidebarMenu>
        
        <div className="mt-auto">
          <SidebarMenu>
            <SidebarSeparator className="my-2 bg-border/50" />
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarMenuItem>
              <MenuItemWithTooltip label={NAV_ITEMS.bulkUpload.label}>
                <OptimizedLink href={NAV_ITEMS.bulkUpload.href} className="w-full">
                  <SidebarMenuButton
                    isActive={pathname === NAV_ITEMS.bulkUpload.href}
                    className="w-full justify-start"
                    size="default"
                  >
                    <NAV_ITEMS.bulkUpload.icon className="h-5 w-5" />
                    <span className="truncate">{NAV_ITEMS.bulkUpload.label}</span>
                                         {pendingCount !== null && (
                       <div className="ml-auto flex items-center">
                         <Badge className="h-5 min-w-5 px-1 text-xs flex items-center justify-center bg-primary text-primary-foreground">
                           {isLoading ? (
                             <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                           ) : (
                             pendingCount
                           )}
                         </Badge>
                       </div>
                     )}
                  </SidebarMenuButton>
                </OptimizedLink>
              </MenuItemWithTooltip>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <MenuItemWithTooltip label={NAV_ITEMS.settings.label}>
                <OptimizedLink href={NAV_ITEMS.settings.href} className="w-full">
                  <SidebarMenuButton
                    isActive={pathname.startsWith(NAV_ITEMS.settings.href)}
                    className="w-full justify-start"
                    size="default"
                  >
                    <NAV_ITEMS.settings.icon className="h-5 w-5" />
                    <span className="truncate">{NAV_ITEMS.settings.label}</span>
                  </SidebarMenuButton>
                </OptimizedLink>
              </MenuItemWithTooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in SafeSidebarNavComponent:', error);
    setHasError(true);
    return <FallbackNav />;
  }
});

SafeSidebarNavComponent.displayName = 'SafeSidebarNavComponent';

export default SafeSidebarNavComponent;
