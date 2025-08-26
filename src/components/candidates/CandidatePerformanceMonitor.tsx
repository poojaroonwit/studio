import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Activity, Clock, Database, Zap, TrendingUp, TrendingDown, Move, X } from 'lucide-react';

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

interface Position {
  x: number;
  y: number;
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
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 20, y: 80 });
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const requestStartTime = useRef<number>(0);
  const filterChangeTime = useRef<number>(0);
  const requestCount = useRef<number>(0);
  const responseTimes = useRef<number[]>([]);
  const cacheHitCount = useRef<number>(0);
  const cacheMissCount = useRef<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPosition = localStorage.getItem('candidate-performance-monitor-position');
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
      localStorage.setItem('candidate-performance-monitor-position', JSON.stringify(newPosition));
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

    // Ensure we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

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
    // Ensure we're in a browser environment
    if (typeof document === 'undefined') {
      return;
    }

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
          Candidates Performance
          {status === 'critical' && (
            <Badge variant="destructive" className="ml-2 text-xs">
              CRITICAL
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  // If not visible and no showDetails, show minimized button
  if (!isVisible && !showDetails) {
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
          onClick={() => {
            setIsVisible(true);
            onClose?.(); // Reset the external control
          }}
          className="bg-background/95 backdrop-blur-sm border-2 shadow-lg hover:shadow-xl transition-all duration-200 floating-performance-button"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <Activity className="h-4 w-4 mr-2" />
          Candidates Performance
        </Button>
      </div>
    );
  }

  return (
          <div
        ref={cardRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 9999,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        className={`transition-all duration-200 floating-performance-monitor ${isDragging ? 'dragging' : ''}`}
      >
        <Card className="w-80 bg-background/95 backdrop-blur-sm border-2 shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center gap-2 performance-drag-handle"
                onMouseDown={handleMouseDown}
              >
              <Move className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm flex items-center text-primary">
                <Activity className="h-4 w-4 mr-2 animate-pulse" />
                Candidates Performance
              </CardTitle>
            </div>
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
                onClick={() => setIsMinimized(true)}
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <X className="h-3 w-3" />
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
    </div>
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
