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
  appLogoUrl: string | null;
  isClient: boolean;
}

export function SidebarHeaderContent({ currentAppName, appLogoUrl, isClient }: SidebarHeaderContentProps) {
  const sidebarContext = useSidebar();

  const handleToggle = () => {
    if (sidebarContext?.toggleSidebar) {
      sidebarContext.toggleSidebar();
    }
  };

  const renderLogo = (isCollapsed: boolean) => {
    if (isClient && appLogoUrl) {
      return <Image src={appLogoUrl} alt="App Logo" width={32} height={32} className="h-8 w-8 object-contain" data-ai-hint="company logo" />;
    }
    return <Package2 className="h-6 w-6" />;
  };

  // Collapsed (icon) mode: show logo and toggle button
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
    </div>
  );
} 