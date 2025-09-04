import * as React from 'react';

/**
 * Modal Manager - Handles overlay stacking for nested modals
 * Prevents the "modal -> overlay -> modal -> overlay -> page" stacking issue
 */

interface ModalInstance {
  id: string;
  type: 'dialog' | 'alert-dialog' | 'sheet' | 'custom';
  zIndex: number;
  overlayElement?: HTMLElement;
  contentElement?: HTMLElement;
}

class ModalManager {
  private modals: Map<string, ModalInstance> = new Map();
  private globalOverlay: HTMLElement | null = null;
  private nextZIndex = 10000;

  /**
   * Register a new modal instance
   */
  registerModal(id: string, type: ModalInstance['type']): number {
    try {
      // Safety check for undefined id
      if (!id || typeof id !== 'string') {
        console.warn('ModalManager.registerModal: Invalid id provided:', id);
        return 10000; // Return default z-index
      }

      const zIndex = this.nextZIndex;
      this.nextZIndex += 100; // Increment by 100 to leave room for overlays

      this.modals.set(id, {
        id,
        type,
        zIndex,
      });

      this.updateGlobalOverlay();
      return zIndex;
    } catch (error) {
      console.warn('Error in ModalManager.registerModal:', error);
      return 10000; // Return default z-index on error
    }
  }

  /**
   * Unregister a modal instance
   */
  unregisterModal(id: string): void {
    try {
      // Safety check for undefined id
      if (!id || typeof id !== 'string') {
        console.warn('ModalManager.unregisterModal: Invalid id provided:', id);
        return;
      }

      this.modals.delete(id);
      this.updateGlobalOverlay();
    } catch (error) {
      console.warn('Error in ModalManager.unregisterModal:', error);
    }
  }

  /**
   * Get the z-index for a modal
   */
  getModalZIndex(id: string): number {
    const modal = this.modals.get(id);
    return modal?.zIndex || 10000;
  }

  /**
   * Get the z-index for a modal's overlay
   */
  getOverlayZIndex(id: string): number {
    const modal = this.modals.get(id);
    return modal ? modal.zIndex - 1 : 9999;
  }

  /**
   * Check if there are any open modals
   */
  hasOpenModals(): boolean {
    return this.modals.size > 0;
  }

  /**
   * Get the highest z-index currently in use
   */
  getHighestZIndex(): number {
    if (this.modals.size === 0) return 0;
    return Math.max(...Array.from(this.modals.values()).map(m => m.zIndex));
  }

  /**
   * Create or update the global overlay
   */
  private updateGlobalOverlay(): void {
    if (this.modals.size === 0) {
      this.removeGlobalOverlay();
      return;
    }

    if (!this.globalOverlay) {
      this.createGlobalOverlay();
    }

    if (this.globalOverlay) {
      // Set z-index to be just below the lowest modal
      const lowestModalZIndex = Math.min(...Array.from(this.modals.values()).map(m => m.zIndex));
      this.globalOverlay.style.zIndex = (lowestModalZIndex - 1).toString();
    }
  }

  /**
   * Create the global overlay element
   */
  private createGlobalOverlay(): void {
    this.globalOverlay = document.createElement('div');
    this.globalOverlay.className = 'fixed inset-0 bg-black/20 backdrop-blur-sm';
    this.globalOverlay.setAttribute('data-modal-manager-overlay', 'true');
    this.globalOverlay.style.pointerEvents = 'auto';
    
    document.body.appendChild(this.globalOverlay);
    
    // Prevent body scroll when overlay is present
    document.body.style.overflow = 'hidden';
  }

  /**
   * Remove the global overlay
   */
  private removeGlobalOverlay(): void {
    if (this.globalOverlay && this.globalOverlay.parentNode) {
      this.globalOverlay.parentNode.removeChild(this.globalOverlay);
      this.globalOverlay = null;
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Force cleanup of all modals and overlays
   */
  cleanup(): void {
    this.modals.clear();
    this.removeGlobalOverlay();
    this.nextZIndex = 10000;
  }

  /**
   * Get debug information about current modals
   */
  getDebugInfo(): { modals: ModalInstance[]; hasGlobalOverlay: boolean } {
    return {
      modals: Array.from(this.modals.values()),
      hasGlobalOverlay: this.globalOverlay !== null,
    };
  }
}

// Global instance
export const modalManager = new ModalManager();

/**
 * Hook to manage modal registration
 */
export function useModalManager(id: string, type: ModalInstance['type']) {
  const [zIndex, setZIndex] = React.useState(10000);

  React.useEffect(() => {
    try {
      // Safety check for undefined id
      if (!id || typeof id !== 'string') {
        console.warn('useModalManager: Invalid id provided:', id);
        return;
      }

      const modalZIndex = modalManager.registerModal(id, type);
      setZIndex(modalZIndex);

      return () => {
        try {
          modalManager.unregisterModal(id);
        } catch (error) {
          console.warn('Error unregistering modal:', error);
        }
      };
    } catch (error) {
      console.warn('Error in useModalManager:', error);
      // Fallback to default z-index
      setZIndex(10000);
    }
  }, [id, type]);

  return {
    zIndex,
    overlayZIndex: zIndex - 1,
    hasOpenModals: modalManager.hasOpenModals(),
  };
}

/**
 * Hook to get modal manager state
 */
export function useModalManagerState() {
  const [state, setState] = React.useState(() => modalManager.getDebugInfo());

  React.useEffect(() => {
    const updateState = () => {
      setState(modalManager.getDebugInfo());
    };

    // Update state every 100ms to catch modal changes
    const interval = setInterval(updateState, 100);
    return () => clearInterval(interval);
  }, []);

  return state;
}

/**
 * Emergency cleanup function
 */
export function emergencyModalCleanup() {
  console.log('🧹 Performing emergency modal cleanup...');
  modalManager.cleanup();
  
  // Also clean up any remaining Radix overlays
  const radixOverlays = document.querySelectorAll('[data-radix-dialog-overlay], [data-radix-alert-dialog-overlay]');
  radixOverlays.forEach(overlay => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  });

  console.log('✅ Emergency modal cleanup completed');
}

// Make emergency cleanup available globally
if (typeof window !== 'undefined') {
  (window as any).emergencyModalCleanup = emergencyModalCleanup;
}
