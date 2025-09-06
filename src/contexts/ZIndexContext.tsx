"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface ZIndexItem {
  id: string;
  type: 'modal' | 'drawer' | 'overlay';
  zIndex: number;
  timestamp: number;
}

interface ZIndexContextType {
  registerComponent: (id: string, type: 'modal' | 'drawer' | 'overlay') => number;
  unregisterComponent: (id: string) => void;
  getZIndex: (id: string) => number;
  getOverlayZIndex: (id: string) => number;
  getContentZIndex: (id: string) => number;
  components: ZIndexItem[];
}

const ZIndexContext = createContext<ZIndexContextType | undefined>(undefined);

// Base z-index values - increased to ensure they're higher than any hardcoded values
const BASE_Z_INDEX = {
  overlay: 100000,
  content: 100001,
  modal: 100002,
  drawer: 100003,
};

// Increment for each new component
const Z_INDEX_INCREMENT = 100;

export function ZIndexProvider({ children }: { children: React.ReactNode }) {
  const [components, setComponents] = useState<ZIndexItem[]>([]);
  const nextZIndexRef = useRef(BASE_Z_INDEX.content);

  const registerComponent = useCallback((id: string, type: 'modal' | 'drawer' | 'overlay') => {
    const timestamp = Date.now();
    const zIndex = nextZIndexRef.current;
    
    setComponents(prev => {
      // Remove existing component with same id if it exists
      const filtered = prev.filter(comp => comp.id !== id);
      return [...filtered, { id, type, zIndex, timestamp }];
    });
    
    // Increment for next component
    nextZIndexRef.current += Z_INDEX_INCREMENT;
    return zIndex;
  }, []);

  const unregisterComponent = useCallback((id: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
  }, []);

  const getZIndex = useCallback((id: string) => {
    const component = components.find(comp => comp.id === id);
    return component?.zIndex || BASE_Z_INDEX.content;
  }, [components]);

  const getOverlayZIndex = useCallback((id: string) => {
    const component = components.find(comp => comp.id === id);
    if (!component) return BASE_Z_INDEX.overlay;
    
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
export function useDynamicZIndex(id: string, type: 'modal' | 'drawer' | 'overlay') {
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
