import { useState, useEffect, useCallback } from 'react';
import { getDynamicPerformanceOptimizer, DynamicSettings, PerformanceMetrics } from '@/lib/dynamic-performance-optimizer';

/**
 * Hook to get dynamic performance settings based on system resources
 * Automatically updates when system conditions change
 */
export function useDynamicPerformance() {
  const [settings, setSettings] = useState<DynamicSettings | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    const optimizer = getDynamicPerformanceOptimizer();
    
    // Get initial settings
    setSettings(optimizer.getCurrentSettings());
    setMetrics(optimizer.getCurrentMetrics());

    // Listen for settings changes
    const handleSettingsChanged = (newSettings: DynamicSettings) => {
      setSettings(newSettings);
      setIsOptimizing(true);
      
      // Reset optimizing flag after a short delay
      setTimeout(() => setIsOptimizing(false), 1000);
    };

    optimizer.onSettingsChanged(handleSettingsChanged);

    // Update metrics periodically
    const metricsInterval = setInterval(() => {
      setMetrics(optimizer.getCurrentMetrics());
    }, 10000); // Update metrics every 10 seconds

    return () => {
      clearInterval(metricsInterval);
      // Note: We don't remove the callback as it's a global optimizer
    };
  }, []);

  const forceOptimization = useCallback(() => {
    const optimizer = getDynamicPerformanceOptimizer();
    optimizer.forceUpdate();
  }, []);

  const getOptimizedInterval = useCallback((baseInterval: number, type: 'upload' | 'session' | 'page' | 'favicon'): number => {
    if (!settings) return baseInterval;
    
    switch (type) {
      case 'upload':
        return settings.uploadQueueInterval;
      case 'session':
        return settings.sessionValidationInterval;
      case 'page':
        return settings.pageLoadingDebounce;
      case 'favicon':
        return settings.faviconUpdateInterval;
      default:
        return baseInterval;
    }
  }, [settings]);

  const getOptimizedThreshold = useCallback((baseThreshold: number, type: 'loop' | 'render'): number => {
    if (!settings) return baseThreshold;
    
    switch (type) {
      case 'loop':
        return settings.infiniteLoopMaxRuns;
      case 'render':
        return settings.renderMonitorThreshold;
      default:
        return baseThreshold;
    }
  }, [settings]);

  const getOptimizedBatchSize = useCallback((baseBatchSize: number): number => {
    return settings?.batchSize || baseBatchSize;
  }, [settings]);

  const getOptimizedTimeout = useCallback((baseTimeout: number, type: 'connection' | 'request'): number => {
    if (!settings) return baseTimeout;
    
    switch (type) {
      case 'connection':
        return settings.connectionTimeout;
      case 'request':
        return settings.requestTimeout;
      default:
        return baseTimeout;
    }
  }, [settings]);

  return {
    settings,
    metrics,
    isOptimizing,
    forceOptimization,
    getOptimizedInterval,
    getOptimizedThreshold,
    getOptimizedBatchSize,
    getOptimizedTimeout
  };
}

/**
 * Hook to get performance recommendations based on current system state
 */
export function usePerformanceRecommendations() {
  const { metrics, settings } = useDynamicPerformance();
  
  const recommendations = useCallback(() => {
    if (!metrics || !settings) return [];

    const recs: string[] = [];

    // CPU-based recommendations
    if (metrics.cpuUsage > 80) {
      recs.push('High CPU usage detected - reducing background processing');
    } else if (metrics.cpuUsage > 60) {
      recs.push('Moderate CPU usage - optimizing processing intervals');
    }

    // Memory-based recommendations
    if (metrics.memoryUsage > 80) {
      recs.push('High memory usage - reducing batch sizes and processing frequency');
    } else if (metrics.memoryUsage > 60) {
      recs.push('Moderate memory usage - optimizing resource usage');
    }

    // Network-based recommendations
    if (metrics.networkSpeed === 'slow') {
      recs.push('Slow network detected - increasing timeouts and reducing batch sizes');
    }

    // Device-based recommendations
    if (metrics.deviceType === 'mobile') {
      recs.push('Mobile device detected - optimizing for battery and performance');
    }

    // Battery-based recommendations
    if (metrics.batteryLevel !== undefined && metrics.batteryLevel < 20) {
      recs.push('Low battery detected - aggressive power saving mode');
    } else if (metrics.batteryLevel !== undefined && metrics.batteryLevel < 50) {
      recs.push('Moderate battery level - conservative power usage');
    }

    return recs;
  }, [metrics, settings]);

  return recommendations();
}

/**
 * Hook to get performance status summary
 */
export function usePerformanceStatus() {
  const { metrics, settings, isOptimizing } = useDynamicPerformance();
  
  const getStatus = useCallback(() => {
    if (!metrics || !settings) return 'unknown';

    if (isOptimizing) return 'optimizing';

    // Determine overall performance status
    if (metrics.cpuUsage > 80 || metrics.memoryUsage > 80) {
      return 'critical';
    } else if (metrics.cpuUsage > 60 || metrics.memoryUsage > 60) {
      return 'warning';
    } else if (metrics.networkSpeed === 'slow') {
      return 'slow';
    } else {
      return 'optimal';
    }
  }, [metrics, settings, isOptimizing]);

  const getStatusColor = useCallback(() => {
    const status = getStatus();
    switch (status) {
      case 'critical':
        return 'red';
      case 'warning':
        return 'yellow';
      case 'slow':
        return 'orange';
      case 'optimizing':
        return 'blue';
      case 'optimal':
        return 'green';
      default:
        return 'gray';
    }
  }, [getStatus]);

  return {
    status: getStatus(),
    statusColor: getStatusColor(),
    isOptimizing
  };
}
