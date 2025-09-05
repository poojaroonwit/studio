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
  defaultZoom = 1.0,
  minZoom = 0.5,
  maxZoom = 1.5,
  step = 0.1
}: ZoomControlProps) {
  const [zoom, setZoom] = useState(defaultZoom);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {
    // Apply zoom using CSS zoom property for browser-like behavior
    document.documentElement.style.zoom = zoom.toString();
    
    // Store zoom level in localStorage
    localStorage.setItem('app-zoom-level', zoom.toString());
  }, [zoom]);

  useEffect(() => {
    // Load saved zoom level on mount
    const savedZoom = localStorage.getItem('app-zoom-level');
    if (savedZoom) {
      const parsedZoom = parseFloat(savedZoom);
      if (parsedZoom >= minZoom && parsedZoom <= maxZoom) {
        setZoom(parsedZoom);
      }
    }
  }, [minZoom, maxZoom]);

  // Add keyboard shortcuts for zoom (Ctrl + Plus/Minus)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl (or Cmd on Mac) is pressed
      if (event.ctrlKey || event.metaKey) {
        if (event.key === '+' || event.key === '=') {
          event.preventDefault();
          handleZoomIn();
        } else if (event.key === '-') {
          event.preventDefault();
          handleZoomOut();
        } else if (event.key === '0') {
          event.preventDefault();
          handleReset();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + step, maxZoom));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - step, minZoom));
  };

  const handleReset = () => {
    setZoom(defaultZoom);
  };

  const handleSliderChange = (value: number[]) => {
    setZoom(value[0]);
  };

  const toggleVisibility = () => {
    setIsVisible(prev => !prev);
    setIsMinimized(false);
  };

  const minimizeControl = () => {
    setIsMinimized(true);
    setIsVisible(false);
  };

  // Hide the floating control by default since we now have it in the dropdown
  if (isMinimized) {
    return null;
  }

  return (
    <div className={cn("fixed bottom-4 right-4 z-50", className)}>
      {/* Toggle Button */}
      <Button
        onClick={toggleVisibility}
        size="sm"
        variant="outline"
        className="mb-2 shadow-lg"
        title="Toggle Zoom Controls"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>

      {/* Zoom Controls Panel */}
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
                  title="Reset to 100%"
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

// Hook for programmatic zoom control with server-side storage
export function useZoom() {
  const [zoom, setZoom] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID from session
  useEffect(() => {
    const getUserId = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const session = await response.json();
          if (session?.user?.id) {
            setUserId(session.user.id);
          }
        }
      } catch (error) {
        console.warn('Failed to get user session:', error);
      }
    };
    getUserId();
  }, []);

  // Load zoom preferences from server
  useEffect(() => {
    const loadZoomPreferences = async () => {
      if (!userId) {
        // Fallback to localStorage if no user ID
        const savedZoom = localStorage.getItem('app-zoom-level');
        if (savedZoom) {
          setZoom(parseFloat(savedZoom));
        }
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/users/${userId}/zoom-preferences`);
        if (response.ok) {
                   const preferences = await response.json();
         const zoomLevel = preferences.zoomLevel || 1.0;
         setZoom(zoomLevel);
         document.documentElement.style.zoom = zoomLevel.toString();
        } else {
          // Fallback to localStorage
          const savedZoom = localStorage.getItem('app-zoom-level');
          if (savedZoom) {
            setZoom(parseFloat(savedZoom));
          }
        }
      } catch (error) {
        console.warn('Failed to load zoom preferences from server:', error);
        // Fallback to localStorage
        const savedZoom = localStorage.getItem('app-zoom-level');
        if (savedZoom) {
          setZoom(parseFloat(savedZoom));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadZoomPreferences();
  }, [userId]);


  const setZoomLevel = async (level: number) => {
    setZoom(level);
    document.documentElement.style.zoom = level.toString();
    
    // Save to localStorage as backup
    localStorage.setItem('app-zoom-level', level.toString());

    // Save to server if user is logged in
    if (userId) {
      try {
        await fetch(`/api/users/${userId}/zoom-preferences`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            zoomLevel: level,
            autoZoom: false, // Keep existing values
            rememberZoom: true,
            mobileZoom: 0.9,
          }),
        });
      } catch (error) {
        console.warn('Failed to save zoom preferences to server:', error);
      }
    }
  };

  const resetZoom = () => {
    setZoomLevel(1.0);
  };

  // Add keyboard shortcuts for zoom (Ctrl + Plus/Minus)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl (or Cmd on Mac) is pressed
      if (event.ctrlKey || event.metaKey) {
        if (event.key === '+' || event.key === '=') {
          event.preventDefault();
          setZoomLevel(Math.min(zoom + 0.1, 1.5));
        } else if (event.key === '-') {
          event.preventDefault();
          setZoomLevel(Math.max(zoom - 0.1, 0.5));
        } else if (event.key === '0') {
          event.preventDefault();
          resetZoom();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom]);

  return {
    zoom,
    setZoom: setZoomLevel,
    resetZoom,
    isLoading,
    isServerStorage: !!userId,
  };
}
