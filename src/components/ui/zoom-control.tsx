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
  defaultZoom = 0.9,
  minZoom = 0.5,
  maxZoom = 1.5,
  step = 0.1
}: ZoomControlProps) {
  const [zoom, setZoom] = useState(defaultZoom);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  // Simple zoom application
  useEffect(() => {
    document.documentElement.style.zoom = zoom.toString();
    localStorage.setItem('app-zoom-level', zoom.toString());
    
    // Update visual indicator
    const zoomValueElement = document.getElementById('zoom-value');
    if (zoomValueElement) {
      zoomValueElement.textContent = zoom.toString();
    }
  }, [zoom]);

  // Load saved zoom on mount
  useEffect(() => {
    const savedZoom = localStorage.getItem('app-zoom-level');
    if (savedZoom) {
      const parsedZoom = parseFloat(savedZoom);
      if (parsedZoom >= minZoom && parsedZoom <= maxZoom) {
        setZoom(parsedZoom);
      }
    }
  }, [minZoom, maxZoom]);


  const handleZoomIn = () => {
    setZoom(Math.min(zoom + step, maxZoom));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - step, minZoom));
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

  if (isMinimized) {
    return null;
  }

  return (
    <div className={cn("fixed bottom-4 right-4 z-50", className)}>
      <Button
        onClick={toggleVisibility}
        size="sm"
        variant="outline"
        className="mb-2 shadow-lg"
        title="Toggle Zoom Controls"
      >
        <ZoomIn className="w-4 h-4" />
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

// Simple hook for zoom control
export function useZoom() {
  const [zoom, setZoom] = useState(0.9);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedZoom = localStorage.getItem('app-zoom-level');
    if (savedZoom) {
      const zoomLevel = parseFloat(savedZoom);
      setZoom(zoomLevel);
    }
    setIsLoading(false);
  }, []);

  const setZoomLevel = (level: number) => {
    setZoom(level);
    document.documentElement.style.zoom = level.toString();
    localStorage.setItem('app-zoom-level', level.toString());
    
    // Update visual indicator
    const zoomValueElement = document.getElementById('zoom-value');
    if (zoomValueElement) {
      zoomValueElement.textContent = level.toString();
    }
  };

  const resetZoom = () => {
    setZoomLevel(0.9);
  };

  return {
    zoom,
    setZoom: setZoomLevel,
    resetZoom,
    isLoading,
    isServerStorage: false,
  };
}
