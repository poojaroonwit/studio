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
const Z_INDEX_INCREMENT = 100;
const INITIAL_Z_INDEX = 1000; // Starting point for the first component

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
      
      // Enforce strict hierarchy: dropdown > overlay (toasts) > modal/drawer > base content
      // This ensures proper layering for usability regardless of registration order
      // Toasts appear above modals/drawers for better user experience
      
      if (type === 'dropdown') {
        // Dropdowns should always be above all other components to be visible
        // This is necessary for usability - dropdowns must be visible above their parent containers
        const allOtherComponents = filtered.filter(comp => comp.type !== 'dropdown');
        if (allOtherComponents.length > 0) {
          const highestOther = Math.max(...allOtherComponents.map(comp => comp.zIndex));
          zIndex = Math.max(zIndex, highestOther + Z_INDEX_INCREMENT);
        }
      } else if (type === 'modal' || type === 'drawer') {
        // Modals and drawers should be above base content but below toasts
        // This allows toasts to appear above modals/drawers for better UX
        const allOtherComponents = filtered.filter(comp => comp.type !== 'modal' && comp.type !== 'drawer');
        if (allOtherComponents.length > 0) {
          const highestOther = Math.max(...allOtherComponents.map(comp => comp.zIndex));
          // Ensure modals/drawers are above base content but below toasts
          zIndex = Math.max(zIndex, highestOther - Z_INDEX_INCREMENT);
        }
      } else if (type === 'overlay') {
        // Overlays (toasts, loading indicators) should be above base content
        // For better UX, toasts should appear above modals/drawers so users can see notifications
        const modalDrawerComponents = filtered.filter(comp => comp.type === 'modal' || comp.type === 'drawer');
        
        if (modalDrawerComponents.length > 0) {
          // Toasts should appear above modals/drawers for better user experience
          const highestModalDrawer = Math.max(...modalDrawerComponents.map(comp => comp.zIndex));
          zIndex = Math.max(zIndex, highestModalDrawer + Z_INDEX_INCREMENT);
        } else {
          // If no modals/drawers exist, overlays can be above other components
          const allOtherComponents = filtered.filter(comp => comp.type !== 'overlay');
          if (allOtherComponents.length > 0) {
            const highestOther = Math.max(...allOtherComponents.map(comp => comp.zIndex));
            zIndex = Math.max(zIndex, highestOther + Z_INDEX_INCREMENT);
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
