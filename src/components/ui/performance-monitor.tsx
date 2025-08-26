"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { AlertTriangle, Clock, Zap, Activity, TrendingUp, TrendingDown, Move, X } from 'lucide-react';

interface PerformanceMetrics {
  memory: number;
  renderTime: number;
  apiCalls: number;
  cacheHitRate: number;
  navigationTime: number;
  slowQueries: number;
  totalQueries: number;
  pageLoadTime: number;
  domContentLoaded: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  showDetails?: boolean;
  threshold?: {
    memory: number;
    renderTime: number;
    apiCalls: number;
    cacheHitRate: number;
    navigationTime: number;
  };
}

interface Position {
  x: number;
  y: number;
}

export function PerformanceMonitor({ 
  enabled = true, 
  showDetails = false,
  threshold = {
    memory: 100,
    renderTime: 1000,
    apiCalls: 10,
    cacheHitRate: 50,
    navigationTime: 2000
  }
}: PerformanceMonitorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memory: 0,
    renderTime: 0,
    apiCalls: 0,
    cacheHitRate: 0,
    navigationTime: 0,
    slowQueries: 0,
    totalQueries: 0,
    pageLoadTime: 0,
    domContentLoaded: 0
  });
  const [warnings, setWarnings] = useState<string[]>([]);
  const [navigationHistory, setNavigationHistory] = useState<Array<{
    path: string;
    time: number;
    duration: number;
  }>>([]);
  
  const apiCallCount = useRef(0);
  const cacheHits = useRef(0);
  const cacheMisses = useRef(0);
  const navigationStartTime = useRef<number | null>(null);
  const lastPathname = useRef<string>('');
  const cardRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPosition = localStorage.getItem('performance-monitor-position');
      if (savedPosition) {
        try {
          const parsed = JSON.parse(savedPosition);
          setPosition(parsed);
        } catch (e) {
          console.warn('Failed to parse saved position:', e);
        }
      }
    }
  }, []);

  // Save position to localStorage
  const savePosition = useCallback((newPosition: Position) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('performance-monitor-position', JSON.stringify(newPosition));
    }
  }, []);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    // Constrain to viewport bounds
    const maxX = window.innerWidth - (cardRef.current?.offsetWidth || 320);
    const maxY = window.innerHeight - (cardRef.current?.offsetHeight || 200);

    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));

    setPosition({ x: constrainedX, y: constrainedY });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      savePosition(position);
    }
  }, [isDragging, position, savePosition]);

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Monitor memory usage
  useEffect(() => {
    if (!enabled) return;

    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memoryInfo = (performance as any).memory;
        const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
        setMetrics(prev => ({ ...prev, memory: usedMB }));
      }
    };

    const interval = setInterval(updateMemoryUsage, 5000);
    updateMemoryUsage();

    return () => clearInterval(interval);
  }, [enabled]);

  // Monitor navigation performance
  useEffect(() => {
    if (!enabled) return;

    const handleNavigationStart = () => {
      navigationStartTime.current = performance.now();
    };

    const handleNavigationEnd = () => {
      if (navigationStartTime.current) {
        const duration = performance.now() - navigationStartTime.current;
        const currentPath = window.location.pathname;
        
        setNavigationHistory(prev => [
          { path: currentPath, time: Date.now(), duration },
          ...prev.slice(0, 9) // Keep last 10 navigations
        ]);
        
        setMetrics(prev => ({ ...prev, navigationTime: duration }));
        navigationStartTime.current = null;
      }
    };

    // Monitor page load performance
    const handlePageLoad = () => {
      const loadTime = performance.now();
      setMetrics(prev => ({ ...prev, pageLoadTime: loadTime }));
    };

    // Monitor DOM content loaded
    const handleDOMContentLoaded = () => {
      const domTime = performance.now();
      setMetrics(prev => ({ ...prev, domContentLoaded: domTime }));
    };

    // Listen for navigation events
    window.addEventListener('beforeunload', handleNavigationStart);
    window.addEventListener('load', handleNavigationEnd);
    window.addEventListener('load', handlePageLoad);
    document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);

    return () => {
      window.removeEventListener('beforeunload', handleNavigationStart);
      window.removeEventListener('load', handleNavigationEnd);
      window.removeEventListener('load', handlePageLoad);
      document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
    };
  }, [enabled]);

  // Monitor render performance
  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();

    const measureRenderTime = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        const renderTime = 1000 / fps;
        
        setMetrics(prev => ({ ...prev, renderTime }));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureRenderTime);
    };

    requestAnimationFrame(measureRenderTime);
  }, [enabled]);

  // Generate warnings based on thresholds
  useEffect(() => {
    const newWarnings: string[] = [];
    
    if (metrics.memory > threshold.memory) {
      newWarnings.push(`High memory usage: ${metrics.memory}MB`);
    }
    
    if (metrics.renderTime > threshold.renderTime) {
      newWarnings.push(`Slow rendering: ${Math.round(metrics.renderTime)}ms`);
    }
    
    if (metrics.apiCalls > threshold.apiCalls) {
      newWarnings.push(`Too many API calls: ${metrics.apiCalls}`);
    }
    
    if (metrics.cacheHitRate < threshold.cacheHitRate) {
      newWarnings.push(`Low cache hit rate: ${Math.round(metrics.cacheHitRate)}%`);
    }
    
    if (metrics.navigationTime > threshold.navigationTime) {
      newWarnings.push(`Slow navigation: ${Math.round(metrics.navigationTime)}ms`);
    }

    setWarnings(newWarnings);
  }, [metrics, threshold]);

  // Auto-hide after 10 seconds
  useEffect(() => {
    if (warnings.length > 0 && showDetails) {
      const timeoutId = setTimeout(() => {
        setIsVisible(false);
      }, 10000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [warnings, showDetails]);

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

  // Update cache hit rate
  useEffect(() => {
    const total = cacheHits.current + cacheMisses.current;
    if (total > 0) {
      const hitRate = (cacheHits.current / total) * 100;
      setMetrics(prev => ({ ...prev, cacheHitRate: hitRate, apiCalls: apiCallCount.current }));
    }
  }, [metrics.totalQueries]);

  const getPerformanceStatus = () => {
    const hasWarnings = warnings.length > 0;
    return hasWarnings ? 'warning' : 'good';
  };

  const status = getPerformanceStatus();

  // If minimized, show just the floating button
  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 9999,
          cursor: 'pointer'
        }}
        onMouseDown={handleMouseDown}
        className="transition-all duration-200 hover:scale-110"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="bg-background/95 backdrop-blur-sm border-2 shadow-lg hover:shadow-xl transition-all duration-200 floating-performance-button"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <Activity className="h-4 w-4 mr-2" />
          Performance
          {warnings.length > 0 && (
            <Badge variant="destructive" className="ml-2 text-xs">
              {warnings.length}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  // If not visible and no warnings, show minimized button
  if (!isVisible && warnings.length === 0) {
    return (
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 9999,
          cursor: 'pointer'
        }}
        onMouseDown={handleMouseDown}
        className="transition-all duration-200 hover:scale-110"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-background/95 backdrop-blur-sm border-2 shadow-lg hover:shadow-xl transition-all duration-200 floating-performance-button"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <Activity className="h-4 w-4 mr-2" />
          Performance
        </Button>
      </div>
    );
  }

  return (
          <div
        ref={cardRef}
        className={`transition-all duration-200 floating-performance-monitor ${isDragging ? 'dragging' : ''}`}
      >
        <Card className={`w-80 bg-background/95 backdrop-blur-sm border-2 shadow-2xl transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center gap-2 performance-drag-handle"
                onMouseDown={handleMouseDown}
              >
              <Move className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Performance Monitor
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status === 'warning' ? 'destructive' : 'default'} className="text-xs">
                {status === 'warning' ? <AlertTriangle className="h-3 w-3 mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                {status === 'warning' ? warnings.length : 'Good'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {isVisible && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              {/* Current Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Memory:</span>
                  <span className={metrics.memory > threshold.memory ? 'text-red-500 font-semibold' : ''}>
                    {metrics.memory}MB
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>Render:</span>
                  <span className={metrics.renderTime > threshold.renderTime ? 'text-red-500 font-semibold' : ''}>
                    {Math.round(metrics.renderTime)}ms
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  <span>API Calls:</span>
                  <span className={metrics.apiCalls > threshold.apiCalls ? 'text-red-500 font-semibold' : ''}>
                    {metrics.apiCalls}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>Cache:</span>
                  <span className={metrics.cacheHitRate < threshold.cacheHitRate ? 'text-red-500 font-semibold' : ''}>
                    {Math.round(metrics.cacheHitRate)}%
                  </span>
                </div>
              </div>

              {/* Navigation Performance */}
              {metrics.navigationTime > 0 && (
                <div className="text-xs">
                  <div className="flex items-center gap-1 mb-1">
                    <TrendingDown className="h-3 w-3" />
                    <span>Last Navigation:</span>
                    <span className={metrics.navigationTime > threshold.navigationTime ? 'text-red-500 font-semibold' : ''}>
                      {Math.round(metrics.navigationTime)}ms
                    </span>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-red-600">Warnings:</div>
                  {warnings.map((warning, index) => (
                    <div key={index} className="text-xs text-red-500 bg-red-50 p-1 rounded">
                      {warning}
                    </div>
                  ))}
                </div>
              )}

              {/* Navigation History */}
              {showDetails && navigationHistory.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold">Recent Navigation:</div>
                  <div className="max-h-20 overflow-y-auto space-y-1">
                    {navigationHistory.map((nav, index) => (
                      <div key={index} className="text-xs flex justify-between">
                        <span className="truncate">{nav.path}</span>
                        <span className={nav.duration > threshold.navigationTime ? 'text-red-500' : 'text-green-500'}>
                          {Math.round(nav.duration)}ms
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
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

  // Development-only memory leak detection
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // Start memory leak detection automatically in dev
      const { startMemoryLeakDetection } = require('@/lib/performance-utils-core');
      startMemoryLeakDetection(100, 10000); // 100MB threshold, check every 10s
      
      return () => {
        const { stopMemoryLeakDetection } = require('@/lib/performance-utils-core');
        stopMemoryLeakDetection();
      };
    }
  }, []);

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
