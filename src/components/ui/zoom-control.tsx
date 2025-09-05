"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
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

  useEffect(() => {
    // Apply zoom to the document
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
  };

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
        <div className="bg-background border border-border rounded-lg p-4 shadow-lg min-w-[200px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Zoom: {Math.round(zoom * 100)}%</span>
              <Button
                onClick={handleReset}
                size="sm"
                variant="ghost"
                title="Reset to 100%"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
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

// Hook for programmatic zoom control
export function useZoom() {
  const [zoom, setZoom] = useState(1.0);

  useEffect(() => {
    const savedZoom = localStorage.getItem('app-zoom-level');
    if (savedZoom) {
      setZoom(parseFloat(savedZoom));
    }
  }, []);

  const setZoomLevel = (level: number) => {
    setZoom(level);
    document.documentElement.style.zoom = level.toString();
    localStorage.setItem('app-zoom-level', level.toString());
  };

  const resetZoom = () => {
    setZoomLevel(1.0);
  };

  return {
    zoom,
    setZoom: setZoomLevel,
    resetZoom
  };
}
