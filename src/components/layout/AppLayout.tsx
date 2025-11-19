"use client";

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import React, { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider, SidebarSeparator } from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRight } from 'lucide-react';
import SidebarNav from '@/components/layout/SafeSidebarNav';
import { SidebarHeaderContent } from '@/components/layout/SidebarHeaderContent';
import { Header } from '@/components/layout/Header';
import { GlobalLoadingOverlay } from '@/components/layout/GlobalLoadingOverlay';
import { usePageLoading } from '@/hooks/use-page-loading';
import { useFavicon } from '@/hooks/use-favicon';
import { FaviconUpdater } from '@/components/layout/FaviconUpdater';
import { useSessionValidation } from '@/hooks/use-session-validation';
import { useTheme } from '@/hooks/use-theme';
import { useRenderMonitor } from '@/hooks/use-render-monitor';
import { OptimizedContainer, LayoutContainer } from '@/components/ui/optimized-container';
import { useAppLayoutState } from '@/hooks/use-app-layout-state';

const DEFAULT_APP_NAME = "FitScan";

interface AppLayoutProps {
  children: React.ReactNode;
}

// Memoized component to prevent unnecessary re-renders
const MemoizedFaviconUpdater = memo(FaviconUpdater);
const MemoizedSidebarHeaderContent = memo(SidebarHeaderContent);
const MemoizedHeader = memo(Header);
const MemoizedSidebarNav = memo(SidebarNav);
MemoizedSidebarNav.displayName = 'MemoizedSidebarNav';

const AppLayoutComponent = ({ children }: AppLayoutProps) => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { isLoading } = usePageLoading();
  const { faviconDataUrl } = useFavicon();
  const { mounted: themeMounted } = useTheme();
  
  // Refs to store stable function references
  const updateAppConfigRef = useRef<any>(null);
  const updateThemeAndColorsRef = useRef<any>(null);
  const resetToDefaultsRef = useRef<any>(null);
  const setLogoLoadingRef = useRef<any>(null);
  const hasInitializedRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Enhanced render monitoring with stricter thresholds - optimized for performance
  useRenderMonitor('AppLayout', 1000); // Reduced to 1000ms for better detection

  // Memoize session validation logic
  const shouldValidateSession = useMemo(() => {
    return pathname !== "/auth/signin" && status === "authenticated";
  }, [pathname, status]);

  // Memoize session validation options to prevent unnecessary re-renders
  const sessionValidationOptions = useMemo(() => ({
    validateInterval: 30 * 60 * 1000, // Increased from 15 to 30 minutes for better performance
    autoSignOut: true,
    redirectTo: '/auth/signin'
  }), []);

  const { isValidating: isSessionValidating } = useSessionValidation(sessionValidationOptions);

  // Memoize session state to prevent unnecessary re-renders
  const sessionState = useMemo(() => ({
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    isValidating: isSessionValidating,
  }), [status, isSessionValidating]);

  // Optimized state management
  const {
    isClient,
    appLogoUrl,
    currentAppName,
    showLogoOnly,
    sidebarLogoSize,
    isLogoLoading,
    contextualLogos,
    themeAndColors,
    initializeClient,
    setLogoLoading,
    updateAppConfig,
    updateThemeAndColors,
    resetToDefaults,
  } = useAppLayoutState();

  // Update refs when functions are available - only run once
  useEffect(() => {
    if (!updateAppConfigRef.current) {
      updateAppConfigRef.current = updateAppConfig;
    }
    if (!updateThemeAndColorsRef.current) {
      updateThemeAndColorsRef.current = updateThemeAndColors;
    }
    if (!resetToDefaultsRef.current) {
      resetToDefaultsRef.current = resetToDefaults;
    }
    if (!setLogoLoadingRef.current) {
      setLogoLoadingRef.current = setLogoLoading;
    }
  }, [updateAppConfig, updateThemeAndColors, resetToDefaults, setLogoLoading]);

  // Memoize the fetch function to prevent recreation on every render with timeout protection
  const fetchGlobalSettings = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setLogoLoadingRef.current?.(true);
      
      // Set timeout to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        fetchTimeoutRef.current = setTimeout(() => {
          reject(new Error('Settings fetch timeout'));
        }, 5000); // 5 second timeout
      });

      const fetchPromise = fetch('/api/settings/system-settings');
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      const data = await response.json();

      if (!isMountedRef.current) return;

      let prefs: any = {};
      if (data.settings && Array.isArray(data.settings)) {
        prefs = Object.fromEntries(data.settings.map((setting: any) => [setting.key, setting.value]));
      } else {
        prefs = data;
      }

      // Update app configuration using the optimized hook
      updateAppConfigRef.current?.({
        appLogoUrl: prefs.appLogoDataUrl || null,
        currentAppName: prefs.appName || DEFAULT_APP_NAME,
        showLogoOnly: prefs.showLogoOnly === true || prefs.showLogoOnly === 'true',
        sidebarLogoSize: prefs.sidebarLogoSize ? parseInt(prefs.sidebarLogoSize) : 48,
        contextualLogos: {
          sidebarLogoCollapsedLightMode: prefs.sidebarLogoCollapsedLightMode || null,
          sidebarLogoExpandedLightMode: prefs.sidebarLogoExpandedLightMode || null,
          sidebarLogoCollapsedDarkMode: prefs.sidebarLogoCollapsedDarkMode || null,
          sidebarLogoExpandedDarkMode: prefs.sidebarLogoExpandedDarkMode || null,
        }
      });

      // Extract sidebar colors
      const sidebarColors: Record<string, string> = {};
      const sidebarColorKeys = [
        'sidebarBgStartL', 'sidebarBgEndL', 'sidebarTextL', 'sidebarActiveBgStartL', 'sidebarActiveBgEndL', 'sidebarActiveTextL',
        'sidebarHoverBgL', 'sidebarHoverTextL', 'sidebarBorderL', 'buttonTextColorL', 'buttonTextColorD',
        'sidebarBgStartD', 'sidebarBgEndD', 'sidebarTextD',
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

      updateThemeAndColorsRef.current?.({
        themePreference: prefs.appThemePreference || 'system',
        primaryGradient: prefs.primaryGradient || null,
        sidebarColors,
      });

      // Immediately apply sidebar styles to ensure they're set
      import('@/lib/themeUtils').then(({ setThemeAndColors, applySidebarStyles }) => {
        // Apply sidebar styles immediately
        applySidebarStyles(sidebarColors);
        
        // Then apply the full theme
        setThemeAndColors({
          themePreference: prefs.appThemePreference || 'system',
          primaryGradient: prefs.primaryGradient || null,
          sidebarColors,
        });
      }).catch((error) => {
        console.warn('[APPLAYOUT] Error applying theme and colors:', error);
      });

      if (prefs.sidebarBackgroundType || prefs.sidebarBackgroundImageUrl) {
        import('@/lib/themeUtils').then(({ applySidebarBackgroundSettings }) => {
          applySidebarBackgroundSettings({
            sidebarBackgroundType: prefs.sidebarBackgroundType,
            sidebarBackgroundImageUrl: prefs.sidebarBackgroundImageUrl,
            sidebarBackgroundImageFit: prefs.sidebarBackgroundImageFit,
            sidebarBackgroundImagePosition: prefs.sidebarBackgroundImagePosition,
          });
        }).catch((error) => {
          console.warn('[APPLAYOUT] Error loading theme utils:', error);
        });
      }

      // Reapply sidebar colors to ensure they're properly applied
      if (Object.keys(sidebarColors).length > 0) {
        import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
          setTimeout(() => {
            reapplyCurrentSidebarColors();
          }, 100); // Small delay to ensure DOM is ready
        }).catch((error) => {
          console.warn('[APPLAYOUT] Error loading theme utils:', error);
        });
      }
    } catch (error) {
      console.warn('[APPLAYOUT] Failed to fetch global settings:', error);
      resetToDefaultsRef.current?.();
    } finally {
      if (isMountedRef.current) {
        setLogoLoadingRef.current?.(false);
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    }
  }, []); // Empty dependency array to prevent infinite loops - functions are stable from useAppLayoutState

  // Memoize the app config change handler
  const handleAppConfigChange = useCallback((event: Event) => {
    if (!isMountedRef.current) return;
    
    try {
      const customEvent = event as CustomEvent<{
        appName?: string;
        logoUrl?: string | null;
        showLogoOnly?: boolean;
        sidebarLogoSize?: number;
      }>;
      
      if (customEvent.detail) {
        const updates: any = {};
        if (customEvent.detail.appName) {
          updates.currentAppName = customEvent.detail.appName;
        }
        if (customEvent.detail.logoUrl !== undefined) {
          updates.appLogoUrl = customEvent.detail.logoUrl;
        }
        if (customEvent.detail.showLogoOnly !== undefined) {
          updates.showLogoOnly = customEvent.detail.showLogoOnly;
        }
        if (customEvent.detail.sidebarLogoSize !== undefined) {
          updates.sidebarLogoSize = customEvent.detail.sidebarLogoSize;
        }
        
        if (Object.keys(updates).length > 0) {
          updateAppConfigRef.current?.(updates);
        }
      }
    } catch (error) {
      console.warn('[APPLAYOUT] Error handling app config change:', error);
    }
  }, []); // Empty dependency array to prevent infinite loops

  // Safe effect for client-side initialization - only run once
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    
    initializeClient();
    
    // Initialize sidebar styles first
    import('@/lib/themeUtils').then(({ initializeSidebarStyles }) => {
      initializeSidebarStyles();
    }).catch((error) => {
      console.warn('[APPLAYOUT] Error loading theme utils:', error);
    });
    
    // Then fetch global settings
    fetchGlobalSettings();
    
    window.addEventListener('appConfigChanged', handleAppConfigChange);
    
    return () => {
      try {
        window.removeEventListener('appConfigChanged', handleAppConfigChange);
      } catch (error) {
        console.warn('[APPLAYOUT] Error removing app config listener:', error);
      }
    };
  }, []); // Empty dependency array since this should only run once on mount

  // Memoize theme change handler
  const handleThemeChange = useCallback(() => {
    if (!isMountedRef.current) return;
    
    import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
      reapplyCurrentSidebarColors();
    }).catch((error) => {
      console.warn('[APPLAYOUT] Error loading theme utils:', error);
    });
  }, []); // Empty dependency array to prevent infinite loops

  // Safe effect for theme change listener - only run once
  useEffect(() => {
    let mediaQuery: MediaQueryList | null = null;
    
    try {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      // Remove any existing listener first
      mediaQuery.removeEventListener('change', handleThemeChange);
      mediaQuery.addEventListener('change', handleThemeChange);
    } catch (error) {
      console.warn('[APPLAYOUT] MediaQuery not supported:', error);
    }

    return () => {
      if (mediaQuery) {
        try {
          mediaQuery.removeEventListener('change', handleThemeChange);
        } catch (error) {
          console.warn('[APPLAYOUT] Error removing theme change listener:', error);
        }
      }
    };
  }, []); // Empty dependency array since this should only run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    };
  }, []);

  // Memoize page title calculation
  const pageTitle = useMemo(() => {
    const pathSegments = pathname.split("/");
    const lastSegment = pathSegments[pathSegments.length - 1];
    return pathname === "/" ? "Dashboard" : 
      (lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) : "Page");
  }, [pathname]);

  // Memoize sidebar header props to prevent unnecessary re-renders
  const sidebarHeaderProps = useMemo(() => ({
    currentAppName,
    appLogoUrl,
    isClient,
    isLogoLoading,
    showLogoOnly,
    sidebarLogoSize,
    contextualLogos,
  }), [
    currentAppName,
    appLogoUrl,
    isClient,
    isLogoLoading,
    showLogoOnly,
    sidebarLogoSize,
    contextualLogos,
  ]);

  // Memoize header props
  const headerProps = useMemo(() => ({
    pageTitle,
    showLogoOnly,
  }), [pageTitle, showLogoOnly]);

  // Memoize the main layout JSX to prevent unnecessary re-renders
  const mainLayout = useMemo(() => (
    <SidebarProvider defaultOpen={true}>
      <MemoizedFaviconUpdater faviconDataUrl={faviconDataUrl} />
      <SidebarToggleButton />
      <LayoutContainer 
        layout="flex" 
        direction="row"
        className="bg-background"
        data-testid="app-layout"
      >
        <Sidebar collapsible="icon" className="border-r border-border" data-testid="sidebar">
          <SidebarHeader>
            <MemoizedSidebarHeaderContent {...sidebarHeaderProps} />
          </SidebarHeader>
          <SidebarContent>
            <MemoizedSidebarNav />
          </SidebarContent>
        </Sidebar>
        <LayoutContainer 
          layout="flex" 
          direction="column"
          className="flex-1 min-w-0 h-full"
        >
          <MemoizedHeader {...headerProps} />
          <OptimizedContainer as="main" className="flex-1 main-content-area p-0">
            {isLoading && <GlobalLoadingOverlay />}
            {children}
          </OptimizedContainer>
        </LayoutContainer>
      </LayoutContainer>
    </SidebarProvider>
  ), [
    faviconDataUrl,
    sidebarHeaderProps,
    headerProps,
    isLoading,
    children
  ]);

  // Early return for loading states
  if (status === "loading" || !themeMounted) {
    return <GlobalLoadingOverlay />;
  }

  if (!session) {
    // During logout, children might be empty or contain multiple elements
    // Use a regular container to avoid React.Children.only errors
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  return mainLayout;
};

AppLayoutComponent.displayName = 'AppLayoutComponent';

export const AppLayout = memo(AppLayoutComponent);
AppLayout.displayName = 'AppLayout';

// Memoize the SidebarToggleButton component
const SidebarToggleButton = memo(() => {
  const { open, toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const toggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTogglingRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = useCallback(() => {
    // Prevent multiple rapid clicks
    if (isTogglingRef.current) {
      return;
    }

    isTogglingRef.current = true;
    toggleSidebar();

    // Reset after animation completes
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
    }
    
    toggleTimeoutRef.current = setTimeout(() => {
      isTogglingRef.current = false;
    }, 200);
  }, [toggleSidebar]);

  useEffect(() => {
    return () => {
      if (toggleTimeoutRef.current) {
        clearTimeout(toggleTimeoutRef.current);
      }
    };
  }, []);

  // Only show the toggle button when sidebar is collapsed and component is mounted
  if (!mounted || open) {
    return null;
  }

  return (
    <div 
      className="fixed top-[12px] left-[var(--sidebar-width-icon,5rem)] z-[110] transition-all duration-200"
      style={{ 
        left: 'var(--sidebar-width-icon, 5rem)',
        transform: 'translateX(-50%)'
      }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-2 bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background/90 text-sidebar-foreground"
              onClick={handleToggle}
              disabled={isTogglingRef.current}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Open sidebar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});

SidebarToggleButton.displayName = 'SidebarToggleButton';
