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

  // Set theme class
  if (themePreference === 'dark') {
    root.classList.add('dark');
  } else if (themePreference === 'light') {
    root.classList.remove('dark');
  } else if (themePreference === 'system') {
    // Follow OS
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
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

  // Apply all sidebar styles including group labels
  applySidebarStyles(sidebarColors);
}

// New function to apply all sidebar styles including group labels
export function applySidebarStyles(sidebarColors: Record<string, string>) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  
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
    'sidebarFontFamilyL': '--sidebar-font-family',
    'sidebarFontSizeL': '--sidebar-font-size',
    'sidebarFontWeightL': '--sidebar-font-weight',
    'sidebarLineHeightL': '--sidebar-line-height',
    'sidebarLetterSpacingL': '--sidebar-letter-spacing',
    'sidebarTextTransformL': '--sidebar-text-transform',
    
    // Light theme - Border and shadow settings
    'sidebarBorderWidthL': '--sidebar-border-width',
    'sidebarBorderStyleL': '--sidebar-border-style',
    'sidebarBorderRadiusL': '--sidebar-border-radius',
    'sidebarShadowL': '--sidebar-shadow',
    'sidebarShadowHoverL': '--sidebar-shadow-hover',
    'sidebarShadowActiveL': '--sidebar-shadow-active',
    
    // Light theme - Spacing and layout
    'sidebarPaddingXL': '--sidebar-padding-x',
    'sidebarPaddingYL': '--sidebar-padding-y',
    'sidebarMarginL': '--sidebar-margin',
    'sidebarGapL': '--sidebar-gap',
    'sidebarWidthL': '--sidebar-width',
    'sidebarWidthCollapsedL': '--sidebar-width-collapsed',
    'sidebarTransitionDurationL': '--sidebar-transition-duration',
    'sidebarTransitionTimingL': '--sidebar-transition-timing',
    
    // Light theme - Menu item specific settings
    'sidebarMenuItemBgL': '--sidebar-menu-item-background',
    'sidebarMenuItemBgHoverL': '--sidebar-menu-item-background-hover',
    'sidebarMenuItemBgActiveL': '--sidebar-menu-item-background-active',
    'sidebarMenuItemColorL': '--sidebar-menu-item-color',
    'sidebarMenuItemColorHoverL': '--sidebar-menu-item-color-hover',
    'sidebarMenuItemColorActiveL': '--sidebar-menu-item-color-active',
    'sidebarMenuItemBorderL': '--sidebar-menu-item-border',
    'sidebarMenuItemBorderHoverL': '--sidebar-menu-item-border-hover',
    'sidebarMenuItemBorderActiveL': '--sidebar-menu-item-border-active',
    'sidebarMenuItemBorderRadiusL': '--sidebar-menu-item-border-radius',
    'sidebarMenuItemPaddingXL': '--sidebar-menu-item-padding-x',
    'sidebarMenuItemPaddingYL': '--sidebar-menu-item-padding-y',
    'sidebarMenuItemMarginL': '--sidebar-menu-item-margin',
    'sidebarMenuItemFontWeightL': '--sidebar-menu-item-font-weight',
    'sidebarMenuItemFontWeightActiveL': '--sidebar-menu-item-font-weight-active',
    'sidebarMenuItemFontSizeL': '--sidebar-menu-item-font-size',
    'sidebarMenuItemLineHeightL': '--sidebar-menu-item-line-height',
    'sidebarMenuItemTransitionL': '--sidebar-menu-item-transition',
    
    // Light theme - Icon settings
    'sidebarIconSizeL': '--sidebar-icon-size',
    'sidebarIconColorL': '--sidebar-icon-color',
    'sidebarIconColorHoverL': '--sidebar-icon-color-hover',
    'sidebarIconColorActiveL': '--sidebar-icon-color-active',
    'sidebarIconMarginRightL': '--sidebar-icon-margin-right',
    'sidebarIconTransitionL': '--sidebar-icon-transition',
    
    // Light theme - Group label settings
    'sidebarGroupLabelColorL': '--sidebar-group-label-color',
    'sidebarGroupLabelFontSizeL': '--sidebar-group-label-font-size',
    'sidebarGroupLabelFontWeightL': '--sidebar-group-label-font-weight',
    'sidebarGroupLabelTextTransformL': '--sidebar-group-label-text-transform',
    'sidebarGroupLabelLetterSpacingL': '--sidebar-group-label-letter-spacing',
    'sidebarGroupLabelPaddingL': '--sidebar-group-label-padding-x',
    'sidebarGroupLabelMarginL': '--sidebar-group-label-margin',
    
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
    'sidebarFontFamilyD': '--sidebar-font-family',
    'sidebarFontSizeD': '--sidebar-font-size',
    'sidebarFontWeightD': '--sidebar-font-weight',
    'sidebarLineHeightD': '--sidebar-line-height',
    'sidebarLetterSpacingD': '--sidebar-letter-spacing',
    'sidebarTextTransformD': '--sidebar-text-transform',
    
    // Dark theme - Border and shadow settings
    'sidebarBorderWidthD': '--sidebar-border-width',
    'sidebarBorderStyleD': '--sidebar-border-style',
    'sidebarBorderRadiusD': '--sidebar-border-radius',
    'sidebarShadowD': '--sidebar-shadow',
    'sidebarShadowHoverD': '--sidebar-shadow-hover',
    'sidebarShadowActiveD': '--sidebar-shadow-active',
    
    // Dark theme - Spacing and layout
    'sidebarPaddingXD': '--sidebar-padding-x',
    'sidebarPaddingYD': '--sidebar-padding-y',
    'sidebarMarginD': '--sidebar-margin',
    'sidebarGapD': '--sidebar-gap',
    'sidebarWidthD': '--sidebar-width',
    'sidebarWidthCollapsedD': '--sidebar-width-collapsed',
    'sidebarTransitionDurationD': '--sidebar-transition-duration',
    'sidebarTransitionTimingD': '--sidebar-transition-timing',
    
    // Dark theme - Menu item specific settings
    'sidebarMenuItemBgD': '--sidebar-menu-item-background',
    'sidebarMenuItemBgHoverD': '--sidebar-menu-item-background-hover',
    'sidebarMenuItemBgActiveD': '--sidebar-menu-item-background-active',
    'sidebarMenuItemColorD': '--sidebar-menu-item-color',
    'sidebarMenuItemColorHoverD': '--sidebar-menu-item-color-hover',
    'sidebarMenuItemColorActiveD': '--sidebar-menu-item-color-active',
    'sidebarMenuItemBorderD': '--sidebar-menu-item-border',
    'sidebarMenuItemBorderHoverD': '--sidebar-menu-item-border-hover',
    'sidebarMenuItemBorderActiveD': '--sidebar-menu-item-border-active',
    'sidebarMenuItemBorderRadiusD': '--sidebar-menu-item-border-radius',
    'sidebarMenuItemPaddingXD': '--sidebar-menu-item-padding-x',
    'sidebarMenuItemPaddingYD': '--sidebar-menu-item-padding-y',
    'sidebarMenuItemMarginD': '--sidebar-menu-item-margin',
    'sidebarMenuItemFontWeightD': '--sidebar-menu-item-font-weight',
    'sidebarMenuItemFontWeightActiveD': '--sidebar-menu-item-font-weight-active',
    'sidebarMenuItemFontSizeD': '--sidebar-menu-item-font-size',
    'sidebarMenuItemLineHeightD': '--sidebar-menu-item-line-height',
    'sidebarMenuItemTransitionD': '--sidebar-menu-item-transition',
    
    // Dark theme - Icon settings
    'sidebarIconSizeD': '--sidebar-icon-size',
    'sidebarIconColorD': '--sidebar-icon-color',
    'sidebarIconColorHoverD': '--sidebar-icon-color-hover',
    'sidebarIconColorActiveD': '--sidebar-icon-color-active',
    'sidebarIconMarginRightD': '--sidebar-icon-margin-right',
    'sidebarIconTransitionD': '--sidebar-icon-transition',
    
    // Dark theme - Group label settings
    'sidebarGroupLabelColorD': '--sidebar-group-label-color',
    'sidebarGroupLabelFontSizeD': '--sidebar-group-label-font-size',
    'sidebarGroupLabelFontWeightD': '--sidebar-group-label-font-weight',
    'sidebarGroupLabelTextTransformD': '--sidebar-group-label-text-transform',
    'sidebarGroupLabelLetterSpacingD': '--sidebar-group-label-letter-spacing',
    'sidebarGroupLabelPaddingD': '--sidebar-group-label-padding-x',
    'sidebarGroupLabelMarginD': '--sidebar-group-label-margin',
  };

  // Set CSS variables based on current theme
  const isDark = root.classList.contains('dark');
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