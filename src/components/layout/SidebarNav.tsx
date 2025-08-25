"use client"
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Briefcase, Settings, UsersRound, Code2, ListOrdered, Palette, Zap, ListTodo, DatabaseZap, SlidersHorizontal, KanbanSquare, Settings2, UserCog, UploadCloud, Loader2, XCircle, Database } from "lucide-react"; 
import { cn } from "@/lib/utils";
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
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRecentUrls, formatRelativeTime } from "@/hooks/use-recent-urls";
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

const mainNavItems = [dashboardNavItem, myTaskBoardNavItem, candidatesNavItem, positionsNavItem, bulkUploadNavItem, settingsNavItem];

// Helper to get the most specific active menu item
function getActiveMenuItem(pathname: string, items: { href: string }[]): { href: string } | undefined {
  // Sort by href length descending to prioritize more specific paths
  const sorted = [...items].sort((a, b) => b.href.length - a.href.length);
  return sorted.find(item =>
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(item.href + "/"))
  );
}

// Helper to get sidebar style from settings/localStorage
function getSidebarStyles() {
  // Try user preferences (localStorage)
  let sidebarBg = localStorage.getItem("sidebarBgStartL") || localStorage.getItem("sidebarBgStartD");
  let sidebarBgEnd = localStorage.getItem("sidebarBgEndL") || localStorage.getItem("sidebarBgEndD");
  let sidebarGradient = sidebarBg && sidebarBgEnd ? `linear-gradient(135deg, hsl(${sidebarBg}), hsl(${sidebarBgEnd}))` : undefined;
  let activeBg = localStorage.getItem("sidebarActiveBgStartL") || localStorage.getItem("sidebarActiveBgStartD");
  let activeBgEnd = localStorage.getItem("sidebarActiveBgEndL") || localStorage.getItem("sidebarActiveBgEndD");
  let activeGradient = activeBg && activeBgEnd ? `linear-gradient(135deg, hsl(${activeBg}), hsl(${activeBgEnd}))` : undefined;
  let activeText = localStorage.getItem("sidebarActiveTextL") || localStorage.getItem("sidebarActiveTextD");
  
  // Get sidebar background type and image settings
  let sidebarBackgroundType = localStorage.getItem("sidebarBackgroundType") || 'gradient';
  let sidebarBackgroundImage = localStorage.getItem("sidebarBackgroundImageUrl");
  let sidebarImageFit = localStorage.getItem("sidebarBackgroundImageFit") || 'cover';
  let sidebarImagePosition = localStorage.getItem("sidebarBackgroundImagePosition") || 'center';
  
  // Fallback to system settings (window.__systemSettings injected or fetched)
  if (typeof window !== "undefined" && window.__systemSettings) {
    if (!sidebarGradient && window.__systemSettings.sidebarBgStartL && window.__systemSettings.sidebarBgEndL) {
      sidebarGradient = `linear-gradient(135deg, hsl(${window.__systemSettings.sidebarBgStartL}), hsl(${window.__systemSettings.sidebarBgEndL}))`;
    }
    if (!activeGradient && window.__systemSettings.sidebarActiveBgStartL && window.__systemSettings.sidebarActiveBgEndL) {
      activeGradient = `linear-gradient(135deg, hsl(${window.__systemSettings.sidebarActiveBgStartL}), hsl(${window.__systemSettings.sidebarActiveBgEndL}))`;
    }
    if (!activeText && window.__systemSettings.sidebarActiveTextL) {
      activeText = window.__systemSettings.sidebarActiveTextL;
    }
    
    // Get background settings from system settings
    if (window.__systemSettings.sidebarBackgroundType) {
      sidebarBackgroundType = window.__systemSettings.sidebarBackgroundType;
    }
    if (window.__systemSettings.sidebarBackgroundImageUrl) {
      sidebarBackgroundImage = window.__systemSettings.sidebarBackgroundImageUrl;
    }
    if (window.__systemSettings.sidebarBackgroundImageFit) {
      sidebarImageFit = window.__systemSettings.sidebarBackgroundImageFit;
    }
    if (window.__systemSettings.sidebarBackgroundImagePosition) {
      sidebarImagePosition = window.__systemSettings.sidebarBackgroundImagePosition;
    }
  }
  
  return { 
    sidebarGradient, 
    activeGradient, 
    activeText,
    sidebarBackgroundType,
    sidebarBackgroundImage,
    sidebarImageFit,
    sidebarImagePosition
  };
}

// Helper to get app menu icon from system settings
function getAppMenuIcon() {
  if (typeof window !== "undefined" && window.__systemSettings) {
    return window.__systemSettings.appMenuIcon || null;
  }
  return null;
}

// Helper to generate sidebar background style based on background type
function getSidebarBackgroundStyle(sidebarStyles: any) {
  const { sidebarBackgroundType, sidebarBackgroundImage, sidebarImageFit, sidebarImagePosition, sidebarGradient } = sidebarStyles;
  
  switch (sidebarBackgroundType) {
    case 'image':
      if (sidebarBackgroundImage) {
        return {
          backgroundImage: `url(${sidebarBackgroundImage})`,
          backgroundSize: sidebarImageFit,
          backgroundPosition: sidebarImagePosition,
          backgroundRepeat: 'no-repeat'
        };
      }
      // Fallback to gradient if no image
      return sidebarGradient ? { background: sidebarGradient } : {};
    
    case 'solid':
      // Use the start color as solid background
      const solidColor = localStorage.getItem("sidebarBgStartL") || localStorage.getItem("sidebarBgStartD");
      if (solidColor) {
        return { backgroundColor: `hsl(${solidColor})` };
      }
      // Fallback to gradient if no solid color
      return sidebarGradient ? { background: sidebarGradient } : {};
    
    case 'gradient':
    default:
      return sidebarGradient ? { background: sidebarGradient } : {};
  }
}

// Helper to generate active button styles
function getActiveButtonStyles(sidebarStyles: { activeGradient?: string; activeText?: string | null }) {
  const styles: React.CSSProperties = {};
  
  if (sidebarStyles.activeGradient) {
    styles.background = sidebarStyles.activeGradient;
  }
  // Remove color property; rely on CSS variable for text color
  return styles;
}

// Helper to generate active icon styles
function getActiveIconStyles(sidebarStyles: { activeText?: string | null }) {
  // Remove color property; rely on CSS variable for text color
  return {};
}

// Helper to get the Lucide icon component by name
import * as LucideIcons from "lucide-react";

function getLucideIconByName(name: string) {
  return LucideIcons[name as keyof typeof LucideIcons] || null;
}

// Helper component to wrap menu items with tooltips when collapsed
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
        <TooltipContent side="right" className="z-[100]">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const SidebarNavComponent = function SidebarNav() {
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const userRole = session?.user?.role;
  const { open, toggleSidebar } = useSidebar();
  const { recentUrls, clearRecentUrls } = useRecentUrls();

  const [isClient, setIsClient] = React.useState(false);

  // Bulk upload pending count state
  const [pendingCount, setPendingCount] = React.useState<number | null>(null);
  const [pendingError, setPendingError] = React.useState(false);
  const [isPendingLoading, setIsPendingLoading] = React.useState(true);
  
  React.useEffect(() => {
    // Only set up SSE if session is authenticated
    if (sessionStatus !== 'authenticated' || !session?.user) {
      return;
    }

    let ignore = false;
    let eventSource: EventSource | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 1000;
    const maxReconnectDelay = 10000;
    let pollingInterval: NodeJS.Timeout | null = null;
    
    async function fetchPending() {
      try {
        const res = await fetch("/api/upload-queue/count");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const count = data.pending || 0;
        if (!ignore) {
          setPendingCount(count);
          setPendingError(false);
          setIsPendingLoading(false);
        }
      } catch (e) {
        if (!ignore) {
          setPendingError(true);
          setIsPendingLoading(false);
        }
      }
    }

    function connectSSE() {
      try {
        eventSource = new EventSource("/api/upload-queue/sse");
        
        eventSource.onopen = () => {
          if (!ignore) {
            setPendingError(false);
            reconnectAttempts = 0;
          }
        };

        eventSource.onmessage = (event) => {
          if (!ignore) {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'queue' && data.summary) {
                const count = (data.summary.queued || 0) + (data.summary.inprocess || 0);
                setPendingCount(count);
                setPendingError(false);
                setIsPendingLoading(false);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        };
        
        eventSource.onerror = (error) => {
          if (!ignore) {
            setPendingError(true);
            console.error('[SSE] Upload queue connection error:', error);
            
            // Attempt to reconnect if under max attempts
            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              const delay = Math.min(baseReconnectDelay * reconnectAttempts, maxReconnectDelay);
              
              setTimeout(() => {
                if (!ignore && eventSource) {
                  eventSource.close();
                  connectSSE();
                }
              }, delay);
            } else {
              // Fall back to polling if SSE fails completely
              // Max reconnect attempts reached, falling back to polling
              if (pollingInterval) clearInterval(pollingInterval);
              pollingInterval = setInterval(() => {
                if (!ignore) {
                  fetchPending();
                }
              }, 10000); // Poll every 10 seconds as fallback
            }
          }
        };
      } catch (e) {
        console.error('Failed to set up SSE:', e);
        if (!ignore) {
          setPendingError(true);
        }
      }
    }

    // Initial fetch
    fetchPending();

    // Set up SSE for real-time updates
    connectSSE();

    // Set up periodic refresh as backup (every 30 seconds)
    const refreshInterval = setInterval(() => {
      if (!ignore) {
        fetchPending();
      }
    }, 30000);

    return () => { 
      ignore = true; 
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [sessionStatus, session?.user]);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Replace the sidebarStyles state initialization and usage with a proper type

  type SidebarStyles = {
    sidebarGradient?: string;
    activeGradient?: string;
    activeText?: string | null;
    appLogoUrl?: string;
    appMenuIcon?: string | null;
  };

  const [sidebarStyles, setSidebarStyles] = useState<SidebarStyles>({});

  useEffect(() => {
    setSidebarStyles(getSidebarStyles());
    // Listen for system settings changes
    const handler = () => {
      setSidebarStyles(getSidebarStyles());
    };
    window.addEventListener("appConfigChanged", handler);
    return () => window.removeEventListener("appConfigChanged", handler);
  }, []);

  // Re-apply sidebar styles when pathname changes to ensure active menu styling is correct
  useEffect(() => {
    // Use a small delay to ensure DOM is updated before applying styles
    const timer = setTimeout(() => {
      // Import and call reapplyCurrentSidebarColors to ensure CSS variables are set
      import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
        reapplyCurrentSidebarColors();
      });
    }, 10);
    
    return () => clearTimeout(timer);
  }, [pathname]);

  // Only the most specific menu item should be active
  const activeMainNavItem = getActiveMenuItem(pathname, mainNavItems);
  const isMyTaskBoardActive = myTaskBoardNavItem.href === pathname || pathname.startsWith(myTaskBoardNavItem.href + "/");

  // Collapsed sidebar redesign
  if (!open) {
    // Get the custom icon from preferences
    const menuIcon = getAppMenuIcon() || sidebarStyles.appMenuIcon;
    let CustomIconComponent = null;
    let isImage = false;
    if (menuIcon) {
      if (menuIcon.startsWith("http://") || menuIcon.startsWith("https://") || menuIcon.startsWith("/")) {
        isImage = true;
      } else {
        CustomIconComponent = getLucideIconByName(menuIcon);
      }
    }
    return (
      <div 
        className="flex flex-col h-full w-full items-center justify-between py-4"
        style={getSidebarBackgroundStyle(sidebarStyles)}
      >
        {/* App icon/logo at the top - only show if custom icon is set */}
        {menuIcon && (
          <div className="flex flex-col items-center mb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center">
                    {isImage ? (
                      <Image src={menuIcon} alt="App Icon" width={24} height={24} className="h-6 w-6 object-contain" data-ai-hint="company icon" />
                    ) : (
                      CustomIconComponent && <CustomIconComponent className="h-6 w-6" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">App Icon</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
        
        {/* Main menu items in the middle */}
        <div className="flex flex-col items-center gap-2 mt-4">
          <MenuItemWithTooltip label={dashboardNavItem.label}>
            <Link href={dashboardNavItem.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={activeMainNavItem && activeMainNavItem.href === dashboardNavItem.href}
                className={cn(
                  "rounded-full p-2 mx-auto flex items-center justify-center",
                  activeMainNavItem && activeMainNavItem.href === dashboardNavItem.href ? "shadow" : "hover:bg-accent"
                )}
                style={activeMainNavItem && activeMainNavItem.href === dashboardNavItem.href ? getActiveButtonStyles(sidebarStyles) : {}}
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === dashboardNavItem.href}
              >
                <a>
                  <dashboardNavItem.icon 
                    className="h-4 w-4" 
                    style={activeMainNavItem && activeMainNavItem.href === dashboardNavItem.href ? getActiveIconStyles(sidebarStyles) : {}}
                  />
                </a>
              </SidebarMenuButton>
            </Link>
          </MenuItemWithTooltip>
          {isClient && userRole && ((userRole === 'Admin' || session?.user?.modulePermissions?.includes('USERS_MANAGE')) || 
            session?.user?.modulePermissions?.includes('TASK_BOARD_VIEW') || 
            session?.user?.modulePermissions?.includes('CANDIDATES_VIEW')) && (
            <MenuItemWithTooltip label={myTaskBoardNavItem.label}>
              <Link href={myTaskBoardNavItem.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={isMyTaskBoardActive}
                  className={cn(
                    "rounded-full p-2 mx-auto flex items-center justify-center",
                    isMyTaskBoardActive ? "shadow" : "hover:bg-accent"
                  )}
                  style={isMyTaskBoardActive ? getActiveButtonStyles(sidebarStyles) : {}}
                  size="default"
                  data-active={isMyTaskBoardActive}
                >
                                  <a>
                  <myTaskBoardNavItem.icon 
                    className="h-4 w-4" 
                    style={isMyTaskBoardActive ? getActiveIconStyles(sidebarStyles) : {}}
                  />
                </a>
                </SidebarMenuButton>
              </Link>
            </MenuItemWithTooltip>
          )}
          <MenuItemWithTooltip label={candidatesNavItem.label}>
            <Link href={candidatesNavItem.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={activeMainNavItem && activeMainNavItem.href === candidatesNavItem.href}
                className={cn(
                  "rounded-full p-2 mx-auto flex items-center justify-center",
                  activeMainNavItem && activeMainNavItem.href === candidatesNavItem.href ? "shadow" : "hover:bg-accent"
                )}
                style={activeMainNavItem && activeMainNavItem.href === candidatesNavItem.href ? getActiveButtonStyles(sidebarStyles) : {}}
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === candidatesNavItem.href}
              >
                <a>
                  <candidatesNavItem.icon 
                    className="h-4 w-4" 
                    style={activeMainNavItem && activeMainNavItem.href === candidatesNavItem.href ? getActiveIconStyles(sidebarStyles) : {}}
                  />
                </a>
              </SidebarMenuButton>
            </Link>
          </MenuItemWithTooltip>
          <MenuItemWithTooltip label={positionsNavItem.label}>
            <Link href={positionsNavItem.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={activeMainNavItem && activeMainNavItem.href === positionsNavItem.href}
                className={cn(
                  "rounded-full p-2 mx-auto flex items-center justify-center",
                  activeMainNavItem && activeMainNavItem.href === positionsNavItem.href ? "shadow" : "hover:bg-accent"
                )}
                style={activeMainNavItem && activeMainNavItem.href === positionsNavItem.href ? getActiveButtonStyles(sidebarStyles) : {}}
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === positionsNavItem.href}
              >
                <a>
                  <positionsNavItem.icon 
                    className="h-4 w-4" 
                    style={activeMainNavItem && activeMainNavItem.href === positionsNavItem.href ? getActiveIconStyles(sidebarStyles) : {}}
                  />
                </a>
              </SidebarMenuButton>
            </Link>
          </MenuItemWithTooltip>
        </div>

        {/* Recently visited URLs in collapsed mode */}
        {recentUrls.length > 0 && (
          <div className="flex flex-col items-center gap-1 mb-4">
            <div className="flex items-center gap-1 mb-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <button
                onClick={clearRecentUrls}
                className="p-1 hover:bg-accent rounded-sm"
                title="Clear recent URLs"
              >
                <X className="h-2 w-2" />
              </button>
            </div>
            {recentUrls.slice(0, 3).map((url) => (
              <MenuItemWithTooltip key={url.path} label={`${url.label} - ${formatRelativeTime(url.timestamp)}`}>
                <Link href={url.path} passHref legacyBehavior>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === url.path}
                    className={cn(
                      "rounded-full p-2 mx-auto flex items-center justify-center",
                      pathname === url.path ? "shadow" : "hover:bg-accent"
                    )}
                    style={pathname === url.path ? getActiveButtonStyles(sidebarStyles) : {}}
                    size="default"
                    data-active={pathname === url.path}
                  >
                    <a>
                      <Clock className="h-3 w-3" />
                    </a>
                  </SidebarMenuButton>
                </Link>
              </MenuItemWithTooltip>
            ))}
          </div>
        )}
        
        {/* Footer items at the bottom */}
        <div className="flex flex-col items-center gap-2 mt-auto">
          <MenuItemWithTooltip label={bulkUploadNavItem.label}>
            <Link href={bulkUploadNavItem.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href}
                className={cn(
                  "rounded-full p-2 mx-auto flex items-center justify-center relative",
                  activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href ? "shadow" : "hover:bg-accent"
                )}
                style={activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href ? getActiveButtonStyles(sidebarStyles) : {}}
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href}
              >
                <a>
                  <bulkUploadNavItem.icon 
                    className="h-4 w-4" 
                    style={activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href ? getActiveIconStyles(sidebarStyles) : {}}
                  />
                  {/* Pending count badge for collapsed view */}
                  {pendingCount && pendingCount > 0 && !pendingError && !isPendingLoading && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </div>
                  )}
                  {pendingError && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      !
                    </div>
                  )}
                </a>
              </SidebarMenuButton>
            </Link>
          </MenuItemWithTooltip>
          <MenuItemWithTooltip label={settingsNavItem.label}>
            <Link href={settingsNavItem.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(settingsNavItem.href)}
                className={cn(
                  "rounded-full p-2 mx-auto flex items-center justify-center",
                  pathname.startsWith(settingsNavItem.href) ? "shadow" : "hover:bg-accent"
                )}
                style={pathname.startsWith(settingsNavItem.href) ? getActiveButtonStyles(sidebarStyles) : {}}
                size="default"
                data-active={pathname.startsWith(settingsNavItem.href)}
              >
                <a>
                  <settingsNavItem.icon 
                    className="h-4 w-4" 
                    style={pathname.startsWith(settingsNavItem.href) ? getActiveIconStyles(sidebarStyles) : {}}
                  />
                </a>
              </SidebarMenuButton>
            </Link>
          </MenuItemWithTooltip>

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
        <SidebarMenuItem key={dashboardNavItem.href}>
          <MenuItemWithTooltip label={dashboardNavItem.label}>
            <Link href={dashboardNavItem.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={activeMainNavItem && activeMainNavItem.href === dashboardNavItem.href}
                className="w-full justify-start"
                style={activeMainNavItem && activeMainNavItem.href === dashboardNavItem.href ? getActiveButtonStyles(sidebarStyles) : {}}
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === dashboardNavItem.href}
              >
                <a>
                  <dashboardNavItem.icon 
                    className="h-5 w-5" 
                    style={activeMainNavItem && activeMainNavItem.href === dashboardNavItem.href ? getActiveIconStyles(sidebarStyles) : {}}
                  />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{dashboardNavItem.label}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </MenuItemWithTooltip>
        </SidebarMenuItem>
        {isClient && userRole && ((userRole === 'Admin' || session?.user?.modulePermissions?.includes('USERS_MANAGE')) || 
          session?.user?.modulePermissions?.includes('TASK_BOARD_VIEW') || 
          session?.user?.modulePermissions?.includes('CANDIDATES_VIEW')) && (
          <SidebarMenuItem key={myTaskBoardNavItem.href}>
            <MenuItemWithTooltip label={myTaskBoardNavItem.label}>
              <Link href={myTaskBoardNavItem.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={isMyTaskBoardActive}
                  className="w-full justify-start"
                  style={isMyTaskBoardActive ? getActiveButtonStyles(sidebarStyles) : {}}
                  size="default"
                  data-active={isMyTaskBoardActive}
                >
                  <a>
                    <myTaskBoardNavItem.icon 
                      className="h-5 w-5" 
                      style={isMyTaskBoardActive ? getActiveIconStyles(sidebarStyles) : {}}
                    />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{myTaskBoardNavItem.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </MenuItemWithTooltip>
          </SidebarMenuItem>
        )}
        {/* Separator between groups */}
        <SidebarSeparator className="my-2" />
        {/* Group 2: Candidates, Positions */}
        <SidebarGroupLabel>Recruitment</SidebarGroupLabel>
        <SidebarMenuItem key={candidatesNavItem.href}>
          <MenuItemWithTooltip label={candidatesNavItem.label}>
            <Link href={candidatesNavItem.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={activeMainNavItem && activeMainNavItem.href === candidatesNavItem.href}
                className="w-full justify-start"
                style={activeMainNavItem && activeMainNavItem.href === candidatesNavItem.href ? getActiveButtonStyles(sidebarStyles) : {}}
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === candidatesNavItem.href}
              >
                <a>
                  <candidatesNavItem.icon 
                    className="h-5 w-5" 
                    style={activeMainNavItem && activeMainNavItem.href === candidatesNavItem.href ? getActiveIconStyles(sidebarStyles) : {}}
                  />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{candidatesNavItem.label}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </MenuItemWithTooltip>
        </SidebarMenuItem>
        <SidebarMenuItem key={positionsNavItem.href}>
          <MenuItemWithTooltip label={positionsNavItem.label}>
            <Link href={positionsNavItem.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={activeMainNavItem && activeMainNavItem.href === positionsNavItem.href}
                className="w-full justify-start"
                style={activeMainNavItem && activeMainNavItem.href === positionsNavItem.href ? getActiveButtonStyles(sidebarStyles) : {}}
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === positionsNavItem.href}
              >
                <a>
                  <positionsNavItem.icon 
                    className="h-5 w-5" 
                    style={activeMainNavItem && activeMainNavItem.href === positionsNavItem.href ? getActiveIconStyles(sidebarStyles) : {}}
                  />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{positionsNavItem.label}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </MenuItemWithTooltip>
        </SidebarMenuItem>
      </SidebarMenu>
      
      {/* Recently Visited URLs */}
      {recentUrls.length > 0 && (
        <SidebarMenu style={sidebarStyles.sidebarGradient ? { background: sidebarStyles.sidebarGradient } : {}}>
          <SidebarSeparator className="my-2" />
          <div className="flex items-center justify-between px-3 py-2">
            <SidebarGroupLabel className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recently Visited
            </SidebarGroupLabel>
            <button
              onClick={clearRecentUrls}
              className="p-1 hover:bg-accent rounded-sm"
              title="Clear recent URLs"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          {recentUrls.slice(0, 5).map((url) => (
            <SidebarMenuItem key={url.path}>
              <MenuItemWithTooltip label={url.label}>
                <Link href={url.path} passHref legacyBehavior>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === url.path}
                    className="w-full justify-start"
                    style={pathname === url.path ? getActiveButtonStyles(sidebarStyles) : {}}
                    size="default"
                    data-active={pathname === url.path}
                  >
                    <a>
                      <Clock className="h-4 w-4" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate group-data-[collapsible=icon]:hidden">{url.label}</span>
                        <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                          {formatRelativeTime(url.timestamp)}
                        </span>
                      </div>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </MenuItemWithTooltip>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      )}
      
      {/* Footer Group: Other (Process queue, Settings, Manual, Power BI) */}
      <div className="mt-auto">
        <SidebarMenu style={sidebarStyles.sidebarGradient ? { background: sidebarStyles.sidebarGradient } : {}}>
          {/* Separator between groups */}
          <SidebarSeparator className="my-2" />
          <SidebarGroupLabel>Other</SidebarGroupLabel>
          <SidebarMenuItem key={bulkUploadNavItem.href}>
            <MenuItemWithTooltip label={bulkUploadNavItem.label}>
              <Link href={bulkUploadNavItem.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href}
                  className="w-full justify-start"
                  style={activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href ? getActiveButtonStyles(sidebarStyles) : {}}
                  size="default"
                  data-active={activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href}
                >
                  <a className="flex items-center w-full">
                    <bulkUploadNavItem.icon 
                      className="h-5 w-5" 
                      style={activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href ? getActiveIconStyles(sidebarStyles) : {}}
                    />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{bulkUploadNavItem.label}</span>
                    {pendingError ? (
                      <SidebarMenuBadge className="ml-2 bg-red-100 text-red-700 flex items-center">
                        <XCircle className="h-3 w-3 mr-1" />
                        Error
                      </SidebarMenuBadge>
                    ) : isPendingLoading ? (
                      <SidebarMenuBadge className="ml-2 bg-blue-100 text-blue-700 flex items-center">
                        <Loader2 className="animate-spin h-3 w-3 mr-1" />
                        Loading
                      </SidebarMenuBadge>
                    ) : pendingCount && pendingCount > 0 ? (
                      <SidebarMenuBadge className="ml-2 bg-orange-100 text-orange-700 animate-pulse">
                        {pendingCount}
                      </SidebarMenuBadge>
                    ) : (
                      <SidebarMenuBadge className="ml-2 bg-green-100 text-green-700">
                        0
                      </SidebarMenuBadge>
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
