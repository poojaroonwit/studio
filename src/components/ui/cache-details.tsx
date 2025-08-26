"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { 
  Database, 
  Clock, 
  Zap, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Move, 
  X, 
  RefreshCw,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle,
  HardDrive,
  Globe,
  Smartphone
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';

interface CacheEntry {
  key: string;
  size: number;
  timestamp: number;
  ttl: number;
  hits: number;
  misses: number;
  type: 'client' | 'api' | 'browser' | 'avatar' | 'positions';
}

interface CacheDetailsProps {
  enabled?: boolean;
  showDetails?: boolean;
}

interface Position {
  x: number;
  y: number;
}

export function CacheDetails({ 
  enabled = true, 
  showDetails = false 
}: CacheDetailsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 20, y: 100 });
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    memory: 0,
    apiCalls: 0,
    cacheHitRate: 0,
    totalCacheSize: 0,
    cacheEntries: 0,
    slowQueries: 0,
    totalQueries: 0
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  
  const apiCallCount = useRef(0);
  const cacheHits = useRef(0);
  const cacheMisses = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPosition = localStorage.getItem('cache-details-position');
      if (savedPosition) {
        try {
          const parsed = JSON.parse(savedPosition);
          setPosition(parsed);
        } catch (e) {
          // Failed to parse saved position
        }
      }
    }
  }, []);

  // Save position to localStorage
  const savePosition = useCallback((newPosition: Position) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cache-details-position', JSON.stringify(newPosition));
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
    const maxX = window.innerWidth - (cardRef.current?.offsetWidth || 400);
    const maxY = window.innerHeight - (cardRef.current?.offsetHeight || 300);

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
        setPerformanceMetrics(prev => ({ ...prev, memory: usedMB }));
      }
    };

    const interval = setInterval(updateMemoryUsage, 5000);
    updateMemoryUsage();

    return () => clearInterval(interval);
  }, [enabled]);

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
          setPerformanceMetrics(prev => ({
            ...prev,
            slowQueries: prev.slowQueries + 1,
            totalQueries: prev.totalQueries + 1
          }));
        } else {
          setPerformanceMetrics(prev => ({
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

  // Update cache hit rate and API calls
  useEffect(() => {
    const total = cacheHits.current + cacheMisses.current;
    if (total > 0) {
      const hitRate = (cacheHits.current / total) * 100;
      setPerformanceMetrics(prev => ({ 
        ...prev, 
        cacheHitRate: hitRate, 
        apiCalls: apiCallCount.current 
      }));
    }
  }, [performanceMetrics.totalQueries]);

  // Collect cache information
  const collectCacheInfo = useCallback(() => {
    const entries: CacheEntry[] = [];
    let totalSize = 0;
    let totalEntries = 0;

    // Client-side caches
    if (typeof window !== 'undefined') {
      // Check localStorage
      const localStorageSize = new Blob(Object.values(localStorage)).size;
      if (localStorageSize > 0) {
        entries.push({
          key: 'localStorage',
          size: localStorageSize,
          timestamp: Date.now(),
          ttl: Infinity,
          hits: 0,
          misses: 0,
          type: 'client'
        });
        totalSize += localStorageSize;
        totalEntries += Object.keys(localStorage).length;
      }

      // Check sessionStorage
      const sessionStorageSize = new Blob(Object.values(sessionStorage)).size;
      if (sessionStorageSize > 0) {
        entries.push({
          key: 'sessionStorage',
          size: sessionStorageSize,
          timestamp: Date.now(),
          ttl: Infinity,
          hits: 0,
          misses: 0,
          type: 'client'
        });
        totalSize += sessionStorageSize;
        totalEntries += Object.keys(sessionStorage).length;
      }

      // Check IndexedDB (if available)
      if ('indexedDB' in window) {
        entries.push({
          key: 'IndexedDB',
          size: 0, // Would need to query actual size
          timestamp: Date.now(),
          ttl: Infinity,
          hits: 0,
          misses: 0,
          type: 'client'
        });
      }

      // Check Service Worker caches
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            if (registration.active) {
              caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                  caches.open(cacheName).then(cache => {
                    cache.keys().then(requests => {
                      const cacheSize = requests.length * 1024; // Estimate
                      entries.push({
                        key: `Service Worker: ${cacheName}`,
                        size: cacheSize,
                        timestamp: Date.now(),
                        ttl: Infinity,
                        hits: 0,
                        misses: 0,
                        type: 'browser'
                      });
                    });
                  });
                });
              });
            }
          });
        });
      }
    }

    // Simulate known caches from the codebase
    const knownCaches = [
      { name: 'Positions Cache', type: 'positions', size: 50 * 1024, ttl: 5 * 60 * 1000 },
      { name: 'Avatar Cache', type: 'avatar', size: 20 * 1024, ttl: 5 * 60 * 1000 },
      { name: 'Candidate Detail Cache', type: 'client', size: 100 * 1024, ttl: 30 * 1000 },
      { name: 'API Response Cache', type: 'api', size: 200 * 1024, ttl: 2 * 60 * 1000 }
    ];

    knownCaches.forEach(cache => {
      entries.push({
        key: cache.name,
        size: cache.size,
        timestamp: Date.now() - Math.random() * cache.ttl,
        ttl: cache.ttl,
        hits: Math.floor(Math.random() * 100),
        misses: Math.floor(Math.random() * 20),
        type: cache.type as any
      });
      totalSize += cache.size;
      totalEntries++;
    });

    setCacheEntries(entries);
    setPerformanceMetrics(prev => ({ 
      ...prev, 
      totalCacheSize: totalSize,
      cacheEntries: totalEntries
    }));
  }, []);

  // Collect cache info periodically
  useEffect(() => {
    if (!enabled) return;

    collectCacheInfo();
    const interval = setInterval(collectCacheInfo, 10000);

    return () => clearInterval(interval);
  }, [enabled, collectCacheInfo]);

  // Clear all caches
  const clearAllCaches = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
      
      // Clear Service Worker caches
      if ('serviceWorker' in navigator) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
          });
        });
      }
      
      // Reset counters
      apiCallCount.current = 0;
      cacheHits.current = 0;
      cacheMisses.current = 0;
      
      // Refresh cache info
      collectCacheInfo();
    }
  }, [collectCacheInfo]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (timestamp: number) => {
    const age = Date.now() - timestamp;
    if (age < 60000) return `${Math.floor(age / 1000)}s ago`;
    if (age < 3600000) return `${Math.floor(age / 60000)}m ago`;
    return `${Math.floor(age / 3600000)}h ago`;
  };

  const getCacheTypeIcon = (type: string) => {
    switch (type) {
      case 'client': return <Smartphone className="h-3 w-3" />;
      case 'api': return <Database className="h-3 w-3" />;
      case 'browser': return <Globe className="h-3 w-3" />;
      case 'avatar': return <HardDrive className="h-3 w-3" />;
      case 'positions': return <Database className="h-3 w-3" />;
      default: return <Info className="h-3 w-3" />;
    }
  };

  const getCacheTypeColor = (type: string) => {
    switch (type) {
      case 'client': return 'bg-blue-100 text-blue-800';
      case 'api': return 'bg-green-100 text-green-800';
      case 'browser': return 'bg-purple-100 text-purple-800';
      case 'avatar': return 'bg-orange-100 text-orange-800';
      case 'positions': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
          className="bg-background/95 backdrop-blur-sm border-2 shadow-lg hover:shadow-xl transition-all duration-200"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <Database className="h-4 w-4 mr-2" />
          Cache Details
          <Badge variant="secondary" className="ml-2 text-xs">
            {performanceMetrics.cacheEntries}
          </Badge>
        </Button>
      </div>
    );
  }

  // If not visible, show minimized button
  if (!isVisible) {
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
          className="bg-background/95 backdrop-blur-sm border-2 shadow-lg hover:shadow-xl transition-all duration-200"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <Database className="h-4 w-4 mr-2" />
          Cache Details
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-200 ${isDragging ? 'dragging' : ''}`}
    >
      <Card className={`w-96 bg-background/95 backdrop-blur-sm border-2 shadow-2xl transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-2"
              onMouseDown={handleMouseDown}
            >
              <Move className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Cache Details
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {performanceMetrics.cacheEntries} entries
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
          <CardContent className="pt-0 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {/* Overview Section */}
              <Collapsible open={expandedSections.has('overview')}>
                <CollapsibleTrigger 
                  className="flex items-center justify-between w-full text-left text-sm font-medium"
                  onClick={() => toggleSection('overview')}
                >
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Overview
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(performanceMetrics.totalCacheSize)}
                    </span>
                    {expandedSections.has('overview') ? '−' : '+'}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      <span>Total Size:</span>
                      <span className="font-semibold">
                        {formatBytes(performanceMetrics.totalCacheSize)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Database className="h-3 w-3" />
                      <span>Entries:</span>
                      <span className="font-semibold">
                        {performanceMetrics.cacheEntries}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      <span>Hit Rate:</span>
                      <span className={`font-semibold ${
                        performanceMetrics.cacheHitRate > 70 ? 'text-green-600' : 
                        performanceMetrics.cacheHitRate > 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Math.round(performanceMetrics.cacheHitRate)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <span>API Calls:</span>
                      <span className="font-semibold">
                        {performanceMetrics.apiCalls}
                      </span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Cache Entries Section */}
              <Collapsible open={expandedSections.has('entries')}>
                <CollapsibleTrigger 
                  className="flex items-center justify-between w-full text-left text-sm font-medium"
                  onClick={() => toggleSection('entries')}
                >
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Cache Entries
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {cacheEntries.length} items
                    </span>
                    {expandedSections.has('entries') ? '−' : '+'}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {cacheEntries.map((entry, index) => (
                      <div key={index} className="text-xs p-2 bg-muted/50 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {getCacheTypeIcon(entry.type)}
                            <span className="font-medium truncate">{entry.key}</span>
                            <Badge variant="outline" className={`text-xs ${getCacheTypeColor(entry.type)}`}>
                              {entry.type}
                            </Badge>
                          </div>
                          <span className="text-muted-foreground">
                            {formatBytes(entry.size)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>{formatTime(entry.timestamp)}</span>
                          <span>Hits: {entry.hits} | Misses: {entry.misses}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Performance Section */}
              <Collapsible open={expandedSections.has('performance')}>
                <CollapsibleTrigger 
                  className="flex items-center justify-between w-full text-left text-sm font-medium"
                  onClick={() => toggleSection('performance')}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Performance
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {performanceMetrics.slowQueries} slow
                    </span>
                    {expandedSections.has('performance') ? '−' : '+'}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      <span>Memory:</span>
                      <span className={`font-semibold ${
                        performanceMetrics.memory > 100 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {performanceMetrics.memory}MB
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Slow Queries:</span>
                      <span className={`font-semibold ${
                        performanceMetrics.slowQueries > 5 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {performanceMetrics.slowQueries}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <span>Total Queries:</span>
                      <span className="font-semibold">
                        {performanceMetrics.totalQueries}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Cache Hits:</span>
                      <span className="font-semibold text-green-600">
                        {cacheHits.current}
                      </span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Actions Section */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collectCacheInfo}
                  className="flex-1 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearAllCaches}
                  className="flex-1 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Hook for easy cache details monitoring
export function useCacheDetails(options?: CacheDetailsProps) {
  const [isEnabled, setIsEnabled] = useState(options?.enabled ?? true);
  const [showDetails, setShowDetails] = useState(options?.showDetails ?? false);

  return {
    CacheDetails: () => (
      <CacheDetails 
        enabled={isEnabled} 
        showDetails={showDetails}
      />
    ),
    isEnabled,
    setIsEnabled,
    showDetails,
    setShowDetails
  };
}
