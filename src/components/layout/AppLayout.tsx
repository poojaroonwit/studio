"use client";

import React, { type ReactNode, useState, useEffect } from "react";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, useSidebar, SidebarSeparator } from "@/components/ui/sidebar";
import { Header } from "./Header";
import { useSession } from "next-auth/react";
import { GlobalLoadingOverlay } from "./GlobalLoadingOverlay";
import { usePageLoading } from "@/hooks/use-page-loading";
import { useSessionValidation } from "@/hooks/use-session-validation";
import SidebarNav from "./SidebarNav";
import { SidebarStyleInitializer } from "./SidebarStyleInitializer";
import { FaviconUpdater } from "./FaviconUpdater";
import { useFavicon } from "@/hooks/use-favicon";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';
import { Package2, ChevronRight, ChevronLeft } from "lucide-react";
import packageJson from '../../../package.json';
import { setThemeAndColors } from '@/lib/themeUtils';
import { useTheme } from '@/hooks/use-theme';
import { SidebarHeaderContent } from "./SidebarHeaderContent";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

const APP_LOGO_DATA_URL_KEY = 'appLogoDataUrl';
const APP_CONFIG_APP_NAME_KEY = 'appConfigAppName';
const DEFAULT_APP_NAME = "FitScan";
const DEFAULT_LOGO_ICON = <Package2 className="h-6 w-6" />;

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/candidates")) { 
    if (pathname === "/candidates/upload") {
      return "Process queue";
    }
    if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '' && !pathname.includes('create-via-automation')) {
        return "Candidate Details";
    }
    return "Candidates";
  }
  if (pathname.startsWith("/positions")) {
     if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '') {
        return "Position Details";
    }
    return "Job Positions";
  }
  if (pathname.startsWith("/users")) return "Manage Users";
  if (pathname.startsWith("/my-tasks")) return "My Task Board";
  if (pathname.startsWith("/settings/preferences")) return "Preferences";
      if (pathname.startsWith("/settings/system-settings")) return "Integrations";
  if (pathname.startsWith("/settings/stages")) return "Recruitment Stages";

  if (pathname.startsWith("/settings/custom-fields")) return "Custom Field Definitions";
  
  if (pathname.startsWith("/settings/user-groups")) return "User Groups"; // New
  if (pathname.startsWith("/api-docs")) return "API Documentation";
  if (pathname.startsWith("/logs")) return "Application Logs";
  if (pathname.startsWith("/auth/signin")) return "Sign In";
  return DEFAULT_APP_NAME; // Use dynamic app name as fallback for unknown paths
}

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [currentAppName, setCurrentAppName] = useState<string>(DEFAULT_APP_NAME);
  const pageTitle = pathname === "/auth/signin" ? "Sign In" : getPageTitle(pathname) || currentAppName; // Use currentAppName in title if needed
  
  // Initialize theme
  const { mounted: themeMounted } = useTheme();
  
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null); // MinIO URL, not data URL
  const [isClient, setIsClient] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [contextualLogos, setContextualLogos] = useState<{
    sidebarLogoCollapsedLightMode?: string | null;
    sidebarLogoExpandedLightMode?: string | null;
    sidebarLogoCollapsedDarkMode?: string | null;
    sidebarLogoExpandedDarkMode?: string | null;
  }>({});
  const [showLogoOnly, setShowLogoOnly] = useState<boolean>(false);
  const [sidebarLogoSize, setSidebarLogoSize] = useState<number>(48);
  const [isLogoLoading, setIsLogoLoading] = useState(true);

  const { data: session, status } = useSession();
  const isLoading = usePageLoading();
  
  // Add favicon management
  const { faviconDataUrl } = useFavicon();
  
  // Add session validation - only validate on authenticated pages
  const shouldValidateSession = pathname !== "/auth/signin" && status === "authenticated";
  const { isValidating: isSessionValidating } = useSessionValidation({
    validateInterval: 5 * 60 * 1000, // 5 minutes
    autoSignOut: true,
    redirectTo: '/auth/signin'
  });

  useEffect(() => {
    setIsClient(true);
    // Fetch global preferences from system-settings API
    const fetchGlobalSettings = async () => {
      try {
        setIsLogoLoading(true);
        const res = await fetch('/api/settings/system-settings');
        const data = await res.json();
        
        // Handle both response formats (GET returns {settings: [...], isAzureAdConfigured: boolean})
        let prefs: any = {};
        if (data.settings && Array.isArray(data.settings)) {
          // Convert array format to object format
          prefs = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
        } else {
          // Already in object format
          prefs = data;
        }
        
        setAppLogoUrl(prefs.appLogoDataUrl || null); // MinIO URL
        setCurrentAppName(prefs.appName || DEFAULT_APP_NAME);
        setShowLogoOnly(prefs.showLogoOnly === 'true' || prefs.showLogoOnly === true);
        setSidebarLogoSize(prefs.sidebarLogoSize ? parseInt(prefs.sidebarLogoSize) : 48);
        
        // Load contextual logos
        setContextualLogos({
          sidebarLogoCollapsedLightMode: prefs.sidebarLogoCollapsedLightMode || null,
          sidebarLogoExpandedLightMode: prefs.sidebarLogoExpandedLightMode || null,
          sidebarLogoCollapsedDarkMode: prefs.sidebarLogoCollapsedDarkMode || null,
          sidebarLogoExpandedDarkMode: prefs.sidebarLogoExpandedDarkMode || null,
        });
        
        // Extract sidebar colors from individual settings
        const sidebarColors: Record<string, string> = {};
        const sidebarColorKeys = [
          'sidebarBgStartL', 'sidebarBgEndL', 'sidebarTextL', 'sidebarActiveBgStartL', 'sidebarActiveBgEndL', 'sidebarActiveTextL',
          'sidebarHoverBgL', 'sidebarHoverTextL', 'sidebarBorderL', 'sidebarBgStartD', 'sidebarBgEndD', 'sidebarTextD',
          'sidebarActiveBgStartD', 'sidebarActiveBgEndD', 'sidebarActiveTextD', 'sidebarHoverBgD', 'sidebarHoverTextD', 'sidebarBorderD',
          'sidebarFontFamilyL', 'sidebarFontSizeL', 'sidebarFontWeightL', 'sidebarLineHeightL', 'sidebarLetterSpacingL', 'sidebarTextTransformL',
          'sidebarFontFamilyD', 'sidebarFontSizeD', 'sidebarFontWeightD', 'sidebarLineHeightD', 'sidebarLetterSpacingD', 'sidebarTextTransformD',
          'sidebarBorderWidthL', 'sidebarBorderStyleL', 'sidebarBorderRadiusL', 'sidebarShadowL', 'sidebarShadowHoverL', 'sidebarShadowActiveL',
          'sidebarBorderWidthD', 'sidebarBorderStyleD', 'sidebarBorderRadiusD', 'sidebarShadowD', 'sidebarShadowHoverD', 'sidebarShadowActiveD',
          'sidebarPaddingXL', 'sidebarPaddingYL', 'sidebarMarginL', 'sidebarGapL', 'sidebarWidthL', 'sidebarWidthCollapsedL', 'sidebarTransitionDurationL', 'sidebarTransitionTimingL',
          'sidebarPaddingXD', 'sidebarPaddingYD', 'sidebarMarginD', 'sidebarGapD', 'sidebarWidthD', 'sidebarWidthCollapsedD', 'sidebarTransitionDurationD', 'sidebarTransitionTimingD',
          'sidebarMenuItemBgL', 'sidebarMenuItemBgHoverL', 'sidebarMenuItemBgActiveL', 'sidebarMenuItemColorL', 'sidebarMenuItemColorHoverL', 'sidebarMenuItemColorActiveL',
          'sidebarMenuItemBorderL', 'sidebarMenuItemBorderHoverL', 'sidebarMenuItemBorderActiveL', 'sidebarMenuItemBorderRadiusL', 'sidebarMenuItemPaddingXL', 'sidebarMenuItemPaddingYL',
          'sidebarMenuItemMarginL', 'sidebarMenuItemFontWeightL', 'sidebarMenuItemFontWeightActiveL', 'sidebarMenuItemFontSizeL', 'sidebarMenuItemLineHeightL', 'sidebarMenuItemTransitionL',
          'sidebarMenuItemBgD', 'sidebarMenuItemBgHoverD', 'sidebarMenuItemBgActiveD', 'sidebarMenuItemColorD', 'sidebarMenuItemColorHoverD', 'sidebarMenuItemColorActiveD',
          'sidebarMenuItemBorderD', 'sidebarMenuItemBorderHoverD', 'sidebarMenuItemBorderActiveD', 'sidebarMenuItemBorderRadiusD', 'sidebarMenuItemPaddingXD', 'sidebarMenuItemPaddingYD',
          'sidebarMenuItemMarginD', 'sidebarMenuItemFontWeightD', 'sidebarMenuItemFontWeightActiveD', 'sidebarMenuItemFontSizeD', 'sidebarMenuItemLineHeightD', 'sidebarMenuItemTransitionD',
          'sidebarIconSizeL', 'sidebarIconColorL', 'sidebarIconColorHoverL', 'sidebarIconColorActiveL', 'sidebarIconMarginRightL', 'sidebarIconTransitionL',
          'sidebarIconSizeD', 'sidebarIconColorD', 'sidebarIconColorHoverD', 'sidebarIconColorActiveD', 'sidebarIconMarginRightD', 'sidebarIconTransitionD',
          'sidebarGroupLabelColorL', 'sidebarGroupLabelFontSizeL', 'sidebarGroupLabelFontWeightL', 'sidebarGroupLabelTextTransformL', 'sidebarGroupLabelLetterSpacingL', 'sidebarGroupLabelPaddingL', 'sidebarGroupLabelMarginL',
          'sidebarGroupLabelColorD', 'sidebarGroupLabelFontSizeD', 'sidebarGroupLabelFontWeightD', 'sidebarGroupLabelTextTransformD', 'sidebarGroupLabelLetterSpacingD', 'sidebarGroupLabelPaddingD', 'sidebarGroupLabelMarginD',
        ];
        
        sidebarColorKeys.forEach(key => {
          if (prefs[key]) {
            sidebarColors[key] = prefs[key];
          }
        });
        
        setThemeAndColors({
          themePreference: prefs.appThemePreference || 'system',
          primaryGradientStart: prefs.primaryGradientStart || prefs.sidebarActiveBgStartL,
          primaryGradientEnd: prefs.primaryGradientEnd || prefs.sidebarActiveBgEndL,
          sidebarColors,
        });
      } catch (e) {
        setAppLogoUrl(null);
        setCurrentAppName(DEFAULT_APP_NAME);
      } finally {
        setIsLogoLoading(false);
      }
    };
    fetchGlobalSettings();
    const handleAppConfigChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ 
        appName?: string; 
        logoUrl?: string | null; 
        themePreference?: string; 
        primaryGradientStart?: string; 
        primaryGradientEnd?: string; 
        sidebarColors?: Record<string,string>;
        sidebarLogoSize?: number;
        contextualLogos?: {
          sidebarLogoCollapsedLightMode?: string | null;
          sidebarLogoExpandedLightMode?: string | null;
          sidebarLogoCollapsedDarkMode?: string | null;
          sidebarLogoExpandedDarkMode?: string | null;
        };
      }>;
      if (customEvent.detail) {
        if (customEvent.detail.appName) {
          setCurrentAppName(customEvent.detail.appName);
        }
        if (customEvent.detail.logoUrl !== undefined) {
          setAppLogoUrl(customEvent.detail.logoUrl);
        }
        if (customEvent.detail.contextualLogos) {
          setContextualLogos(customEvent.detail.contextualLogos);
        }
        if (customEvent.detail.sidebarLogoSize !== undefined) {
          setSidebarLogoSize(customEvent.detail.sidebarLogoSize);
        }
        
        // If sidebarColors are provided in the event, use them; otherwise fetch fresh data
        if (customEvent.detail.sidebarColors) {
          setThemeAndColors({
            themePreference: (customEvent.detail.themePreference || 'system') as 'system' | 'light' | 'dark',
            primaryGradientStart: customEvent.detail.primaryGradientStart,
            primaryGradientEnd: customEvent.detail.primaryGradientEnd,
            sidebarColors: customEvent.detail.sidebarColors,
          });
        } else {
          fetchGlobalSettings();
        }
      } else {
        fetchGlobalSettings();
      }
    };
    window.addEventListener('appConfigChanged', handleAppConfigChange);
    return () => {
      window.removeEventListener('appConfigChanged', handleAppConfigChange);
    };
  }, []);

  // Add theme change listener to re-apply sidebar colors when theme changes
  useEffect(() => {
    const handleThemeChange = () => {
      // Re-apply current sidebar colors when theme changes
      import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
        reapplyCurrentSidebarColors();
      });
    };

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);

  // Handle page loading state
  useEffect(() => {
    setIsPageLoading(true);
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 300); // Short delay to show loading state

    return () => clearTimeout(timer);
  }, [pathname]);

  // Show loading while session is being fetched or validated
  if (status === "loading" || (shouldValidateSession && isSessionValidating) || !themeMounted) {
    return <GlobalLoadingOverlay />;
  }

  // If not authenticated, show children (auth pages will handle redirect)
  if (!session?.user) {
    return <>{children}</>;
  }

  const isSettingsPage = pathname.startsWith("/settings");



  return (
    <SidebarProvider defaultOpen={true}>
      <SidebarStyleInitializer />
      <FaviconUpdater faviconDataUrl={faviconDataUrl} />
      <SidebarToggleButton />
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar collapsible="icon" className="border-r border-border">
          <SidebarHeader>
            <SidebarHeaderContent 
              currentAppName={currentAppName}
              appLogoUrl={appLogoUrl}
              isClient={isClient}
              isLogoLoading={isLogoLoading}
              showLogoOnly={showLogoOnly}
              sidebarLogoSize={sidebarLogoSize}
              contextualLogos={contextualLogos}
            />
          </SidebarHeader>
          {/* Add separator below app name/logo group */}
          <SidebarSeparator className="my-0" />
          <SidebarContent>
            <SidebarNav />
          </SidebarContent>
        </Sidebar>
        <div className="flex-1 flex flex-col min-w-0">
          <Header pageTitle={pageTitle} showLogoOnly={showLogoOnly} />
          <main className="flex-1 overflow-auto p-0">
            {isLoading && <GlobalLoadingOverlay />}
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Restore SidebarToggleButton, but only show when sidebar is collapsed
function SidebarToggleButton() {
  const { open, toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || open) {
    return null;
  }

  return (
    <div className={`fixed top-[12px] left-[var(--sidebar-width-icon,4rem)] z-[100] transition-all duration-200`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              className="rounded-full bg-transparent hover:bg-transparent shadow-lg h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand sidebar</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
