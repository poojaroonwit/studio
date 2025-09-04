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
  openedAt: number; // Timestamp when modal was opened
  stackOrder: number; // Order in the stack (0 = oldest, higher = newer)
}

class ModalManager {
  private modals: Map<string, ModalInstance> = new Map();
  private globalOverlay: HTMLElement | null = null;
  private nextZIndex = 50000; // Increased base z-index to ensure modals are visible
  private modalStack: string[] = []; // Stack to track opening order
  private baseZIndex = 50000; // Base z-index for the first modal

  /**
   * Register a new modal instance with dynamic z-index based on opening order
   */
  registerModal(id: string, type: ModalInstance['type']): number {
    try {
      // Safety check for undefined id
      if (!id || typeof id !== 'string') {
        console.warn('ModalManager.registerModal: Invalid id provided:', id);
        return this.baseZIndex; // Return default z-index
      }

      // If modal already exists, return its current z-index
      if (this.modals.has(id)) {
        return this.modals.get(id)!.zIndex;
      }

      // Add to stack and calculate z-index based on position
      this.modalStack.push(id);
      const stackOrder = this.modalStack.length - 1;
      const zIndex = this.baseZIndex + (stackOrder * 1000); // Each modal gets 1000 z-index units

      this.modals.set(id, {
        id,
        type,
        zIndex,
        openedAt: Date.now(),
        stackOrder,
      });

      console.log(`Modal registered: ${id} (${type}) with z-index ${zIndex}, stack order: ${stackOrder}`);
      this.updateGlobalOverlay();
      return zIndex;
    } catch (error) {
      console.warn('Error in ModalManager.registerModal:', error);
      return this.baseZIndex; // Return default z-index on error
    }
  }

  /**
   * Unregister a modal instance and update stack
   */
  unregisterModal(id: string): void {
    try {
      // Safety check for undefined id
      if (!id || typeof id !== 'string') {
        console.warn('ModalManager.unregisterModal: Invalid id provided:', id);
        return;
      }

      // Remove from stack
      const stackIndex = this.modalStack.indexOf(id);
      if (stackIndex !== -1) {
        this.modalStack.splice(stackIndex, 1);
      }

      // Remove from modals map
      this.modals.delete(id);

      console.log(`Modal unregistered: ${id}, remaining stack:`, this.modalStack);
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
    return modal?.zIndex || this.baseZIndex;
  }

  /**
   * Get the z-index for a modal's overlay
   */
  getOverlayZIndex(id: string): number {
    const modal = this.modals.get(id);
    return modal ? modal.zIndex - 1 : this.baseZIndex - 1;
  }

  /**
   * Get the current modal stack order
   */
  getModalStack(): string[] {
    return [...this.modalStack];
  }

  /**
   * Get the stack order of a specific modal
   */
  getModalStackOrder(id: string): number {
    return this.modalStack.indexOf(id);
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
    // DISABLED: Global overlay is causing modal visibility issues
    // Each modal should handle its own overlay
    this.removeGlobalOverlay();
    return;
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
    this.modalStack = [];
    this.removeGlobalOverlay();
    this.nextZIndex = this.baseZIndex;
  }

  /**
   * Get debug information about current modals
   */
  getDebugInfo(): { modals: ModalInstance[]; hasGlobalOverlay: boolean; stack: string[] } {
    return {
      modals: Array.from(this.modals.values()),
      hasGlobalOverlay: this.globalOverlay !== null,
      stack: [...this.modalStack],
    };
  }
}

// Global instance
export const modalManager = new ModalManager();

/**
 * Hook to manage modal registration
 */
export function useModalManager(id: string, type: ModalInstance['type']) {
  const [zIndex, setZIndex] = React.useState(50000);

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
      setZIndex(50000);
    }
  }, [id, type]);

  return {
    zIndex,
    overlayZIndex: zIndex - 1,
    hasOpenModals: modalManager.hasOpenModals(),
    stackOrder: modalManager.getModalStackOrder(id),
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

// Make emergency cleanup and debug functions available globally
if (typeof window !== 'undefined') {
  (window as any).emergencyModalCleanup = emergencyModalCleanup;
  (window as any).debugModalManager = () => {
    const debugInfo = modalManager.getDebugInfo();
    console.log('Modal Manager Debug Info:', debugInfo);
    console.log('Current modals:', Array.from(modalManager['modals'].entries()));
    console.log('Modal stack (opening order):', debugInfo.stack);
    console.log('Z-index hierarchy:');
    debugInfo.modals.forEach(modal => {
      console.log(`  ${modal.id} (${modal.type}): z-index ${modal.zIndex}, stack order ${modal.stackOrder}`);
    });
  };
}
