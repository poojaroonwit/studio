/**
 * Sidebar Styles
 * Functions for applying sidebar color and style settings
 */

import { cssVarMapping } from './css-var-mapping';
import { isFullGradientString } from './colors';

// Store current sidebar colors for re-application
let currentSidebarColors: Record<string, string> = {};

/**
 * Apply all sidebar styles with explicit theme information
 */
export function applySidebarStylesWithTheme(sidebarColors: Record<string, string>, isDark: boolean) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  
  // Store the colors for later use
  currentSidebarColors = { ...sidebarColors };
  
  const themeSuffix = isDark ? 'D' : 'L';
  const bgStartKey = `sidebarBgStart${themeSuffix}`;
  const activeBgStartKey = `sidebarActiveBgStart${themeSuffix}`;
  
  // Check if we have a full gradient string for background
  const bgStartValue = sidebarColors[bgStartKey];
  const isFullGradient = isFullGradientString(bgStartValue);
  
  // Check if we have a full gradient string for active background
  const activeBgStartValue = sidebarColors[activeBgStartKey];
  const isActiveFullGradient = isFullGradientString(activeBgStartValue);
  
  // Apply full gradient directly if provided
  if (isFullGradient && bgStartValue) {
    root.style.setProperty('--sidebar-background-full-gradient', bgStartValue);
    // Find sidebar element and apply directly
    requestAnimationFrame(() => {
      const sidebarElement = document.querySelector('[data-sidebar="sidebar"]') as HTMLElement;
      if (sidebarElement) {
        sidebarElement.style.background = bgStartValue;
        sidebarElement.classList.add('custom-background');
      }
    });
  }
  
  // Apply full gradient directly for active background if provided
  if (isActiveFullGradient && activeBgStartValue) {
    root.style.setProperty('--sidebar-active-bg-full-gradient', activeBgStartValue);
  }
  
  // Apply each sidebar color to CSS variables
  Object.entries(sidebarColors).forEach(([key, value]) => {
    if (key.endsWith(themeSuffix) && value) {
      // Skip bgStartKey and activeBgStartKey if they contain full gradient strings
      if ((key === bgStartKey && isFullGradient) || (key === activeBgStartKey && isActiveFullGradient)) {
        return;
      }
      
      const cssVarName = cssVarMapping[key];
      if (cssVarName) {
        // Special handling for active text color
        if (key === `sidebarActiveText${themeSuffix}`) {
          root.style.setProperty(cssVarName, value);
        } else if (key === 'buttonTextColorL' || key === 'buttonTextColorD') {
          root.style.setProperty(cssVarName, `hsl(${value})`);
        } else if (key === `sidebarActiveBgStart${themeSuffix}` || key === `sidebarActiveBgEnd${themeSuffix}`) {
          root.style.setProperty(cssVarName, value);
        } else {
          root.style.setProperty(cssVarName, value);
        }
      }
    }
  });
  
  // Handle button text colors without theme suffix
  if (sidebarColors.buttonTextColorL) {
    root.style.setProperty('--button-text-color-l', `hsl(${sidebarColors.buttonTextColorL})`);
  }
  if (sidebarColors.buttonTextColorD) {
    root.style.setProperty('--button-text-color-d', `hsl(${sidebarColors.buttonTextColorD})`);
  }
}

/**
 * Get current sidebar colors
 */
export function getCurrentSidebarColors(): Record<string, string> {
  return { ...currentSidebarColors };
}

/**
 * Wrapper function for backward compatibility
 */
export function applySidebarStyles(sidebarColors: Record<string, string>) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  applySidebarStylesWithTheme(sidebarColors, isDark);
}

/**
 * Wait for sidebar DOM to be ready
 */
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

/**
 * Re-apply current sidebar colors for the current theme
 */
export function reapplyCurrentSidebarColors() {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  
  waitForSidebar().then(() => {
    requestAnimationFrame(() => {
      applySidebarStylesWithTheme(currentSidebarColors, isDark);
    });
  });
}
