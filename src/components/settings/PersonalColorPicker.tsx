"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PersonalColorPickerProps {
  className?: string;
  personalColor?: string;
  onColorChange?: (color: string) => void;
  isAdminMode?: boolean;
}

export function PersonalColorPicker({ 
  className, 
  personalColor = '#3B82F6', 
  onColorChange, 
  isAdminMode = false 
}: PersonalColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState<string>(personalColor);

  // Update selected color when personal color changes
  React.useEffect(() => {
    setSelectedColor(personalColor);
  }, [personalColor]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setSelectedColor(color);
    if (onColorChange) {
      onColorChange(color);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Current Color Preview - Clickable */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <input
              type="color"
              value={selectedColor}
              onChange={handleColorChange}
              className="w-12 h-12 rounded-lg border-2 border-border shadow-sm cursor-pointer opacity-0 absolute inset-0 z-10"
            />
            <div 
              className="w-12 h-12 rounded-lg border-2 border-border shadow-sm group-hover:border-primary transition-colors duration-200"
              style={{ backgroundColor: selectedColor }}
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="text-white text-xs font-medium drop-shadow-lg bg-black/20 px-1 py-0.5 rounded">Click</div>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{selectedColor}</p>
            <p className="text-xs text-muted-foreground">
              Click the color swatch to change
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
