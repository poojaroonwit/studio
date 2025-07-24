"use client";

import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Package2 } from "lucide-react";
import Image from 'next/image';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarHeaderContentProps {
  currentAppName: string;
  appLogoUrl: string | null; // MinIO URL, not data URL
  isClient: boolean;
  isLogoLoading?: boolean;
  contextualLogos?: {
    sidebarLogoCollapsedLightMode?: string | null;
    sidebarLogoExpandedLightMode?: string | null;
    sidebarLogoCollapsedDarkMode?: string | null;
    sidebarLogoExpandedDarkMode?: string | null;
  };
}

export function SidebarHeaderContent({ currentAppName, appLogoUrl, isClient, isLogoLoading, contextualLogos }: SidebarHeaderContentProps) {
  const sidebarContext = useSidebar();

  // Function to determine which logo to use
  const getContextualLogo = (isCollapsed: boolean): string | null => {
    if (!contextualLogos) return appLogoUrl;
    
    const isDark = document.documentElement.classList.contains('dark');
    
    if (isCollapsed) {
      if (isDark && contextualLogos.sidebarLogoCollapsedDarkMode) {
        return contextualLogos.sidebarLogoCollapsedDarkMode;
      } else if (!isDark && contextualLogos.sidebarLogoCollapsedLightMode) {
        return contextualLogos.sidebarLogoCollapsedLightMode;
      }
    } else {
      if (isDark && contextualLogos.sidebarLogoExpandedDarkMode) {
        return contextualLogos.sidebarLogoExpandedDarkMode;
      } else if (!isDark && contextualLogos.sidebarLogoExpandedLightMode) {
        return contextualLogos.sidebarLogoExpandedLightMode;
      }
    }
    
    return appLogoUrl; // Fallback to default logo
  };

  const handleToggle = () => {
    if (sidebarContext?.toggleSidebar) {
      sidebarContext.toggleSidebar();
    }
  };

  const renderLogo = (isCollapsed: boolean) => {
    if (isLogoLoading) {
      return <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />;
    }
    
    const logoToUse = getContextualLogo(isCollapsed);
    
    if (isClient && logoToUse) {
      return (
        <div className="relative">
          <img
            src={logoToUse}
            alt="App Logo"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            data-ai-hint="company logo"
          />
          {/* Fallback icon that shows if image fails to load */}
          <Package2 className="h-6 w-6 absolute inset-0 m-auto opacity-0" style={{ pointerEvents: 'none' }} />
        </div>
      );
    }
    return <Package2 className="h-6 w-6" />;
  };

  // Collapsed (icon) mode: show logo only, no toggle button (handled by floating button outside)
  if (!sidebarContext.open) {
    return (
      <div className="h-[var(--sidebar-width-icon)] flex flex-col justify-center items-center gap-2">
        {/* Logo in collapsed mode */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                {renderLogo(true)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{currentAppName}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Expanded mode: logo, app name, and collapse button in top right
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1 min-h-[48px]">
      <div className="flex items-center gap-2">
        {renderLogo(false)}
        <span className="font-semibold text-lg">{currentAppName}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        aria-label="Collapse sidebar"
        className="rounded-full bg-transparent hover:bg-transparent shadow-lg h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
} 