import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Activity, Clock, Database, Zap } from 'lucide-react';

interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  apiCalls: number;
  cacheHits: number;
  cacheMisses: number;
}

interface PerformanceMonitorProps {
  componentName: string;
  showDetails?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export function PerformanceMonitor({ 
  componentName, 
  showDetails = false,
  onMetricsUpdate 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    renderTime: 0,
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0
  });

  const [isVisible, setIsVisible] = useState(false);
  const renderStartTime = useRef<number>(0);
  const apiCallCount = useRef<number>(0);
  const cacheHitCount = useRef<number>(0);
  const cacheMissCount = useRef<number>(0);

  // Track render time
  useEffect(() => {
    renderStartTime.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      setMetrics(prev => ({ ...prev, renderTime }));
    };
  });

  // Monitor memory usage
  useEffect(() => {
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({ 
          ...prev, 
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024) 
        }));
      }
    };

    const interval = setInterval(updateMemoryUsage, 5000);
    updateMemoryUsage();

    return () => clearInterval(interval);
  }, []);

  // Track API calls (this would need to be integrated with your fetch wrapper)
  const trackApiCall = (isCacheHit: boolean = false) => {
    if (isCacheHit) {
      cacheHitCount.current++;
    } else {
      cacheMissCount.current++;
      apiCallCount.current++;
    }

    setMetrics(prev => ({
      ...prev,
      apiCalls: apiCallCount.current,
      cacheHits: cacheHitCount.current,
      cacheMisses: cacheMissCount.current
    }));
  };

  // Notify parent component of metrics updates
  useEffect(() => {
    onMetricsUpdate?.(metrics);
  }, [metrics, onMetricsUpdate]);

  const getPerformanceStatus = () => {
    if (metrics.memoryUsage > 100) return 'critical';
    if (metrics.memoryUsage > 50) return 'warning';
    if (metrics.renderTime > 100) return 'warning';
    return 'good';
  };

  const status = getPerformanceStatus();

  if (!isVisible && !showDetails) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50 opacity-50 hover:opacity-100"
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 left-4 z-50 w-80 bg-background/95 backdrop-blur-sm border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            {componentName} Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={status === 'critical' ? 'destructive' : status === 'warning' ? 'secondary' : 'default'}
              className="text-xs"
            >
              {status.toUpperCase()}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center">
              <Database className="h-3 w-3 mr-1" />
              Memory Usage:
            </span>
            <span className={metrics.memoryUsage > 50 ? 'text-orange-500' : 'text-green-500'}>
              {metrics.memoryUsage} MB
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Render Time:
            </span>
            <span className={metrics.renderTime > 100 ? 'text-orange-500' : 'text-green-500'}>
              {metrics.renderTime.toFixed(1)}ms
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center">
              <Zap className="h-3 w-3 mr-1" />
              API Calls:
            </span>
            <span>{metrics.apiCalls}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Cache Hits:</span>
            <span className="text-green-500">{metrics.cacheHits}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Cache Misses:</span>
            <span className="text-orange-500">{metrics.cacheMisses}</span>
          </div>
          
          {status === 'critical' && (
            <div className="flex items-center text-red-500 text-xs mt-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              High memory usage detected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook to track API calls
export function useApiTracker() {
  const trackCall = (endpoint: string, isCacheHit: boolean = false) => {
    // You can integrate this with your fetch wrapper
    console.log(`API Call: ${endpoint} (${isCacheHit ? 'cache hit' : 'cache miss'})`);
  };

  return { trackCall };
}
