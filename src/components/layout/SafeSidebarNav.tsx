"use client"
import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Briefcase, Settings, ListTodo, UploadCloud } from "lucide-react";
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

// Simple pending count hook with error handling and caching
const usePendingCount = () => {
  const [pendingCount, setPendingCount] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const lastFetchTime = React.useRef<number>(0);

  const fetchPending = React.useCallback(async () => {
    // Prevent excessive API calls - only fetch once per 30 seconds
    const now = Date.now();
    if (now - lastFetchTime.current < 30000) {
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/upload-queue/count", {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.pending || 0);
        lastFetchTime.current = now;
      } else {
        console.warn("Failed to fetch pending count:", res.status);
      }
    } catch (error) {
      console.warn("Error fetching pending count:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [fetchPending]);

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
          <SidebarSeparator className="my-2" />
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
    if (!session || !session.user) {
      return { canAccessMyTasks: false, modulePermissions: [] };
    }
    
    const modulePermissions = Array.isArray(session.user.modulePermissions) 
      ? session.user.modulePermissions 
      : [];
    
    const canAccessMyTasks = session.user.role === 'Admin' || 
      modulePermissions.includes('TASK_BOARD_VIEW') ||
      modulePermissions.includes('CANDIDATES_VIEW');
    
    return { canAccessMyTasks, modulePermissions };
  } catch (error) {
    console.error('Error getting session info:', error);
    return { canAccessMyTasks: false, modulePermissions: [] };
  }
};

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

    const handleNavigation = React.useCallback((href: string) => {
      try {
        router.push(href);
      } catch (error) {
        console.error("Navigation error:", error);
        window.location.href = href;
      }
    }, [router]);

    // Collapsed mode
    if (!open) {
      return (
        <div className="flex flex-col h-full">
          <SidebarMenu className="flex-1">
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <MenuItemWithTooltip label={item.label}>
                  <Link href={item.href} className="w-full">
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      className="w-full justify-center"
                      size="default"
                    >
                      <item.icon className="h-5 w-5" />
                    </SidebarMenuButton>
                  </Link>
                </MenuItemWithTooltip>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          
          <div className="mt-auto">
            <SidebarMenu>
              <SidebarMenuItem>
                <MenuItemWithTooltip label={NAV_ITEMS.bulkUpload.label}>
                  <Link href={NAV_ITEMS.bulkUpload.href} className="w-full">
                    <SidebarMenuButton
                      isActive={pathname === NAV_ITEMS.bulkUpload.href}
                      className="w-full justify-center relative"
                      size="default"
                    >
                      <NAV_ITEMS.bulkUpload.icon className="h-5 w-5" />
                      {pendingCount !== null && (
                        <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-0.5 text-xs group-data-[collapsible=icon]:-top-0.5 group-data-[collapsible=icon]:-right-0.5">
                          {isLoading ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                          ) : (
                            pendingCount
                          )}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </Link>
                </MenuItemWithTooltip>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <MenuItemWithTooltip label={NAV_ITEMS.settings.label}>
                  <Link href={NAV_ITEMS.settings.href} className="w-full">
                    <SidebarMenuButton
                      isActive={pathname.startsWith(NAV_ITEMS.settings.href)}
                      className="w-full justify-center"
                      size="default"
                    >
                      <NAV_ITEMS.settings.icon className="h-5 w-5" />
                    </SidebarMenuButton>
                  </Link>
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
          <SidebarGroupLabel>General</SidebarGroupLabel>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <MenuItemWithTooltip label={item.label}>
                <Link href={item.href} className="w-full">
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    className="w-full justify-start"
                    size="default"
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="truncate">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </MenuItemWithTooltip>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        
        <div className="mt-auto">
          <SidebarMenu>
            <SidebarSeparator className="my-2" />
            <SidebarMenuItem>
              <MenuItemWithTooltip label={NAV_ITEMS.bulkUpload.label}>
                <Link href={NAV_ITEMS.bulkUpload.href} className="w-full">
                  <SidebarMenuButton
                    isActive={pathname === NAV_ITEMS.bulkUpload.href}
                    className="w-full justify-start"
                    size="default"
                  >
                    <NAV_ITEMS.bulkUpload.icon className="h-5 w-5" />
                    <span className="truncate">{NAV_ITEMS.bulkUpload.label}</span>
                    {pendingCount !== null && (
                      <Badge className="ml-auto h-5 min-w-5 px-0.5 text-xs">
                        {isLoading ? (
                          <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                        ) : (
                          pendingCount
                        )}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </Link>
              </MenuItemWithTooltip>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <MenuItemWithTooltip label={NAV_ITEMS.settings.label}>
                <Link href={NAV_ITEMS.settings.href} className="w-full">
                  <SidebarMenuButton
                    isActive={pathname.startsWith(NAV_ITEMS.settings.href)}
                    className="w-full justify-start"
                    size="default"
                  >
                    <NAV_ITEMS.settings.icon className="h-5 w-5" />
                    <span className="truncate">{NAV_ITEMS.settings.label}</span>
                  </SidebarMenuButton>
                </Link>
              </MenuItemWithTooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in SafeSidebarNav component:', error);
    setHasError(true);
    return <FallbackNav />;
  }
});

SafeSidebarNavComponent.displayName = 'SafeSidebarNavComponent';

// Error boundary for SafeSidebarNav
class SafeSidebarNavErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('SafeSidebarNav Error Boundary caught error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SafeSidebarNav Error Boundary error details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackNav />;
    }

    return this.props.children;
  }
}

// Export with error boundary wrapper
export default function SafeSidebarNav() {
  return (
    <SafeSidebarNavErrorBoundary>
      <SafeSidebarNavComponent />
    </SafeSidebarNavErrorBoundary>
  );
}
