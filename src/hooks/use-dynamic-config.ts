import { useState, useEffect, useCallback } from 'react';
import { resourceMonitor, type DynamicConfig } from '@/lib/resource-monitor';

/**
 * Hook to get dynamic configuration based on system resources
 * Automatically updates when resource pressure changes
 */
export function useDynamicConfig() {
  const [config, setConfig] = useState<DynamicConfig>(resourceMonitor.getCurrentConfig());
  const [pressure, setPressure] = useState<'low' | 'medium' | 'high' | 'critical'>(
    resourceMonitor.getCurrentPressure()
  );
  const [healthScore, setHealthScore] = useState<number>(resourceMonitor.getHealthScore());

  // Update configuration when resource monitor changes
  const handleConfigChange = useCallback((newConfig: DynamicConfig) => {
    setConfig(newConfig);
    setPressure(resourceMonitor.getCurrentPressure());
    setHealthScore(resourceMonitor.getHealthScore());
  }, []);

  useEffect(() => {
    // Add listener for configuration changes
    resourceMonitor.addListener(handleConfigChange);

    // Initial update
    setConfig(resourceMonitor.getCurrentConfig());
    setPressure(resourceMonitor.getCurrentPressure());
    setHealthScore(resourceMonitor.getHealthScore());

    return () => {
      resourceMonitor.removeListener(handleConfigChange);
    };
  }, [handleConfigChange]);

  // Get configuration for specific use case
  const getConfigFor = useCallback((useCase: 'upload' | 'processing' | 'api' | 'ui') => {
    const baseConfig = config;
    
    switch (useCase) {
      case 'upload':
        return {
          batchSize: baseConfig.batchSize,
          maxConcurrent: baseConfig.maxConcurrentRequests,
          timeout: baseConfig.timeoutMultiplier * 30000, // 30s base
          retries: baseConfig.retryAttempts
        };
      
      case 'processing':
        return {
          interval: baseConfig.processingInterval,
          batchSize: baseConfig.batchSize,
          maxConcurrent: baseConfig.maxConcurrentRequests,
          timeout: baseConfig.timeoutMultiplier * 60000, // 60s base
          retries: baseConfig.retryAttempts
        };
      
      case 'api':
        return {
          timeout: baseConfig.timeoutMultiplier * 10000, // 10s base
          retries: baseConfig.retryAttempts,
          maxConcurrent: baseConfig.maxConcurrentRequests
        };
      
      case 'ui':
        return {
          debounceDelay: pressure === 'critical' ? 1000 : pressure === 'high' ? 500 : 200,
          updateInterval: pressure === 'critical' ? 5000 : pressure === 'high' ? 3000 : 1000,
          maxRenders: pressure === 'critical' ? 50 : pressure === 'high' ? 100 : 200
        };
      
      default:
        return baseConfig;
    }
  }, [config, pressure]);

  // Get performance recommendations
  const getRecommendations = useCallback(() => {
    const recommendations: string[] = [];
    
    if (pressure === 'critical') {
      recommendations.push('System under critical load - consider reducing workload');
      recommendations.push('Increase processing intervals and reduce batch sizes');
      recommendations.push('Monitor memory usage and consider restarting if needed');
    } else if (pressure === 'high') {
      recommendations.push('System under high load - processing may be slower');
      recommendations.push('Consider reducing concurrent operations');
    } else if (pressure === 'low') {
      recommendations.push('System has good performance - can increase workload');
      recommendations.push('Consider increasing batch sizes for better efficiency');
    }
    
    return recommendations;
  }, [pressure]);

  return {
    config,
    pressure,
    healthScore,
    getConfigFor,
    getRecommendations,
    isHealthy: healthScore > 60,
    isUnderPressure: pressure === 'high' || pressure === 'critical'
  };
}
