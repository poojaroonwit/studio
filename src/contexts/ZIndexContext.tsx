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
    setComponents(prev => {
      // Check if component already exists with same properties to avoid unnecessary updates
      const existing = prev.find(comp => comp.id === id);
      if (existing && existing.type === type) {
        return prev;
      }
      
      const timestamp = Date.now();
      const filtered = prev.filter(comp => comp.id !== id);
      
      let zIndex: number;
      if (type === 'overlay') {
        if (filtered.length > 0) {
          const highestExisting = Math.max(...filtered.map(comp => comp.zIndex));
          zIndex = calculateZIndex(highestExisting, 3);
        } else {
          zIndex = calculateZIndex(INITIAL_Z_INDEX, 5);
        }
      } else {
        if (filtered.length > 0) {
          const highestExisting = Math.max(...filtered.map(comp => comp.zIndex));
          zIndex = calculateZIndex(highestExisting, 1);
        } else {
          zIndex = INITIAL_Z_INDEX;
        }
      }
      
      zIndex = Math.max(zIndex, INITIAL_Z_INDEX);
      
      const newComponent = { id, type, zIndex, timestamp };
      return [...filtered, newComponent];
    });
    
    // We can't return the exact z-index synchronously here because it's calculated in the next state update.
    // However, getDynamicZIndex hook will update the component value via useMemo when the state changes.
    // For synchronous return (if needed), we might need a more complex approach but current hooks use state updates.
    return INITIAL_Z_INDEX; 
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
