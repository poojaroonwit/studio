"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon as ChevronLeft, CubeIcon as Package2 } from "@heroicons/react/24/outline";
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
  const sidebarContext = useSidebar();
  const { currentTheme } = useTheme();
  const isMountedRef = useRef(true);

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
          <img
            src={logoToUse}
            alt="App Logo"
            width={100}
            height={100}
            style={{
              maxWidth: `${effectiveLogoSize}px`,
              maxHeight: `${effectiveLogoSize}px`,
              width: 'auto',
              height: 'auto',
            }}
            className="object-contain"
            data-ai-hint="company logo"
            onError={(e) => {
              // Logo failed to load - fallback icon will be shown
            }}
            onLoad={() => {
              // Logo loaded successfully
            }}
          />
          {/* Fallback icon that shows if image fails to load */}
          <Package2 className="h-6 w-6 absolute inset-0 m-auto opacity-0" style={{ pointerEvents: 'none' }} />
        </div>
      );
    }
    return <Package2 className="h-6 w-6" />;
  }, [isLogoLoading, getContextualLogo, isClient, sidebarLogoSize]);

  // Collapsed (icon) mode: show logo only, no toggle button (handled by floating button outside)
  if (!sidebarContext.open) {
    return (
      <div className="h-[var(--sidebar-width-icon)] flex items-center justify-center">
        {/* Logo in collapsed mode */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-full h-full">
                {renderLogo(true)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{showLogoOnly ? 'Application' : currentAppName}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Expanded mode: logo section (aligned with primary sidebar) and app details (aligned with secondary sidebar)
  return (
    <div className="flex items-center h-[64px] w-full border-b border-border/50 bg-sidebar/50 backdrop-blur-sm">
      <div className="w-[80px] flex items-center justify-center shrink-0 h-full">
        {renderLogo(false)}
      </div>
      {!showLogoOnly && (
        <div className="flex-1 flex items-center justify-between pl-2 pr-4 min-w-0 h-full">
          <span className="font-bold text-lg truncate text-foreground leading-tight tracking-tight">{currentAppName}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            disabled={isToggling}
            aria-label="Collapse sidebar"
            className="rounded-full bg-transparent hover:bg-sidebar-accent shadow-none h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground transition-all ml-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
} 