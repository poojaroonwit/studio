"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Database, AlertTriangle, RefreshCw, Trash2, Activity, Cpu, HardDrive } from 'lucide-react';

interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

interface SystemMetrics {
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  activeTimeouts: number;
  activeIntervals: number;
  eventListeners: number;
  renderTime: number;
  apiCallCount: number;
  cacheHitRate: number;
}

export function AdminMemoryMonitor() {
  const { data: session, status } = useSession();
  const [isVisible, setIsVisible] = useState(false);
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    memoryUsage: 0,
    cpuUsage: 0,
    activeConnections: 0,
    activeTimeouts: 0,
    activeIntervals: 0,
    eventListeners: 0,
    renderTime: 0,
    apiCallCount: 0,
    cacheHitRate: 0
  });
  const [memoryHistory, setMemoryHistory] = useState<MemoryMetrics[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [leakDetected, setLeakDetected] = useState(false);
  const [performanceWarnings, setPerformanceWarnings] = useState<string[]>([]);
  
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const performanceStartTime = useRef<number>(0);
  const renderStartTime = useRef<number>(0);
  const apiCallCount = useRef<number>(0);
  const cacheHits = useRef<number>(0);
  const cacheMisses = useRef<number>(0);

  // Check if user is admin
  const isAdmin = session?.user?.role === 'Admin' || 
                 session?.user?.modulePermissions?.includes('USERS_MANAGE');

  // Don't render if not admin or not authenticated
  if (status !== 'authenticated' || !isAdmin) {
    return null;
  }

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

  const getSystemMetrics = (): SystemMetrics => {
    const memory = getMemoryMetrics();
    const memoryUsage = memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0;
    
    // Estimate CPU usage based on performance timing
    const now = performance.now();
    const timeDiff = now - (performanceStartTime.current || now);
    performanceStartTime.current = now;
    
    // Simple CPU estimation (not accurate but gives an idea)
    const cpuUsage = Math.min(100, Math.max(0, (timeDiff / 16) * 100)); // 16ms = 60fps

    // Calculate render time
    const renderTime = renderStartTime.current ? performance.now() - renderStartTime.current : 0;
    renderStartTime.current = performance.now();

    // Calculate cache hit rate
    const totalCache = cacheHits.current + cacheMisses.current;
    const cacheHitRate = totalCache > 0 ? (cacheHits.current / totalCache) * 100 : 0;

    return {
      memoryUsage,
      cpuUsage,
      activeConnections: 0, // Would need to track these globally
      activeTimeouts: 0,
      activeIntervals: 0,
      eventListeners: 0,
      renderTime,
      apiCallCount: apiCallCount.current,
      cacheHitRate
    };
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    setMemoryHistory([]);
    setLeakDetected(false);
    setPerformanceWarnings([]);
    
    // Reset counters
    apiCallCount.current = 0;
    cacheHits.current = 0;
    cacheMisses.current = 0;
    renderStartTime.current = performance.now();
    
    monitoringIntervalRef.current = setInterval(() => {
      const metrics = getMemoryMetrics();
      const sysMetrics = getSystemMetrics();
      
      if (metrics) {
        setMemoryMetrics(metrics);
        setSystemMetrics(sysMetrics);
        
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

        // Check for performance warnings
        const warnings: string[] = [];
        if (sysMetrics.memoryUsage > 80) {
          warnings.push(`High memory usage: ${sysMetrics.memoryUsage.toFixed(1)}%`);
        }
        if (sysMetrics.cpuUsage > 80) {
          warnings.push(`High CPU usage: ${sysMetrics.cpuUsage.toFixed(1)}%`);
        }
        if (metrics.usedJSHeapSize / (1024 * 1024) > 100) {
          warnings.push(`Large heap size: ${(metrics.usedJSHeapSize / (1024 * 1024)).toFixed(1)}MB`);
        }
        if (sysMetrics.renderTime > 1000) {
          warnings.push(`Slow render time: ${sysMetrics.renderTime.toFixed(0)}ms`);
        }
        if (sysMetrics.apiCallCount > 10) {
          warnings.push(`Many API calls: ${sysMetrics.apiCallCount}`);
        }
        if (sysMetrics.cacheHitRate < 50) {
          warnings.push(`Low cache hit rate: ${sysMetrics.cacheHitRate.toFixed(1)}%`);
        }
        
        setPerformanceWarnings(warnings);
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
    // Force garbage collection
    forceGarbageCollection();
    
    // Reset warnings and counters
    setLeakDetected(false);
    setPerformanceWarnings([]);
    apiCallCount.current = 0;
    cacheHits.current = 0;
    cacheMisses.current = 0;
  };

  // Track API calls
  useEffect(() => {
    if (!isMonitoring) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      apiCallCount.current++;
      return originalFetch.apply(window, args);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [isMonitoring]);

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
        className="fixed bottom-4 right-4 z-50 opacity-70 hover:opacity-100 bg-background/80 backdrop-blur-sm border border-border shadow-lg"
        title="Admin Memory Monitor"
      >
        <Database className="h-4 w-4 mr-2" />
        Memory
        <Badge variant="secondary" className="ml-2 text-xs">Admin</Badge>
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 bg-background/95 backdrop-blur-sm border-2 border-border shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Admin Memory Monitor
            <Badge variant="secondary" className="text-xs">Admin Only</Badge>
          </span>
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
          <div className="flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            CPU: {systemMetrics.cpuUsage.toFixed(1)}%
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            Memory: {systemMetrics.memoryUsage.toFixed(1)}%
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Render: {systemMetrics.renderTime.toFixed(0)}ms
          </div>
          <div className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            API: {systemMetrics.apiCallCount}
          </div>
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Cache: {systemMetrics.cacheHitRate.toFixed(1)}%
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Warnings: {performanceWarnings.length}
          </div>
        </div>

        {(leakDetected || performanceWarnings.length > 0) && (
          <Alert className="text-xs">
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription>
              {leakDetected && <div className="font-semibold text-red-600">Memory leak detected!</div>}
              {performanceWarnings.map((warning, index) => (
                <div key={index} className="text-orange-600">{warning}</div>
              ))}
            </AlertDescription>
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
