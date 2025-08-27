"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Activity, Memory, Clock, Zap } from 'lucide-react';

interface DevMemoryMonitorProps {
  enabled?: boolean;
}

export function DevMemoryMonitor({ enabled = true }: DevMemoryMonitorProps) {
  const [metrics, setMetrics] = useState({
    memory: 0,
    resourceCount: 0,
    lastUpdate: Date.now(),
  });

  useEffect(() => {
    if (!enabled || process.env.NODE_ENV !== 'development' || typeof window === 'undefined') {
      return;
    }

    const updateMetrics = () => {
      const memoryInfo = (performance as any).memory;
      const memoryMB = memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) : 0;
      
      // Get resource stats if available
      let resourceCount = 0;
      try {
        // Simple DOM node count as resource count
        resourceCount = document.querySelectorAll('*').length;
      } catch (e) {
        // Resource tracking not available
      }

      setMetrics({
        memory: memoryMB,
        resourceCount,
        lastUpdate: Date.now(),
      });
    };

    const interval = setInterval(updateMetrics, 2000);
    updateMetrics();

    return () => clearInterval(interval);
  }, [enabled]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development' || !enabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-64 bg-background/95 backdrop-blur-sm border-2 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-500" />
            Dev Memory Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Memory className="h-3 w-3" />
                Memory:
              </span>
              <Badge variant={metrics.memory > 150 ? 'destructive' : 'default'} className="text-xs">
                {metrics.memory}MB
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Resources:
              </span>
              <Badge variant={metrics.resourceCount > 50 ? 'destructive' : 'default'} className="text-xs">
                {metrics.resourceCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated:
              </span>
              <span className="text-muted-foreground">
                {Math.round((Date.now() - metrics.lastUpdate) / 1000)}s ago
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for easy integration
export function useDevMemoryMonitor(enabled = true) {
  return {
    DevMemoryMonitor: () => <DevMemoryMonitor enabled={enabled} />
  };
}
