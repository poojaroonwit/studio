export function setThemeAndColors({
  themePreference,
  primaryGradientStart,
  primaryGradientEnd,
  sidebarColors = {},
}: {
  themePreference: 'light' | 'dark' | 'system',
  primaryGradientStart?: string,
  primaryGradientEnd?: string,
  sidebarColors?: Record<string, string>,
}) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;

  // Determine if theme should be dark
  let shouldBeDark = false;
  if (themePreference === 'dark') {
    shouldBeDark = true;
  } else if (themePreference === 'light') {
    shouldBeDark = false;
  } else if (themePreference === 'system') {
    shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Set theme class
  if (shouldBeDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Set primary color CSS variables
  if (primaryGradientStart) {
    root.style.setProperty('--primary-gradient-start-l', primaryGradientStart);
    root.style.setProperty('--primary-gradient-start-d', primaryGradientStart);
    root.style.setProperty('--primary', `hsl(${primaryGradientStart})`);
  }
  if (primaryGradientEnd) {
    root.style.setProperty('--primary-gradient-end-l', primaryGradientEnd);
    root.style.setProperty('--primary-gradient-end-d', primaryGradientEnd);
  }

  // Apply sidebar styles with explicit theme information
  // Use requestAnimationFrame to ensure DOM has updated
  requestAnimationFrame(() => {
    applySidebarStylesWithTheme(sidebarColors, shouldBeDark);
  });
}

// Store current sidebar colors for re-application
let currentSidebarColors: Record<string, string> = {};

// New function to apply all sidebar styles with explicit theme information
export function applySidebarStylesWithTheme(sidebarColors: Record<string, string>, isDark: boolean) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  
  // Store the colors for later use
  currentSidebarColors = { ...sidebarColors };
  
  // Map settings keys to CSS variable names
  const cssVarMapping: Record<string, string> = {
    // Light theme - Background colors
    'sidebarBgStartL': '--sidebar-background-start-l',
    'sidebarBgEndL': '--sidebar-background-end-l',
    'sidebarTextL': '--sidebar-foreground-l',
    'sidebarBorderL': '--sidebar-border-l',
    'sidebarActiveBgStartL': '--sidebar-active-bg-start-l',
    'sidebarActiveTextL': '--sidebar-active-foreground-l',
    'sidebarHoverBgL': '--sidebar-accent-l',
    'sidebarHoverTextL': '--sidebar-accent-foreground-l',
    
    // Light theme - Font settings
    'sidebarFontFamilyL': '--sidebar-font-family-l',
    'sidebarFontSizeL': '--sidebar-font-size-l',
    'sidebarFontWeightL': '--sidebar-font-weight-l',
    'sidebarLineHeightL': '--sidebar-line-height-l',
    'sidebarLetterSpacingL': '--sidebar-letter-spacing-l',
    'sidebarTextTransformL': '--sidebar-text-transform-l',
    
    // Light theme - Border and shadow settings
    'sidebarBorderWidthL': '--sidebar-border-width-l',
    'sidebarBorderStyleL': '--sidebar-border-style-l',
    'sidebarBorderRadiusL': '--sidebar-border-radius-l',
    'sidebarShadowL': '--sidebar-shadow-l',
    'sidebarShadowHoverL': '--sidebar-shadow-hover-l',
    'sidebarShadowActiveL': '--sidebar-shadow-active-l',
    
    // Light theme - Spacing and layout
    'sidebarPaddingXL': '--sidebar-padding-x-l',
    'sidebarPaddingYL': '--sidebar-padding-y-l',
    'sidebarMarginL': '--sidebar-margin-l',
    'sidebarGapL': '--sidebar-gap-l',
    'sidebarWidthL': '--sidebar-width-l',
    'sidebarWidthCollapsedL': '--sidebar-width-collapsed-l',
    'sidebarTransitionDurationL': '--sidebar-transition-duration-l',
    'sidebarTransitionTimingL': '--sidebar-transition-timing-l',
    
    // Light theme - Menu item specific settings
    'sidebarMenuItemBgL': '--sidebar-menu-item-background-l',
    'sidebarMenuItemBgHoverL': '--sidebar-menu-item-background-hover-l',
    'sidebarMenuItemBgActiveL': '--sidebar-menu-item-background-active-l',
    'sidebarMenuItemColorL': '--sidebar-menu-item-color-l',
    'sidebarMenuItemColorHoverL': '--sidebar-menu-item-color-hover-l',
    'sidebarMenuItemColorActiveL': '--sidebar-menu-item-color-active-l',
    'sidebarMenuItemBorderL': '--sidebar-menu-item-border-l',
    'sidebarMenuItemBorderHoverL': '--sidebar-menu-item-border-hover-l',
    'sidebarMenuItemBorderActiveL': '--sidebar-menu-item-border-active-l',
    'sidebarMenuItemBorderRadiusL': '--sidebar-menu-item-border-radius-l',
    'sidebarMenuItemPaddingXL': '--sidebar-menu-item-padding-x-l',
    'sidebarMenuItemPaddingYL': '--sidebar-menu-item-padding-y-l',
    'sidebarMenuItemMarginL': '--sidebar-menu-item-margin-l',
    'sidebarMenuItemFontWeightL': '--sidebar-menu-item-font-weight-l',
    'sidebarMenuItemFontWeightActiveL': '--sidebar-menu-item-font-weight-active-l',
    'sidebarMenuItemFontSizeL': '--sidebar-menu-item-font-size-l',
    'sidebarMenuItemLineHeightL': '--sidebar-menu-item-line-height-l',
    'sidebarMenuItemTransitionL': '--sidebar-menu-item-transition-l',
    
    // Light theme - Icon settings
    'sidebarIconSizeL': '--sidebar-icon-size-l',
    'sidebarIconColorL': '--sidebar-icon-color-l',
    'sidebarIconColorHoverL': '--sidebar-icon-color-hover-l',
    'sidebarIconColorActiveL': '--sidebar-icon-color-active-l',
    'sidebarIconMarginRightL': '--sidebar-icon-margin-right-l',
    'sidebarIconTransitionL': '--sidebar-icon-transition-l',
    
    // Light theme - Group label settings
    'sidebarGroupLabelColorL': '--sidebar-group-label-color-l',
    'sidebarGroupLabelFontSizeL': '--sidebar-group-label-font-size-l',
    'sidebarGroupLabelFontWeightL': '--sidebar-group-label-font-weight-l',
    'sidebarGroupLabelTextTransformL': '--sidebar-group-label-text-transform-l',
    'sidebarGroupLabelLetterSpacingL': '--sidebar-group-label-letter-spacing-l',
    'sidebarGroupLabelPaddingL': '--sidebar-group-label-padding-x-l',
    'sidebarGroupLabelMarginL': '--sidebar-group-label-margin-l',
    
    // Dark theme - Background colors
    'sidebarBgStartD': '--sidebar-background-start-d',
    'sidebarBgEndD': '--sidebar-background-end-d',
    'sidebarTextD': '--sidebar-foreground-d',
    'sidebarBorderD': '--sidebar-border-d',
    'sidebarActiveBgStartD': '--sidebar-active-bg-start-d',
    'sidebarActiveTextD': '--sidebar-active-foreground-d',
    'sidebarHoverBgD': '--sidebar-accent-d',
    'sidebarHoverTextD': '--sidebar-accent-foreground-d',
    
    // Dark theme - Font settings
    'sidebarFontFamilyD': '--sidebar-font-family-d',
    'sidebarFontSizeD': '--sidebar-font-size-d',
    'sidebarFontWeightD': '--sidebar-font-weight-d',
    'sidebarLineHeightD': '--sidebar-line-height-d',
    'sidebarLetterSpacingD': '--sidebar-letter-spacing-d',
    'sidebarTextTransformD': '--sidebar-text-transform-d',
    
    // Dark theme - Border and shadow settings
    'sidebarBorderWidthD': '--sidebar-border-width-d',
    'sidebarBorderStyleD': '--sidebar-border-style-d',
    'sidebarBorderRadiusD': '--sidebar-border-radius-d',
    'sidebarShadowD': '--sidebar-shadow-d',
    'sidebarShadowHoverD': '--sidebar-shadow-hover-d',
    'sidebarShadowActiveD': '--sidebar-shadow-active-d',
    
    // Dark theme - Spacing and layout
    'sidebarPaddingXD': '--sidebar-padding-x-d',
    'sidebarPaddingYD': '--sidebar-padding-y-d',
    'sidebarMarginD': '--sidebar-margin-d',
    'sidebarGapD': '--sidebar-gap-d',
    'sidebarWidthD': '--sidebar-width-d',
    'sidebarWidthCollapsedD': '--sidebar-width-collapsed-d',
    'sidebarTransitionDurationD': '--sidebar-transition-duration-d',
    'sidebarTransitionTimingD': '--sidebar-transition-timing-d',
    
    // Dark theme - Menu item specific settings
    'sidebarMenuItemBgD': '--sidebar-menu-item-background-d',
    'sidebarMenuItemBgHoverD': '--sidebar-menu-item-background-hover-d',
    'sidebarMenuItemBgActiveD': '--sidebar-menu-item-background-active-d',
    'sidebarMenuItemColorD': '--sidebar-menu-item-color-d',
    'sidebarMenuItemColorHoverD': '--sidebar-menu-item-color-hover-d',
    'sidebarMenuItemColorActiveD': '--sidebar-menu-item-color-active-d',
    'sidebarMenuItemBorderD': '--sidebar-menu-item-border-d',
    'sidebarMenuItemBorderHoverD': '--sidebar-menu-item-border-hover-d',
    'sidebarMenuItemBorderActiveD': '--sidebar-menu-item-border-active-d',
    'sidebarMenuItemBorderRadiusD': '--sidebar-menu-item-border-radius-d',
    'sidebarMenuItemPaddingXD': '--sidebar-menu-item-padding-x-d',
    'sidebarMenuItemPaddingYD': '--sidebar-menu-item-padding-y-d',
    'sidebarMenuItemMarginD': '--sidebar-menu-item-margin-d',
    'sidebarMenuItemFontWeightD': '--sidebar-menu-item-font-weight-d',
    'sidebarMenuItemFontWeightActiveD': '--sidebar-menu-item-font-weight-active-d',
    'sidebarMenuItemFontSizeD': '--sidebar-menu-item-font-size-d',
    'sidebarMenuItemLineHeightD': '--sidebar-menu-item-line-height-d',
    'sidebarMenuItemTransitionD': '--sidebar-menu-item-transition-d',
    
    // Dark theme - Icon settings
    'sidebarIconSizeD': '--sidebar-icon-size-d',
    'sidebarIconColorD': '--sidebar-icon-color-d',
    'sidebarIconColorHoverD': '--sidebar-icon-color-hover-d',
    'sidebarIconColorActiveD': '--sidebar-icon-color-active-d',
    'sidebarIconMarginRightD': '--sidebar-icon-margin-right-d',
    'sidebarIconTransitionD': '--sidebar-icon-transition-d',
    
    // Dark theme - Group label settings
    'sidebarGroupLabelColorD': '--sidebar-group-label-color-d',
    'sidebarGroupLabelFontSizeD': '--sidebar-group-label-font-size-d',
    'sidebarGroupLabelFontWeightD': '--sidebar-group-label-font-weight-d',
    'sidebarGroupLabelTextTransformD': '--sidebar-group-label-text-transform-d',
    'sidebarGroupLabelLetterSpacingD': '--sidebar-group-label-letter-spacing-d',
    'sidebarGroupLabelPaddingD': '--sidebar-group-label-padding-x-d',
    'sidebarGroupLabelMarginD': '--sidebar-group-label-margin-d',
  };

  // Set CSS variables based on provided theme
  const themeSuffix = isDark ? 'D' : 'L';
  
  let appliedCount = 0;
  Object.entries(sidebarColors).forEach(([key, value]) => {
    if (key.endsWith(themeSuffix) && value) {
      const cssVarName = cssVarMapping[key];
      if (cssVarName) {
        // Special handling for active text color: ensure hsl() is used
        if (key === `sidebarActiveText${themeSuffix}`) {
          root.style.setProperty(cssVarName, `hsl(${value})`);
        } else {
          root.style.setProperty(cssVarName, value);
        }
        appliedCount++;
        if (key.includes('GroupLabel')) {
        }
        if (key.includes('ActiveText')) {
        }
      }
    }
  });
  
}

// Function to get current sidebar colors
export function getCurrentSidebarColors(): Record<string, string> {
  return { ...currentSidebarColors };
}

// Wrapper function for backward compatibility
export function applySidebarStyles(sidebarColors: Record<string, string>) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  applySidebarStylesWithTheme(sidebarColors, isDark);
}

// Function to re-apply current sidebar colors for the current theme
export function reapplyCurrentSidebarColors() {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  
  // Use requestAnimationFrame to ensure DOM is in sync
  requestAnimationFrame(() => {
    applySidebarStylesWithTheme(currentSidebarColors, isDark);
  });
}

// Theme utility functions for managing sidebar styling preferences

export type SidebarActiveStyle = "gradient" | "solid" | "outline" | "subtle";

const SIDEBAR_ACTIVE_STYLE_KEY = 'sidebarActiveStylePreference';

export function getSidebarActiveStyle(): SidebarActiveStyle {
  if (typeof window === 'undefined') return 'gradient';
  return (localStorage.getItem(SIDEBAR_ACTIVE_STYLE_KEY) as SidebarActiveStyle) || 'gradient';
}

export function setSidebarActiveStyle(style: SidebarActiveStyle) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SIDEBAR_ACTIVE_STYLE_KEY, style);
  applySidebarActiveStyle(style);
}

export function applySidebarActiveStyle(style: SidebarActiveStyle) {
  if (typeof window === 'undefined') return;
  
  // Remove existing style classes
  document.documentElement.classList.remove(
    'sidebar-active-gradient',
    'sidebar-active-solid', 
    'sidebar-active-outline',
    'sidebar-active-subtle'
  );
  
  // Add new style class
  document.documentElement.classList.add(`sidebar-active-${style}`);
  
}

// Initialize sidebar style on load
export function initializeSidebarStyle() {
  if (typeof window === 'undefined') return;
  const style = getSidebarActiveStyle();
  applySidebarActiveStyle(style);
}

// Listen for preference changes
export function setupSidebarStyleListener() {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('appConfigChanged', (event: any) => {
    if (event.detail?.sidebarActiveStyle) {
      applySidebarActiveStyle(event.detail.sidebarActiveStyle);
    }
  });
} 