/**
 * Sidebar Background
 * Functions for managing sidebar background images and settings
 */

import { addCacheBuster } from '../imageUtils';
import { waitForSidebar } from './sidebar-styles';

// Store observer reference for cleanup
let sidebarBackgroundObserver: MutationObserver | null = null;
let sidebarBackgroundInitialized = false;

/**
 * Apply sidebar background settings
 */
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

/**
 * Apply sidebar background settings to CSS
 */
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

/**
 * Internal function to actually apply the background styles
 */
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
          sidebarElement.style.background = fullGradient;
          sidebarElement.classList.add('custom-background');
        } else {
          sidebarElement.style.backgroundImage = '';
          sidebarElement.style.backgroundColor = '';
        }
        break;
        
      case 'solid':
        const isDark = root.classList.contains('dark');
        const bgStartVar = isDark ? '--sidebar-background-start-d' : '--sidebar-background-start-l';
        const bgStartValue = getComputedStyle(root).getPropertyValue(bgStartVar);
        sidebarElement.style.backgroundColor = `hsl(${bgStartValue})`;
        sidebarElement.classList.add('custom-background');
        break;
        
      case 'image':
        if (backgroundImageUrl) {
          try {
            const cacheBustedUrl = addCacheBuster(backgroundImageUrl, true);
            sidebarElement.style.backgroundImage = `url(${cacheBustedUrl})`;
            sidebarElement.style.backgroundSize = backgroundImageFit;
            sidebarElement.style.backgroundPosition = backgroundImagePosition;
            sidebarElement.style.backgroundRepeat = 'no-repeat';
            sidebarElement.classList.add('custom-background');
          } catch (cacheError) {
            console.error('Error applying cache busting to sidebar background image:', cacheError);
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

/**
 * Initialize sidebar background on page load
 */
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

/**
 * Cleanup sidebar background resources
 */
export function cleanupSidebarBackground() {
  if (sidebarBackgroundObserver) {
    sidebarBackgroundObserver.disconnect();
    sidebarBackgroundObserver = null;
  }
  sidebarBackgroundInitialized = false;
}
