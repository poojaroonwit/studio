"use client";

// Import T object initialization early
import '@/lib/t-object-init';
if (typeof window !== 'undefined') {
  // Always ensure T object exists and has all required methods
  if (!(window as any).T) {
    (window as any).T = {};
  }
  
  // Universal single-letter global object protection
  // This ensures ALL single-letter global objects (A-Z) are available
  const singleLetterObjects = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  
  singleLetterObjects.forEach(letter => {
    if (!(window as any)[letter]) {
      (window as any)[letter] = {};
    }
    
    // Ensure filter method exists with robust error handling
    (window as any)[letter].filter = (window as any)[letter].filter || ((array: any, predicate: any) => {
      try {
        if (!Array.isArray(array)) {
          console.warn(letter + '.filter: Input is not an array:', array);
          return [];
        }
        return array.filter(predicate);
      } catch (error) {
        console.error(letter + '.filter: Error during filtering:', error);
        return [];
      }
    });
  });
  
  console.log('🔍 ALL single-letter objects (A-Z) initialized in AppLayout');
  
  // Ensure all methods exist with robust error handling
  (window as any).T.filter = (window as any).T.filter || ((array: any, predicate: any) => {
    try {
      if (!Array.isArray(array)) {
        console.warn('T.filter: Input is not an array:', array);
        return [];
      }
      return array.filter(predicate);
    } catch (error) {
      console.error('T.filter: Error during filtering:', error);
      return [];
    }
  });
  
  (window as any).T.map = (window as any).T.map || ((array: any, mapper: any) => {
    try {
      if (!Array.isArray(array)) {
        console.warn('T.map: Input is not an array:', array);
        return [];
      }
      return array.map(mapper);
    } catch (error) {
      console.error('T.map: Error during mapping:', error);
      return [];
    }
  });
  
  (window as any).T.find = (window as any).T.find || ((array: any, predicate: any) => {
    try {
      if (!Array.isArray(array)) {
        console.warn('T.find: Input is not an array:', array);
        return undefined;
      }
      return array.find(predicate);
    } catch (error) {
      console.error('T.find: Error during finding:', error);
      return undefined;
    }
  });
  
  (window as any).T.some = (window as any).T.some || ((array: any, predicate: any) => {
    try {
      if (!Array.isArray(array)) {
        console.warn('T.some: Input is not an array:', array);
        return false;
      }
      return array.some(predicate);
    } catch (error) {
      console.error('T.some: Error during some operation:', error);
      return false;
    }
  });
  
  (window as any).T.every = (window as any).T.every || ((array: any, predicate: any) => {
    try {
      if (!Array.isArray(array)) {
        console.warn('T.every: Input is not an array:', array);
        return true;
      }
      return array.every(predicate);
    } catch (error) {
      console.error('T.every: Error during every operation:', error);
      return true;
    }
  });
  
  console.log('✅ T object initialized immediately in AppLayout with robust error handling');
}

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
  // Ensure T and D objects are available during component initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Always ensure T object exists
      if (!(window as any).T) {
        (window as any).T = {};
      }
      
      // Universal single-letter global object protection
      // This ensures ALL single-letter global objects (A-Z) are available
      const singleLetterObjects = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
      
      singleLetterObjects.forEach(letter => {
        if (!(window as any)[letter]) {
          (window as any)[letter] = {};
        }
        
        // Ensure filter method exists with robust error handling
        (window as any)[letter].filter = (window as any)[letter].filter || ((array: any, predicate: any) => {
          try {
            if (!Array.isArray(array)) {
              console.warn(letter + '.filter: Input is not an array:', array);
              return [];
            }
            return array.filter(predicate);
          } catch (error) {
            console.error(letter + '.filter: Error during filtering:', error);
            return [];
          }
        });
      });
      
      console.log('🔍 ALL single-letter objects (A-Z) ensured in AppLayout useEffect');
      
      // Ensure all methods exist with robust error handling
      (window as any).T.filter = (window as any).T.filter || ((array: any, predicate: any) => {
        try {
          if (!Array.isArray(array)) {
            console.warn('T.filter: Input is not an array:', array);
            return [];
          }
          return array.filter(predicate);
        } catch (error) {
          console.error('T.filter: Error during filtering:', error);
          return [];
        }
      });
      
      (window as any).T.map = (window as any).T.map || ((array: any, mapper: any) => {
        try {
          if (!Array.isArray(array)) {
            console.warn('T.map: Input is not an array:', array);
            return [];
          }
          return array.map(mapper);
        } catch (error) {
          console.error('T.map: Error during mapping:', error);
          return [];
        }
      });
      
      (window as any).T.find = (window as any).T.find || ((array: any, predicate: any) => {
        try {
          if (!Array.isArray(array)) {
            console.warn('T.find: Input is not an array:', array);
            return undefined;
          }
          return array.find(predicate);
        } catch (error) {
          console.error('T.find: Error during finding:', error);
          return undefined;
        }
      });
      
      (window as any).T.some = (window as any).T.some || ((array: any, predicate: any) => {
        try {
          if (!Array.isArray(array)) {
            console.warn('T.some: Input is not an array:', array);
            return false;
          }
          return array.some(predicate);
        } catch (error) {
          console.error('T.some: Error during some operation:', error);
          return false;
        }
      });
      
      (window as any).T.every = (window as any).T.every || ((array: any, predicate: any) => {
        try {
          if (!Array.isArray(array)) {
            console.warn('T.every: Input is not an array:', array);
            return true;
          }
          return array.every(predicate);
        } catch (error) {
          console.error('T.every: Error during every operation:', error);
          return true;
        }
      });
      
      console.log('✅ T object initialized in AppLayout useEffect with robust error handling');
      
      // Add global error handler for T.filter errors
      const handleTFilterError = (event: ErrorEvent) => {
        if (event.error && event.error.message && event.error.message.includes('T.filter is not a function')) {
          console.warn('AppLayout caught T.filter error, ensuring T object is available');
          
          // Ensure T object exists
          if (!(window as any).T) {
            (window as any).T = {};
          }
          
          // Ensure T.filter exists
          if (!(window as any).T.filter) {
            (window as any).T.filter = function(array: any, predicate: any) {
              try {
                if (!Array.isArray(array)) {
                  console.warn('T.filter: Input is not an array:', array);
                  return [];
                }
                return array.filter(predicate);
              } catch (error) {
                console.error('T.filter: Error during filtering:', error);
                return [];
              }
            };
          }
          
          // Prevent the error from propagating
          event.preventDefault();
          return false;
        }
      };
      
      // Add error listener
      window.addEventListener('error', handleTFilterError);
      
      // Cleanup function
      return () => {
        window.removeEventListener('error', handleTFilterError);
      };
    }
  }, []);

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
  const { isLoading } = usePageLoading();
  
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

        // Load and apply sidebar background settings
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
      console.log('AppLayout received appConfigChanged event:', event);
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
        if (customEvent.detail.appName) {
          setCurrentAppName(customEvent.detail.appName);
        }
        if (customEvent.detail.logoUrl !== undefined) {
          console.log('Setting appLogoUrl to:', customEvent.detail.logoUrl);
          setAppLogoUrl(customEvent.detail.logoUrl);
        }
        if (customEvent.detail.contextualLogos) {
          console.log('Setting contextualLogos to:', customEvent.detail.contextualLogos);
          setContextualLogos(customEvent.detail.contextualLogos);
        }
        if (customEvent.detail.sidebarLogoSize !== undefined) {
          setSidebarLogoSize(customEvent.detail.sidebarLogoSize);
        }

        // Handle sidebar background updates
        if (customEvent.detail.sidebarBackgroundImageUrl !== undefined || customEvent.detail.sidebarBackgroundType !== undefined) {
          // Import and apply sidebar background settings
          import('@/lib/themeUtils').then(({ applySidebarBackgroundSettings }) => {
            applySidebarBackgroundSettings({
              sidebarBackgroundType: customEvent.detail.sidebarBackgroundType,
              sidebarBackgroundImageUrl: customEvent.detail.sidebarBackgroundImageUrl,
            });
          });
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
    
    // Remove any existing listener before adding a new one to prevent duplicates
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

  // Add theme change listener to re-apply sidebar colors when theme changes
  useEffect(() => {
    let mediaQuery: MediaQueryList | null = null;
    
    const handleThemeChange = () => {
      // Re-apply current sidebar colors when theme changes
      import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
        reapplyCurrentSidebarColors();
      }).catch((error) => {
        console.warn('Error loading theme utils:', error);
      });
    };

    // Listen for system theme changes
    try {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Remove any existing listener before adding a new one
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

  // Handle page loading state with proper cleanup
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    setIsPageLoading(true);
    timeoutId = setTimeout(() => {
      setIsPageLoading(false);
    }, 300); // Short delay to show loading state

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [pathname]);

  // Show loading while session is being fetched or validated
  if (status === "loading" || !themeMounted) {
    return <GlobalLoadingOverlay />;
  }

  // If not authenticated, show children (auth pages will handle redirect)
  if (!session?.user) {
    return <>{children}</>;
  }

  const isSettingsPage = pathname.startsWith("/settings");



  return (
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
