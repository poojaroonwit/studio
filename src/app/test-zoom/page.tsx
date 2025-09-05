"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomControl } from '@/components/ui/zoom-control';

export default function TestZoomPage() {
  const [debugInfo, setDebugInfo] = useState({
    zoom: '0',
    bodyHeight: '0',
    bodyMinHeight: '0',
    htmlHeight: '0',
    windowHeight: '0',
    documentHeight: '0'
  });

  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo({
        zoom: document.documentElement.style.zoom || '1',
        bodyHeight: document.body.style.height || 'auto',
        bodyMinHeight: document.body.style.minHeight || 'auto',
        htmlHeight: document.documentElement.style.height || 'auto',
        windowHeight: window.innerHeight.toString(),
        documentHeight: document.documentElement.scrollHeight.toString()
      });
    };

    updateDebugInfo();
    
    const interval = setInterval(updateDebugInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  const testZoom = (level: number) => {
    document.documentElement.style.zoom = level.toString();
    localStorage.setItem('app-zoom-level', level.toString());
  };

  return (
    <div className="h-full min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Zoom Test Page</h1>
        
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Zoom Controls</h2>
            <div className="space-y-4">
              <Button onClick={() => testZoom(0.5)}>50%</Button>
              <Button onClick={() => testZoom(0.75)}>75%</Button>
              <Button onClick={() => testZoom(0.9)}>90%</Button>
              <Button onClick={() => testZoom(1.0)}>100%</Button>
              <Button onClick={() => testZoom(1.25)}>125%</Button>
              <Button onClick={() => testZoom(1.5)}>150%</Button>
            </div>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
            <div className="space-y-2 text-sm font-mono">
              <div>Zoom: {debugInfo.zoom}</div>
              <div>Body H: {debugInfo.bodyHeight}</div>
              <div>Body MinH: {debugInfo.bodyMinHeight}</div>
              <div>HTML H: {debugInfo.htmlHeight}</div>
              <div>Window H: {debugInfo.windowHeight}</div>
              <div>Doc H: {debugInfo.documentHeight}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Test Content</h2>
          <div className="space-y-4">
            <p>This is a test page to verify zoom functionality.</p>
            <p>Try using Ctrl + Plus/Minus to zoom in/out.</p>
            <p>Check if there's any white space at the bottom when zoomed out.</p>
            <div className="h-32 bg-muted rounded flex items-center justify-center">
              <span>Test Box</span>
            </div>
            <div className="h-32 bg-muted rounded flex items-center justify-center">
              <span>Another Test Box</span>
            </div>
            <div className="h-32 bg-muted rounded flex items-center justify-center">
              <span>Third Test Box</span>
            </div>
          </div>
        </div>
      </div>
      
      <ZoomControl />
    </div>
  );
}
