"use client";

import { useEffect } from 'react';
import { initializeSidebarStyle, setupSidebarStyleListener, applySidebarStyles } from '@/lib/themeUtils';

export function SidebarStyleInitializer() {
  useEffect(() => {
    // Initialize sidebar style on component mount
    initializeSidebarStyle();
    
    // Setup listener for preference changes
    setupSidebarStyleListener();
    
    // Fetch and apply sidebar styles including group labels
    const fetchAndApplySidebarStyles = async () => {
      try {
        const res = await fetch('/api/settings/system-settings');
        if (res.ok) {
          const data = await res.json();
          
          // Extract sidebar color settings
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
            if (data[key]) {
              sidebarColors[key] = data[key];
            }
          });
          
          // Apply the sidebar styles
          applySidebarStyles(sidebarColors);
        }
      } catch (error) {
        console.error('Failed to fetch sidebar styles:', error);
      }
    };
    
    fetchAndApplySidebarStyles();
    
    // Listen for theme changes and reapply sidebar styles
    const handleThemeChange = () => {
      // Re-fetch and apply sidebar styles when theme changes
      fetchAndApplySidebarStyles();
    };
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);
    
    // Listen for app config changes
    window.addEventListener('appConfigChanged', handleThemeChange);
    
    // Debug: Log the current style
    if (typeof window !== 'undefined') {
      const currentStyle = localStorage.getItem('sidebarActiveStylePreference') || 'gradient';
    }
    
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
      window.removeEventListener('appConfigChanged', handleThemeChange);
    };
  }, []);

  // This component doesn't render anything
  return null;
} 