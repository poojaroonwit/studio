"use client";

import { useEffect, useState } from 'react';

export function useZoomAwarePositioning() {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    // Get current zoom level
    const getCurrentZoom = () => {
      if (window.getZoom) {
        return window.getZoom();
      }
      const savedZoom = localStorage.getItem('app-zoom-level');
      return savedZoom ? parseFloat(savedZoom) : 0.9;
    };

    const currentZoom = getCurrentZoom();
    setZoom(currentZoom);

    // Listen for zoom changes
    const handleZoomChange = (event: CustomEvent) => {
      if (event.detail && event.detail.zoom) {
        setZoom(event.detail.zoom);
      }
    };

    window.addEventListener('zoomChanged', handleZoomChange as EventListener);

    return () => {
      window.removeEventListener('zoomChanged', handleZoomChange as EventListener);
    };
  }, []);

  return {
    zoom,
    // Simple compensation: when zoomed out, reduce the offset
    sideOffset: 4 / zoom,
    alignOffset: 0,
  };
}
