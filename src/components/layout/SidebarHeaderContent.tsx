"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon as ChevronLeft, CubeIcon as Package2, ArrowRightOnRectangleIcon as LogOut, UserIcon as User, Cog6ToothIcon as Settings } from "@heroicons/react/24/outline";
import { UserAvatarCompact } from "@/components/ui/user-avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";
import Image from 'next/image';
import { convertMinIOUrlToSecureUrl } from '@/lib/imageUtils';

interface SidebarHeaderContentProps {
  currentAppName: string;
  appLogoUrl: string | null; // MinIO URL, not data URL
  isClient: boolean;
  isLogoLoading: boolean;
  showLogoOnly?: boolean;
  sidebarLogoSize?: number;
  collapsedSidebarLogoSize?: number;
  contextualLogos?: {
    sidebarLogoCollapsedLightMode?: string | null;
    sidebarLogoExpandedLightMode?: string | null;
    sidebarLogoCollapsedDarkMode?: string | null;
    sidebarLogoExpandedDarkMode?: string | null;
  };
}

export function SidebarHeaderContent({
  currentAppName,
  appLogoUrl,
  isClient,
  isLogoLoading,
  showLogoOnly = false,
  sidebarLogoSize = 48,
  collapsedSidebarLogoSize = 40,
  contextualLogos = {}
}: SidebarHeaderContentProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const sidebarContext = useSidebar();
  const { currentTheme } = useTheme();
  const isMountedRef = useRef(true);

  const user = useMemo(() => {
    if (!session?.user) return null;
    return {
      id: session.user.id as string,
      name: (session.user.name || session.user.email || 'User') as string,
      email: session.user.email ?? undefined,
      role: (session.user as any).role ?? 'Recruiter',
      avatarUrl: ((session.user as any).avatarUrl ?? null) as string | null,
      image: ((session.user as any).image ?? null) as string | null,
      personalColor: ((session.user as any).personalColor ?? null) as string | null,
    };
  }, [session?.user]);

  // Use currentTheme from the centralized theme hook
  const isDarkMode = currentTheme === 'dark';

  const getContextualLogo = useCallback((isCollapsed: boolean) => {
    let logoUrl: string | null = null;

    if (isCollapsed) {
      if (isDarkMode && contextualLogos.sidebarLogoCollapsedDarkMode) {
        logoUrl = contextualLogos.sidebarLogoCollapsedDarkMode;
      } else if (!isDarkMode && contextualLogos.sidebarLogoCollapsedLightMode) {
        logoUrl = contextualLogos.sidebarLogoCollapsedLightMode;
      }
    } else {
      if (isDarkMode && contextualLogos.sidebarLogoExpandedDarkMode) {
        logoUrl = contextualLogos.sidebarLogoExpandedDarkMode;
      } else if (!isDarkMode && contextualLogos.sidebarLogoExpandedLightMode) {
        logoUrl = contextualLogos.sidebarLogoExpandedLightMode;
      }
    }

    // Fallback to default logo
    if (!logoUrl) {
      logoUrl = appLogoUrl;
    }

    // Convert MinIO URLs to secure endpoints (sidebar is authenticated, so use secure endpoint)
    const convertedUrl = convertMinIOUrlToSecureUrl(logoUrl, false);
    return convertedUrl;
  }, [contextualLogos, appLogoUrl, isDarkMode]);

  const [isToggling, setIsToggling] = useState(false);
  const toggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastToggleTimeRef = useRef<number>(0);

  const handleToggle = useCallback(() => {
    if (!isMountedRef.current) return;

    const now = Date.now();
    const timeSinceLastToggle = now - lastToggleTimeRef.current;

    // Reduced protection: prevent rapid toggling (less than 100ms apart - reduced from 150ms)
    if (timeSinceLastToggle < 100) {
      return;
    }

    // Prevent toggle if already toggling
    if (isToggling) {
      return;
    }

    lastToggleTimeRef.current = now;
    setIsToggling(true);

    // Clear any existing timeout
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
    }

    // Set a timeout to reset toggle state (reduced from 500ms to 300ms)
    toggleTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsToggling(false);
      }
    }, 300);

    if (sidebarContext?.toggleSidebar) {
      sidebarContext.toggleSidebar();
    }
  }, [sidebarContext?.toggleSidebar, isToggling]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (toggleTimeoutRef.current) {
        clearTimeout(toggleTimeoutRef.current);
      }
    };
  }, []);

  const renderLogo = useCallback((isCollapsed: boolean) => {
    if (isLogoLoading) {
      return <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />;
    }

    const logoToUse = getContextualLogo(isCollapsed);

    if (isClient && logoToUse) {
      // Calculate responsive logo size based on sidebar state and available space
      const effectiveLogoSize = isCollapsed
        ? Math.min(collapsedSidebarLogoSize, 64) // In collapsed mode, limit to sidebar width
        : sidebarLogoSize; // In expanded mode, use full size up to 500px

      return (
        <div className="relative">
          <Image
            src={logoToUse}
            alt="App Logo"
            width={effectiveLogoSize}
            height={effectiveLogoSize}
            unoptimized
            sizes={`${effectiveLogoSize}px`}
            style={{
              maxWidth: `${effectiveLogoSize}px`,
              maxHeight: `${effectiveLogoSize}px`,
              width: 'auto',
              height: 'auto',
            }}
            className="object-contain"
            data-ai-hint="company logo"
          />
          {/* Fallback icon that shows if image fails to load */}
          <Package2 className="h-6 w-6 absolute inset-0 m-auto opacity-0" style={{ pointerEvents: 'none' }} />
        </div>
      );
    }
    return <Package2 className="h-6 w-6" />;
  }, [isLogoLoading, getContextualLogo, isClient, sidebarLogoSize]);

  // Collapsed (icon) mode: show user avatar and logo below it
  if (!sidebarContext.open) {
    return (
      <div className="flex flex-col items-center py-4 gap-4 bg-sidebar/40 backdrop-blur-xl border-b border-border/50">
        {/* User Avatar in collapsed mode */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-10 w-10 rounded-xl overflow-hidden ring-2 ring-primary/20 hover:ring-indigo-500/50 hover:scale-105 transition-all shadow-lg shadow-primary/10 active:scale-95 group">
                <UserAvatarCompact user={user} size="sm" />
                <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-64 rounded-2xl border border-border/50 shadow-2xl ml-3 overflow-hidden">
              <DropdownMenuLabel className="font-normal p-0">
                <div className="bg-gradient-to-br from-indigo-500/10 to-blue-600/10 px-5 py-4 border-b border-border/30 text-indigo-600">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">User Account</p>
                  <p className="text-sm font-bold truncate mt-0.5">{user.name}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onSelect={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="h-1px w-8 bg-border/30" />

        {/* Logo in collapsed mode */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-full">
                {renderLogo(true)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{showLogoOnly ? 'Application' : currentAppName}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Expanded mode: user profile section and logo/toggle
  return (
    <div className="flex flex-col w-full border-b border-border/50 bg-sidebar/30 backdrop-blur-xl">
      {/* User Profile Section (Top) */}
      {user && (
        <div className="p-4 border-b border-border/30">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-indigo-500/5 transition-all cursor-pointer group border border-transparent hover:border-indigo-500/20 shadow-sm hover:shadow-indigo-500/10">
                <div className="relative h-11 w-11 shrink-0 rounded-xl overflow-hidden ring-2 ring-primary/10 group-hover:ring-indigo-500/40 transition-all shadow-sm group-hover:shadow-md">
                  <UserAvatarCompact user={user} size="md" />
                  <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors" />
                </div>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-sm font-bold text-foreground/90 truncate group-hover:text-indigo-600 transition-colors tracking-tight">{user.name}</span>
                  <span className="text-[9px] font-extrabold text-muted-foreground/60 uppercase tracking-[0.15em] group-hover:text-indigo-500/70 transition-colors">{user.role}</span>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 rounded-2xl border border-border/50 shadow-2xl mt-2 overflow-hidden">
              <DropdownMenuLabel className="font-normal p-0">
                <div className="bg-gradient-to-br from-indigo-500/10 to-blue-600/10 px-5 py-4 border-b border-border/30">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest opacity-80">Logged in as</p>
                  <p className="text-sm font-bold text-foreground truncate mt-0.5">{user.email || user.name}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onSelect={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Brand Section (Middle) */}
      <div className="flex items-center h-[64px] w-full px-4">
        <div className="flex items-center gap-3 w-full">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            {renderLogo(false)}
          </div>
          {!showLogoOnly && (
            <div className="flex-1 flex items-center justify-between min-w-0">
              <span className="font-bold text-base truncate text-foreground/90 tracking-tight">{currentAppName}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggle}
                disabled={isToggling}
                aria-label="Collapse sidebar"
                className="rounded-xl hover:bg-sidebar-accent shadow-none h-8 w-8 text-muted-foreground hover:text-foreground transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
