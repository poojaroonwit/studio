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

// Advanced dynamic z-index system for complex stacking scenarios
// 1. Toasts (overlay) have absolute priority - they ALWAYS appear on top
// 2. All other components follow "most recent on top" approach
// 3. Handles complex scenarios: overlay -> drawer -> overlay -> modal -> toast
// 4. All z-index calculations are relative to existing components
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
      
      // New approach: Handle complex stacking scenarios
      // 1. Toasts (overlay) ALWAYS go on top - they have absolute priority
      // 2. All other components follow a "most recent on top" approach
      // 3. This handles scenarios like: overlay -> drawer -> overlay -> modal -> toast
      
      let zIndex: number;
      
      if (type === 'overlay') {
        // Toasts have absolute priority - they ALWAYS go on top
        // This ensures users always see important notifications regardless of the stack
        if (filtered.length > 0) {
          const highestExisting = Math.max(...filtered.map(comp => comp.zIndex));
          // Toasts get a significant boost to ensure they're always visible
          zIndex = calculateZIndex(highestExisting, 3);
        } else {
          // If no other components exist, use a high starting point for toasts
          zIndex = calculateZIndex(INITIAL_Z_INDEX, 5);
        }
      } else {
        // For non-toast components, use a "most recent on top" approach
        // This handles complex nesting scenarios naturally
        if (filtered.length > 0) {
          const highestExisting = Math.max(...filtered.map(comp => comp.zIndex));
          // Each new component goes on top of the previous highest
          zIndex = calculateZIndex(highestExisting, 1);
        } else {
          // First component starts at the initial z-index
          zIndex = INITIAL_Z_INDEX;
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

  // Use useMemo to ensure z-index values are reactive to components state changes
  const overlayZIndex = React.useMemo(() => getOverlayZIndex(id), [getOverlayZIndex, id]);
  const contentZIndex = React.useMemo(() => getContentZIndex(id), [getContentZIndex, id]);

  return {
    overlayZIndex,
    contentZIndex,
  };
}

// Hook for debugging z-index layers
export function useZIndexDebug() {
  const { components } = useZIndex();
  return components;
}
