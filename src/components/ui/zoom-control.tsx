"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useZoom } from '@/contexts/ZoomContext';
import { useDynamicZIndex } from '@/contexts/ZIndexContext';

interface ZoomControlProps {
  className?: string;
}

export function ZoomControl({ className }: ZoomControlProps) {
  const { contentZIndex } = useDynamicZIndex('zoom-control', 'overlay');
  const { zoom, setZoom, resetZoom, minZoom, maxZoom } = useZoom();
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.1, maxZoom);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.1, minZoom);
    setZoom(newZoom);
  };

  const handleSliderChange = (value: number[]) => {
    const newZoom = value[0];
    setZoom(newZoom);
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
    <div 
      className={cn("fixed bottom-4 right-4", className)} 
      style={{ zIndex: contentZIndex }}
    >
      <Button
        onClick={toggleVisibility}
        size="sm"
        variant="outline"
        className="mb-2 shadow-lg"
        title={`Toggle Zoom Controls - Current: ${Math.round(zoom * 100)}%`}
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
                  onClick={resetZoom}
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
                step={0.05}
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

// Re-export the useZoom hook from the context for backward compatibility
export { useZoom } from '@/contexts/ZoomContext';