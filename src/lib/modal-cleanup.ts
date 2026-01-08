import * as React from 'react';

/**
 * Global modal cleanup utilities to prevent page from becoming unclickable
 */

/**
 * Clean up all modal-related elements that might be causing issues
 */
export function cleanupAllModals() {
  // Clean up any remaining dialog overlays
  const dialogOverlays = document.querySelectorAll('[data-radix-dialog-overlay]');
  dialogOverlays.forEach(overlay => {
    if (overlay.getAttribute('data-state') === 'closed') {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }
  });

  // Clean up any remaining alert dialog overlays
  const alertDialogOverlays = document.querySelectorAll('[data-radix-alert-dialog-overlay]');
  alertDialogOverlays.forEach(overlay => {
    if (overlay.getAttribute('data-state') === 'closed') {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }
  });

  // Clean up any remaining sheet overlays
  const sheetOverlays = document.querySelectorAll('[data-radix-dialog-overlay][data-radix-dialog-content]');
  sheetOverlays.forEach(overlay => {
    if (overlay.getAttribute('data-state') === 'closed') {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }
  });

  // Clean up any remaining portal containers
  const portalContainers = document.querySelectorAll('[data-candidate-modal-portal="true"]');
  portalContainers.forEach(container => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  // Clean up any remaining portal containers with data-portal-container attribute
  const genericPortalContainers = document.querySelectorAll('[data-portal-container]');
  genericPortalContainers.forEach(container => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  // Restore body scroll
  document.body.style.overflow = '';
  document.body.style.pointerEvents = '';

  // Force a reflow to ensure cleanup
  document.body.offsetHeight;
}

/**
 * Check if there are any modal overlays that might be blocking interactions
 */
export function checkForBlockingModals(): boolean {
  const blockingElements = [
    ...document.querySelectorAll('[data-radix-dialog-overlay][data-state="closed"]'),
    ...document.querySelectorAll('[data-radix-alert-dialog-overlay][data-state="closed"]'),
    ...document.querySelectorAll('[data-radix-dialog-content][data-state="closed"]'),
    ...document.querySelectorAll('[data-radix-alert-dialog-content][data-state="closed"]'),
  ];

  return blockingElements.length > 0;
}

/**
 * Force cleanup of any blocking modal elements
 */
export function forceModalCleanup() {
  // Remove all closed modal overlays
  const allOverlays = document.querySelectorAll('[data-radix-dialog-overlay], [data-radix-alert-dialog-overlay]');
  allOverlays.forEach(overlay => {
    const state = overlay.getAttribute('data-state');
    if (state === 'closed' || !state) {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }
  });

  // Remove all closed modal contents
  const allContents = document.querySelectorAll('[data-radix-dialog-content], [data-radix-alert-dialog-content]');
  allContents.forEach(content => {
    const state = content.getAttribute('data-state');
    if (state === 'closed' || !state) {
      if (content.parentNode) {
        content.parentNode.removeChild(content);
      }
    }
  });

  // Clean up Popovers - remove all portals containing popover content
  const allPortals = document.querySelectorAll('[data-radix-portal]');
  allPortals.forEach((portal) => {
    const hasPopover = portal.querySelector('[data-radix-popover-content]');
    const hasSelect = portal.querySelector('[data-radix-select-content]');
    if ((hasPopover || hasSelect) && portal.parentNode) {
      portal.parentNode.removeChild(portal);
    }
  });
  
  // Also try to close by clicking triggers
  const popoverTriggers = document.querySelectorAll('[data-radix-popover-trigger][aria-expanded="true"]');
  popoverTriggers.forEach((trigger) => {
    (trigger as HTMLElement).click();
  });
  
  const selectTriggers = document.querySelectorAll('[data-radix-select-trigger][aria-expanded="true"]');
  selectTriggers.forEach((trigger) => {
    (trigger as HTMLElement).click();
  });

  // Clean up portal containers
  cleanupAllModals();

  // Ensure body is clickable
  document.body.style.pointerEvents = '';
  document.documentElement.style.pointerEvents = '';

  // Force reflow
  document.body.offsetHeight;
}

/**
 * Hook to monitor for modal cleanup issues
 */
export function useModalCleanupMonitor() {
  React.useEffect(() => {
    const checkForIssues = () => {
      if (checkForBlockingModals()) {
        console.warn('Modal cleanup issues detected, forcing cleanup...');
        forceModalCleanup();
      }
    };

<<<<<<< HEAD
    // Check periodically for cleanup issues
    const interval = setInterval(checkForIssues, 1000);
=======
    // Check periodically for cleanup issues - reduced frequency for lower CPU
    const interval = setInterval(checkForIssues, 10000); // Optimized: 10s (was 1s)
>>>>>>> ca51ac36

    // Check on page visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(checkForIssues, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}

/**
 * Emergency cleanup function that can be called from console
 */
export function emergencyModalCleanup() {
<<<<<<< HEAD
  console.log('🧹 Performing emergency modal cleanup...');
=======
  // console.log('🧹 Performing emergency modal cleanup...');
>>>>>>> ca51ac36
  
  // Remove all modal-related elements
  const modalSelectors = [
    '[data-radix-dialog-overlay]',
    '[data-radix-alert-dialog-overlay]',
    '[data-radix-dialog-content]',
    '[data-radix-alert-dialog-content]',
    '[data-candidate-modal-portal]',
    '[data-portal-container]',
    '.fixed[style*="z-index"]'
  ];

  modalSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  });

  // Reset body styles
  document.body.style.overflow = '';
  document.body.style.pointerEvents = '';
  document.documentElement.style.pointerEvents = '';

  // Force reflow
  document.body.offsetHeight;

<<<<<<< HEAD
  console.log('Emergency modal cleanup completed');
=======
  // console.log('Emergency modal cleanup completed');
>>>>>>> ca51ac36
}

// Make emergency cleanup available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).emergencyModalCleanup = emergencyModalCleanup;
  (window as any).cleanupAllModals = cleanupAllModals;
  (window as any).forceModalCleanup = forceModalCleanup;
}
