/**
 * Set Theme and Colors
 * Main function for applying theme settings
 */

import { parseGradientToHsl } from './colors';
import { applySidebarStylesWithTheme } from './sidebar-styles';

/**
 * Set theme and apply colors
 */
export function setThemeAndColors({
  themePreference,
  primaryGradient,
  primaryGradientStart,
  primaryGradientEnd,
  sidebarColors = {},
  primaryButtonShadows = {},
}: {
  themePreference: 'light' | 'dark' | 'system',
  primaryGradient?: string | null,
  primaryGradientStart?: string,
  primaryGradientEnd?: string,
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

  // Apply button text colors if provided in sidebarColors
  if (sidebarColors.buttonTextColorL) {
    root.style.setProperty('--button-text-color-l', `hsl(${sidebarColors.buttonTextColorL})`);
  }
  if (sidebarColors.buttonTextColorD) {
    root.style.setProperty('--button-text-color-d', `hsl(${sidebarColors.buttonTextColorD})`);
  }

  // Apply primary button shadows if provided
  if (primaryButtonShadows.primaryButtonShadowL) {
    root.style.setProperty('--primary-button-shadow-l', primaryButtonShadows.primaryButtonShadowL);
  }
  if (primaryButtonShadows.primaryButtonShadowHoverL) {
    root.style.setProperty('--primary-button-shadow-hover-l', primaryButtonShadows.primaryButtonShadowHoverL);
  }
  if (primaryButtonShadows.primaryButtonShadowD) {
    root.style.setProperty('--primary-button-shadow-d', primaryButtonShadows.primaryButtonShadowD);
  }
  if (primaryButtonShadows.primaryButtonShadowHoverD) {
    root.style.setProperty('--primary-button-shadow-hover-d', primaryButtonShadows.primaryButtonShadowHoverD);
  }

  // Apply sidebar styles with explicit theme information
  requestAnimationFrame(() => {
    applySidebarStylesWithTheme(sidebarColors, shouldBeDark);
  });
}
