import { readJsonOrFallback } from '../../lib/response-json';
import { APP_LAYOUT_SIDEBAR_COLOR_KEYS } from './app-layout-sidebar-color-keys';

const APP_LAYOUT_SETTINGS_KEYS = [
  'appLogoDataUrl',
  'appName',
  'showLogoOnly',
  'sidebarLogoSize',
  'collapsedSidebarLogoSize',
  'sidebarLogoCollapsedLightMode',
  'sidebarLogoExpandedLightMode',
  'sidebarLogoCollapsedDarkMode',
  'sidebarLogoExpandedDarkMode',
  'themePreference',
  'primaryGradient',
  'primaryButtonShadowL',
  'primaryButtonShadowHoverL',
  'primaryButtonShadowD',
  'primaryButtonShadowHoverD',
  'sidebarBackgroundType',
  'sidebarBackgroundImageUrl',
  'sidebarBackgroundImageFit',
  'sidebarBackgroundImagePosition',
  'sidebarNavigationMode',
  'sidebarSecondaryGroupLabels',
  ...APP_LAYOUT_SIDEBAR_COLOR_KEYS,
];

const APP_LAYOUT_SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedSettings: { value: unknown; expiresAt: number } | null = null;
let settingsRequest: Promise<unknown> | null = null;

export async function fetchLayoutSystemSettings(forceRefresh = false): Promise<unknown> {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && cachedSettings.expiresAt > now) {
    return cachedSettings.value;
  }
  if (!forceRefresh && settingsRequest) {
    return settingsRequest;
  }

  const params = new URLSearchParams({ keys: APP_LAYOUT_SETTINGS_KEYS.join(',') });
  const request = (async () => {
    const response = await fetch(`/api/settings/system-settings?${params.toString()}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      return null;
    }

    const value = await readJsonOrFallback<unknown>(response, {});
    cachedSettings = {
      value,
      expiresAt: Date.now() + APP_LAYOUT_SETTINGS_CACHE_TTL_MS,
    };
    return value;
  })();
  settingsRequest = request;

  try {
    return await request;
  } finally {
    if (settingsRequest === request) {
      settingsRequest = null;
    }
  }
}
