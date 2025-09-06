"use client"

import { useState, useEffect } from 'react';

/**
 * Custom hook that provides zoom level awareness for portal components
 * This fixes the issue where Radix UI portals don't inherit CSS zoom transforms
 */
export function useZoomAwarePortal() {
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    // Get current zoom level
    const getZoomLevel = () => {
      if (window.getZoom) {
        return window.getZoom();
      }
      const savedZoom = localStorage.getItem('app-zoom-level');
      return savedZoom ? parseFloat(savedZoom) : 0.9;
    };

    const updateZoomLevel = () => {
      setZoomLevel(getZoomLevel());
    };

    // Initial zoom level
    updateZoomLevel();

    // Listen for zoom changes
    const handleZoomChange = () => {
      updateZoomLevel();
    };

    window.addEventListener('zoomChanged', handleZoomChange);
    
    return () => {
      window.removeEventListener('zoomChanged', handleZoomChange);
    };
  }, []);

  return {
    zoomLevel,
    portalStyle: {
      transform: `scale(${zoomLevel})`,
      transformOrigin: 'top left'
    }
  };
}
