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

const dashboardNavItem = { href: "/", label: "Dashboard", icon: LayoutDashboard };
const myTaskBoardNavItem = { href: "/my-tasks", label: "My Task Board", icon: ListTodo };
const candidatesNavItem = { href: "/candidates", label: "Candidates", icon: Users };
const positionsNavItem = { href: "/positions", label: "Positions", icon: Briefcase };
const bulkUploadNavItem = { href: "/candidates/upload", label: "Process queue", icon: UploadCloud };
const settingsNavItem = { href: "/settings", label: "Settings", icon: Settings };

// Ensure mainNavItems is always a valid array
const mainNavItems = [dashboardNavItem, myTaskBoardNavItem, candidatesNavItem, positionsNavItem];

// Simple pending count hook with error handling
const usePendingCount = () => {
  const [pendingCount, setPendingCount] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchPending = React.useCallback(async () => {
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
    const interval = setInterval(fetchPending, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPending]);

  return { pendingCount, isLoading };
};

// Simple tooltip component
const MenuItemWithTooltip = ({ children, label }: { children: React.ReactNode; label: string }) => {
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
};

// Fallback navigation component
const FallbackNav = () => {
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
};

const SidebarNavComponent = () => {
  const [hasError, setHasError] = React.useState(false);
  
  // If there was an error, show fallback
  if (hasError) {
    return <FallbackNav />;
  }

  try {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status } = useSession();
    const { open } = useSidebar();
    const { pendingCount, isLoading } = usePendingCount();

    // Check if user has permission to access My Task Board with safe fallbacks
    const modulePermissions = session?.user?.modulePermissions || [];
    const canAccessMyTasks = session?.user?.role === 'Admin' || 
      modulePermissions.includes('TASK_BOARD_VIEW') ||
      modulePermissions.includes('CANDIDATES_VIEW');

    // Filter navigation items based on permissions with comprehensive safety checks
    const filteredMainNavItems = React.useMemo(() => {
      // Ensure mainNavItems is always an array
      if (!Array.isArray(mainNavItems)) {
        console.warn('mainNavItems is not an array, using fallback');
        return [dashboardNavItem, candidatesNavItem, positionsNavItem];
      }
      
      try {
        return mainNavItems.filter(item => {
          // Validate item structure
          if (!item || typeof item !== 'object') {
            console.warn('Invalid nav item:', item);
            return false;
          }
          
          // Ensure item has required properties
          if (!item.href || !item.label || !item.icon) {
            console.warn('Nav item missing required properties:', item);
            return false;
          }
          
          if (item.href === '/my-tasks') {
            return canAccessMyTasks;
          }
          return true; // Show all other items
        });
      } catch (error) {
        console.error('Error filtering nav items:', error);
        // Return a safe fallback
        return [dashboardNavItem, candidatesNavItem, positionsNavItem];
      }
    }, [canAccessMyTasks]);

    // Simple loading state
    if (status === 'loading') {
      return (
        <div className="flex items-center justify-center p-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      );
    }

    const handleNavigation = (href: string) => {
      try {
        // Use Next.js router for client-side navigation
        router.push(href);
      } catch (error) {
        console.error("Navigation error:", error);
        // Final fallback - only use window.location as last resort
        window.location.href = href;
      }
    };

    // Collapsed mode
    if (!open) {
      return (
        <div className="flex flex-col h-full">
          <SidebarMenu className="flex-1">
            {filteredMainNavItems.map((item) => (
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
                <MenuItemWithTooltip label={bulkUploadNavItem.label}>
                  <Link href={bulkUploadNavItem.href} className="w-full">
                    <SidebarMenuButton
                      isActive={pathname === bulkUploadNavItem.href}
                      className="w-full justify-center relative"
                      size="default"
                    >
                      <bulkUploadNavItem.icon className="h-5 w-5" />
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
                <MenuItemWithTooltip label={settingsNavItem.label}>
                  <Link href={settingsNavItem.href} className="w-full">
                    <SidebarMenuButton
                      isActive={pathname.startsWith(settingsNavItem.href)}
                      className="w-full justify-center"
                      size="default"
                    >
                      <settingsNavItem.icon className="h-5 w-5" />
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
          {filteredMainNavItems.map((item) => (
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
              <MenuItemWithTooltip label={bulkUploadNavItem.label}>
                <Link href={bulkUploadNavItem.href} className="w-full">
                  <SidebarMenuButton
                    isActive={pathname === bulkUploadNavItem.href}
                    className="w-full justify-start"
                    size="default"
                  >
                    <bulkUploadNavItem.icon className="h-5 w-5" />
                    <span className="truncate">{bulkUploadNavItem.label}</span>
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
              <MenuItemWithTooltip label={settingsNavItem.label}>
                <Link href={settingsNavItem.href} className="w-full">
                  <SidebarMenuButton
                    isActive={pathname.startsWith(settingsNavItem.href)}
                    className="w-full justify-start"
                    size="default"
                  >
                    <settingsNavItem.icon className="h-5 w-5" />
                    <span className="truncate">{settingsNavItem.label}</span>
                  </SidebarMenuButton>
                </Link>
              </MenuItemWithTooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in SidebarNav component:', error);
    setHasError(true);
    return <FallbackNav />;
  }
};

export default SidebarNavComponent;
