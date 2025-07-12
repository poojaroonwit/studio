"use client"
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Briefcase, Settings, UsersRound, Code2, ListOrdered, Palette, Zap, ListTodo, DatabaseZap, SlidersHorizontal, KanbanSquare, Settings2, UserCog, UploadCloud, Loader2, FileText } from "lucide-react"; 
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
  SidebarMenuBadge,
  useSidebar,
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
const bulkUploadNavItem = { href: "/candidates/upload", label: "Bulk Upload", icon: UploadCloud };
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
  }
  return { sidebarGradient, activeGradient, activeText };
}

// Helper to get manual link/type from system settings
function getManualConfig() {
  if (typeof window !== "undefined" && window.__systemSettings) {
    return {
      manualLink: window.__systemSettings.manualLink || null,
      manualType: window.__systemSettings.manualType || "external",
      appMenuIcon: window.__systemSettings.appMenuIcon || null,
    };
  }
  return { manualLink: null, manualType: "external", appMenuIcon: null };
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
        <TooltipContent side="right" className="z-[99999]">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const SidebarNavComponent = function SidebarNav() {
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const userRole = session?.user?.role;
  const { open, toggleSidebar } = useSidebar();

  const [isClient, setIsClient] = React.useState(false);

  // Bulk upload pending count state
  const [pendingCount, setPendingCount] = React.useState<number | null>(null);
  const [pendingError, setPendingError] = React.useState(false);
  React.useEffect(() => {
    let ignore = false;
    async function fetchPending() {
      try {
        const res = await fetch("/api/upload-queue?limit=100");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const count = Array.isArray(data.data)
          ? data.data.filter((item: any) => item.status === "queued").length
          : 0;
        if (!ignore) {
          setPendingCount(count);
        }
      } catch (e) {
        if (!ignore) {
          setPendingError(true);
        }
      }
    }
    fetchPending();
    return () => { ignore = true; };
  }, []);

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
  const [manualConfig, setManualConfig] = useState({ manualLink: null, manualType: "external", appMenuIcon: null });

  useEffect(() => {
    setSidebarStyles(getSidebarStyles());
    setManualConfig(getManualConfig());
    // Listen for system settings changes
    const handler = () => {
      setSidebarStyles(getSidebarStyles());
      setManualConfig(getManualConfig());
    };
    window.addEventListener("appConfigChanged", handler);
    return () => window.removeEventListener("appConfigChanged", handler);
  }, []);

  // Only the most specific menu item should be active
  const activeMainNavItem = getActiveMenuItem(pathname, mainNavItems);
  const isMyTaskBoardActive = myTaskBoardNavItem.href === pathname || pathname.startsWith(myTaskBoardNavItem.href + "/");

  // Collapsed sidebar redesign
  if (!open) {
    // Get the custom icon from preferences
    const menuIcon = manualConfig.appMenuIcon || sidebarStyles.appMenuIcon;
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
      <div className="flex flex-col h-full w-full items-center justify-between py-4">
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
                  activeMainNavItem && activeMainNavItem.href === dashboardNavItem.href ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent"
                )}
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === dashboardNavItem.href}
              >
                <a>
                  <dashboardNavItem.icon className="h-4 w-4" />
                </a>
              </SidebarMenuButton>
            </Link>
          </MenuItemWithTooltip>
          {isClient && (userRole === 'Recruiter' || userRole === 'Admin') && (
            <MenuItemWithTooltip label={myTaskBoardNavItem.label}>
              <Link href={myTaskBoardNavItem.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={isMyTaskBoardActive}
                  className={cn(
                    "rounded-full p-2 mx-auto flex items-center justify-center",
                    isMyTaskBoardActive ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent"
                  )}
                  size="default"
                  data-active={isMyTaskBoardActive}
                >
                  <a>
                    <myTaskBoardNavItem.icon className="h-4 w-4" />
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
                  activeMainNavItem && activeMainNavItem.href === candidatesNavItem.href ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent"
                )}
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === candidatesNavItem.href}
              >
                <a>
                  <candidatesNavItem.icon className="h-4 w-4" />
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
                  activeMainNavItem && activeMainNavItem.href === positionsNavItem.href ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent"
                )}
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === positionsNavItem.href}
              >
                <a>
                  <positionsNavItem.icon className="h-4 w-4" />
                </a>
              </SidebarMenuButton>
            </Link>
          </MenuItemWithTooltip>
        </div>

        {/* Footer items at the bottom */}
        <div className="flex flex-col items-center gap-2 mt-auto">
          <MenuItemWithTooltip label={bulkUploadNavItem.label}>
            <Link href={bulkUploadNavItem.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href}
                className={cn(
                  "rounded-full p-2 mx-auto flex items-center justify-center",
                  activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent"
                )}
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href}
              >
                <a>
                  <bulkUploadNavItem.icon className="h-4 w-4" />
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
                  pathname.startsWith(settingsNavItem.href) ? "bg-primary text-primary-foreground shadow" : "hover:bg-accent"
                )}
                size="default"
                data-active={pathname.startsWith(settingsNavItem.href)}
              >
                <a>
                  <settingsNavItem.icon className="h-4 w-4" />
                </a>
              </SidebarMenuButton>
            </Link>
          </MenuItemWithTooltip>
          {manualConfig.manualLink && (
            <MenuItemWithTooltip label="Manual">
              <a
                href={manualConfig.manualType === "external" ? manualConfig.manualLink : "/manual"}
                target={manualConfig.manualType === "external" ? "_blank" : undefined}
                rel={manualConfig.manualType === "external" ? "noopener noreferrer" : undefined}
                className="rounded-full p-2 mx-auto flex items-center justify-center hover:bg-accent"
              >
                <FileText className="h-4 w-4" />
              </a>
            </MenuItemWithTooltip>
          )}
        </div>
      </div>
    );
  }

  // Expanded mode: keep the current layout
  return (
    <div className="flex flex-col h-full">
      <SidebarMenu style={sidebarStyles.sidebarGradient ? { background: sidebarStyles.sidebarGradient } : {}} className="flex-1">
        {/* Group 1: Dashboard, My Task Board */}
        <SidebarGroupLabel>General</SidebarGroupLabel>
        <SidebarMenuItem key={dashboardNavItem.href}>
          <MenuItemWithTooltip label={dashboardNavItem.label}>
            <Link href={dashboardNavItem.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={activeMainNavItem && activeMainNavItem.href === dashboardNavItem.href}
                className="w-full justify-start"
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === dashboardNavItem.href}
              >
                <a>
                  <dashboardNavItem.icon className="h-5 w-5" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{dashboardNavItem.label}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </MenuItemWithTooltip>
        </SidebarMenuItem>
        {isClient && (userRole === 'Recruiter' || userRole === 'Admin') && (
          <SidebarMenuItem key={myTaskBoardNavItem.href}>
            <MenuItemWithTooltip label={myTaskBoardNavItem.label}>
              <Link href={myTaskBoardNavItem.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={isMyTaskBoardActive}
                  className="w-full justify-start"
                  size="default"
                  data-active={isMyTaskBoardActive}
                >
                  <a>
                    <myTaskBoardNavItem.icon className="h-5 w-5" />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{myTaskBoardNavItem.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </MenuItemWithTooltip>
          </SidebarMenuItem>
        )}
        
        {/* Group 2: Candidates, Positions */}
        <SidebarGroupLabel>Recruitment</SidebarGroupLabel>
        <SidebarMenuItem key={candidatesNavItem.href}>
          <MenuItemWithTooltip label={candidatesNavItem.label}>
            <Link href={candidatesNavItem.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={activeMainNavItem && activeMainNavItem.href === candidatesNavItem.href}
                className="w-full justify-start"
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === candidatesNavItem.href}
              >
                <a>
                  <candidatesNavItem.icon className="h-5 w-5" />
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
                size="default"
                data-active={activeMainNavItem && activeMainNavItem.href === positionsNavItem.href}
              >
                <a>
                  <positionsNavItem.icon className="h-5 w-5" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{positionsNavItem.label}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </MenuItemWithTooltip>
        </SidebarMenuItem>
      </SidebarMenu>
      
      {/* Footer Group: Other (Bulk Actions, Settings, Manual, Power BI) */}
      <div className="mt-auto">
        <SidebarMenu style={sidebarStyles.sidebarGradient ? { background: sidebarStyles.sidebarGradient } : {}}>
          <SidebarGroupLabel>Other</SidebarGroupLabel>
          <SidebarMenuItem key={bulkUploadNavItem.href}>
            <MenuItemWithTooltip label={bulkUploadNavItem.label}>
              <Link href={bulkUploadNavItem.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href}
                  className="w-full justify-start"
                  size="default"
                  data-active={activeMainNavItem && activeMainNavItem.href === bulkUploadNavItem.href}
                >
                  <a className="flex items-center w-full">
                    <bulkUploadNavItem.icon className="h-5 w-5" />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{bulkUploadNavItem.label}</span>
                    {pendingError ? (
                      <SidebarMenuBadge className="ml-2 bg-gray-400 text-white">?</SidebarMenuBadge>
                    ) : pendingCount === null ? (
                      <SidebarMenuBadge className="ml-2 bg-yellow-100 text-yellow-700 flex items-center"><Loader2 className="animate-spin h-4 w-4 mr-1" />Loading</SidebarMenuBadge>
                    ) : (
                      <SidebarMenuBadge className="ml-2 bg-yellow-400 text-black">{pendingCount} Pending</SidebarMenuBadge>
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
                  size="default"
                  data-active={pathname.startsWith(settingsNavItem.href)}
                >
                  <a>
                    <settingsNavItem.icon className="h-5 w-5" />
                    <span className="truncate group-data-[collapsible=icon]:hidden">{settingsNavItem.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </MenuItemWithTooltip>
          </SidebarMenuItem>
          
          {/* Manual menu item */}
          {manualConfig.manualLink && (
            <SidebarMenuItem>
              <MenuItemWithTooltip label="Manual">
                <a
                  href={manualConfig.manualType === "external" ? manualConfig.manualLink : "/manual"}
                  target={manualConfig.manualType === "external" ? "_blank" : undefined}
                  rel={manualConfig.manualType === "external" ? "noopener noreferrer" : undefined}
                  className="flex items-center w-full px-3 py-2 text-sm rounded-md hover:bg-accent"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  <span className="truncate group-data-[collapsible=icon]:hidden">Manual</span>
                </a>
              </MenuItemWithTooltip>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </div>
    </div>
  );
};

const SidebarNav = React.memo(SidebarNavComponent);
export default SidebarNav;
