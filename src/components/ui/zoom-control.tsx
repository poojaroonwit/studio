"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZoomControlProps {
  className?: string;
  defaultZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
}

export function ZoomControl({ 
  className,
  defaultZoom = 0.9, // Changed default to 0.9 (90%)
  minZoom = 0.5,
  maxZoom = 1.5,
  step = 0.1
}: ZoomControlProps) {
  const [zoom, setZoom] = useState(defaultZoom);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Load saved zoom on mount and listen for keyboard zoom changes
  useEffect(() => {
    // Get the current zoom level from the DOM
    const getCurrentZoom = () => {
      if (window.getZoom) {
        const zoom = window.getZoom();
        console.log('Got zoom from window.getZoom():', zoom);
        return zoom;
      }
      const savedZoom = localStorage.getItem('app-zoom-level');
      const fallbackZoom = savedZoom ? parseFloat(savedZoom) : defaultZoom;
      console.log('Using fallback zoom:', fallbackZoom, 'savedZoom:', savedZoom);
      return fallbackZoom;
    };
    
    // Wait for the global zoom functions to be available
    const initializeZoom = () => {
      const initialZoom = getCurrentZoom();
      console.log('Initial zoom set to:', initialZoom);
      if (initialZoom >= minZoom && initialZoom <= maxZoom) {
        setZoom(initialZoom);
      }
    };
    
    // Try immediately
    initializeZoom();
    
    // If window.getZoom is not available, retry after a short delay
    if (!window.getZoom) {
      console.log('window.getZoom not available, retrying in 100ms...');
      setTimeout(initializeZoom, 100);
    }
    
    // Listen for zoom changes from keyboard shortcuts
    const handleZoomChange = (event: CustomEvent) => {
      if (event.detail && event.detail.zoom) {
        setZoom(event.detail.zoom);
      }
    };
    
    window.addEventListener('zoomChanged', handleZoomChange as EventListener);
    
    return () => {
      window.removeEventListener('zoomChanged', handleZoomChange as EventListener);
    };
  }, [minZoom, maxZoom, defaultZoom]);


  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + step, maxZoom);
    console.log('Zoom In clicked - Current zoom:', zoom, 'New zoom:', newZoom);
    setZoom(newZoom);
    // Use the global zoom function to sync with keyboard shortcuts
    if (window.setZoom) {
      console.log('Calling window.setZoom with:', newZoom);
      window.setZoom(newZoom);
    } else {
      console.warn('window.setZoom is not available');
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - step, minZoom);
    console.log('Zoom Out clicked - Current zoom:', zoom, 'New zoom:', newZoom);
    setZoom(newZoom);
    // Use the global zoom function to sync with keyboard shortcuts
    if (window.setZoom) {
      console.log('Calling window.setZoom with:', newZoom);
      window.setZoom(newZoom);
    } else {
      console.warn('window.setZoom is not available');
    }
  };

  const handleReset = () => {
    setZoom(defaultZoom);
    // Use the global zoom function to sync with keyboard shortcuts
    if (window.setZoom) {
      window.setZoom(defaultZoom);
    } else {
      console.warn('window.setZoom is not available');
    }
  };

  const handleSliderChange = (value: number[]) => {
    const newZoom = value[0];
    setZoom(newZoom);
    // Use the global zoom function to sync with keyboard shortcuts
    if (window.setZoom) {
      window.setZoom(newZoom);
    } else {
      console.warn('window.setZoom is not available');
    }
  };

  const toggleVisibility = () => {
    setIsVisible(prev => !prev);
    setIsMinimized(false);
  };

  const minimizeControl = () => {
    setIsMinimized(true);
    setIsVisible(false);
  };

  if (isMinimized) {
    console.log('ZoomControl: Component is minimized, not rendering');
    return null;
  }
  
  console.log('ZoomControl: Rendering component, zoom:', zoom, 'isVisible:', isVisible);

  // Test function to verify global zoom functions
  const testGlobalZoom = () => {
    console.log('=== ZOOM DEBUG TEST ===');
    console.log('window.setZoom exists:', typeof window.setZoom);
    console.log('window.getZoom exists:', typeof window.getZoom);
    console.log('Current DOM zoom style:', document.documentElement.style.zoom);
    console.log('Current DOM transform style:', document.documentElement.style.transform);
    console.log('Current localStorage zoom:', localStorage.getItem('app-zoom-level'));
    console.log('Document element:', document.documentElement);
    console.log('Document body:', document.body);
    
    // Test direct DOM manipulation
    console.log('Testing direct DOM manipulation...');
    document.documentElement.style.transform = 'scale(1.5)';
    document.documentElement.style.transformOrigin = 'top left';
    console.log('Direct transform applied:', document.documentElement.style.transform);
    
    if (window.setZoom) {
      console.log('Testing window.setZoom with 1.2...');
      window.setZoom(1.2);
      setTimeout(() => {
        console.log('After setZoom(1.2):');
        console.log('DOM zoom style:', document.documentElement.style.zoom);
        console.log('DOM transform style:', document.documentElement.style.transform);
        console.log('window.getZoom():', window.getZoom ? window.getZoom() : 'not available');
        
        // Test if the page actually looks different
        console.log('Page should now be zoomed to 120%');
      }, 100);
    } else {
      console.error('window.setZoom is not available!');
    }
  };

  return (
    <div className={cn("fixed bottom-4 right-4 z-50", className)}>
      <Button
        onClick={toggleVisibility}
        size="sm"
        variant="outline"
        className="mb-2 shadow-lg"
        title={`Toggle Zoom Controls - Current: ${Math.round(zoom * 100)}%`}
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      
      {/* Debug test button */}
      <Button
        onClick={testGlobalZoom}
        size="sm"
        variant="destructive"
        className="mb-2 shadow-lg"
        title="Test Global Zoom Functions"
      >
        TEST
      </Button>

      {isVisible && (
        <div className="bg-background border border-border rounded-lg p-4 shadow-lg min-w-[200px] mb-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Zoom: {Math.round(zoom * 100)}%</span>
              <div className="flex items-center gap-1">
                <Button
                  onClick={handleReset}
                  size="sm"
                  variant="ghost"
                  title="Reset to 90%"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
                <Button
                  onClick={minimizeControl}
                  size="sm"
                  variant="ghost"
                  title="Close"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Slider
                value={[zoom]}
                onValueChange={handleSliderChange}
                min={minZoom}
                max={maxZoom}
                step={step}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(minZoom * 100)}%</span>
                <span>{Math.round(maxZoom * 100)}%</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleZoomOut}
                size="sm"
                variant="outline"
                disabled={zoom <= minZoom}
                className="flex-1"
              >
                <ZoomOut className="w-3 h-3" />
              </Button>
              <Button
                onClick={handleZoomIn}
                size="sm"
                variant="outline"
                disabled={zoom >= maxZoom}
                className="flex-1"
              >
                <ZoomIn className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple hook for zoom control
export function useZoom() {
  const [zoom, setZoom] = useState(0.9); // Changed default to 0.9 (90%)
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get the current zoom level from the DOM
    const getCurrentZoom = () => {
      if (window.getZoom) {
        return window.getZoom();
      }
      const savedZoom = localStorage.getItem('app-zoom-level');
      return savedZoom ? parseFloat(savedZoom) : 0.9;
    };
    
    const initialZoom = getCurrentZoom();
    setZoom(initialZoom);
    setIsLoading(false);
    
    // Listen for zoom changes from keyboard shortcuts
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

  const setZoomLevel = (level: number) => {
    console.log('useZoom: setZoomLevel called with:', level);
    setZoom(level);
    // Use the global zoom function to sync with keyboard shortcuts
    if (window.setZoom) {
      console.log('useZoom: Calling window.setZoom with:', level);
      window.setZoom(level);
    } else {
      console.warn('useZoom: window.setZoom is not available');
    }
  };

  const resetZoom = () => {
    setZoomLevel(0.9); // Reset to 90% instead of 100%
  };

  return {
    zoom,
    setZoom: setZoomLevel,
    resetZoom,
    isLoading,
    isServerStorage: false,
  };
}
