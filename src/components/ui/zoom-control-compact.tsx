"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw, Monitor } from 'lucide-react';
import { useZoom } from '@/components/ui/zoom-control';

interface ZoomControlCompactProps {
  className?: string;
}

export function ZoomControlCompact({ className }: ZoomControlCompactProps) {
  const { zoom, setZoom, resetZoom, isLoading, isServerStorage } = useZoom();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleZoomChange = (value: number[]) => {
    console.log('ZoomControlCompact: handleZoomChange called with:', value[0]);
    setZoom(value[0]);
  };

  const quickZoomOptions = [
    { label: '75%', value: 0.75 },
    { label: '90%', value: 0.9 },
    { label: '100%', value: 1.0 },
    { label: '110%', value: 1.1 },
    { label: '125%', value: 1.25 },
  ];

  return (
    <div className={className}>
      {/* Zoom Level Display */}
      <div className="px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Display Size</span>
          <div className="flex items-center gap-1">
            <Monitor className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium">
              {isLoading ? '...' : `${Math.round(zoom * 100)}%`}
            </span>
            {isServerStorage && (
              <span className="text-xs text-green-500" title="Synced across devices">●</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Zoom Buttons */}
      <div className="px-2 py-1.5">
        <div className="flex flex-wrap gap-1">
          {quickZoomOptions.map((option) => (
            <Button
              key={option.value}
              variant={Math.abs(zoom - option.value) < 0.01 ? "default" : "outline"}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('ZoomControlCompact: Quick zoom button clicked:', option.label, option.value);
                setZoom(option.value);
              }}
              className="h-6 px-2 text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Zoom Slider */}
      <div className="px-2 py-1.5">
        <div className="space-y-2">
          <Slider
            value={[zoom]}
            onValueChange={handleZoomChange}
            min={0.5}
            max={1.5}
            step={0.05}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50%</span>
            <span>150%</span>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="px-2 py-1.5">
        <Button
          onClick={resetZoom}
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset to 100%
        </Button>
      </div>
    </div>
  );
}
