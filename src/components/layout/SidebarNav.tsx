"use client"
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Briefcase, Settings, UsersRound, Code2, ListOrdered, Palette, Zap, ListTodo, DatabaseZap, SlidersHorizontal, KanbanSquare, Settings2, UserCog, UploadCloud, Loader2, XCircle, Database } from "lucide-react"; 
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
  SidebarMenuBadge,
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
import type { PlatformModuleId } from '@/lib/types';
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { useRecentUrls, formatRelativeTime } from "@/hooks/use-recent-urls";
import { useUnifiedRealtime } from "@/hooks/use-unified-realtime-optimized";
import { Clock, X } from "lucide-react";

// Add this at the top for TypeScript global declaration
declare global {
  interface Window {
    __systemSettings?: Record<string, any>;
  }
}

const dashboardNavItem = { href: "/", label: "Dashboard", icon: LayoutDashboard };
const myTaskBoardNavItem = { href: "/my-tasks", label: "My Task Board", icon: ListTodo };
const candidatesNavItem = { href: "/candidates", label: "Candidates", icon: Users };
const positionsNavItem = { href: "/positions", label: "Positions", icon: Briefcase };
const bulkUploadNavItem = { href: "/candidates/upload", label: "Process queue", icon: UploadCloud };
const settingsNavItem = { href: "/settings", label: "Settings", icon: Settings };

// Main navigation items (excluding Process queue and Settings)
const mainNavItems = [dashboardNavItem, myTaskBoardNavItem, candidatesNavItem, positionsNavItem];

// Helper to get the most specific active menu item
const getActiveMainNavItem = (pathname: string) => {
  // Check for exact matches first
  const exactMatch = mainNavItems.find(item => item.href === pathname);
  if (exactMatch) return exactMatch;
  
  // Then check for pathname starts with
  return mainNavItems.find(item => 
    item.href !== "/" && pathname.startsWith(item.href)
  );
};

// Memoized sidebar styles to prevent recalculation
const getSidebarStyles = () => {
  if (typeof window === 'undefined') return {};
  
  const systemSettings = window.__systemSettings;
  if (!systemSettings) return {};
  
  return {
    backgroundColor: systemSettings.sidebarBackgroundColor || undefined,
    color: systemSettings.sidebarTextColor || undefined,
    activeBackgroundColor: systemSettings.sidebarActiveBackgroundColor || undefined,
    activeTextColor: systemSettings.sidebarActiveTextColor || undefined,
    activeIconColor: systemSettings.sidebarActiveIconColor || undefined,
  };
};

const getSidebarBackgroundStyle = (styles: any) => ({
  backgroundColor: styles.backgroundColor || undefined,
  color: styles.color || undefined,
});

const getActiveButtonStyles = (styles: any) => ({
  backgroundColor: styles.activeBackgroundColor || undefined,
  color: styles.activeTextColor || undefined,
});

const getActiveIconStyles = (styles: any) => ({
  color: styles.activeIconColor || undefined,
});

// Memoized MenuItemWithTooltip component
const MenuItemWithTooltip = React.memo(({ 
  children, 
  label 
}: { 
  children: React.ReactNode; 
  label: string; 
}) => {
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
        <TooltipContent side="right" className="flex items-center gap-2">
          <span>{label}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

MenuItemWithTooltip.displayName = 'MenuItemWithTooltip';

// Optimized pending count hook
const usePendingCount = () => {
  const { data: session } = useSession();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [pendingError, setPendingError] = useState(false);
  const [isPendingLoading, setIsPendingLoading] = useState(true);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const fetchPending = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const res = await fetch("/api/upload-queue/count", {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const count = data.pending || 0;
      setPendingCount(count);
      setPendingError(false);
      setIsPendingLoading(false);
    } catch (e) {
      setPendingError(true);
      setIsPendingLoading(false);
    }
  }, [session?.user]);

  // Use unified real-time hook for upload queue updates with optimized callbacks
  const { isConnected } = useUnifiedRealtime({
    onUploadQueueUpdate: useCallback((data: any) => {
      console.log('[SidebarNav] Received upload queue update:', data);
      if (data.type === 'queue' && data.summary) {
        const count = (data.summary.queued || 0) + (data.summary.inprocess || 0);
        console.log('[SidebarNav] Setting pending count to:', count);
        setPendingCount(count);
        setPendingError(false);
        setIsPendingLoading(false);
      } else {
        console.log('[SidebarNav] Invalid data structure:', data);
      }
    }, [])
  });

  // Initial fetch with debouncing
  useEffect(() => {
    if (session?.user) {
      // Clear any existing timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      // Debounce the fetch to prevent multiple rapid requests
      fetchTimeoutRef.current = setTimeout(() => {
        fetchPending();
      }, 100);
    }
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [session?.user, fetchPending]);

  return {
    pendingCount,
    pendingError,
    isPendingLoading,
    isConnected
  };
};

const SidebarNavComponent = function SidebarNav() {
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const userRole = session?.user?.role;
  const { open, toggleSidebar } = useSidebar();
  const { recentUrls, clearRecentUrls } = useRecentUrls();

  const [isClient, setIsClient] = React.useState(false);

  // Use optimized pending count hook
  const { pendingCount, pendingError, isPendingLoading, isConnected } = usePendingCount();

  // Memoize sidebar styles to prevent recalculation on every render
  const sidebarStyles = useMemo(() => getSidebarStyles(), []);

  // Memoize active navigation item
  const activeMainNavItem = useMemo(() => getActiveMainNavItem(pathname), [pathname]);

  // Memoize visible nav items based on user permissions (excluding Process queue)
  const visibleNavItems = useMemo(() => {
    if (!isClient || !userRole) return mainNavItems;
    
    return mainNavItems.filter(item => {
      // Show all items for admin users
      if (userRole === 'Admin' || session?.user?.modulePermissions?.includes('USERS_MANAGE')) {
        return true;
      }
      
      // Filter based on module permissions
      switch (item.href) {
        case '/settings':
          return session?.user?.modulePermissions?.includes('SETTINGS_VIEW');
        default:
          return true;
      }
    });
  }, [isClient, userRole, session?.user?.modulePermissions]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Early return for loading state
  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  // Collapsed mode: show only icons with tooltips
  if (!open) {
    return (
      <div className="flex flex-col h-full">
        <SidebarMenu style={getSidebarBackgroundStyle(sidebarStyles)} className="flex-1">
          {visibleNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <MenuItemWithTooltip label={item.label}>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    asChild
                    isActive={activeMainNavItem && activeMainNavItem.href === item.href}
                    className="w-full justify-start"
                    style={activeMainNavItem && activeMainNavItem.href === item.href ? getActiveButtonStyles(sidebarStyles) : {}}
                    size="default"
                    data-active={activeMainNavItem && activeMainNavItem.href === item.href}
                  >
                    <a>
                      <item.icon 
                        className="h-5 w-5" 
                        style={activeMainNavItem && activeMainNavItem.href === item.href ? getActiveIconStyles(sidebarStyles) : {}}
                      />
                    </a>
                  </SidebarMenuButton>
                </Link>
              </MenuItemWithTooltip>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        
        {/* Process queue button at bottom */}
        <div className="mt-auto p-2">
          <SidebarMenu style={getSidebarBackgroundStyle(sidebarStyles)}>
            <SidebarMenuItem>
              <MenuItemWithTooltip label={bulkUploadNavItem.label}>
                <Link href={bulkUploadNavItem.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === bulkUploadNavItem.href}
                    className="w-full justify-start"
                    style={pathname === bulkUploadNavItem.href ? getActiveButtonStyles(sidebarStyles) : {}}
                    size="default"
                    data-active={pathname === bulkUploadNavItem.href}
                  >
                    <a>
                      <bulkUploadNavItem.icon 
                        className="h-5 w-5" 
                        style={pathname === bulkUploadNavItem.href ? getActiveIconStyles(sidebarStyles) : {}}
                      />
                      {pendingCount !== null && (
                        <Badge 
                          variant={pendingError ? "destructive" : "default"}
                          className="ml-auto h-5 min-w-5 px-0.5 text-xs"
                        >
                          {isPendingLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : pendingError ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            pendingCount || 0
                          )}
                        </Badge>
                      )}
                    </a>
                  </SidebarMenuButton>
                </Link>
              </MenuItemWithTooltip>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <MenuItemWithTooltip label={settingsNavItem.label}>
                <Link href={settingsNavItem.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(settingsNavItem.href)}
                    className="w-full justify-start"
                    style={pathname.startsWith(settingsNavItem.href) ? getActiveButtonStyles(sidebarStyles) : {}}
                    size="default"
                    data-active={pathname.startsWith(settingsNavItem.href)}
                  >
                    <a>
                      <settingsNavItem.icon 
                        className="h-5 w-5" 
                        style={pathname.startsWith(settingsNavItem.href) ? getActiveIconStyles(sidebarStyles) : {}}
                      />
                    </a>
                  </SidebarMenuButton>
                </Link>
              </MenuItemWithTooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </div>
    );
  }

  // Expanded mode: keep the current layout
  return (
    <div className="flex flex-col h-full">
      <SidebarMenu style={getSidebarBackgroundStyle(sidebarStyles)} className="flex-1">
        {/* Group 1: Dashboard, My Task Board */}
        <SidebarGroupLabel>General</SidebarGroupLabel>
        {visibleNavItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <MenuItemWithTooltip label={item.label}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={activeMainNavItem && activeMainNavItem.href === item.href}
                  className="w-full justify-start"
                  style={activeMainNavItem && activeMainNavItem.href === item.href ? getActiveButtonStyles(sidebarStyles) : {}}
                  size="default"
                  data-active={activeMainNavItem && activeMainNavItem.href === item.href}
                >
                  <a>
                    <item.icon 
                      className="h-5 w-5" 
                      style={activeMainNavItem && activeMainNavItem.href === item.href ? getActiveIconStyles(sidebarStyles) : {}}
                    />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </MenuItemWithTooltip>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      
      {/* Process queue button at bottom */}
      <div className="mt-auto">
        <SidebarMenu style={getSidebarBackgroundStyle(sidebarStyles)}>
          <SidebarSeparator className="my-2" />
          <SidebarMenuItem>
            <MenuItemWithTooltip label={bulkUploadNavItem.label}>
              <Link href={bulkUploadNavItem.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === bulkUploadNavItem.href}
                  className="w-full justify-start"
                  style={pathname === bulkUploadNavItem.href ? getActiveButtonStyles(sidebarStyles) : {}}
                  size="default"
                  data-active={pathname === bulkUploadNavItem.href}
                >
                  <a>
                    <bulkUploadNavItem.icon 
                      className="h-5 w-5" 
                      style={pathname === bulkUploadNavItem.href ? getActiveIconStyles(sidebarStyles) : {}}
                    />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{bulkUploadNavItem.label}</span>
                    {pendingCount !== null && (
                      <Badge 
                        variant={pendingError ? "destructive" : "default"}
                        className="ml-auto h-5 min-w-5 px-0.5 text-xs"
                      >
                        {isPendingLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : pendingError ? (
                          <XCircle className="h-3 w-3" />
                        ) : (
                          pendingCount || 0
                        )}
                      </Badge>
                    )}
                  </a>
                </SidebarMenuButton>
              </Link>
            </MenuItemWithTooltip>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <MenuItemWithTooltip label={settingsNavItem.label}>
              <Link href={settingsNavItem.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(settingsNavItem.href)}
                  className="w-full justify-start"
                  style={pathname.startsWith(settingsNavItem.href) ? getActiveButtonStyles(sidebarStyles) : {}}
                  size="default"
                  data-active={pathname.startsWith(settingsNavItem.href)}
                >
                  <a>
                    <settingsNavItem.icon 
                      className="h-5 w-5" 
                      style={pathname.startsWith(settingsNavItem.href) ? getActiveIconStyles(sidebarStyles) : {}}
                    />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{settingsNavItem.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </MenuItemWithTooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
};

const SidebarNav = React.memo(SidebarNavComponent);
export default SidebarNav;
