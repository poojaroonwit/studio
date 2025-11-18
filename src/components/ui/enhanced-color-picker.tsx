"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, X, Image as ImageIcon, Video, Palette, Layers, FileImage } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ColorMode = 'solid' | 'gradient' | 'texture' | 'image' | 'video';

export interface GradientStop {
  color: string; // hex
  position: number; // 0-100
}

export interface ColorValue {
  mode: ColorMode;
  solid?: string; // hex
  gradient?: {
    stops: GradientStop[];
    angle?: number; // degrees, default 135
  };
  texture?: string; // texture pattern identifier or URL
  image?: string; // image URL
  video?: string; // video URL
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#84CC16', // Lime
  '#6366F1', // Indigo
  '#F43F5E', // Rose
  '#14B8A6', // Teal
  '#000000', // Black
  '#FFFFFF', // White
  '#808080', // Gray
];

const PRESET_TEXTURES = [
  { id: 'dots', name: 'Dots', pattern: 'radial-gradient(circle, currentColor 1px, transparent 1px)' },
  { id: 'lines', name: 'Lines', pattern: 'repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 20px)' },
  { id: 'grid', name: 'Grid', pattern: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)' },
  { id: 'diagonal', name: 'Diagonal', pattern: 'repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 20px)' },
];

interface EnhancedColorPickerProps {
  value: string | ColorValue;
  onChange: (value: string) => void; // Always emit string for backward compatibility
  className?: string;
  allowBackground?: boolean; // If true, shows image and video options
  placeholder?: string;
  disabled?: boolean;
}

// Helper functions
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

function isValidHex(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

function normalizeHex(hex: string): string {
  if (!hex) return '#000000';
  if (hex.startsWith('#')) {
    if (hex.length === 4) {
      // Expand #RGB to #RRGGBB
      return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    return hex.length === 7 ? hex : '#000000';
  }
  return `#${hex}`.length === 7 ? `#${hex}` : '#000000';
}

function parseValue(value: string | ColorValue): ColorValue {
  if (typeof value === 'object' && value !== null && 'mode' in value) {
    return value as ColorValue;
  }
  
  // Try to parse as gradient
  if (typeof value === 'string' && value.includes('gradient')) {
    const linearMatch = value.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
    if (linearMatch) {
      const angle = parseInt(linearMatch[1]);
      const stopsStr = linearMatch[2];
      const colorMatches = stopsStr.match(/#[0-9A-Fa-f]{6}/g);
      if (colorMatches && colorMatches.length >= 2) {
        const stops: GradientStop[] = colorMatches.map((color, index) => ({
          color: normalizeHex(color),
          position: Math.round((index / (colorMatches.length - 1)) * 100)
        }));
        return { mode: 'gradient', gradient: { stops, angle } };
      }
    }
  }
  
  // Try to parse as image/video URL
  if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('/') || value.startsWith('data:'))) {
    if (value.match(/\.(mp4|webm|ogg)$/i)) {
      return { mode: 'video', video: value };
    }
    if (value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || value.startsWith('data:image')) {
      return { mode: 'image', image: value };
    }
  }
  
  // Default to solid color
  const hex = typeof value === 'string' ? normalizeHex(value) : '#000000';
  return { mode: 'solid', solid: isValidHex(hex) ? hex : '#000000' };
}

function formatValue(colorValue: ColorValue): string {
  switch (colorValue.mode) {
    case 'solid':
      return colorValue.solid || '#000000';
    case 'gradient':
      if (!colorValue.gradient || !colorValue.gradient.stops.length) {
        return '#000000';
      }
      const angle = colorValue.gradient.angle || 135;
      const stops = colorValue.gradient.stops
        .sort((a, b) => a.position - b.position)
        .map(stop => `${stop.color} ${stop.position}%`)
        .join(', ');
      return `linear-gradient(${angle}deg, ${stops})`;
    case 'texture':
      return colorValue.texture || '';
    case 'image':
      return colorValue.image || '';
    case 'video':
      return colorValue.video || '';
    default:
      return '#000000';
  }
}

function getPreviewStyle(colorValue: ColorValue): React.CSSProperties {
  switch (colorValue.mode) {
    case 'solid':
      return { backgroundColor: colorValue.solid || '#000000' };
    case 'gradient':
      if (!colorValue.gradient || !colorValue.gradient.stops.length) {
        return { backgroundColor: '#000000' };
      }
      const angle = colorValue.gradient.angle || 135;
      const stops = colorValue.gradient.stops
        .sort((a, b) => a.position - b.position)
        .map(stop => `${stop.color} ${stop.position}%`)
        .join(', ');
      return { background: `linear-gradient(${angle}deg, ${stops})` };
    case 'texture':
      const texture = PRESET_TEXTURES.find(t => t.id === colorValue.texture);
      if (texture) {
        return { 
          background: texture.pattern,
          backgroundSize: '20px 20px',
          backgroundColor: '#f0f0f0'
        };
      }
      return { backgroundColor: '#f0f0f0' };
    case 'image':
      return {
        backgroundImage: colorValue.image ? `url(${colorValue.image})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    case 'video':
      return { backgroundColor: '#000000' };
    default:
      return { backgroundColor: '#000000' };
  }
}

function getDisplayText(colorValue: ColorValue): string {
  switch (colorValue.mode) {
    case 'solid':
      return colorValue.solid || '#000000';
    case 'gradient':
      return `${colorValue.gradient?.stops.length || 0} color gradient`;
    case 'texture':
      const texture = PRESET_TEXTURES.find(t => t.id === colorValue.texture);
      return texture?.name || 'Texture';
    case 'image':
      return 'Image';
    case 'video':
      return 'Video';
    default:
      return '#000000';
  }
}

export function EnhancedColorPicker({
  value,
  onChange,
  className,
  allowBackground = false,
  placeholder = '#000000',
  disabled = false
}: EnhancedColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [colorValue, setColorValue] = useState<ColorValue>(() => parseValue(value));
  const [activeTab, setActiveTab] = useState<ColorMode>(colorValue.mode);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const parsed = parseValue(value);
    setColorValue(parsed);
    // Only update active tab if it's a valid mode and we're not in the middle of user interaction
    if (parsed.mode && ['solid', 'gradient', 'texture', 'image', 'video'].includes(parsed.mode)) {
      setActiveTab(parsed.mode);
    }
  }, [value]);

  const handleColorValueChange = (newValue: ColorValue) => {
    setColorValue(newValue);
    // Emit the formatted string value for backward compatibility
    const formatted = formatValue(newValue);
    onChange(formatted);
  };

  const handleSolidColorChange = (hex: string) => {
    const normalized = normalizeHex(hex);
    if (isValidHex(normalized)) {
      handleColorValueChange({ ...colorValue, mode: 'solid', solid: normalized });
    }
  };

  const handleGradientStopChange = (index: number, stop: Partial<GradientStop>) => {
    if (!colorValue.gradient) {
      handleColorValueChange({
        ...colorValue,
        mode: 'gradient',
        gradient: {
          stops: [{ color: '#3B82F6', position: 0 }, { color: '#8B5CF6', position: 100 }],
          angle: 135
        }
      });
      return;
    }
    const newStops = [...colorValue.gradient.stops];
    newStops[index] = { ...newStops[index], ...stop };
    handleColorValueChange({
      ...colorValue,
      mode: 'gradient',
      gradient: { ...colorValue.gradient, stops: newStops }
    });
  };

  const handleAddGradientStop = () => {
    if (!colorValue.gradient || !colorValue.gradient.stops.length) {
      handleColorValueChange({
        ...colorValue,
        mode: 'gradient',
        gradient: {
          stops: [
            { color: '#3B82F6', position: 0 },
            { color: '#8B5CF6', position: 50 },
            { color: '#EC4899', position: 100 }
          ],
          angle: 135
        }
      });
      return;
    }
    const newStops = [...colorValue.gradient.stops];
    const midPosition = Math.round((newStops[0].position + newStops[newStops.length - 1].position) / 2);
    newStops.push({ color: '#10B981', position: midPosition });
    newStops.sort((a, b) => a.position - b.position);
    handleColorValueChange({
      ...colorValue,
      mode: 'gradient',
      gradient: { ...colorValue.gradient, stops: newStops }
    });
  };

  const handleRemoveGradientStop = (index: number) => {
    if (!colorValue.gradient || colorValue.gradient.stops.length <= 2) return;
    const newStops = colorValue.gradient.stops.filter((_, i) => i !== index);
    handleColorValueChange({
      ...colorValue,
      mode: 'gradient',
      gradient: { ...colorValue.gradient, stops: newStops }
    });
  };

  const handleGradientAngleChange = (angle: number) => {
    if (!colorValue.gradient) return;
    handleColorValueChange({
      ...colorValue,
      mode: 'gradient',
      gradient: { ...colorValue.gradient, angle }
    });
  };

  const handleTextureChange = (textureId: string) => {
    handleColorValueChange({ ...colorValue, mode: 'texture', texture: textureId });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        handleColorValueChange({ ...colorValue, mode: 'image', image: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        handleColorValueChange({ ...colorValue, mode: 'video', video: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const previewStyle = getPreviewStyle(colorValue);
  const displayText = getDisplayText(colorValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative flex items-center w-full", className)}>
          <div
            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded border-2 border-border cursor-pointer z-10"
            style={previewStyle}
            onClick={(e) => {
              e.preventDefault();
              if (!disabled) setOpen(true);
            }}
          />
          <Input
            type="text"
            value={displayText}
            readOnly
            placeholder={placeholder}
            disabled={disabled}
            className="pl-10 cursor-pointer"
            onClick={() => !disabled && setOpen(true)}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start" popoverId="enhanced-color-picker">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ColorMode)} className="w-full">
          <TabsList className="w-full rounded-none rounded-t-lg">
            <TabsTrigger value="solid" className="flex-1">
              <Palette className="w-4 h-4 mr-1" />
              Solid
            </TabsTrigger>
            <TabsTrigger value="gradient" className="flex-1">
              <Layers className="w-4 h-4 mr-1" />
              Gradient
            </TabsTrigger>
            <TabsTrigger value="texture" className="flex-1">
              <FileImage className="w-4 h-4 mr-1" />
              Texture
            </TabsTrigger>
            {allowBackground && (
              <>
                <TabsTrigger value="image" className="flex-1">
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Image
                </TabsTrigger>
                <TabsTrigger value="video" className="flex-1">
                  <Video className="w-4 h-4 mr-1" />
                  Video
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <div className="p-4">
            <TabsContent value="solid" className="mt-0 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Preset Colors</Label>
                <div className="grid grid-cols-8 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded border-2 transition-colors hover:scale-110",
                        colorValue.solid === color ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => handleSolidColorChange(color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Custom Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={colorValue.solid || '#000000'}
                    onChange={(e) => handleSolidColorChange(e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={colorValue.solid || '#000000'}
                    onChange={(e) => handleSolidColorChange(e.target.value)}
                    placeholder="#000000"
                    className="flex-1 font-mono"
                    maxLength={7}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="gradient" className="mt-0 space-y-4">
              {colorValue.gradient && colorValue.gradient.stops.length > 0 ? (
                <>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Gradient Stops</Label>
                    <div className="space-y-2">
                      {colorValue.gradient.stops.map((stop, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={stop.color}
                            onChange={(e) => handleGradientStopChange(index, { color: normalizeHex(e.target.value) })}
                            className="w-12 h-10 p-1"
                          />
                          <Input
                            type="text"
                            value={stop.color}
                            onChange={(e) => handleGradientStopChange(index, { color: normalizeHex(e.target.value) })}
                            placeholder="#000000"
                            className="flex-1 font-mono"
                            maxLength={7}
                          />
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={stop.position}
                            onChange={(e) => handleGradientStopChange(index, { position: parseInt(e.target.value) || 0 })}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          {colorValue.gradient!.stops.length > 2 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveGradientStop(index)}
                              className="h-8 w-8"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddGradientStop}
                      className="w-full mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stop
                    </Button>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Angle: {colorValue.gradient.angle || 135}°
                    </Label>
                    <Input
                      type="range"
                      min={0}
                      max={360}
                      value={colorValue.gradient.angle || 135}
                      onChange={(e) => handleGradientAngleChange(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div
                    className="w-full h-20 rounded border"
                    style={{
                      background: `linear-gradient(${colorValue.gradient.angle || 135}deg, ${colorValue.gradient.stops
                        .sort((a, b) => a.position - b.position)
                        .map(stop => `${stop.color} ${stop.position}%`)
                        .join(', ')})`
                    }}
                  />
                </>
              ) : (
                <div className="text-center py-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      handleColorValueChange({
                        ...colorValue,
                        mode: 'gradient',
                        gradient: {
                          stops: [
                            { color: '#3B82F6', position: 0 },
                            { color: '#8B5CF6', position: 100 }
                          ],
                          angle: 135
                        }
                      });
                    }}
                  >
                    Create Gradient
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="texture" className="mt-0 space-y-4">
              <Label className="text-sm font-medium mb-2 block">Texture Patterns</Label>
              <div className="grid grid-cols-2 gap-3">
                {PRESET_TEXTURES.map((texture) => (
                  <button
                    key={texture.id}
                    type="button"
                    className={cn(
                      "h-20 rounded border-2 transition-all hover:scale-105",
                      colorValue.texture === texture.id
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "border-border"
                    )}
                    style={{
                      background: texture.pattern,
                      backgroundSize: '20px 20px',
                      backgroundColor: '#f0f0f0'
                    }}
                    onClick={() => handleTextureChange(texture.id)}
                  >
                    <span className="text-xs text-muted-foreground">{texture.name}</span>
                  </button>
                ))}
              </div>
            </TabsContent>

            {allowBackground && (
              <>
                <TabsContent value="image" className="mt-0 space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Background Image</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                    {colorValue.image && (
                      <div className="mt-2">
                        <div className="relative w-full h-32 rounded border overflow-hidden">
                          <img
                            src={colorValue.image}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleColorValueChange({ ...colorValue, mode: 'image', image: '' })}
                          className="w-full mt-2"
                        >
                          Remove Image
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="video" className="mt-0 space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Background Video</Label>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => videoInputRef.current?.click()}
                      className="w-full"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Upload Video
                    </Button>
                    {colorValue.video && (
                      <div className="mt-2">
                        <div className="relative w-full h-32 rounded border overflow-hidden bg-black">
                          <video
                            src={colorValue.video}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            autoPlay
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleColorValueChange({ ...colorValue, mode: 'video', video: '' })}
                          className="w-full mt-2"
                        >
                          Remove Video
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

