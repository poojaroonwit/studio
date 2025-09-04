/**
 * Dynamic Z-Index Management System
 * 
 * This system tracks the sequence of modal/drawer openings and assigns
 * appropriate z-index values based on the order they were opened.
 * This ensures that the most recently opened modal/drawer always appears on top.
 */

export type ModalType = 'dialog' | 'sheet' | 'alert-dialog' | 'custom-modal';

export interface ModalInstance {
  id: string;
  type: ModalType;
  overlayZIndex: number;
  contentZIndex: number;
  openedAt: number;
}

class ZIndexManager {
  private static instance: ZIndexManager;
  private modalStack: ModalInstance[] = [];
  private baseZIndex = 10000;
  private zIndexIncrement = 100;

  private constructor() {}

  public static getInstance(): ZIndexManager {
    if (!ZIndexManager.instance) {
      ZIndexManager.instance = new ZIndexManager();
    }
    return ZIndexManager.instance;
  }

  /**
   * Register a new modal/drawer and get its z-index values
   */
  public registerModal(id: string, type: ModalType): { overlayZIndex: number; contentZIndex: number } {
    try {
      // Validate inputs
      if (!id || typeof id !== 'string') {
        console.warn('[ZIndexManager] Invalid modal ID provided:', id);
        return { overlayZIndex: this.baseZIndex, contentZIndex: this.baseZIndex + 1 };
      }

      if (!type || !['dialog', 'sheet', 'alert-dialog', 'custom-modal'].includes(type)) {
        console.warn('[ZIndexManager] Invalid modal type provided:', type);
        return { overlayZIndex: this.baseZIndex, contentZIndex: this.baseZIndex + 1 };
      }

      // Remove any existing modal with the same ID
      this.unregisterModal(id);

      const overlayZIndex = this.baseZIndex + (this.modalStack.length * this.zIndexIncrement);
      const contentZIndex = overlayZIndex + 1;

      const modalInstance: ModalInstance = {
        id,
        type,
        overlayZIndex,
        contentZIndex,
        openedAt: Date.now()
      };

      this.modalStack.push(modalInstance);
      
      console.log(`[ZIndexManager] Registered ${type} modal "${id}" with z-index ${overlayZIndex}/${contentZIndex}`);
      console.log(`[ZIndexManager] Current stack:`, this.modalStack.map(m => `${m.type}:${m.id}(${m.overlayZIndex})`));

      return { overlayZIndex, contentZIndex };
    } catch (error) {
      console.error('[ZIndexManager] Error registering modal:', error);
      return { overlayZIndex: this.baseZIndex, contentZIndex: this.baseZIndex + 1 };
    }
  }

  /**
   * Unregister a modal/drawer when it's closed
   */
  public unregisterModal(id: string): void {
    try {
      if (!id || typeof id !== 'string') {
        console.warn('[ZIndexManager] Invalid modal ID provided for unregister:', id);
        return;
      }

      const index = this.modalStack.findIndex(modal => modal.id === id);
      if (index !== -1) {
        const removed = this.modalStack.splice(index, 1)[0];
        console.log(`[ZIndexManager] Unregistered ${removed.type} modal "${id}"`);
        console.log(`[ZIndexManager] Current stack:`, this.modalStack.map(m => `${m.type}:${m.id}(${m.overlayZIndex})`));
      }
    } catch (error) {
      console.error('[ZIndexManager] Error unregistering modal:', error);
    }
  }

  /**
   * Get the current z-index values for a modal (useful for dynamic updates)
   */
  public getModalZIndex(id: string): { overlayZIndex: number; contentZIndex: number } | null {
    const modal = this.modalStack.find(m => m.id === id);
    if (modal) {
      return { overlayZIndex: modal.overlayZIndex, contentZIndex: modal.contentZIndex };
    }
    return null;
  }

  /**
   * Bring a modal to the front (useful for focus management)
   */
  public bringToFront(id: string): { overlayZIndex: number; contentZIndex: number } | null {
    const modalIndex = this.modalStack.findIndex(modal => modal.id === id);
    if (modalIndex === -1) return null;

    // Move the modal to the end of the stack (top)
    const modal = this.modalStack.splice(modalIndex, 1)[0];
    this.modalStack.push(modal);

    // Recalculate z-index values for all modals
    this.modalStack.forEach((modal, index) => {
      modal.overlayZIndex = this.baseZIndex + (index * this.zIndexIncrement);
      modal.contentZIndex = modal.overlayZIndex + 1;
    });

    console.log(`[ZIndexManager] Brought ${modal.type} modal "${id}" to front`);
    console.log(`[ZIndexManager] Current stack:`, this.modalStack.map(m => `${m.type}:${m.id}(${m.overlayZIndex})`));

    return { overlayZIndex: modal.overlayZIndex, contentZIndex: modal.contentZIndex };
  }

  /**
   * Get the current modal stack (for debugging)
   */
  public getStack(): ModalInstance[] {
    return [...this.modalStack];
  }

  /**
   * Clear all modals (useful for cleanup)
   */
  public clearAll(): void {
    console.log(`[ZIndexManager] Clearing all modals (${this.modalStack.length} items)`);
    this.modalStack = [];
  }

  /**
   * Generate a unique ID for a modal
   */
  public generateId(type: ModalType): string {
    return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const zIndexManager = ZIndexManager.getInstance();

// React hook for using the z-index manager
export function useZIndexManager() {
  return zIndexManager;
}

// Utility function to create CSS z-index styles
export function createZIndexStyles(overlayZIndex: number, contentZIndex: number) {
  return {
    overlay: { zIndex: overlayZIndex },
    content: { zIndex: contentZIndex }
  };
}
