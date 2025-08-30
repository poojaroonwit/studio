"use client";

// Import T object initialization early
import '@/lib/t-object-init';

import React, { type ReactNode, useState, useEffect } from "react";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, useSidebar, SidebarSeparator } from "@/components/ui/sidebar";
import { Header } from "./Header";
import { useSession } from "next-auth/react";
import { GlobalLoadingOverlay } from "./GlobalLoadingOverlay";
import { usePageLoading } from "@/hooks/use-page-loading";
import { useSessionValidation } from "@/hooks/use-session-validation";
import SidebarNav from "./SidebarNav";
import { FaviconUpdater } from "./FaviconUpdater";
import { useFavicon } from "@/hooks/use-favicon";
import { usePathname } from "next/navigation";
import { Package2, ChevronRight } from "lucide-react";
import { setThemeAndColors } from '@/lib/themeUtils';
import { useTheme } from '@/hooks/use-theme';
import { SidebarHeaderContent } from "./SidebarHeaderContent";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useComponentProtection } from "@/hooks/use-global-objects";
import { GlobalObjectsProvider } from "@/components/GlobalObjectsProvider";

const DEFAULT_APP_NAME = "FitScan";

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/candidates")) { 
    if (pathname === "/candidates/upload") return "Process queue";
    if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '' && !pathname.includes('create-via-automation')) {
      return "Candidate Details";
    }
    return "Candidates";
  }
  if (pathname.startsWith("/positions")) {
    if (pathname.split('/').length === 3 && pathname.split('/')[2] !== '') return "Position Details";
    return "Job Positions";
  }
  if (pathname.startsWith("/users")) return "Manage Users";
  if (pathname.startsWith("/my-tasks")) return "My Task Board";
  if (pathname.startsWith("/settings/preferences")) return "Preferences";
  if (pathname.startsWith("/settings/system-settings")) return "Integrations";
  if (pathname.startsWith("/settings/stages")) return "Recruitment Stages";
  if (pathname.startsWith("/settings/custom-fields")) return "Custom Field Definitions";
  if (pathname.startsWith("/settings/user-groups")) return "User Groups";
  if (pathname.startsWith("/api-docs")) return "API Documentation";
  if (pathname.startsWith("/logs")) return "Application Logs";
  if (pathname.startsWith("/auth/signin")) return "Sign In";
  return DEFAULT_APP_NAME;
}

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  // Use component protection hook for ultra-aggressive global object protection
  const { ensureObjects } = useComponentProtection();

  // Ensure single-letter objects are available during component initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Import and call the ensure function from t-object-init
      import('@/lib/t-object-init').then(({ ensureGlobalObjects }) => {
        ensureGlobalObjects();
        ensureObjects(); // Additional protection
        console.log('ALL single-letter objects (A-Z) ensured in AppLayout useEffect');
      });
    }
  }, [ensureObjects]);

  const pathname = usePathname();
  const [currentAppName, setCurrentAppName] = useState<string>(DEFAULT_APP_NAME);
  const pageTitle = pathname === "/auth/signin" ? "Sign In" : getPageTitle(pathname) || currentAppName;
  
  const { mounted: themeMounted } = useTheme();
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
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
  const { isLoading } = usePageLoading();
  const { faviconDataUrl } = useFavicon();
  
  const shouldValidateSession = pathname !== "/auth/signin" && status === "authenticated";
  const { isValidating: isSessionValidating } = useSessionValidation({
    validateInterval: 5 * 60 * 1000,
    autoSignOut: true,
    redirectTo: '/auth/signin'
  });

  useEffect(() => {
    setIsClient(true);
    
    const fetchGlobalSettings = async () => {
      try {
        setIsLogoLoading(true);
        const res = await fetch('/api/settings/system-settings');
        const data = await res.json();

        let prefs: any = {};
        if (data.settings && Array.isArray(data.settings)) {
          prefs = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
        } else {
          prefs = data;
        }

        setAppLogoUrl(prefs.appLogoDataUrl || null);
        setCurrentAppName(prefs.appName || DEFAULT_APP_NAME);
        setShowLogoOnly(prefs.showLogoOnly === 'true' || prefs.showLogoOnly === true);
        setSidebarLogoSize(prefs.sidebarLogoSize ? parseInt(prefs.sidebarLogoSize) : 48);

        setContextualLogos({
          sidebarLogoCollapsedLightMode: prefs.sidebarLogoCollapsedLightMode || null,
          sidebarLogoExpandedLightMode: prefs.sidebarLogoExpandedLightMode || null,
          sidebarLogoCollapsedDarkMode: prefs.sidebarLogoCollapsedDarkMode || null,
          sidebarLogoExpandedDarkMode: prefs.sidebarLogoExpandedDarkMode || null,
        });

        // Extract sidebar colors
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

        if (prefs.sidebarBackgroundType || prefs.sidebarBackgroundImageUrl) {
          import('@/lib/themeUtils').then(({ applySidebarBackgroundSettings }) => {
            applySidebarBackgroundSettings({
              sidebarBackgroundType: prefs.sidebarBackgroundType,
              sidebarBackgroundImageUrl: prefs.sidebarBackgroundImageUrl,
              sidebarBackgroundImageFit: prefs.sidebarBackgroundImageFit,
              sidebarBackgroundImagePosition: prefs.sidebarBackgroundImagePosition,
            });
          });
        }
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
        sidebarBackgroundImageUrl?: string;
        sidebarBackgroundType?: string;
      }>;
      
      if (customEvent.detail) {
        if (customEvent.detail.appName) setCurrentAppName(customEvent.detail.appName);
        if (customEvent.detail.logoUrl !== undefined) setAppLogoUrl(customEvent.detail.logoUrl);
        if (customEvent.detail.contextualLogos) setContextualLogos(customEvent.detail.contextualLogos);
        if (customEvent.detail.sidebarLogoSize !== undefined) setSidebarLogoSize(customEvent.detail.sidebarLogoSize);

        if (customEvent.detail.sidebarBackgroundImageUrl !== undefined || customEvent.detail.sidebarBackgroundType !== undefined) {
          import('@/lib/themeUtils').then(({ applySidebarBackgroundSettings }) => {
            applySidebarBackgroundSettings({
              sidebarBackgroundType: customEvent.detail.sidebarBackgroundType,
              sidebarBackgroundImageUrl: customEvent.detail.sidebarBackgroundImageUrl,
            });
          });
        }

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
    
    try {
      window.removeEventListener('appConfigChanged', handleAppConfigChange);
      window.addEventListener('appConfigChanged', handleAppConfigChange);
    } catch (error) {
      console.warn('Error setting up app config listener:', error);
    }
    
    return () => {
      try {
        window.removeEventListener('appConfigChanged', handleAppConfigChange);
      } catch (error) {
        console.warn('Error removing app config listener:', error);
      }
    };
  }, []);

  // Theme change listener
  useEffect(() => {
    let mediaQuery: MediaQueryList | null = null;
    
    const handleThemeChange = () => {
      import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
        reapplyCurrentSidebarColors();
      }).catch((error) => {
        console.warn('Error loading theme utils:', error);
      });
    };

    try {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.removeEventListener('change', handleThemeChange);
      mediaQuery.addEventListener('change', handleThemeChange);
    } catch (error) {
      console.warn('MediaQuery not supported:', error);
    }

    return () => {
      if (mediaQuery) {
        try {
          mediaQuery.removeEventListener('change', handleThemeChange);
        } catch (error) {
          console.warn('Error removing theme change listener:', error);
        }
      }
    };
  }, []);

  if (status === "loading" || !themeMounted) {
    return <GlobalLoadingOverlay />;
  }

  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <GlobalObjectsProvider>
      <SidebarProvider defaultOpen={true}>
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
    </GlobalObjectsProvider>
  );
}

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
            <button
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              className="rounded-full bg-transparent hover:bg-accent hover:text-accent-foreground shadow-lg h-8 w-8 flex items-center justify-center transition-all duration-200"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Expand sidebar</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
