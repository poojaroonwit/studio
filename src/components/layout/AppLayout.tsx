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
import { useInfiniteLoopPrevention, useRenderMonitor } from '@/hooks/use-infinite-loop-prevention';
import { OptimizedContainer, LayoutContainer } from '@/components/ui/optimized-container';
import { useAppLayoutState } from '@/hooks/use-app-layout-state';
import { initializeFrozenStatePrevention, trackActivity } from '@/lib/frozen-state-prevention';

const DEFAULT_APP_NAME = "FitScan";

interface AppLayoutProps {
  children: React.ReactNode;
}

// Memoized component to prevent unnecessary re-renders
const MemoizedFaviconUpdater = memo(FaviconUpdater);
const MemoizedSidebarHeaderContent = memo(SidebarHeaderContent);
const MemoizedHeader = memo(Header);
const MemoizedSidebarNav = memo(SidebarNav);

export const AppLayout = memo(({ children }: AppLayoutProps) => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { isLoading } = usePageLoading();
  const { faviconDataUrl } = useFavicon();
  const { mounted: themeMounted } = useTheme();
  
  // Refs to store stable function references
  const trackSettingsFetchRef = useRef<any>(null);
  const trackThemeChangeRef = useRef<any>(null);
  const updateAppConfigRef = useRef<any>(null);
  const updateThemeAndColorsRef = useRef<any>(null);
  const resetToDefaultsRef = useRef<any>(null);
  const setLogoLoadingRef = useRef<any>(null);
  const hasInitializedRef = useRef(false);
  const lastRenderTimeRef = useRef(0);
  
  // Infinite loop prevention for critical effects
  const { trackRun: trackSettingsFetch } = useInfiniteLoopPrevention({
    effectName: 'AppLayout_settings_fetch',
    maxRuns: 20, // Increased from 10 to 20
    timeWindow: 60000, // Increased from 30 seconds to 60 seconds
    onExcessiveRuns: () => console.error('🚨 Excessive settings fetch detected in AppLayout')
  });

  const { trackRun: trackThemeChange } = useInfiniteLoopPrevention({
    effectName: 'AppLayout_theme_change',
    maxRuns: 40, // Increased from 20 to 40
    timeWindow: 20000, // Increased from 10 seconds to 20 seconds
    onExcessiveRuns: () => console.error('🚨 Excessive theme change detected in AppLayout')
  });

  // Update refs when functions are available - only run once
  useEffect(() => {
    if (!trackSettingsFetchRef.current) {
      trackSettingsFetchRef.current = trackSettingsFetch;
    }
    if (!trackThemeChangeRef.current) {
      trackThemeChangeRef.current = trackThemeChange;
    }
  }, [trackSettingsFetch, trackThemeChange]);

  // Enhanced render monitoring with stricter thresholds
  useRenderMonitor('AppLayout', 1000); // Increased from 500 to 1000ms to reduce false positives

  // Memoize session validation logic
  const shouldValidateSession = useMemo(() => {
    return pathname !== "/auth/signin" && status === "authenticated";
  }, [pathname, status]);

  // Memoize session validation options to prevent unnecessary re-renders
  const sessionValidationOptions = useMemo(() => ({
    validateInterval: 10 * 60 * 1000, // Increased from 5 to 10 minutes
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

  // Memoize the fetch function to prevent recreation on every render
  const fetchGlobalSettings = useCallback(async () => {
    if (!trackSettingsFetchRef.current?.()) return;
    
    try {
      setLogoLoadingRef.current?.(true);
      const res = await fetch('/api/settings/system-settings');
      const data = await res.json();

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

      updateThemeAndColorsRef.current?.({
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
      resetToDefaultsRef.current?.();
    } finally {
      setLogoLoadingRef.current?.(false);
    }
  }, []); // Empty dependency array to prevent infinite loops - functions are stable from useAppLayoutState

  // Memoize the app config change handler
  const handleAppConfigChange = useCallback((event: Event) => {
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
  }, []); // Empty dependency array to prevent infinite loops

  // Safe effect for client-side initialization - only run once
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    
    initializeClient();
    fetchGlobalSettings();
    
    // Initialize frozen state prevention
    initializeFrozenStatePrevention();
    
    window.addEventListener('appConfigChanged', handleAppConfigChange);
    
    return () => {
      try {
        window.removeEventListener('appConfigChanged', handleAppConfigChange);
      } catch (error) {
        console.warn('Error removing app config listener:', error);
      }
    };
  }, []); // Empty dependency array since this should only run once on mount

  // Memoize theme change handler
  const handleThemeChange = useCallback(() => {
    if (!trackThemeChangeRef.current?.()) return;
    
    import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
      reapplyCurrentSidebarColors();
    }).catch((error) => {
      console.warn('Error loading theme utils:', error);
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
  }, []); // Empty dependency array since this should only run once on mount

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
        className="h-screen bg-background overflow-hidden"
        data-testid="app-layout"
      >
        <Sidebar collapsible="icon" className="border-r border-border">
          <SidebarHeader>
            <MemoizedSidebarHeaderContent {...sidebarHeaderProps} />
          </SidebarHeader>
          <SidebarSeparator className="my-0" />
          <SidebarContent>
            <MemoizedSidebarNav />
          </SidebarContent>
        </Sidebar>
        <LayoutContainer 
          layout="flex" 
          direction="column"
          className="flex-1 min-w-0"
        >
          <MemoizedHeader {...headerProps} />
          <OptimizedContainer as="main" className="flex-1 overflow-auto p-0">
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
    return <OptimizedContainer noWrapper>{children}</OptimizedContainer>;
  }

  return mainLayout;
});

// Memoize the SidebarToggleButton component
const SidebarToggleButton = memo(() => {
  const { open, toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const toggleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastToggleTimeRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = useCallback(() => {
    const now = Date.now();
    const timeSinceLastToggle = now - lastToggleTimeRef.current;
    
    // Reduced protection: prevent rapid toggling (less than 150ms apart - reduced from 300ms)
    if (timeSinceLastToggle < 150) {
      console.log('Sidebar toggle blocked: too rapid clicking');
      return;
    }
    
    // Prevent toggle if already toggling
    if (isToggling) {
      console.log('Sidebar toggle blocked: already toggling');
      return;
    }
    
    lastToggleTimeRef.current = now;
    setIsToggling(true);
    
    // Clear any existing timeout
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
    }
    
    // Reduced timeout to reset toggle state (300ms - reduced from 500ms)
    toggleTimeoutRef.current = setTimeout(() => {
      setIsToggling(false);
    }, 300);
    
    toggleSidebar();
  }, [toggleSidebar, isToggling]);

  useEffect(() => {
    return () => {
      if (toggleTimeoutRef.current) {
        clearTimeout(toggleTimeoutRef.current);
      }
    };
  }, []);

  if (!mounted || open) {
    return null;
  }

  return (
    <OptimizedContainer 
      className={`fixed top-[12px] left-[var(--sidebar-width-icon,4rem)] z-[100] transition-all duration-200`}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-2 bg-background/80 backdrop-blur-sm"
              onClick={handleToggle}
              disabled={isToggling}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Open sidebar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </OptimizedContainer>
  );
});

SidebarToggleButton.displayName = 'SidebarToggleButton';
