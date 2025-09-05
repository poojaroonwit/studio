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
    console.log('=== HANDLE SLIDER CHANGE DEBUG ===');
    console.log('Slider changed to:', newZoom, 'value array:', value);
    console.log('Current zoom state:', zoom);
    console.log('window.setZoom exists:', typeof window.setZoom);
    console.log('DOM transform before setZoom:', document.documentElement.style.transform);
    
    setZoom(newZoom);
    // Use the global zoom function to sync with keyboard shortcuts
    if (window.setZoom) {
      console.log('Calling window.setZoom with slider value:', newZoom);
      window.setZoom(newZoom);
      
      // Check if it actually changed
      setTimeout(() => {
        console.log('DOM transform after setZoom:', document.documentElement.style.transform);
        const computedStyle = window.getComputedStyle(document.documentElement);
        console.log('Computed transform after setZoom:', computedStyle.transform);
        console.log('Page should now be at', Math.round(newZoom * 100) + '%');
      }, 100);
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
  
  console.log('ZoomControl: Rendering component, zoom:', zoom, 'isVisible:', isVisible, 'isMinimized:', isMinimized);

  // Test function to verify global zoom functions
  const testGlobalZoom = () => {
    console.log('=== COMPREHENSIVE ZOOM DEBUG TEST ===');
    console.log('Browser:', navigator.userAgent);
    console.log('window.setZoom exists:', typeof window.setZoom);
    console.log('window.getZoom exists:', typeof window.getZoom);
    console.log('Current DOM zoom style:', document.documentElement.style.zoom);
    console.log('Current DOM transform style:', document.documentElement.style.transform);
    console.log('Current localStorage zoom:', localStorage.getItem('app-zoom-level'));
    
    // Check computed styles
    const computedStyle = window.getComputedStyle(document.documentElement);
    console.log('Computed transform:', computedStyle.transform);
    console.log('Computed zoom:', computedStyle.zoom);
    
    // Check for CSS conflicts
    console.log('=== CSS CONFLICT CHECK ===');
    console.log('Body overflow:', window.getComputedStyle(document.body).overflow);
    console.log('Body width:', window.getComputedStyle(document.body).width);
    console.log('Body height:', window.getComputedStyle(document.body).height);
    console.log('HTML overflow:', window.getComputedStyle(document.documentElement).overflow);
    console.log('HTML width:', window.getComputedStyle(document.documentElement).width);
    console.log('HTML height:', window.getComputedStyle(document.documentElement).height);
    
    // Test multiple zoom methods
    console.log('=== TESTING MULTIPLE ZOOM METHODS ===');
    
    // Method 1: Direct transform on html
    console.log('Method 1: Direct transform on html');
    document.documentElement.style.transform = 'scale(1.5)';
    document.documentElement.style.transformOrigin = 'top left';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.width = '100vw';
    document.documentElement.style.height = '100vh';
    console.log('HTML transform applied:', document.documentElement.style.transform);
    
    setTimeout(() => {
      const htmlStyle = window.getComputedStyle(document.documentElement);
      console.log('HTML computed transform:', htmlStyle.transform);
      console.log('HTML computed width:', htmlStyle.width);
      console.log('HTML computed height:', htmlStyle.height);
    }, 100);
    
    // Method 2: Transform on body
    setTimeout(() => {
      console.log('Method 2: Transform on body');
      document.body.style.transform = 'scale(1.3)';
      document.body.style.transformOrigin = 'top left';
      document.body.style.overflow = 'hidden';
      console.log('Body transform applied:', document.body.style.transform);
      
      setTimeout(() => {
        const bodyStyle = window.getComputedStyle(document.body);
        console.log('Body computed transform:', bodyStyle.transform);
        console.log('Body computed width:', bodyStyle.width);
        console.log('Body computed height:', bodyStyle.height);
      }, 100);
    }, 200);
    
    // Method 3: Transform on #__next
    setTimeout(() => {
      console.log('Method 3: Transform on #__next');
      const nextElement = document.getElementById('__next');
      if (nextElement) {
        nextElement.style.transform = 'scale(1.2)';
        nextElement.style.transformOrigin = 'top left';
        console.log('#__next transform applied:', nextElement.style.transform);
        
        setTimeout(() => {
          const nextStyle = window.getComputedStyle(nextElement);
          console.log('#__next computed transform:', nextStyle.transform);
        }, 100);
      } else {
        console.log('#__next element not found');
      }
    }, 400);
    
    // Method 4: CSS zoom property
    setTimeout(() => {
      console.log('Method 4: CSS zoom property');
      document.documentElement.style.zoom = '1.4';
      console.log('CSS zoom applied:', document.documentElement.style.zoom);
      
      setTimeout(() => {
        const zoomStyle = window.getComputedStyle(document.documentElement);
        console.log('CSS zoom computed:', zoomStyle.zoom);
      }, 100);
    }, 600);
    
    // Method 5: window.setZoom
    setTimeout(() => {
      if (window.setZoom) {
        console.log('Method 5: window.setZoom');
        window.setZoom(1.1);
        setTimeout(() => {
          console.log('After window.setZoom(1.1):');
          console.log('DOM zoom style:', document.documentElement.style.zoom);
          console.log('DOM transform style:', document.documentElement.style.transform);
          console.log('window.getZoom():', window.getZoom ? window.getZoom() : 'not available');
          
          const finalComputedStyle = window.getComputedStyle(document.documentElement);
          console.log('Final computed transform:', finalComputedStyle.transform);
          console.log('Final computed zoom:', finalComputedStyle.zoom);
        }, 100);
      } else {
        console.error('window.setZoom is not available!');
      }
    }, 800);
    
    // Final check
    setTimeout(() => {
      console.log('=== FINAL STATE CHECK ===');
      console.log('HTML inline transform:', document.documentElement.style.transform);
      console.log('HTML inline zoom:', document.documentElement.style.zoom);
      console.log('Body inline transform:', document.body.style.transform);
      console.log('HTML computed transform:', window.getComputedStyle(document.documentElement).transform);
      console.log('Body computed transform:', window.getComputedStyle(document.body).transform);
      console.log('Page should be visually different now!');
    }, 1000);
  };

  return (
    <div className={cn("fixed bottom-4 right-4", className)} style={{zIndex: 99999}}>
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
        COMPREHENSIVE TEST
      </Button>
      
      {/* Deep diagnostic button */}
      <Button
        onClick={() => {
          console.log('=== DEEP DIAGNOSTIC TEST ===');
          console.log('Browser:', navigator.userAgent);
          console.log('Current URL:', window.location.href);
          console.log('Document ready state:', document.readyState);
          
          // Check if zoom functions exist
          console.log('window.setZoom type:', typeof window.setZoom);
          console.log('window.getZoom type:', typeof window.getZoom);
          
          // Check current DOM state
          console.log('HTML element:', document.documentElement);
          console.log('HTML style transform:', document.documentElement.style.transform);
          console.log('HTML style zoom:', document.documentElement.style.zoom);
          console.log('Body element:', document.body);
          console.log('Body style transform:', document.body.style.transform);
          console.log('Body style zoom:', document.body.style.zoom);
          
          // Check computed styles
          const htmlComputed = window.getComputedStyle(document.documentElement);
          const bodyComputed = window.getComputedStyle(document.body);
          console.log('HTML computed transform:', htmlComputed.transform);
          console.log('HTML computed zoom:', htmlComputed.zoom);
          console.log('Body computed transform:', bodyComputed.transform);
          console.log('Body computed zoom:', bodyComputed.zoom);
          
          // Check localStorage
          console.log('localStorage zoom:', localStorage.getItem('app-zoom-level'));
          
          // Test if functions actually work
          if (window.setZoom) {
            console.log('Testing window.setZoom(1.3)...');
            window.setZoom(1.3);
            setTimeout(() => {
              console.log('After setZoom(1.3):');
              console.log('HTML style transform:', document.documentElement.style.transform);
              console.log('HTML style zoom:', document.documentElement.style.zoom);
              console.log('HTML computed transform:', window.getComputedStyle(document.documentElement).transform);
              console.log('HTML computed zoom:', window.getComputedStyle(document.documentElement).zoom);
              console.log('window.getZoom():', window.getZoom ? window.getZoom() : 'not available');
            }, 100);
          } else {
            console.error('window.setZoom is NOT AVAILABLE!');
          }
          
          // Check for any error messages
          console.log('Checking for any JavaScript errors...');
        }}
        size="sm"
        variant="outline"
        className="mb-2 shadow-lg"
        title="Deep Diagnostic Test"
      >
        DEEP DIAGNOSTIC
      </Button>
      
      {/* Simple test slider */}
      <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded">
        <div className="text-xs text-red-600 mb-1">Simple Test Slider:</div>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={zoom}
          onChange={(e) => {
            const newZoom = parseFloat(e.target.value);
            console.log('=== SIMPLE SLIDER DEBUG ===');
            console.log('Simple slider changed to:', newZoom);
            console.log('window.setZoom exists:', typeof window.setZoom);
            console.log('Current DOM transform before:', document.documentElement.style.transform);
            
            setZoom(newZoom);
            if (window.setZoom) {
              console.log('Calling window.setZoom with:', newZoom);
              window.setZoom(newZoom);
              
              // Check if it actually changed
              setTimeout(() => {
                console.log('DOM transform after setZoom:', document.documentElement.style.transform);
                const computedStyle = window.getComputedStyle(document.documentElement);
                console.log('Computed transform after setZoom:', computedStyle.transform);
                console.log('Page should now be at', Math.round(newZoom * 100) + '%');
              }, 100);
            } else {
              console.error('window.setZoom is not available!');
            }
          }}
          className="w-full"
          style={{pointerEvents: 'auto'}}
        />
        <div className="text-xs text-red-600">Value: {zoom.toFixed(2)}</div>
      </div>

      {(isVisible || true) && (
        <div className="bg-background border border-border rounded-lg p-4 shadow-lg min-w-[200px] mb-4" style={{zIndex: 9999}}>
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
              <div className="text-xs text-muted-foreground">
                Slider: {zoom.toFixed(2)} (min: {minZoom}, max: {maxZoom}, step: {step})
              </div>
              
              {/* Test if Radix Slider is working */}
              <div className="p-2 bg-blue-100 border border-blue-300 rounded mb-2">
                <div className="text-xs text-blue-600 mb-1">Radix UI Slider Test:</div>
                <Slider
                  value={[zoom]}
                  onValueChange={(value) => {
                    console.log('=== RADIX SLIDER DEBUG ===');
                    console.log('Radix Slider onValueChange:', value);
                    console.log('window.setZoom exists:', typeof window.setZoom);
                    console.log('Current DOM transform before:', document.documentElement.style.transform);
                    handleSliderChange(value);
                  }}
                  onValueCommit={(value) => {
                    console.log('Radix Slider value committed:', value);
                    // Check final state
                    setTimeout(() => {
                      const computedStyle = window.getComputedStyle(document.documentElement);
                      console.log('Final computed transform after commit:', computedStyle.transform);
                    }, 100);
                  }}
                  min={minZoom}
                  max={maxZoom}
                  step={step}
                  className="w-full"
                  style={{pointerEvents: 'auto', zIndex: 10000}}
                />
                <div className="text-xs text-blue-600">Radix Value: {zoom.toFixed(2)}</div>
              </div>
              
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
