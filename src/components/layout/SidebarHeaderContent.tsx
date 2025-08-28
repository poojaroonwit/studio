"use client";

import { useCallback, useState, useEffect } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Package2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from 'next/image';

interface SidebarHeaderContentProps {
  currentAppName: string;
  appLogoUrl: string | null; // MinIO URL, not data URL
  isClient: boolean;
  isLogoLoading: boolean;
  showLogoOnly?: boolean;
  sidebarLogoSize?: number;
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
  contextualLogos = {} 
}: SidebarHeaderContentProps) {
  const sidebarContext = useSidebar();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Track dark mode state to avoid DOM queries on every render
  useEffect(() => {
    const checkDarkMode = () => {
      if (typeof window !== 'undefined') {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
      }
    };

    checkDarkMode();

    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode);
    if (typeof window !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return () => observer.disconnect();
  }, []);

  const getContextualLogo = useCallback((isCollapsed: boolean) => {
    if (isCollapsed) {
      if (isDarkMode && contextualLogos.sidebarLogoCollapsedDarkMode) {
        return contextualLogos.sidebarLogoCollapsedDarkMode;
      } else if (!isDarkMode && contextualLogos.sidebarLogoCollapsedLightMode) {
        return contextualLogos.sidebarLogoCollapsedLightMode;
      }
    } else {
      if (isDarkMode && contextualLogos.sidebarLogoExpandedDarkMode) {
        return contextualLogos.sidebarLogoExpandedDarkMode;
      } else if (!isDarkMode && contextualLogos.sidebarLogoExpandedLightMode) {
        return contextualLogos.sidebarLogoExpandedLightMode;
      }
    }
    
    return appLogoUrl; // Fallback to default logo
  }, [contextualLogos, appLogoUrl, isDarkMode]);

  const handleToggle = useCallback(() => {
    if (sidebarContext?.toggleSidebar) {
      sidebarContext.toggleSidebar();
    }
  }, [sidebarContext?.toggleSidebar]);

  const renderLogo = useCallback((isCollapsed: boolean) => {
    if (isLogoLoading) {
      return <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />;
    }
    
    const logoToUse = getContextualLogo(isCollapsed);
    
    if (isClient && logoToUse) {
      // Calculate responsive logo size based on sidebar state and available space
      const effectiveLogoSize = isCollapsed 
        ? Math.min(sidebarLogoSize, 64) // In collapsed mode, limit to sidebar width
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

  // Expanded mode: logo, app name, and collapse button in top right
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1 min-h-[48px] flex-wrap">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {renderLogo(false)}
        {!showLogoOnly && <span className="font-semibold text-lg truncate">{currentAppName}</span>}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        aria-label="Collapse sidebar"
        className="rounded-full bg-transparent hover:bg-transparent shadow-lg h-8 w-8 flex-shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
} 