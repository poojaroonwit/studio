/**
 * Utility functions for handling zoom-aware positioning
 * 
 * When CSS zoom is applied to the document element, it affects the coordinate system
 * for positioning calculations. These utilities help compensate for zoom effects
 * in dropdown and popover components.
 */

/**
 * Get the current zoom level from the application
 * @returns The current zoom level (default: 0.9)
 */
export function getCurrentZoomLevel(): number {
  if (typeof window !== 'undefined' && window.getZoom) {
    return window.getZoom();
  }
  const savedZoom = localStorage.getItem('app-zoom-level');
  return savedZoom ? parseFloat(savedZoom) : 0.9;
}

/**
 * Adjust a side offset value to compensate for zoom level
 * @param sideOffset The original side offset value
 * @returns The adjusted side offset value
 */
export function adjustSideOffsetForZoom(sideOffset: number): number {
  const zoomLevel = getCurrentZoomLevel();
  return sideOffset / zoomLevel;
}

/**
 * Adjust a transform value to compensate for zoom level
 * @param transformValue The original transform value
 * @returns The adjusted transform value
 */
export function adjustTransformForZoom(transformValue: number): number {
  const zoomLevel = getCurrentZoomLevel();
  return transformValue / zoomLevel;
}

/**
 * Check if the current zoom level is different from the default
 * @returns True if zoom is not at default level (0.9)
 */
export function isZoomed(): boolean {
  return getCurrentZoomLevel() !== 0.9;
}

/**
 * Get zoom-aware positioning props for Radix UI components
 * @param sideOffset The original side offset
 * @returns Object with adjusted positioning props
 */
export function getZoomAwarePositioningProps(sideOffset: number = 4) {
  return {
    sideOffset: adjustSideOffsetForZoom(sideOffset),
  };
}
