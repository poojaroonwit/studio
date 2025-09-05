"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ZoomIn, ZoomOut, RotateCcw, Monitor, Smartphone } from 'lucide-react';
import { useZoom } from '@/components/ui/zoom-control';

interface ZoomSettingsProps {
  className?: string;
}

export function ZoomSettings({ className }: ZoomSettingsProps) {
  const { zoom, setZoom, resetZoom } = useZoom();
  const [autoZoom, setAutoZoom] = useState(false);
  const [rememberZoom, setRememberZoom] = useState(true);
  const [mobileZoom, setMobileZoom] = useState(0.9);

  useEffect(() => {
    // Load settings from localStorage
    const savedAutoZoom = localStorage.getItem('auto-zoom-enabled');
    const savedRememberZoom = localStorage.getItem('remember-zoom-enabled');
    const savedMobileZoom = localStorage.getItem('mobile-zoom-level');

    if (savedAutoZoom) setAutoZoom(JSON.parse(savedAutoZoom));
    if (savedRememberZoom) setRememberZoom(JSON.parse(savedRememberZoom));
    if (savedMobileZoom) setMobileZoom(parseFloat(savedMobileZoom));
  }, []);

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

  const handleAutoZoomChange = (enabled: boolean) => {
    setAutoZoom(enabled);
    localStorage.setItem('auto-zoom-enabled', JSON.stringify(enabled));
    
    if (enabled) {
      // Auto-adjust zoom based on screen size
      const width = window.innerWidth;
      if (width < 640) {
        setZoom(mobileZoom);
      } else if (width < 1024) {
        setZoom(0.95);
      } else {
        setZoom(1.0);
      }
    }
  };

  const handleRememberZoomChange = (enabled: boolean) => {
    setRememberZoom(enabled);
    localStorage.setItem('remember-zoom-enabled', JSON.stringify(enabled));
  };

  const handleMobileZoomChange = (value: number[]) => {
    setMobileZoom(value[0]);
    localStorage.setItem('mobile-zoom-level', value[0].toString());
  };

  const quickZoomOptions = [
    { label: '75%', value: 0.75, icon: <ZoomOut className="w-4 h-4" /> },
    { label: '90%', value: 0.9, icon: <ZoomOut className="w-4 h-4" /> },
    { label: '100%', value: 1.0, icon: <Monitor className="w-4 h-4" /> },
    { label: '110%', value: 1.1, icon: <ZoomIn className="w-4 h-4" /> },
    { label: '125%', value: 1.25, icon: <ZoomIn className="w-4 h-4" /> },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="w-5 h-5" />
          Display & Zoom Settings
        </CardTitle>
        <CardDescription>
          Adjust the application's display size and zoom level to match your preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Zoom Level */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Current Zoom Level: {Math.round(zoom * 100)}%
          </Label>
          <div className="text-xs text-muted-foreground">
            Adjust the overall size of the application interface
          </div>
        </div>

        {/* Zoom Slider */}
        <div className="space-y-3">
          <Label htmlFor="zoom-slider">Zoom Level</Label>
          <Slider
            id="zoom-slider"
            value={[zoom]}
            onValueChange={handleZoomChange}
            min={0.5}
            max={1.5}
            step={0.05}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50%</span>
            <span>100%</span>
            <span>150%</span>
          </div>
        </div>

        {/* Quick Zoom Buttons */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick Zoom</Label>
          <div className="flex flex-wrap gap-2">
            {quickZoomOptions.map((option) => (
              <Button
                key={option.value}
                variant={Math.abs(zoom - option.value) < 0.01 ? "default" : "outline"}
                size="sm"
                onClick={() => setZoom(option.value)}
                className="flex items-center gap-1"
              >
                {option.icon}
                {option.label}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={resetZoom}
              className="flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>

        <Separator />

        {/* Auto Zoom Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-zoom">Auto-adjust zoom by device</Label>
              <div className="text-xs text-muted-foreground">
                Automatically adjust zoom level based on screen size
              </div>
            </div>
            <Switch
              id="auto-zoom"
              checked={autoZoom}
              onCheckedChange={handleAutoZoomChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="remember-zoom">Remember zoom level</Label>
              <div className="text-xs text-muted-foreground">
                Save zoom level between sessions
              </div>
            </div>
            <Switch
              id="remember-zoom"
              checked={rememberZoom}
              onCheckedChange={handleRememberZoomChange}
            />
          </div>
        </div>

        {/* Mobile Zoom Settings */}
        {autoZoom && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              <Label htmlFor="mobile-zoom">Mobile Zoom Level</Label>
            </div>
            <Slider
              id="mobile-zoom"
              value={[mobileZoom]}
              onValueChange={handleMobileZoomChange}
              min={0.7}
              max={1.0}
              step={0.05}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>70%</span>
              <span>100%</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Zoom level for mobile devices (screens smaller than 640px)
            </div>
          </div>
        )}

        {/* Preview Information */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium mb-1">Current Settings</div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• Zoom Level: {Math.round(zoom * 100)}%</div>
            <div>• Auto-adjust: {autoZoom ? 'Enabled' : 'Disabled'}</div>
            <div>• Remember settings: {rememberZoom ? 'Yes' : 'No'}</div>
            {autoZoom && <div>• Mobile zoom: {Math.round(mobileZoom * 100)}%</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
