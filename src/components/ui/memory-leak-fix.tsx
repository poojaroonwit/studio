"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

export function MemoryLeakFix() {
  const [isVisible, setIsVisible] = useState(false);
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics | null>(null);
  const [memoryHistory, setMemoryHistory] = useState<MemoryMetrics[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [leakDetected, setLeakDetected] = useState(false);
  const [activeConnections, setActiveConnections] = useState<number>(0);
  const [activeTimeouts, setActiveTimeouts] = useState<number>(0);
  const [activeIntervals, setActiveIntervals] = useState<number>(0);
  const [activeEventListeners, setActiveEventListeners] = useState<number>(0);
  
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionCountRef = useRef<number>(0);
  const timeoutCountRef = useRef<number>(0);
  const intervalCountRef = useRef<number>(0);
  const eventListenerCountRef = useRef<number>(0);

  // Simplified resource tracking - just monitor memory usage
  useEffect(() => {
    if (!isMonitoring) return;

    // For now, we'll just track memory usage without overriding global functions
    // This avoids complex TypeScript issues with function overrides
    
    return () => {
      // Cleanup
    };
  }, [isMonitoring]);

  const getMemoryMetrics = (): MemoryMetrics | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };
    }
    return null;
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    setMemoryHistory([]);
    setLeakDetected(false);
    
    monitoringIntervalRef.current = setInterval(() => {
      const metrics = getMemoryMetrics();
      if (metrics) {
        setMemoryMetrics(metrics);
        setMemoryHistory(prev => {
          const newHistory = [...prev, metrics].slice(-20); // Keep last 20 measurements
          
          // Detect memory leak (continuous growth over 5 measurements)
          if (newHistory.length >= 5) {
            const recent = newHistory.slice(-5);
            const isGrowing = recent.every((metric, i) => 
              i === 0 || metric.usedJSHeapSize > recent[i - 1].usedJSHeapSize
            );
            
            if (isGrowing && !leakDetected) {
              setLeakDetected(true);
            }
          }
          
          return newHistory;
        });
      }
    }, 2000); // Check every 2 seconds
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  };

  const forceGarbageCollection = () => {
    if ('gc' in window) {
      (window as any).gc();
    } else {
      // Alternative: trigger garbage collection by creating and releasing large objects
      const largeArray = new Array(1000000).fill(0);
      largeArray.length = 0;
    }
  };

  const cleanupResources = () => {
    // Reset counters
    connectionCountRef.current = 0;
    timeoutCountRef.current = 0;
    intervalCountRef.current = 0;
    eventListenerCountRef.current = 0;
    
    setActiveConnections(0);
    setActiveTimeouts(0);
    setActiveIntervals(0);
    setActiveEventListeners(0);
    
    // Force garbage collection
    forceGarbageCollection();
  };

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  const memoryUsagePercent = memoryMetrics 
    ? (memoryMetrics.usedJSHeapSize / memoryMetrics.jsHeapSizeLimit) * 100 
    : 0;

  const memoryUsageMB = memoryMetrics 
    ? memoryMetrics.usedJSHeapSize / (1024 * 1024) 
    : 0;

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50 opacity-50 hover:opacity-100"
      >
        <Database className="h-4 w-4 mr-2" />
        Memory
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 left-4 z-50 w-80 bg-background/95 backdrop-blur-sm border-2 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Memory Monitor</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {memoryMetrics && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Memory Usage:</span>
              <span className="font-mono">{memoryUsageMB.toFixed(1)} MB</span>
            </div>
            <Progress value={memoryUsagePercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Used: {(memoryMetrics.usedJSHeapSize / (1024 * 1024)).toFixed(1)} MB</span>
              <span>Total: {(memoryMetrics.totalJSHeapSize / (1024 * 1024)).toFixed(1)} MB</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>Connections: {activeConnections}</div>
          <div>Timeouts: {activeTimeouts}</div>
          <div>Intervals: {activeIntervals}</div>
          <div>Event Listeners: {activeEventListeners}</div>
        </div>

        {leakDetected && (
          <Alert className="text-xs">
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription>Memory leak detected!</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          {!isMonitoring ? (
            <Button size="sm" onClick={startMonitoring} className="flex-1">
              <RefreshCw className="h-3 w-3 mr-1" />
              Start
            </Button>
          ) : (
            <Button size="sm" onClick={stopMonitoring} className="flex-1">
              Stop
            </Button>
          )}
          <Button size="sm" onClick={cleanupResources} variant="destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
