import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Activity, Clock, Database, Zap, TrendingUp, TrendingDown } from 'lucide-react';

interface CandidatePerformanceMetrics {
  filterResponseTime: number;
  apiResponseTime: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  lastFilterChange: Date | null;
  isOptimisticUpdate: boolean;
}

interface CandidatePerformanceMonitorProps {
  showDetails?: boolean;
  onMetricsUpdate?: (metrics: CandidatePerformanceMetrics) => void;
  onClose?: () => void;
}

export function CandidatePerformanceMonitor({ 
  showDetails = false,
  onMetricsUpdate,
  onClose
}: CandidatePerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<CandidatePerformanceMetrics>({
    filterResponseTime: 0,
    apiResponseTime: 0,
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    lastFilterChange: null,
    isOptimisticUpdate: false
  });

  const [isVisible, setIsVisible] = useState(false);
  const requestStartTime = useRef<number>(0);
  const filterChangeTime = useRef<number>(0);
  const requestCount = useRef<number>(0);
  const responseTimes = useRef<number[]>([]);
  const cacheHitCount = useRef<number>(0);
  const cacheMissCount = useRef<number>(0);

  // Track filter changes
  const trackFilterChange = () => {
    filterChangeTime.current = Date.now();
    setMetrics(prev => ({
      ...prev,
      lastFilterChange: new Date(),
      isOptimisticUpdate: true
    }));
  };

  // Track API requests
  const trackApiRequest = () => {
    requestStartTime.current = Date.now();
    requestCount.current++;
  };

  // Track API responses
  const trackApiResponse = (isCacheHit: boolean = false) => {
    const responseTime = Date.now() - requestStartTime.current;
    responseTimes.current.push(responseTime);
    
    // Keep only last 10 response times for average calculation
    if (responseTimes.current.length > 10) {
      responseTimes.current.shift();
    }

    if (isCacheHit) {
      cacheHitCount.current++;
    } else {
      cacheMissCount.current++;
    }

    const averageResponseTime = responseTimes.current.reduce((a, b) => a + b, 0) / responseTimes.current.length;

    setMetrics(prev => ({
      ...prev,
      apiResponseTime: responseTime,
      totalRequests: requestCount.current,
      cacheHits: cacheHitCount.current,
      cacheMisses: cacheMissCount.current,
      averageResponseTime,
      isOptimisticUpdate: false
    }));
  };

  // Calculate filter response time
  useEffect(() => {
    if (metrics.lastFilterChange && !metrics.isOptimisticUpdate) {
      const filterResponseTime = Date.now() - filterChangeTime.current;
      setMetrics(prev => ({ ...prev, filterResponseTime }));
    }
  }, [metrics.lastFilterChange, metrics.isOptimisticUpdate]);

  // Notify parent component of metrics updates
  useEffect(() => {
    onMetricsUpdate?.(metrics);
  }, [metrics, onMetricsUpdate]);

  const getPerformanceStatus = () => {
    if (metrics.averageResponseTime > 2000) return 'critical';
    if (metrics.averageResponseTime > 1000) return 'warning';
    if (metrics.filterResponseTime > 500) return 'warning';
    return 'good';
  };

  const status = getPerformanceStatus();

  // Expose tracking functions globally for use in other components
  useEffect(() => {
    (window as any).candidatePerformanceTracker = {
      trackFilterChange,
      trackApiRequest,
      trackApiResponse
    };

    return () => {
      delete (window as any).candidatePerformanceTracker;
    };
  }, []);

  if (!isVisible && !showDetails) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setIsVisible(true);
          onClose?.(); // Reset the external control
        }}
        className="fixed bottom-4 right-4 z-50 opacity-50 hover:opacity-100 transition-opacity duration-200"
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 bg-background/95 backdrop-blur-sm border-2 shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center text-primary">
            <Activity className="h-4 w-4 mr-2 animate-pulse" />
            Candidates Performance
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
              onClick={() => {
                setIsVisible(false);
                onClose?.();
              }}
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
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
              <Clock className="h-3 w-3 mr-1" />
              Filter Response:
            </span>
            <span className={metrics.filterResponseTime > 500 ? 'text-orange-500' : 'text-green-500'}>
              {metrics.filterResponseTime}ms
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center">
              <Zap className="h-3 w-3 mr-1" />
              API Response:
            </span>
            <span className={metrics.apiResponseTime > 1000 ? 'text-orange-500' : 'text-green-500'}>
              {metrics.apiResponseTime}ms
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              Avg Response:
            </span>
            <span className={metrics.averageResponseTime > 1000 ? 'text-orange-500' : 'text-green-500'}>
              {metrics.averageResponseTime.toFixed(0)}ms
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Total Requests:</span>
            <span>{metrics.totalRequests}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Cache Hits:</span>
            <span className="text-green-500">{metrics.cacheHits}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Cache Misses:</span>
            <span className="text-orange-500">{metrics.cacheMisses}</span>
          </div>
          
          {metrics.isOptimisticUpdate && (
            <div className="flex items-center text-blue-500 text-xs mt-2">
              <Activity className="h-3 w-3 mr-1 animate-pulse" />
              Optimistic update active
            </div>
          )}
          
          {status === 'critical' && (
            <div className="flex items-center text-red-500 text-xs mt-2">
              <AlertTriangle className="h-3 w-3 mr-1" />
              High response times detected
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook to use the performance tracker
export function useCandidatePerformanceTracker() {
  const trackFilterChange = () => {
    if ((window as any).candidatePerformanceTracker) {
      (window as any).candidatePerformanceTracker.trackFilterChange();
    }
  };

  const trackApiRequest = () => {
    if ((window as any).candidatePerformanceTracker) {
      (window as any).candidatePerformanceTracker.trackApiRequest();
    }
  };

  const trackApiResponse = (isCacheHit: boolean = false) => {
    if ((window as any).candidatePerformanceTracker) {
      (window as any).candidatePerformanceTracker.trackApiResponse(isCacheHit);
    }
  };

  return {
    trackFilterChange,
    trackApiRequest,
    trackApiResponse
  };
}
