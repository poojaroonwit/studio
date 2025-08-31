/**
 * Dynamic Resource Monitor
 * 
 * This module monitors system resources and dynamically adjusts application behavior
 * based on available CPU, memory, and database connection health.
 */

interface ResourceMetrics {
  cpu: {
    usage: number; // 0-100
    load: number; // system load average
  };
  memory: {
    used: number; // bytes
    total: number; // bytes
    percentage: number; // 0-100
  };
  database: {
    activeConnections: number;
    maxConnections: number;
    connectionPoolHealth: number; // 0-100
  };
  network: {
    activeRequests: number;
    responseTime: number; // ms
  };
}

interface ResourceThresholds {
  cpu: {
    warning: number; // 70%
    critical: number; // 90%
  };
  memory: {
    warning: number; // 80%
    critical: number; // 95%
  };
  database: {
    warning: number; // 70%
    critical: number; // 90%
  };
}

interface DynamicConfig {
  processingInterval: number; // ms
  batchSize: number;
  maxConcurrentRequests: number;
  timeoutMultiplier: number;
  retryAttempts: number;
}

class ResourceMonitor {
  private metrics: ResourceMetrics = {
    cpu: { usage: 0, load: 0 },
    memory: { used: 0, total: 0, percentage: 0 },
    database: { activeConnections: 0, maxConnections: 0, connectionPoolHealth: 0 },
    network: { activeRequests: 0, responseTime: 0 }
  };

  private thresholds: ResourceThresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    database: { warning: 70, critical: 90 }
  };

  private baseConfig: DynamicConfig = {
    processingInterval: 10000, // 10 seconds
    batchSize: 3,
    maxConcurrentRequests: 5,
    timeoutMultiplier: 1,
    retryAttempts: 3
  };

  private currentConfig: DynamicConfig = { ...this.baseConfig };
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(config: DynamicConfig) => void> = [];

  // Get current resource metrics
  async getMetrics(): Promise<ResourceMetrics> {
    try {
      // CPU usage (simplified - in production, use os.cpus() or process.cpuUsage())
      const cpuUsage = await this.getCPUUsage();
      
      // Memory usage
      const memoryUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      
      // Database connections (if available)
      const dbMetrics = await this.getDatabaseMetrics();
      
      // Network metrics
      const networkMetrics = await this.getNetworkMetrics();

      this.metrics = {
        cpu: { usage: cpuUsage, load: require('os').loadavg()[0] },
        memory: {
          used: memoryUsage.heapUsed,
          total: totalMemory,
          percentage: (memoryUsage.heapUsed / totalMemory) * 100
        },
        database: dbMetrics,
        network: networkMetrics
      };

      return this.metrics;
    } catch (error) {
      console.warn('Failed to get resource metrics:', error);
      return this.metrics;
    }
  }

  // Simplified CPU usage calculation
  private async getCPUUsage(): Promise<number> {
    try {
      const startUsage = process.cpuUsage();
      await new Promise(resolve => setTimeout(resolve, 100));
      const endUsage = process.cpuUsage();
      
      const totalUsage = (endUsage.user - startUsage.user) + (endUsage.system - startUsage.system);
      return Math.min(100, totalUsage / 1000000); // Convert to percentage
    } catch {
      return 0;
    }
  }

  // Get database connection metrics
  private async getDatabaseMetrics(): Promise<ResourceMetrics['database']> {
    try {
      // Try to get database connection info if available
      const { getPool } = await import('@/lib/db');
      const pool = getPool();
      
      if (pool && typeof pool.totalCount === 'function') {
        return {
          activeConnections: pool.totalCount(),
          maxConnections: pool.options.max || 20,
          connectionPoolHealth: (pool.totalCount() / (pool.options.max || 20)) * 100
        };
      }
    } catch (error) {
      // Database not available or pool not accessible
    }

    return {
      activeConnections: 0,
      maxConnections: 20,
      connectionPoolHealth: 0
    };
  }

  // Get network metrics
  private async getNetworkMetrics(): Promise<ResourceMetrics['network']> {
    // Simplified network metrics
    return {
      activeRequests: 0, // Would need to track active requests
      responseTime: 0 // Would need to track response times
    };
  }

  // Calculate resource health score (0-100, higher is better)
  private calculateHealthScore(): number {
    const cpuHealth = Math.max(0, 100 - this.metrics.cpu.usage);
    const memoryHealth = Math.max(0, 100 - this.metrics.memory.percentage);
    const dbHealth = Math.max(0, 100 - this.metrics.database.connectionPoolHealth);

    return (cpuHealth + memoryHealth + dbHealth) / 3;
  }

  // Determine resource pressure level
  private getResourcePressure(): 'low' | 'medium' | 'high' | 'critical' {
    const healthScore = this.calculateHealthScore();
    
    if (healthScore >= 80) return 'low';
    if (healthScore >= 60) return 'medium';
    if (healthScore >= 40) return 'high';
    return 'critical';
  }

  // Dynamically adjust configuration based on resource pressure
  private adjustConfiguration(): DynamicConfig {
    const pressure = this.getResourcePressure();
    const healthScore = this.calculateHealthScore();
    
    // Base multipliers for different pressure levels
    const multipliers = {
      low: { interval: 0.8, batch: 1.2, concurrent: 1.2, timeout: 0.8, retries: 0.8 },
      medium: { interval: 1.0, batch: 1.0, concurrent: 1.0, timeout: 1.0, retries: 1.0 },
      high: { interval: 1.5, batch: 0.8, concurrent: 0.8, timeout: 1.5, retries: 1.2 },
      critical: { interval: 2.5, batch: 0.5, concurrent: 0.5, timeout: 2.0, retries: 1.5 }
    };

    const mult = multipliers[pressure];
    
    // Apply health score as additional adjustment factor
    const healthFactor = healthScore / 100;
    
    const newConfig: DynamicConfig = {
      processingInterval: Math.round(this.baseConfig.processingInterval * mult.interval * (1 + (1 - healthFactor) * 0.5)),
      batchSize: Math.max(1, Math.round(this.baseConfig.batchSize * mult.batch * healthFactor)),
      maxConcurrentRequests: Math.max(1, Math.round(this.baseConfig.maxConcurrentRequests * mult.concurrent * healthFactor)),
      timeoutMultiplier: mult.timeout * (1 + (1 - healthFactor) * 0.5),
      retryAttempts: Math.max(1, Math.round(this.baseConfig.retryAttempts * mult.retries))
    };

    // Ensure minimum and maximum bounds
    newConfig.processingInterval = Math.max(5000, Math.min(60000, newConfig.processingInterval));
    newConfig.batchSize = Math.max(1, Math.min(10, newConfig.batchSize));
    newConfig.maxConcurrentRequests = Math.max(1, Math.min(20, newConfig.maxConcurrentRequests));
    newConfig.timeoutMultiplier = Math.max(0.5, Math.min(3.0, newConfig.timeoutMultiplier));
    newConfig.retryAttempts = Math.max(1, Math.min(5, newConfig.retryAttempts));

    return newConfig;
  }

  // Start resource monitoring
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔄 Starting dynamic resource monitoring');
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateMetrics();
        const newConfig = this.adjustConfiguration();
        
        // Only notify if configuration changed significantly
        if (this.hasSignificantChange(newConfig)) {
          this.currentConfig = newConfig;
          this.notifyListeners(newConfig);
          
          console.log(`📊 Resource pressure: ${this.getResourcePressure()} (${this.calculateHealthScore().toFixed(1)}%)`);
          console.log(`⚙️  Adjusted config:`, {
            interval: `${newConfig.processingInterval}ms`,
            batchSize: newConfig.batchSize,
            maxConcurrent: newConfig.maxConcurrentRequests,
            timeoutMult: newConfig.timeoutMultiplier.toFixed(2),
            retries: newConfig.retryAttempts
          });
        }
      } catch (error) {
        console.error('Error in resource monitoring:', error);
      }
    }, intervalMs);
  }

  // Stop resource monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Stopped dynamic resource monitoring');
  }

  // Update metrics
  private async updateMetrics(): Promise<void> {
    this.metrics = await this.getMetrics();
  }

  // Check if configuration change is significant
  private hasSignificantChange(newConfig: DynamicConfig): boolean {
    const threshold = 0.1; // 10% change threshold
    
    return Math.abs(newConfig.processingInterval - this.currentConfig.processingInterval) / this.currentConfig.processingInterval > threshold ||
           Math.abs(newConfig.batchSize - this.currentConfig.batchSize) / this.currentConfig.batchSize > threshold ||
           Math.abs(newConfig.maxConcurrentRequests - this.currentConfig.maxConcurrentRequests) / this.currentConfig.maxConcurrentRequests > threshold ||
           Math.abs(newConfig.timeoutMultiplier - this.currentConfig.timeoutMultiplier) / this.currentConfig.timeoutMultiplier > threshold;
  }

  // Add configuration change listener
  addListener(listener: (config: DynamicConfig) => void): void {
    this.listeners.push(listener);
  }

  // Remove configuration change listener
  removeListener(listener: (config: DynamicConfig) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  // Notify all listeners of configuration change
  private notifyListeners(config: DynamicConfig): void {
    this.listeners.forEach(listener => {
      try {
        listener(config);
      } catch (error) {
        console.error('Error in resource monitor listener:', error);
      }
    });
  }

  // Get current configuration
  getCurrentConfig(): DynamicConfig {
    return { ...this.currentConfig };
  }

  // Get current metrics
  getCurrentMetrics(): ResourceMetrics {
    return { ...this.metrics };
  }

  // Get resource pressure level
  getCurrentPressure(): 'low' | 'medium' | 'high' | 'critical' {
    return this.getResourcePressure();
  }

  // Get health score
  getHealthScore(): number {
    return this.calculateHealthScore();
  }

  // Update base configuration
  updateBaseConfig(config: Partial<DynamicConfig>): void {
    this.baseConfig = { ...this.baseConfig, ...config };
    console.log('⚙️  Updated base resource configuration:', this.baseConfig);
  }

  // Update thresholds
  updateThresholds(thresholds: Partial<ResourceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    console.log('⚙️  Updated resource thresholds:', this.thresholds);
  }
}

// Export singleton instance
export const resourceMonitor = new ResourceMonitor();

// Export types for use in other modules
export type { ResourceMetrics, ResourceThresholds, DynamicConfig };

// Auto-start monitoring in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  resourceMonitor.startMonitoring();
}
