import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Activity, Clock, Cpu, Server, Zap, TrendingUp, HardDrive, Move, X } from 'lucide-react';
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime';
import { usePerformanceMonitor } from '@/lib/performance-utils';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

interface ApplicationPerformanceMonitorProps {
  showDetails?: boolean;
  onMetricsUpdate?: (metrics: CandidatePerformanceMetrics) => void;
  onClose?: () => void;
  requiredPermission?: string;
}

interface Position {
  x: number;
  y: number;
}

export function ApplicationPerformanceMonitor({ 
  showDetails = false,
  onMetricsUpdate,
  onClose,
  requiredPermission = 'APP_PERFORMANCE_VIEW'
}: ApplicationPerformanceMonitorProps) {
  const { data: session } = useSession();
  const modulePermissions: string[] = (session as any)?.user?.modulePermissions || [];
  const isAuthorized = requiredPermission ? modulePermissions.includes(requiredPermission) : true;

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

  // Application-level monitors
  const perf = usePerformanceMonitor(true);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const realtime = useUnifiedRealtime({ 
    showNotifications: false, 
    showErrorNotifications: false,
    onUserListUpdate: (users) => {
      try {
        setOnlineUsers(Array.isArray(users) ? users : []);
      } catch {
        setOnlineUsers([]);
      }
    }
  });
  const [cpuLoadPct, setCpuLoadPct] = useState<number>(0);
  const longTaskTimeRef = useRef<number>(0);
  const lastCpuCalcRef = useRef<number>(Date.now());

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

  // Estimate CPU load via Long Tasks API
  useEffect(() => {
    if (typeof window === 'undefined' || !(PerformanceObserver as any)) return;
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries as any) {
          if ((entry as any).name === 'longtask' || (entry as any).entryType === 'longtask') {
            longTaskTimeRef.current += (entry as any).duration || 0;
          }
        }
      });
      (observer as any).observe({ type: 'longtask', buffered: true });
    } catch {}

    const interval = setInterval(() => {
      const now = Date.now();
      const windowMs = now - lastCpuCalcRef.current;
      const blockingMs = longTaskTimeRef.current;
      const pct = Math.max(0, Math.min(100, Math.round((blockingMs / windowMs) * 100)));
      setCpuLoadPct(pct);
      longTaskTimeRef.current = 0;
      lastCpuCalcRef.current = now;
    }, 5000);

    return () => {
      try { observer && observer.disconnect(); } catch {}
      clearInterval(interval);
    };
  }, []);

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

  // Permission gate: only render for allowed roles
  if (!isAuthorized) {
    return null;
  }

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
          Application Performance
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
          Application Performance
        </Button>
      </div>
    );
  }

  return (
          <div
        ref={cardRef}
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
                Application Performance
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
          <div className="space-y-3 text-xs">
            {/* CPU and RAM */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center"><Cpu className="h-3 w-3 mr-1" />CPU:</span>
                <span className={cpuLoadPct > 60 ? 'text-orange-500' : 'text-green-600'}>{cpuLoadPct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><Clock className="h-3 w-3 mr-1" />RAM:</span>
                <span className={perf.memory > 150 ? 'text-orange-500' : 'text-green-600'}>{perf.memory}MB</span>
              </div>
            </div>

            {/* Cache */}
            <div className="flex items-center justify-between">
              <span className="flex items-center"><HardDrive className="h-3 w-3 mr-1" />Cache hit rate:</span>
              <span className={(metrics.cacheHits + metrics.cacheMisses) > 0 && (metrics.cacheHits / Math.max(1, (metrics.cacheHits + metrics.cacheMisses))) * 100 < 60 ? 'text-orange-500' : 'text-green-600'}>
                {Math.round((metrics.cacheHits / Math.max(1, (metrics.cacheHits + metrics.cacheMisses))) * 100)}%
              </span>
            </div>

            {/* API */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center"><Zap className="h-3 w-3 mr-1" />Avg API:</span>
                <span className={metrics.averageResponseTime > 800 ? 'text-orange-500' : 'text-green-600'}>{metrics.averageResponseTime.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total API calls:</span>
                <span>{metrics.totalRequests}</span>
              </div>
            </div>

            {/* SSE */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center"><Server className="h-3 w-3 mr-1" />SSE:</span>
                <span className={realtime.connectionHealth === 'poor' || !realtime.isConnected ? 'text-orange-500' : 'text-green-600'}>
                  {realtime.isConnected ? realtime.connectionHealth : 'disconnected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Messages:</span>
                <span>{realtime.messageCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Error rate:</span>
                <span className={realtime.errorRate > 0.05 ? 'text-orange-500' : 'text-green-600'}>{Math.round(realtime.errorRate * 100)}%</span>
              </div>
              {/* Online Users Avatars */}
              {onlineUsers && onlineUsers.length > 0 && (
                <div className="pt-2">
                  <div className="mb-1 text-muted-foreground">Online users</div>
                  <div className="flex -space-x-2">
                    {onlineUsers.slice(0, 6).map((u, idx) => (
                      <Avatar key={u.id ?? idx} className="h-6 w-6 ring-2 ring-background">
                        <AvatarImage src={u.image || u.avatarUrl || ''} alt={u.name || u.email || 'user'} />
                        <AvatarFallback>{(u.name || u.email || '?').substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ))}
                    {onlineUsers.length > 6 && (
                      <div className="h-6 w-6 rounded-full bg-muted text-[10px] grid place-items-center ring-2 ring-background">+{onlineUsers.length - 6}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {status === 'critical' && (
              <div className="flex items-center text-red-500 text-xs mt-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                High latency detected
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Keep the tracker hook name for backward compatibility
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


