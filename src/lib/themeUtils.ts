<<<<<<< HEAD
import { addCacheBuster } from './imageUtils';

// Helper to parse gradient string and extract start/end HSL values
function parseGradientToHsl(gradientString: string | null | undefined): { start: string; end: string } | null {
  if (!gradientString) return null;
  // Try to parse the gradient string
  const match = gradientString.match(/linear-gradient\([^,]+,\s*(.+)\)/);
  if (match) {
    const stopsStr = match[1];
    const colorMatches = stopsStr.matchAll(/(#[0-9A-Fa-f]{6})\s+(\d+)%/g);
    const stops: Array<{ color: string; position: number }> = [];
    for (const match of colorMatches) {
      stops.push({ color: match[1], position: parseInt(match[2]) });
    }
    if (stops.length >= 2) {
      stops.sort((a, b) => a.position - b.position);
      // Convert hex to HSL
      const hexToHsl = (hex: string): string => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      };
      return {
        start: hexToHsl(stops[0].color),
        end: hexToHsl(stops[stops.length - 1].color)
      };
    }
  }
  return null;
}

export function setThemeAndColors({
  themePreference,
  primaryGradient,
  primaryGradientStart, // Legacy support
  primaryGradientEnd, // Legacy support
  sidebarColors = {},
  primaryButtonShadows = {},
}: {
  themePreference: 'light' | 'dark' | 'system',
  primaryGradient?: string | null,
  primaryGradientStart?: string, // Legacy support
  primaryGradientEnd?: string, // Legacy support
  sidebarColors?: Record<string, string>,
  primaryButtonShadows?: {
    primaryButtonShadowL?: string | null;
    primaryButtonShadowHoverL?: string | null;
    primaryButtonShadowD?: string | null;
    primaryButtonShadowHoverD?: string | null;
  },
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
    shouldBeDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  }

  // Set theme class
  if (shouldBeDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Extract start/end from primary gradient for CSS variables
  let gradientStart = primaryGradientStart;
  let gradientEnd = primaryGradientEnd;
  
  if (primaryGradient) {
    const parsed = parseGradientToHsl(primaryGradient);
    if (parsed) {
      gradientStart = parsed.start;
      gradientEnd = parsed.end;
    }
  }
  
  // Set primary color CSS variables
  if (gradientStart) {
    root.style.setProperty('--primary-gradient-start-l', gradientStart);
    root.style.setProperty('--primary-gradient-start-d', gradientStart);
    root.style.setProperty('--primary', `hsl(${gradientStart})`);
    
    // Also set sidebar active colors to match primary button colors
    root.style.setProperty('--sidebar-active-bg-start-l', gradientStart);
    root.style.setProperty('--sidebar-active-bg-start-d', gradientStart);
  }
  if (gradientEnd) {
    root.style.setProperty('--primary-gradient-end-l', gradientEnd);
    root.style.setProperty('--primary-gradient-end-d', gradientEnd);
    
    // Also set sidebar active colors to match primary button colors
    root.style.setProperty('--sidebar-active-bg-end-l', gradientEnd);
    root.style.setProperty('--sidebar-active-bg-end-d', gradientEnd);
  }
  
  // Store full gradient string for direct use in inline styles
  if (primaryGradient) {
    root.style.setProperty('--primary-gradient', primaryGradient);
  }

  // Apply button text colors if provided in sidebarColors (for backward compatibility)
  // Button text colors can be set via buttonTextColorL and buttonTextColorD keys
  if (sidebarColors.buttonTextColorL) {
    root.style.setProperty('--button-text-color-l', `hsl(${sidebarColors.buttonTextColorL})`);
  }
  if (sidebarColors.buttonTextColorD) {
    root.style.setProperty('--button-text-color-d', `hsl(${sidebarColors.buttonTextColorD})`);
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
    'sidebarActiveBgEndL': '--sidebar-active-bg-end-l',
    'sidebarActiveTextL': '--sidebar-active-foreground-l',
    'sidebarHoverBgL': '--sidebar-accent-l',
    'sidebarHoverTextL': '--sidebar-accent-foreground-l',
    
    // Button text colors - separate from sidebar active text
    'buttonTextColorL': '--button-text-color-l',
    'buttonTextColorD': '--button-text-color-d',
    
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
    'sidebarItemSpacingL': '--sidebar-item-spacing-l',
    'sidebarGroupSpacingL': '--sidebar-group-spacing-l',
    
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
    'sidebarActiveBgEndD': '--sidebar-active-bg-end-d',
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
    'sidebarItemSpacingD': '--sidebar-item-spacing-d',
    'sidebarGroupSpacingD': '--sidebar-group-spacing-d',
    
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
  
  // Check for full gradient strings in bgStartKey and activeBgStartKey
  const bgStartKey = `sidebarBgStart${themeSuffix}`;
  const activeBgStartKey = `sidebarActiveBgStart${themeSuffix}`;
  const bgStartValue = sidebarColors[bgStartKey];
  const activeBgStartValue = sidebarColors[activeBgStartKey];
  
  // Check if bgStartKey contains a full gradient string
  const isFullGradient = bgStartValue && (
    bgStartValue.startsWith('linear-gradient') || 
    bgStartValue.startsWith('radial-gradient') || 
    bgStartValue.startsWith('conic-gradient')
  );
  
  // Check if activeBgStartKey contains a full gradient string
  const isActiveFullGradient = activeBgStartValue && (
    activeBgStartValue.startsWith('linear-gradient') || 
    activeBgStartValue.startsWith('radial-gradient') || 
    activeBgStartValue.startsWith('conic-gradient')
  );
  
  // Apply full gradient directly to sidebar element if detected
  // Wait for sidebar if it's not ready yet (important for cached sessions)
  if (isFullGradient || isActiveFullGradient) {
    // Set CSS variables immediately (these don't require sidebar DOM)
    if (isFullGradient) {
      root.style.setProperty('--sidebar-background-full-gradient', bgStartValue);
    }
    if (isActiveFullGradient) {
      root.style.setProperty('--sidebar-active-background-full-gradient', activeBgStartValue);
      const activeBgVar = isDark ? '--sidebar-active-background-d' : '--sidebar-active-background-l';
      root.style.setProperty(activeBgVar, activeBgStartValue);
    }
    
    // Wait for sidebar DOM to be ready before applying direct styles
    waitForSidebar().then((sidebarElement) => {
      if (sidebarElement) {
        if (isFullGradient) {
          sidebarElement.style.background = bgStartValue;
          sidebarElement.classList.add('custom-background');
        }
      }
    });
  }
  
  let appliedCount = 0;
  Object.entries(sidebarColors).forEach(([key, value]) => {
    if (key.endsWith(themeSuffix) && value) {
      // Skip bgStartKey and activeBgStartKey if they contain full gradient strings
      if ((key === bgStartKey && isFullGradient) || (key === activeBgStartKey && isActiveFullGradient)) {
        return; // Skip setting CSS variable, we already applied it directly
      }
      
      const cssVarName = cssVarMapping[key];
      if (cssVarName) {
        // Special handling for active text color: store as HSL values only (without hsl() wrapper)
        // This allows independent configuration from primary button text color
        if (key === `sidebarActiveText${themeSuffix}`) {
          root.style.setProperty(cssVarName, value); // Store as HSL values only, e.g., "0 0% 100%"
        } else if (key === 'buttonTextColorL' || key === 'buttonTextColorD') {
          // Button text colors: ensure hsl() is used
          root.style.setProperty(cssVarName, `hsl(${value})`);
        } else if (key === `sidebarActiveBgStart${themeSuffix}` || key === `sidebarActiveBgEnd${themeSuffix}`) {
          // Ensure active background colors are set with hsl()
          root.style.setProperty(cssVarName, value);
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
  
  // Also handle button text colors that don't have theme suffix
  if (sidebarColors.buttonTextColorL) {
    root.style.setProperty('--button-text-color-l', `hsl(${sidebarColors.buttonTextColorL})`);
  }
  if (sidebarColors.buttonTextColorD) {
    root.style.setProperty('--button-text-color-d', `hsl(${sidebarColors.buttonTextColorD})`);
  }
  
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

// Function to wait for sidebar DOM to be ready
export function waitForSidebar(maxAttempts = 20, interval = 100): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    let attempts = 0;
    const checkSidebar = () => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]') as HTMLElement;
      if (sidebar) {
        resolve(sidebar);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkSidebar, interval);
      } else {
        resolve(null);
      }
    };
    checkSidebar();
  });
}

// Function to re-apply current sidebar colors for the current theme
export function reapplyCurrentSidebarColors() {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  
  // Wait for sidebar to be ready before applying styles
  waitForSidebar().then(() => {
    // Use requestAnimationFrame to ensure DOM is in sync
    requestAnimationFrame(() => {
      applySidebarStylesWithTheme(currentSidebarColors, isDark);
    });
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
  
  // Also ensure sidebar colors are applied
  reapplyCurrentSidebarColors();
}

// Listen for preference changes
export function setupSidebarStyleListener() {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('appConfigChanged', (event: any) => {
    if (event.detail?.sidebarActiveStyle) {
      applySidebarActiveStyle(event.detail.sidebarActiveStyle);
    }
    // Also reapply colors when config changes
    reapplyCurrentSidebarColors();
    // Reapply background settings when config changes
    applySidebarBackgroundToCSS();
  });
}

// Comprehensive initialization function
export function initializeSidebarStyles() {
  if (typeof window === 'undefined') return;
  
  // Initialize active style
  initializeSidebarStyle();
  
  // Setup listeners
  setupSidebarStyleListener();
  
  // Initialize sidebar background
  initializeSidebarBackground();
  
  // Force a re-application of colors
  setTimeout(() => {
    reapplyCurrentSidebarColors();
  }, 50);
}

// Function to apply sidebar background settings
export function applySidebarBackgroundSettings(settings: {
  sidebarBackgroundType?: string;
  sidebarBackgroundImageUrl?: string;
  sidebarBackgroundImageFit?: string;
  sidebarBackgroundImagePosition?: string;
}) {
  if (typeof window === 'undefined') return;
  
  // Store settings in localStorage for persistence
  if (settings.sidebarBackgroundType) {
    localStorage.setItem('sidebarBackgroundType', settings.sidebarBackgroundType);
  }
  if (settings.sidebarBackgroundImageUrl) {
    localStorage.setItem('sidebarBackgroundImageUrl', settings.sidebarBackgroundImageUrl);
  }
  if (settings.sidebarBackgroundImageFit) {
    localStorage.setItem('sidebarBackgroundImageFit', settings.sidebarBackgroundImageFit);
  }
  if (settings.sidebarBackgroundImagePosition) {
    localStorage.setItem('sidebarBackgroundImagePosition', settings.sidebarBackgroundImagePosition);
  }
  
  // Update system settings for immediate access
  if (typeof window !== "undefined" && (window as any).__systemSettings) {
    if (settings.sidebarBackgroundType) {
      (window as any).__systemSettings.sidebarBackgroundType = settings.sidebarBackgroundType;
    }
    if (settings.sidebarBackgroundImageUrl) {
      (window as any).__systemSettings.sidebarBackgroundImageUrl = settings.sidebarBackgroundImageUrl;
    }
    if (settings.sidebarBackgroundImageFit) {
      (window as any).__systemSettings.sidebarBackgroundImageFit = settings.sidebarBackgroundImageFit;
    }
    if (settings.sidebarBackgroundImagePosition) {
      (window as any).__systemSettings.sidebarBackgroundImagePosition = settings.sidebarBackgroundImagePosition;
    }
  }

  // Apply the background settings to CSS
  applySidebarBackgroundToCSS();
}

// Function to apply sidebar background settings to CSS
export function applySidebarBackgroundToCSS() {
  if (typeof window === 'undefined') return;
  
  // Wait for sidebar to be ready before applying background
  waitForSidebar().then((sidebarElement) => {
    if (!sidebarElement) {
      // If sidebar not found after waiting, try one more time after a delay
      setTimeout(() => {
        const retrySidebar = document.querySelector('[data-sidebar="sidebar"]') as HTMLElement;
        if (retrySidebar) {
          applySidebarBackgroundToCSSInternal(retrySidebar);
        }
      }, 500);
      return;
    }
    
    applySidebarBackgroundToCSSInternal(sidebarElement);
  });
}

// Internal function to actually apply the background styles
function applySidebarBackgroundToCSSInternal(sidebarElement: HTMLElement) {
  if (typeof window === 'undefined') return;
  
  try {
    const root = document.documentElement;
    
    // Get background settings from localStorage or system settings
    const backgroundType = localStorage.getItem('sidebarBackgroundType') || 'gradient';
    const backgroundImageUrl = localStorage.getItem('sidebarBackgroundImageUrl') || '';
    const backgroundImageFit = localStorage.getItem('sidebarBackgroundImageFit') || 'cover';
    const backgroundImagePosition = localStorage.getItem('sidebarBackgroundImagePosition') || 'center';
    
    // Reset all background properties
    sidebarElement.style.backgroundImage = '';
    sidebarElement.style.backgroundColor = '';
    sidebarElement.style.backgroundSize = '';
    sidebarElement.style.backgroundPosition = '';
    sidebarElement.style.backgroundRepeat = '';
    
    // Remove custom background class initially
    sidebarElement.classList.remove('custom-background');
    
    // Apply background based on type
    switch (backgroundType) {
      case 'gradient':
        // Check if we have a full gradient string already applied
        const fullGradient = getComputedStyle(root).getPropertyValue('--sidebar-background-full-gradient').trim();
        if (fullGradient) {
          // Full gradient is already applied, don't override
          sidebarElement.style.background = fullGradient;
          sidebarElement.classList.add('custom-background');
        } else {
          // Use the existing CSS variables for gradient - no custom class needed
          sidebarElement.style.backgroundImage = '';
          sidebarElement.style.backgroundColor = '';
        }
        break;
        
      case 'solid':
        // Use solid color from CSS variables
        const isDark = root.classList.contains('dark');
        const bgStartVar = isDark ? '--sidebar-background-start-d' : '--sidebar-background-start-l';
        const bgStartValue = getComputedStyle(root).getPropertyValue(bgStartVar);
        sidebarElement.style.backgroundColor = `hsl(${bgStartValue})`;
        sidebarElement.classList.add('custom-background');
        break;
        
      case 'image':
        if (backgroundImageUrl) {
          try {
            // Add cache busting to the image URL to prevent browser caching issues
            const cacheBustedUrl = addCacheBuster(backgroundImageUrl, true);
            sidebarElement.style.backgroundImage = `url(${cacheBustedUrl})`;
            sidebarElement.style.backgroundSize = backgroundImageFit;
            sidebarElement.style.backgroundPosition = backgroundImagePosition;
            sidebarElement.style.backgroundRepeat = 'no-repeat';
            sidebarElement.classList.add('custom-background');
          } catch (cacheError) {
            console.error('Error applying cache busting to sidebar background image:', cacheError);
            // Fallback to original URL without cache busting
            sidebarElement.style.backgroundImage = `url(${backgroundImageUrl})`;
            sidebarElement.style.backgroundSize = backgroundImageFit;
            sidebarElement.style.backgroundPosition = backgroundImagePosition;
            sidebarElement.style.backgroundRepeat = 'no-repeat';
            sidebarElement.classList.add('custom-background');
          }
        }
        break;
    }
  } catch (error) {
    console.error('Error applying sidebar background to CSS:', error);
  }
}

// Store observer reference for cleanup
let sidebarBackgroundObserver: MutationObserver | null = null;
let sidebarBackgroundInitialized = false;

// Function to initialize sidebar background on page load
export function initializeSidebarBackground() {
  if (typeof window === 'undefined' || sidebarBackgroundInitialized) return;
  
  sidebarBackgroundInitialized = true;
  
  // Apply background settings after a short delay to ensure DOM is ready
  const initialTimeout = setTimeout(() => {
    try {
      applySidebarBackgroundToCSS();
    } catch (error) {
      console.error('Error applying initial sidebar background:', error);
    }
  }, 100);
  
  // Also listen for DOM changes to handle dynamic sidebar creation
  sidebarBackgroundObserver = new MutationObserver((mutations) => {
    let sidebarFound = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && !sidebarFound) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.querySelector('[data-sidebar="sidebar"]')) {
              sidebarFound = true;
              // Sidebar was added, apply background settings
              setTimeout(() => {
                try {
                  applySidebarBackgroundToCSS();
                } catch (error) {
                  console.error('Error applying sidebar background after DOM change:', error);
                }
              }, 50);
            }
          }
        });
      }
    });
  });
  
  try {
    sidebarBackgroundObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  } catch (error) {
    console.error('Error setting up sidebar background observer:', error);
  }
  
  // Cleanup function to be called when needed
  return () => {
    if (initialTimeout) {
      clearTimeout(initialTimeout);
    }
    if (sidebarBackgroundObserver) {
      sidebarBackgroundObserver.disconnect();
      sidebarBackgroundObserver = null;
    }
    sidebarBackgroundInitialized = false;
  };
}

// Function to cleanup sidebar background resources
export function cleanupSidebarBackground() {
  if (sidebarBackgroundObserver) {
    sidebarBackgroundObserver.disconnect();
    sidebarBackgroundObserver = null;
  }
  sidebarBackgroundInitialized = false;
}

 
=======
/**
 * Theme Utilities
 * 
 * This file re-exports all functions from the theme module for backward compatibility.
 * New code should import directly from '@/lib/theme' instead.
 * 
 * @deprecated Import from '@/lib/theme' instead
 * @module themeUtils
 */

// Re-export everything from the theme module
export {
  // Color utilities
  parseGradientToHsl,
  hexToHsl,
  isFullGradientString,
  
  // CSS variable mapping
  cssVarMapping,
  primaryButtonShadowMapping,
  
  // Main theme setting function
  setThemeAndColors,
  
  // Sidebar styles
  applySidebarStylesWithTheme,
  getCurrentSidebarColors,
  applySidebarStyles,
  waitForSidebar,
  reapplyCurrentSidebarColors,
  
  // Sidebar active style
  type SidebarActiveStyle,
  getSidebarActiveStyle,
  setSidebarActiveStyle,
  applySidebarActiveStyle,
  initializeSidebarStyle,
  setupSidebarStyleListener,
  initializeSidebarStyles,
  
  // Sidebar background
  applySidebarBackgroundSettings,
  applySidebarBackgroundToCSS,
  initializeSidebarBackground,
  cleanupSidebarBackground,
} from './theme';
>>>>>>> ca51ac36
