import { addCacheBuster } from '../imageUtils';
import { waitForSidebar } from './sidebar-styles';
import { updateThemeSystemSettingsCache } from './system-settings-cache';

export interface SidebarBackgroundSettings {
  sidebarBackgroundType?: string;
  sidebarBackgroundImageUrl?: string;
  sidebarBackgroundImageFit?: string;
  sidebarBackgroundImagePosition?: string;
}

export function applySidebarBackgroundSettings(settings: SidebarBackgroundSettings) {
  if (typeof window === 'undefined') return;

  persistSidebarBackgroundSettings(settings);
  updateThemeSystemSettingsCache({
    ...(settings.sidebarBackgroundType ? { sidebarBackgroundType: settings.sidebarBackgroundType } : {}),
    ...(settings.sidebarBackgroundImageUrl ? { sidebarBackgroundImageUrl: settings.sidebarBackgroundImageUrl } : {}),
    ...(settings.sidebarBackgroundImageFit ? { sidebarBackgroundImageFit: settings.sidebarBackgroundImageFit } : {}),
    ...(settings.sidebarBackgroundImagePosition ? { sidebarBackgroundImagePosition: settings.sidebarBackgroundImagePosition } : {}),
  });

  applySidebarBackgroundToCSS();
}

export function applySidebarBackgroundToCSS() {
  if (typeof window === 'undefined') return;

  waitForSidebar().then((sidebarElement) => {
    if (!sidebarElement) {
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

function persistSidebarBackgroundSettings(settings: SidebarBackgroundSettings) {
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
}

function applySidebarBackgroundToCSSInternal(sidebarElement: HTMLElement) {
  if (typeof window === 'undefined') return;

  try {
    const root = document.documentElement;
    const backgroundType = localStorage.getItem('sidebarBackgroundType') || 'gradient';
    const backgroundImageUrl = localStorage.getItem('sidebarBackgroundImageUrl') || '';
    const backgroundImageFit = localStorage.getItem('sidebarBackgroundImageFit') || 'cover';
    const backgroundImagePosition = localStorage.getItem('sidebarBackgroundImagePosition') || 'center';

    resetSidebarBackgroundStyle(sidebarElement);

    switch (backgroundType) {
      case 'gradient':
        applyGradientSidebarBackground(root, sidebarElement);
        break;
      case 'solid':
        applySolidSidebarBackground(root, sidebarElement);
        break;
      case 'image':
        applyImageSidebarBackground({
          backgroundImageFit,
          backgroundImagePosition,
          backgroundImageUrl,
          sidebarElement,
        });
        break;
    }
  } catch (error) {
    console.error('Error applying sidebar background to CSS:', error);
  }
}

function resetSidebarBackgroundStyle(sidebarElement: HTMLElement) {
  sidebarElement.style.backgroundImage = '';
  sidebarElement.style.backgroundColor = '';
  sidebarElement.style.backgroundSize = '';
  sidebarElement.style.backgroundPosition = '';
  sidebarElement.style.backgroundRepeat = '';
  sidebarElement.classList.remove('custom-background');
}

function applyGradientSidebarBackground(root: HTMLElement, sidebarElement: HTMLElement) {
  const fullGradient = getComputedStyle(root).getPropertyValue('--sidebar-background-full-gradient').trim();
  if (fullGradient) {
    sidebarElement.style.background = fullGradient;
    sidebarElement.classList.add('custom-background');
  } else {
    sidebarElement.style.backgroundImage = '';
    sidebarElement.style.backgroundColor = '';
  }
}

function applySolidSidebarBackground(root: HTMLElement, sidebarElement: HTMLElement) {
  const isDark = root.classList.contains('dark');
  const bgStartVar = isDark ? '--sidebar-background-start-d' : '--sidebar-background-start-l';
  const bgStartValue = getComputedStyle(root).getPropertyValue(bgStartVar);
  sidebarElement.style.backgroundColor = `hsl(${bgStartValue})`;
  sidebarElement.classList.add('custom-background');
}

function applyImageSidebarBackground({
  backgroundImageFit,
  backgroundImagePosition,
  backgroundImageUrl,
  sidebarElement,
}: {
  backgroundImageFit: string;
  backgroundImagePosition: string;
  backgroundImageUrl: string;
  sidebarElement: HTMLElement;
}) {
  if (!backgroundImageUrl) return;

  try {
    const cacheBustedUrl = addCacheBuster(backgroundImageUrl, true);
    setSidebarImageBackground(sidebarElement, cacheBustedUrl, backgroundImageFit, backgroundImagePosition);
  } catch (cacheError) {
    console.error('Error applying cache busting to sidebar background image:', cacheError);
    setSidebarImageBackground(sidebarElement, backgroundImageUrl, backgroundImageFit, backgroundImagePosition);
  }
}

function setSidebarImageBackground(
  sidebarElement: HTMLElement,
  imageUrl: string,
  backgroundImageFit: string,
  backgroundImagePosition: string,
) {
  sidebarElement.style.backgroundImage = `url(${imageUrl})`;
  sidebarElement.style.backgroundSize = backgroundImageFit;
  sidebarElement.style.backgroundPosition = backgroundImagePosition;
  sidebarElement.style.backgroundRepeat = 'no-repeat';
  sidebarElement.classList.add('custom-background');
}
