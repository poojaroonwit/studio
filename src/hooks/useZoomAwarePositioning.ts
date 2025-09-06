"use client";

import { useEffect, useState } from 'react';

interface ZoomAwarePositioningOptions {
  zoom?: number;
  sideOffset?: number;
  alignOffset?: number;
}

export function useZoomAwarePositioning(options: ZoomAwarePositioningOptions = {}) {
  const [zoom, setZoom] = useState(options.zoom || 0.9);
  const [sideOffset, setSideOffset] = useState(options.sideOffset || 4);
  const [alignOffset, setAlignOffset] = useState(options.alignOffset || 0);

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

  // Calculate zoom-compensated offsets
  const getZoomCompensatedSideOffset = () => {
    // When zoomed out, we need to increase the offset to maintain visual distance
    return sideOffset / zoom;
  };

  const getZoomCompensatedAlignOffset = () => {
    // When zoomed out, we need to increase the offset to maintain visual distance
    return alignOffset / zoom;
  };

  return {
    zoom,
    sideOffset: getZoomCompensatedSideOffset(),
    alignOffset: getZoomCompensatedAlignOffset(),
    originalSideOffset: sideOffset,
    originalAlignOffset: alignOffset,
  };
}
