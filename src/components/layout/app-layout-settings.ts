import { normalizeSystemSettingsResponse } from '../../lib/system-settings-response';
import {
  asBooleanPreference,
  asNumberPreference,
  getNullableStringPreference,
  getStringPreference,
  getThemePreference,
} from './app-layout-preference-utils';
import { APP_LAYOUT_SIDEBAR_COLOR_KEYS } from './app-layout-sidebar-color-keys';
import type {
  AppConfigChangedDetail,
  AppLayoutContextualLogos,
  AppLayoutSettingsRecord,
} from './app-layout-settings-types';

const DEFAULT_APP_NAME = "FitScan";

export type { AppLayoutContextualLogos, AppLayoutSettingsRecord };

export function parseAppLayoutSettingsResponse(data: unknown): AppLayoutSettingsRecord {
  return normalizeSystemSettingsResponse(data);
}

export function buildAppLayoutConfigUpdates(prefs: AppLayoutSettingsRecord) {
  return {
    appLogoUrl: getNullableStringPreference(prefs, 'appLogoDataUrl'),
    currentAppName: getStringPreference(prefs, 'appName') ?? DEFAULT_APP_NAME,
    showLogoOnly: asBooleanPreference(prefs.showLogoOnly),
    sidebarLogoSize: asNumberPreference(prefs.sidebarLogoSize, 48),
    collapsedSidebarLogoSize: asNumberPreference(prefs.collapsedSidebarLogoSize, 40),
    contextualLogos: {
      sidebarLogoCollapsedLightMode: getNullableStringPreference(prefs, 'sidebarLogoCollapsedLightMode'),
      sidebarLogoExpandedLightMode: getNullableStringPreference(prefs, 'sidebarLogoExpandedLightMode'),
      sidebarLogoCollapsedDarkMode: getNullableStringPreference(prefs, 'sidebarLogoCollapsedDarkMode'),
      sidebarLogoExpandedDarkMode: getNullableStringPreference(prefs, 'sidebarLogoExpandedDarkMode'),
    } satisfies AppLayoutContextualLogos,
  };
}

export function buildAppConfigChangedUpdates(detail?: AppConfigChangedDetail | null) {
  if (!detail) return {};

  return {
    ...(detail.appName ? { currentAppName: detail.appName } : {}),
    ...(detail.logoUrl !== undefined ? { appLogoUrl: detail.logoUrl } : {}),
    ...(detail.showLogoOnly !== undefined ? { showLogoOnly: detail.showLogoOnly } : {}),
    ...(detail.sidebarLogoSize !== undefined ? { sidebarLogoSize: detail.sidebarLogoSize } : {}),
    ...(detail.collapsedSidebarLogoSize !== undefined
      ? { collapsedSidebarLogoSize: detail.collapsedSidebarLogoSize }
      : {}),
  };
}

export function buildAppLayoutThemeConfig(prefs: AppLayoutSettingsRecord) {
  const sidebarColors: Record<string, string> = {};
  APP_LAYOUT_SIDEBAR_COLOR_KEYS.forEach(key => {
    const value = getStringPreference(prefs, key);
    if (value) {
      sidebarColors[key] = value;
    }
  });

  return {
    themePreference: getThemePreference(prefs),
    primaryGradient: getNullableStringPreference(prefs, 'primaryGradient'),
    sidebarColors,
    primaryButtonShadows: {
      primaryButtonShadowL: getNullableStringPreference(prefs, 'primaryButtonShadowL'),
      primaryButtonShadowHoverL: getNullableStringPreference(prefs, 'primaryButtonShadowHoverL'),
      primaryButtonShadowD: getNullableStringPreference(prefs, 'primaryButtonShadowD'),
      primaryButtonShadowHoverD: getNullableStringPreference(prefs, 'primaryButtonShadowHoverD'),
    },
  };
}

export async function initializeAppLayoutSidebarStyles() {
  try {
    const { initializeSidebarStyles } = await import('@/lib/themeUtils');
    initializeSidebarStyles();
  } catch (error) {
    console.warn('[APPLAYOUT] Error loading theme utils:', error);
  }
}

export async function applyAppLayoutThemeSettings(
  prefs: AppLayoutSettingsRecord,
  themeConfig: ReturnType<typeof buildAppLayoutThemeConfig>
) {
  try {
    const { setThemeAndColors, applySidebarStyles } = await import('@/lib/themeUtils');
    applySidebarStyles(themeConfig.sidebarColors);
    setThemeAndColors(themeConfig);
  } catch (error) {
    console.warn('[APPLAYOUT] Error applying theme and colors:', error);
  }

  const sidebarBackgroundType = getStringPreference(prefs, 'sidebarBackgroundType');
  const sidebarBackgroundImageUrl = getStringPreference(prefs, 'sidebarBackgroundImageUrl');

  if (sidebarBackgroundType || sidebarBackgroundImageUrl) {
    try {
      const { applySidebarBackgroundSettings } = await import('@/lib/themeUtils');
      applySidebarBackgroundSettings({
        sidebarBackgroundType,
        sidebarBackgroundImageUrl,
        sidebarBackgroundImageFit: getStringPreference(prefs, 'sidebarBackgroundImageFit'),
        sidebarBackgroundImagePosition: getStringPreference(prefs, 'sidebarBackgroundImagePosition'),
      });
    } catch (error) {
      console.warn('[APPLAYOUT] Error loading theme utils:', error);
    }
  }

  if (Object.keys(themeConfig.sidebarColors).length > 0) {
    try {
      const { reapplyCurrentSidebarColors } = await import('@/lib/themeUtils');
      setTimeout(() => {
        reapplyCurrentSidebarColors();
      }, 100);
    } catch (error) {
      console.warn('[APPLAYOUT] Error loading theme utils:', error);
    }
  }
}

export async function reapplyAppLayoutSidebarStylesAfterLogin() {
  try {
    const { reapplyCurrentSidebarColors, applySidebarBackgroundToCSS } = await import('@/lib/themeUtils');
    reapplyCurrentSidebarColors();
    applySidebarBackgroundToCSS();
  } catch (error) {
    console.warn('[APPLAYOUT] Error reapplying sidebar styles after login:', error);
  }
}

export async function reapplyAppLayoutSidebarColorsForThemeChange() {
  try {
    const { reapplyCurrentSidebarColors } = await import('@/lib/themeUtils');
    reapplyCurrentSidebarColors();
  } catch (error) {
    console.warn('[APPLAYOUT] Error loading theme utils:', error);
  }
}
