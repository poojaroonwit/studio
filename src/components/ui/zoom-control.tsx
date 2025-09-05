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
    // Apply zoom using CSS transform for better height handling
    const body = document.body;
    const html = document.documentElement;
    
    // Remove any existing zoom classes
    body.classList.remove('app-zoom-75', 'app-zoom-80', 'app-zoom-90', 'app-zoom-100', 'app-zoom-110', 'app-zoom-125');
    
    // Apply appropriate zoom class based on zoom level
    if (zoom <= 0.75) {
      body.classList.add('app-zoom-75');
    } else if (zoom <= 0.8) {
      body.classList.add('app-zoom-80');
    } else if (zoom <= 0.9) {
      body.classList.add('app-zoom-90');
    } else if (zoom <= 1.0) {
      body.classList.add('app-zoom-100');
    } else if (zoom <= 1.1) {
      body.classList.add('app-zoom-110');
    } else {
      body.classList.add('app-zoom-125');
    }
    
    // Also apply direct transform for precise zoom levels
    body.style.transform = `scale(${zoom})`;
    body.style.transformOrigin = 'top left';
    
    // Adjust viewport height dynamically
    const scaledHeight = window.innerHeight / zoom;
    html.style.height = `${scaledHeight}px`;
    body.style.height = `${scaledHeight}px`;
    
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

  // Handle window resize to adjust height dynamically
  useEffect(() => {
    const handleResize = () => {
      if (zoom !== 1.0) {
        const body = document.body;
        const html = document.documentElement;
        const scaledHeight = window.innerHeight / zoom;
        html.style.height = `${scaledHeight}px`;
        body.style.height = `${scaledHeight}px`;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoom]);

  // Cleanup effect to reset zoom on unmount
  useEffect(() => {
    return () => {
      // Reset zoom when component unmounts
      const body = document.body;
      const html = document.documentElement;
      body.style.transform = '';
      body.style.transformOrigin = '';
      html.style.height = '';
      body.style.height = '';
      body.classList.remove('app-zoom-75', 'app-zoom-80', 'app-zoom-90', 'app-zoom-100', 'app-zoom-110', 'app-zoom-125');
    };
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
          
          // Apply zoom using CSS transform
          const body = document.body;
          const html = document.documentElement;
          body.style.transform = `scale(${zoomLevel})`;
          body.style.transformOrigin = 'top left';
          
          // Adjust viewport height dynamically
          const scaledHeight = window.innerHeight / zoomLevel;
          html.style.height = `${scaledHeight}px`;
          body.style.height = `${scaledHeight}px`;
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

  // Cleanup effect to reset zoom on unmount
  useEffect(() => {
    return () => {
      // Reset zoom when component unmounts
      const body = document.body;
      const html = document.documentElement;
      body.style.transform = '';
      body.style.transformOrigin = '';
      html.style.height = '';
      body.style.height = '';
      body.classList.remove('app-zoom-75', 'app-zoom-80', 'app-zoom-90', 'app-zoom-100', 'app-zoom-110', 'app-zoom-125');
    };
  }, []);

  const setZoomLevel = async (level: number) => {
    setZoom(level);
    
    // Apply zoom using CSS transform for better height handling
    const body = document.body;
    const html = document.documentElement;
    body.style.transform = `scale(${level})`;
    body.style.transformOrigin = 'top left';
    
    // Adjust viewport height dynamically
    const scaledHeight = window.innerHeight / level;
    html.style.height = `${scaledHeight}px`;
    body.style.height = `${scaledHeight}px`;
    
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

  return {
    zoom,
    setZoom: setZoomLevel,
    resetZoom,
    isLoading,
    isServerStorage: !!userId,
  };
}
