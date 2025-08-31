/**
 * Dynamic Performance Optimizer
 * 
 * Automatically adjusts application performance settings based on available system resources
 * including CPU usage, memory availability, network conditions, and device capabilities.
 */

interface PerformanceMetrics {
  cpuUsage: number; // 0-100
  memoryUsage: number; // 0-100
  availableMemory: number; // MB
  networkSpeed: 'slow' | 'medium' | 'fast';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  batteryLevel?: number; // 0-100 (mobile only)
  isLowPowerMode?: boolean;
}

interface DynamicSettings {
  // Processing intervals
  uploadQueueInterval: number; // ms
  sessionValidationInterval: number; // ms
  pageLoadingDebounce: number; // ms
  faviconUpdateInterval: number; // ms
  
  // Monitoring thresholds
  infiniteLoopMaxRuns: number;
  infiniteLoopTimeWindow: number; // ms
  renderMonitorThreshold: number;
  
  // Background processing
  batchSize: number;
  maxConcurrentProcessors: number;
  connectionTimeout: number; // ms
  requestTimeout: number; // ms
  
  // UI responsiveness
  animationFrameRate: number; // fps
  debounceDelay: number; // ms
  throttleDelay: number; // ms
}

class DynamicPerformanceOptimizer {
  private currentSettings: DynamicSettings;
  private metrics: PerformanceMetrics;
  private updateCallbacks: Array<(settings: DynamicSettings) => void> = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.metrics = this.getInitialMetrics();
    this.currentSettings = this.calculateOptimalSettings(this.metrics);
  }

  private getInitialMetrics(): PerformanceMetrics {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      availableMemory: this.getAvailableMemory(),
      networkSpeed: this.detectNetworkSpeed(),
      deviceType: this.detectDeviceType(),
      batteryLevel: this.getBatteryLevel(),
      isLowPowerMode: this.isLowPowerMode()
    };
  }

  private getAvailableMemory(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    return 1024; // Default 1GB
  }

  private detectNetworkSpeed(): 'slow' | 'medium' | 'fast' {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.effectiveType) {
        switch (connection.effectiveType) {
          case 'slow-2g':
          case '2g':
            return 'slow';
          case '3g':
            return 'medium';
          case '4g':
          default:
            return 'fast';
        }
      }
    }
    return 'medium'; // Default
  }

  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getBatteryLevel(): number | undefined {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      // Battery API is available but async, we'll handle it in updateMetrics
      return undefined;
    }
    return undefined;
  }

  private isLowPowerMode(): boolean {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      // Check for low power mode indicators
      return false; // Default
    }
    return false;
  }

  private async updateMetrics(): Promise<void> {
    const newMetrics: PerformanceMetrics = {
      cpuUsage: await this.measureCPUUsage(),
      memoryUsage: this.measureMemoryUsage(),
      availableMemory: this.getAvailableMemory(),
      networkSpeed: this.detectNetworkSpeed(),
      deviceType: this.detectDeviceType(),
      batteryLevel: await this.getBatteryLevelAsync(),
      isLowPowerMode: this.isLowPowerMode()
    };

    this.metrics = newMetrics;
  }

  private async measureCPUUsage(): Promise<number> {
    // Simple CPU usage estimation based on event loop lag
    const start = performance.now();
    await new Promise(resolve => setTimeout(resolve, 100));
    const end = performance.now();
    const lag = end - start - 100;
    
    // Convert lag to approximate CPU usage (0-100)
    return Math.min(100, Math.max(0, lag * 10));
  }

  private measureMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
    }
    return 50; // Default 50%
  }

  private async getBatteryLevelAsync(): Promise<number | undefined> {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return Math.round(battery.level * 100);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private calculateOptimalSettings(metrics: PerformanceMetrics): DynamicSettings {
    const { cpuUsage, memoryUsage, availableMemory, networkSpeed, deviceType, batteryLevel, isLowPowerMode } = metrics;
    
    // Base settings for high-performance systems
    let settings: DynamicSettings = {
      uploadQueueInterval: 5000,
      sessionValidationInterval: 5 * 60 * 1000,
      pageLoadingDebounce: 200,
      faviconUpdateInterval: 500,
      infiniteLoopMaxRuns: 100,
      infiniteLoopTimeWindow: 10000,
      renderMonitorThreshold: 200,
      batchSize: 5,
      maxConcurrentProcessors: 5,
      connectionTimeout: 30000,
      requestTimeout: 120000,
      animationFrameRate: 60,
      debounceDelay: 300,
      throttleDelay: 100
    };

    // Adjust based on CPU usage
    if (cpuUsage > 80) {
      settings.uploadQueueInterval *= 2;
      settings.sessionValidationInterval *= 2;
      settings.batchSize = Math.max(1, settings.batchSize - 2);
      settings.maxConcurrentProcessors = Math.max(1, settings.maxConcurrentProcessors - 2);
      settings.animationFrameRate = 30;
    } else if (cpuUsage > 60) {
      settings.uploadQueueInterval = Math.round(settings.uploadQueueInterval * 1.5);
      settings.batchSize = Math.max(2, settings.batchSize - 1);
      settings.animationFrameRate = 45;
    }

    // Adjust based on memory usage
    if (memoryUsage > 80 || availableMemory < 512) {
      settings.uploadQueueInterval *= 2;
      settings.batchSize = Math.max(1, settings.batchSize - 1);
      settings.maxConcurrentProcessors = Math.max(1, settings.maxConcurrentProcessors - 1);
      settings.renderMonitorThreshold = Math.round(settings.renderMonitorThreshold * 0.5);
    } else if (memoryUsage > 60) {
      settings.uploadQueueInterval = Math.round(settings.uploadQueueInterval * 1.3);
      settings.batchSize = Math.max(2, settings.batchSize - 1);
    }

    // Adjust based on network speed
    if (networkSpeed === 'slow') {
      settings.uploadQueueInterval *= 3;
      settings.sessionValidationInterval *= 2;
      settings.connectionTimeout *= 2;
      settings.requestTimeout *= 2;
      settings.batchSize = Math.max(1, settings.batchSize - 2);
    } else if (networkSpeed === 'medium') {
      settings.uploadQueueInterval = Math.round(settings.uploadQueueInterval * 1.5);
      settings.connectionTimeout = Math.round(settings.connectionTimeout * 1.3);
    }

    // Adjust based on device type
    if (deviceType === 'mobile') {
      settings.uploadQueueInterval *= 2;
      settings.sessionValidationInterval *= 2;
      settings.batchSize = Math.max(1, settings.batchSize - 1);
      settings.maxConcurrentProcessors = Math.max(1, settings.maxConcurrentProcessors - 1);
      settings.animationFrameRate = 30;
      settings.debounceDelay = 500;
      settings.throttleDelay = 200;
    } else if (deviceType === 'tablet') {
      settings.uploadQueueInterval = Math.round(settings.uploadQueueInterval * 1.3);
      settings.animationFrameRate = 45;
      settings.debounceDelay = 400;
      settings.throttleDelay = 150;
    }

    // Adjust based on battery level (mobile only)
    if (deviceType === 'mobile' && batteryLevel !== undefined) {
      if (batteryLevel < 20) {
        settings.uploadQueueInterval *= 3;
        settings.sessionValidationInterval *= 3;
        settings.batchSize = 1;
        settings.maxConcurrentProcessors = 1;
        settings.animationFrameRate = 15;
      } else if (batteryLevel < 50) {
        settings.uploadQueueInterval *= 2;
        settings.sessionValidationInterval *= 2;
        settings.batchSize = Math.max(1, settings.batchSize - 1);
        settings.animationFrameRate = 30;
      }
    }

    // Adjust based on low power mode
    if (isLowPowerMode) {
      settings.uploadQueueInterval *= 2;
      settings.sessionValidationInterval *= 2;
      settings.batchSize = Math.max(1, settings.batchSize - 1);
      settings.maxConcurrentProcessors = Math.max(1, settings.maxConcurrentProcessors - 1);
      settings.animationFrameRate = 30;
    }

    return settings;
  }

  public startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      await this.updateMetrics();
      const newSettings = this.calculateOptimalSettings(this.metrics);
      
      // Only update if settings have changed significantly
      if (this.hasSignificantChanges(newSettings)) {
        this.currentSettings = newSettings;
        this.notifySettingsChanged();
        console.log('🔄 Dynamic performance settings updated:', newSettings);
      }
    }, intervalMs);
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  private hasSignificantChanges(newSettings: DynamicSettings): boolean {
    const threshold = 0.1; // 10% change threshold
    
    return (
      Math.abs(newSettings.uploadQueueInterval - this.currentSettings.uploadQueueInterval) / this.currentSettings.uploadQueueInterval > threshold ||
      Math.abs(newSettings.sessionValidationInterval - this.currentSettings.sessionValidationInterval) / this.currentSettings.sessionValidationInterval > threshold ||
      Math.abs(newSettings.batchSize - this.currentSettings.batchSize) / this.currentSettings.batchSize > threshold ||
      Math.abs(newSettings.maxConcurrentProcessors - this.currentSettings.maxConcurrentProcessors) / this.currentSettings.maxConcurrentProcessors > threshold
    );
  }

  public getCurrentSettings(): DynamicSettings {
    return { ...this.currentSettings };
  }

  public getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public onSettingsChanged(callback: (settings: DynamicSettings) => void): void {
    this.updateCallbacks.push(callback);
  }

  private notifySettingsChanged(): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(this.currentSettings);
      } catch (error) {
        console.error('Error in settings change callback:', error);
      }
    });
  }

  public forceUpdate(): void {
    this.updateMetrics().then(() => {
      const newSettings = this.calculateOptimalSettings(this.metrics);
      this.currentSettings = newSettings;
      this.notifySettingsChanged();
    });
  }
}

// Global instance
let globalOptimizer: DynamicPerformanceOptimizer | null = null;

export function getDynamicPerformanceOptimizer(): DynamicPerformanceOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new DynamicPerformanceOptimizer();
  }
  return globalOptimizer;
}

export function initializeDynamicPerformanceOptimizer(): void {
  if (typeof window !== 'undefined') {
    const optimizer = getDynamicPerformanceOptimizer();
    optimizer.startMonitoring();
    
    // Listen for system events that might affect performance
    window.addEventListener('online', () => optimizer.forceUpdate());
    window.addEventListener('offline', () => optimizer.forceUpdate());
    window.addEventListener('resize', () => optimizer.forceUpdate());
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        optimizer.stopMonitoring();
      } else {
        optimizer.startMonitoring();
      }
    });
  }
}

export type { DynamicSettings, PerformanceMetrics };
