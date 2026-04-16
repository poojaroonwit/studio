"use client";

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import React, { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
import SidebarNav from '@/components/layout/SafeSidebarNav';
import { Header } from '@/components/layout/Header';
import { GlobalLoadingOverlay } from '@/components/layout/GlobalLoadingOverlay';
import { usePageLoading } from '@/hooks/use-page-loading';
import { useFavicon } from '@/hooks/use-favicon';
import { FaviconUpdater } from '@/components/layout/FaviconUpdater';
import { useSessionValidation } from '@/hooks/use-session-validation';
import { useTheme } from '@/hooks/use-theme';
import { useRenderMonitor } from '@/hooks/use-render-monitor';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { useAppLayoutState } from '@/hooks/use-app-layout-state';

const DEFAULT_APP_NAME = "FitScan";

interface AppLayoutProps {
  children: React.ReactNode;
}

// Memoized component to prevent unnecessary re-renders
const MemoizedFaviconUpdater = memo(FaviconUpdater);

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
    collapsedSidebarLogoSize,
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
        }, 15000); // 15 second timeout
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
        collapsedSidebarLogoSize: prefs.collapsedSidebarLogoSize ? parseInt(prefs.collapsedSidebarLogoSize) : 40,
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

      // Extract primary button shadows
      const primaryButtonShadows = {
        primaryButtonShadowL: prefs.primaryButtonShadowL || null,
        primaryButtonShadowHoverL: prefs.primaryButtonShadowHoverL || null,
        primaryButtonShadowD: prefs.primaryButtonShadowD || null,
        primaryButtonShadowHoverD: prefs.primaryButtonShadowHoverD || null,
      };

      updateThemeAndColorsRef.current?.({
        themePreference: prefs.appThemePreference || 'system',
        primaryGradient: prefs.primaryGradient || null,
        sidebarColors,
        primaryButtonShadows,
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
          primaryButtonShadows,
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
        collapsedSidebarLogoSize?: number;
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
        if (customEvent.detail.collapsedSidebarLogoSize !== undefined) {
          updates.collapsedSidebarLogoSize = customEvent.detail.collapsedSidebarLogoSize;
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

  // Effect to refresh settings when session becomes authenticated (e.g., after login)
  // This handles both fresh logins and cached sessions
  useEffect(() => {
    if (status === 'authenticated' && session && isClient) {
      // For cached sessions, the sidebar might not be ready yet
      // The themeUtils functions now handle waiting for sidebar DOM internally
      const timer = setTimeout(() => {
        // Fetch settings first
        fetchGlobalSettings();

        // Then reapply styles - these functions now wait for sidebar DOM internally
        // Use a small delay to ensure fetchGlobalSettings has started
        setTimeout(() => {
          import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors, applySidebarBackgroundToCSS }) => {
            reapplyCurrentSidebarColors();
            applySidebarBackgroundToCSS();
          }).catch((error) => {
            console.warn('[APPLAYOUT] Error reapplying sidebar styles after login:', error);
          });
        }, 300);
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [status, session, isClient, fetchGlobalSettings]);

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
    const pathSegments = (pathname || '').split("/");
    const lastSegment = pathSegments[pathSegments.length - 1];
    return pathname === "/" || !pathname ? "Dashboard" :
      (lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) : "Page");
  }, [pathname]);



  // Memoize header props
  const headerProps = useMemo(() => ({
    pageTitle,
    showLogoOnly,
  }), [pageTitle, showLogoOnly]);

  // Memoize the main layout JSX to prevent unnecessary re-renders
  const mainLayout = useMemo(() => (
    <>
      <MemoizedFaviconUpdater faviconDataUrl={faviconDataUrl} />
      <div className="h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col overflow-hidden" data-testid="app-layout">
        <ImpersonationBanner />
        {/* Top Header - full width */}
        <MemoizedHeader {...headerProps} appLogoUrl={appLogoUrl} currentAppName={currentAppName} showLogoOnly={showLogoOnly} contextualLogos={contextualLogos} isLogoLoading={isLogoLoading} />

        {/* Main content area with sidebars */}
        <div className="flex flex-1 overflow-hidden">
          {/* SidebarNav renders both Rail + Menu as siblings */}
          <MemoizedSidebarNav />

          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-gray-50 dark:bg-zinc-950">
            <main className="flex-1 overflow-y-auto relative bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">
              <div className="w-full mx-auto h-full flex flex-col">
                {isLoading && <GlobalLoadingOverlay />}
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  ), [
    faviconDataUrl,
    headerProps,
    appLogoUrl,
    currentAppName,
    showLogoOnly,
    contextualLogos,
    isLogoLoading,
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


