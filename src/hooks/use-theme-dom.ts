import type { MutableRefObject } from 'react';

import {
  isMobileThemeLocked,
  resolveThemeFromPreference,
  type ThemeMode,
} from './use-theme-utils';

const THEME_CHANGE_THROTTLE_MS = 500;
const SIDEBAR_COLOR_REAPPLY_UNLOCK_MS = 200;

export function isWindowThemeLocked() {
  return isMobileThemeLocked({
    innerWidth: window.innerWidth,
    userAgent: navigator.userAgent,
  });
}

export function getSystemThemeFromWindow() {
  return resolveThemeFromPreference(
    'system',
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function canApplyThemeChange(lastThemeChange: MutableRefObject<number>) {
  const now = Date.now();
  if (now - lastThemeChange.current < THEME_CHANGE_THROTTLE_MS) {
    return false;
  }

  lastThemeChange.current = now;
  return true;
}

export function applyThemeClass(theme: ThemeMode) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function scheduleSidebarColorReapply(isUpdatingRef: MutableRefObject<boolean>) {
  if (isUpdatingRef.current) {
    return;
  }

  isUpdatingRef.current = true;
  requestAnimationFrame(() => {
    import('@/lib/themeUtils').then(({ reapplyCurrentSidebarColors }) => {
      reapplyCurrentSidebarColors();
      window.setTimeout(() => {
        isUpdatingRef.current = false;
      }, SIDEBAR_COLOR_REAPPLY_UNLOCK_MS);
    }).catch(() => {
      window.setTimeout(() => {
        isUpdatingRef.current = false;
      }, SIDEBAR_COLOR_REAPPLY_UNLOCK_MS);
    });
  });
}
