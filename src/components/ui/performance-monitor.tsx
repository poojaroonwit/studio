"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Zap, Database, Memory, AlertTriangle, CheckCircle } from 'lucide-react';

interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  apiCallCount: number;
  cacheHitRate: number;
  slowQueries: number;
  totalQueries: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  showDetails?: boolean;
  threshold?: {
    memory: number; // MB
    renderTime: number; // ms
    apiCalls: number;
    cacheHitRate: number; // percentage
  };
}

export function PerformanceMonitor({ 
  enabled = true, 
  showDetails = false,
  threshold = {
    memory: 100,
    renderTime: 1000,
    apiCalls: 10,
    cacheHitRate: 50
  }
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    renderTime: 0,
    apiCallCount: 0,
    cacheHitRate: 0,
    slowQueries: 0,
    totalQueries: 0
  });

  const [isVisible, setIsVisible] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const renderStartTime = useRef<number>(0);
  const apiCallCount = useRef<number>(0);
  const cacheHits = useRef<number>(0);
  const cacheMisses = useRef<number>(0);

  // Track render performance
  useEffect(() => {
    if (!enabled) return;

    renderStartTime.current = performance.now();
    
    const updateMetrics = () => {
      const renderTime = performance.now() - renderStartTime.current;
      
      // Get memory usage if available
      let memoryUsage = 0;
      if ('memory' in performance) {
        memoryUsage = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
      }

      setMetrics(prev => ({
        ...prev,
        memoryUsage,
        renderTime,
        apiCallCount: apiCallCount.current,
        cacheHitRate: cacheHits.current + cacheMisses.current > 0 
          ? (cacheHits.current / (cacheHits.current + cacheMisses.current)) * 100 
          : 0
      }));

      // Check for performance warnings
      const newWarnings: string[] = [];
      if (memoryUsage > threshold.memory) {
        newWarnings.push(`High memory usage: ${memoryUsage.toFixed(1)}MB`);
      }
      if (renderTime > threshold.renderTime) {
        newWarnings.push(`Slow render time: ${renderTime.toFixed(0)}ms`);
      }
      if (apiCallCount.current > threshold.apiCalls) {
        newWarnings.push(`Many API calls: ${apiCallCount.current}`);
      }
      if (metrics.cacheHitRate < threshold.cacheHitRate) {
        newWarnings.push(`Low cache hit rate: ${metrics.cacheHitRate.toFixed(1)}%`);
      }

      setWarnings(newWarnings);
      setIsVisible(newWarnings.length > 0 || showDetails);
    };

    // Update metrics after render
    const timeoutId = setTimeout(updateMetrics, 100);
    return () => clearTimeout(timeoutId);
  }, [enabled, showDetails, threshold, metrics.cacheHitRate]);

  // Intercept fetch calls to track API performance
  useEffect(() => {
    if (!enabled) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      apiCallCount.current++;
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Track slow queries
        if (duration > 2000) {
          setMetrics(prev => ({
            ...prev,
            slowQueries: prev.slowQueries + 1,
            totalQueries: prev.totalQueries + 1
          }));
        } else {
          setMetrics(prev => ({
            ...prev,
            totalQueries: prev.totalQueries + 1
          }));
        }

        // Check for cache headers
        const cacheControl = response.headers.get('cache-control');
        if (cacheControl && cacheControl.includes('max-age')) {
          cacheHits.current++;
        } else {
          cacheMisses.current++;
        }

        return response;
      } catch (error) {
        apiCallCount.current--;
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [enabled]);

  if (!isVisible) return null;

  const getPerformanceStatus = () => {
    const hasWarnings = warnings.length > 0;
    return hasWarnings ? 'warning' : 'good';
  };

  const status = getPerformanceStatus();

  return (
    <Card className={`w-full max-w-md ${status === 'warning' ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          {status === 'warning' ? <AlertTriangle className="h-4 w-4 text-orange-600" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
          Performance Monitor
          <Badge variant={status === 'warning' ? 'destructive' : 'default'} className="ml-auto">
            {status === 'warning' ? 'Issues' : 'Good'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {warnings.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              {warnings.map((warning, index) => (
                <div key={index} className="text-xs">{warning}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Memory className="h-3 w-3 text-blue-600" />
            <span>Memory:</span>
            <span className={`font-mono ${metrics.memoryUsage > threshold.memory ? 'text-orange-600' : 'text-green-600'}`}>
              {metrics.memoryUsage.toFixed(1)}MB
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-purple-600" />
            <span>Render:</span>
            <span className={`font-mono ${metrics.renderTime > threshold.renderTime ? 'text-orange-600' : 'text-green-600'}`}>
              {metrics.renderTime.toFixed(0)}ms
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Database className="h-3 w-3 text-indigo-600" />
            <span>API Calls:</span>
            <span className={`font-mono ${metrics.apiCallCount > threshold.apiCalls ? 'text-orange-600' : 'text-green-600'}`}>
              {metrics.apiCallCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-yellow-600" />
            <span>Cache Hit:</span>
            <span className={`font-mono ${metrics.cacheHitRate < threshold.cacheHitRate ? 'text-orange-600' : 'text-green-600'}`}>
              {metrics.cacheHitRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {metrics.totalQueries > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Query Performance:</span>
              <span className="font-mono">
                {metrics.slowQueries}/{metrics.totalQueries} slow
              </span>
            </div>
            <Progress 
              value={(metrics.slowQueries / metrics.totalQueries) * 100} 
              className="h-1"
            />
          </div>
        )}

        <div className="text-xs text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for easy performance monitoring
export function usePerformanceMonitor(options?: PerformanceMonitorProps) {
  const [isEnabled, setIsEnabled] = useState(options?.enabled ?? true);
  const [showDetails, setShowDetails] = useState(options?.showDetails ?? false);

  const resetMetrics = () => {
    // Reset API call counters
    if (typeof window !== 'undefined') {
      (window as any).__performanceMetrics = {
        apiCallCount: 0,
        cacheHits: 0,
        cacheMisses: 0
      };
    }
  };

  return {
    PerformanceMonitor: () => (
      <PerformanceMonitor 
        enabled={isEnabled} 
        showDetails={showDetails}
        threshold={options?.threshold}
      />
    ),
    isEnabled,
    setIsEnabled,
    showDetails,
    setShowDetails,
    resetMetrics
  };
}
