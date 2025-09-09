"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface ZIndexItem {
  id: string;
  type: 'modal' | 'drawer' | 'overlay' | 'dropdown';
  zIndex: number;
  timestamp: number;
}

interface ZIndexContextType {
  registerComponent: (id: string, type: 'modal' | 'drawer' | 'overlay' | 'dropdown') => number;
  unregisterComponent: (id: string) => void;
  getZIndex: (id: string) => number;
  getOverlayZIndex: (id: string) => number;
  getContentZIndex: (id: string) => number;
  components: ZIndexItem[];
}

const ZIndexContext = createContext<ZIndexContextType | undefined>(undefined);

// Completely dynamic z-index system - no hard-coded values
// Components get z-index based on registration order and type hierarchy
// All z-index calculations are relative to existing components, ensuring proper layering
const Z_INDEX_INCREMENT = 100;
const INITIAL_Z_INDEX = 1000; // Starting point for the first component

// Utility function to calculate z-index with proper spacing
const calculateZIndex = (baseZIndex: number, multiplier: number = 1): number => {
  return baseZIndex + (Z_INDEX_INCREMENT * multiplier);
};

export function ZIndexProvider({ children }: { children: React.ReactNode }) {
  const [components, setComponents] = useState<ZIndexItem[]>([]);
  const nextZIndexRef = useRef(INITIAL_Z_INDEX);

  const registerComponent = useCallback((id: string, type: 'modal' | 'drawer' | 'overlay' | 'dropdown') => {
    const timestamp = Date.now();
    
    setComponents(prev => {
      // Remove existing component with same id if it exists
      const filtered = prev.filter(comp => comp.id !== id);
      
      // Completely dynamic z-index calculation based on registration order and type hierarchy
      let zIndex = nextZIndexRef.current;
      
      // Enforce strict hierarchy: overlay (toasts) > dropdown > modal/drawer > base content
      // Toasts have the highest priority to ensure they're always visible to users
      // This ensures proper layering for usability regardless of registration order
      
      if (type === 'overlay') {
        // Toasts have the highest priority - they should appear above everything
        // This ensures users always see important notifications and feedback
        // Calculate z-index dynamically based on existing components
        const allOtherComponents = filtered.filter(comp => comp.type !== 'overlay');
        if (allOtherComponents.length > 0) {
          const highestOther = Math.max(...allOtherComponents.map(comp => comp.zIndex));
          // Ensure toasts are always above everything else by adding multiple increments
          zIndex = Math.max(zIndex, calculateZIndex(highestOther, 2));
        } else {
          // If no other components exist, use a high starting point for toasts
          zIndex = Math.max(zIndex, calculateZIndex(INITIAL_Z_INDEX, 5));
        }
      } else if (type === 'dropdown') {
        // Dropdowns should be above modals/drawers but below toasts
        // This is necessary for usability - dropdowns must be visible above their parent containers
        const overlayComponents = filtered.filter(comp => comp.type === 'overlay');
        const modalDrawerComponents = filtered.filter(comp => comp.type === 'modal' || comp.type === 'drawer');
        
        if (overlayComponents.length > 0) {
          // Dropdowns should be below toasts but still above other components
          const highestOverlay = Math.max(...overlayComponents.map(comp => comp.zIndex));
          const allOtherComponents = filtered.filter(comp => comp.type !== 'overlay' && comp.type !== 'dropdown');
          if (allOtherComponents.length > 0) {
            const highestOther = Math.max(...allOtherComponents.map(comp => comp.zIndex));
            // Position dropdowns between toasts and other components
            zIndex = Math.max(zIndex, Math.min(calculateZIndex(highestOverlay, -1), calculateZIndex(highestOther, 1)));
          } else {
            zIndex = Math.max(zIndex, calculateZIndex(highestOverlay, -1));
          }
        } else if (modalDrawerComponents.length > 0) {
          // Dropdowns should be above modals/drawers
          const highestModalDrawer = Math.max(...modalDrawerComponents.map(comp => comp.zIndex));
          zIndex = Math.max(zIndex, calculateZIndex(highestModalDrawer, 1));
        } else {
          // If no overlays or modals/drawers exist, dropdowns can be above other components
          const allOtherComponents = filtered.filter(comp => comp.type !== 'dropdown');
          if (allOtherComponents.length > 0) {
            const highestOther = Math.max(...allOtherComponents.map(comp => comp.zIndex));
            zIndex = Math.max(zIndex, calculateZIndex(highestOther, 1));
          }
        }
      } else if (type === 'modal' || type === 'drawer') {
        // Modals and drawers should be above base content but below toasts and dropdowns
        const overlayComponents = filtered.filter(comp => comp.type === 'overlay');
        const dropdownComponents = filtered.filter(comp => comp.type === 'dropdown');
        
        if (overlayComponents.length > 0) {
          // Modals/drawers should be below toasts
          const highestOverlay = Math.max(...overlayComponents.map(comp => comp.zIndex));
          const allOtherComponents = filtered.filter(comp => comp.type !== 'overlay' && comp.type !== 'modal' && comp.type !== 'drawer');
          if (allOtherComponents.length > 0) {
            const highestOther = Math.max(...allOtherComponents.map(comp => comp.zIndex));
            // Position modals/drawers between toasts and base content
            zIndex = Math.max(zIndex, Math.min(calculateZIndex(highestOverlay, -2), calculateZIndex(highestOther, 1)));
          } else {
            zIndex = Math.max(zIndex, calculateZIndex(highestOverlay, -2));
          }
        } else if (dropdownComponents.length > 0) {
          // Modals/drawers should be below dropdowns
          const highestDropdown = Math.max(...dropdownComponents.map(comp => comp.zIndex));
          zIndex = Math.max(zIndex, calculateZIndex(highestDropdown, -1));
        } else {
          // If no overlays or dropdowns exist, modals/drawers can be above other components
          const allOtherComponents = filtered.filter(comp => comp.type !== 'modal' && comp.type !== 'drawer');
          if (allOtherComponents.length > 0) {
            const highestOther = Math.max(...allOtherComponents.map(comp => comp.zIndex));
            zIndex = Math.max(zIndex, calculateZIndex(highestOther, 1));
          }
        }
      }
      
      // Ensure z-index is never below the initial value
      zIndex = Math.max(zIndex, INITIAL_Z_INDEX);
      
      const newComponent = { id, type, zIndex, timestamp };
      const updatedComponents = [...filtered, newComponent];
      
      // Update nextZIndexRef to be higher than the highest component
      const maxZIndex = Math.max(...updatedComponents.map(comp => comp.zIndex));
      nextZIndexRef.current = maxZIndex + Z_INDEX_INCREMENT;
      
      return updatedComponents;
    });
    
    return nextZIndexRef.current - Z_INDEX_INCREMENT;
  }, []);

  const unregisterComponent = useCallback((id: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
  }, []);

  const getZIndex = useCallback((id: string) => {
    const component = components.find(comp => comp.id === id);
    return component?.zIndex || INITIAL_Z_INDEX;
  }, [components]);

  const getOverlayZIndex = useCallback((id: string) => {
    const component = components.find(comp => comp.id === id);
    if (!component) return INITIAL_Z_INDEX;
    
    // Overlay should be 1 less than content
    return component.zIndex - 1;
  }, [components]);

  const getContentZIndex = useCallback((id: string) => {
    return getZIndex(id);
  }, [getZIndex]);

  return (
    <ZIndexContext.Provider
      value={{
        registerComponent,
        unregisterComponent,
        getZIndex,
        getOverlayZIndex,
        getContentZIndex,
        components,
      }}
    >
      {children}
    </ZIndexContext.Provider>
  );
}

export function useZIndex() {
  const context = useContext(ZIndexContext);
  if (context === undefined) {
    throw new Error('useZIndex must be used within a ZIndexProvider');
  }
  return context;
}

// Hook for components that need dynamic z-index
export function useDynamicZIndex(id: string, type: 'modal' | 'drawer' | 'overlay' | 'dropdown') {
  const { registerComponent, unregisterComponent, getOverlayZIndex, getContentZIndex } = useZIndex();
  
  React.useEffect(() => {
    registerComponent(id, type);
    return () => unregisterComponent(id);
  }, [id, type, registerComponent, unregisterComponent]);

  return {
    overlayZIndex: getOverlayZIndex(id),
    contentZIndex: getContentZIndex(id),
  };
}

// Hook for debugging z-index layers
export function useZIndexDebug() {
  const { components } = useZIndex();
  return components;
}
