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

const SidebarNavComponent = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { open } = useSidebar();
  const { pendingCount, isLoading } = usePendingCount();

  // Check if user has permission to access My Task Board
  const canAccessMyTasks = session?.user?.role === 'Admin' || 
    session?.user?.session?.user?.modulePermissions?.includes('USERS_VIEW') || session?.user?.modulePermissions?.includes('USERS_CREATE') || session?.user?.modulePermissions?.includes('USERS_EDIT') || session?.user?.modulePermissions?.includes('USERS_DELETE') || session?.user?.modulePermissions?.includes('USERS_PERMISSIONS_MANAGE') ||
    session?.user?.modulePermissions?.includes('TASK_BOARD_VIEW') ||
    session?.user?.modulePermissions?.includes('CANDIDATES_VIEW');

  // Filter navigation items based on permissions
  const filteredMainNavItems = mainNavItems.filter(item => {
    if (item.href === '/my-tasks') {
      return canAccessMyTasks;
    }
    return true; // Show all other items
  });

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
};

export default SidebarNavComponent;
