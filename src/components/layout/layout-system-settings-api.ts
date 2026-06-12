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
  ...APP_LAYOUT_SIDEBAR_COLOR_KEYS,
];

export async function fetchLayoutSystemSettings(): Promise<unknown> {
  const params = new URLSearchParams({ keys: APP_LAYOUT_SETTINGS_KEYS.join(',') });
  const response = await fetch(`/api/settings/system-settings?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    return null;
  }

  return readJsonOrFallback<unknown>(response, {});
}
