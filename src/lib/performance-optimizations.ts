/**
 * Performance Optimization Utilities
 * 
 * This file contains utilities to help optimize application performance
 * and prevent memory leaks after deployment.
 */

// Memory management utilities
export class MemoryManager {
  private static instance: MemoryManager;
  private memoryThreshold = 150; // MB
  private checkInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  startMonitoring(thresholdMB = 150, intervalMs = 30000) {
    if (this.isMonitoring || typeof window === 'undefined') return;

    this.memoryThreshold = thresholdMB;
    this.isMonitoring = true;

    this.checkInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);

    console.log(`🔍 Memory monitoring started (threshold: ${thresholdMB}MB)`);
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Memory monitoring stopped');
  }

  private checkMemoryUsage() {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    const memoryInfo = (performance as any).memory;
    const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);

    if (usedMB > this.memoryThreshold) {
      console.warn(`🚨 High memory usage detected: ${usedMB}MB`);
      this.triggerGarbageCollection();
    }
  }

  private triggerGarbageCollection() {
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
      console.log('🧹 Forced garbage collection');
    }
  }

  getCurrentMemoryUsage(): number {
    if (typeof window === 'undefined' || !('memory' in performance)) return 0;
    const memoryInfo = (performance as any).memory;
    return Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024);
  }
}

// Component optimization utilities
export class ComponentOptimizer {
  private static instance: ComponentOptimizer;
  private heavyComponents = new Set<string>();

  static getInstance(): ComponentOptimizer {
    if (!ComponentOptimizer.instance) {
      ComponentOptimizer.instance = new ComponentOptimizer();
    }
    return ComponentOptimizer.instance;
  }

  trackComponent(componentName: string, renderTime: number) {
    if (renderTime > 100) { // 100ms threshold
      this.heavyComponents.add(componentName);
      console.warn(`🐌 Slow component detected: ${componentName} (${renderTime}ms)`);
    }
  }

  getHeavyComponents(): string[] {
    return Array.from(this.heavyComponents);
  }

  clearHeavyComponents() {
    this.heavyComponents.clear();
  }
}

// API call optimization
export class APIOptimizer {
  private static instance: APIOptimizer;
  private requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();

  static getInstance(): APIOptimizer {
    if (!APIOptimizer.instance) {
      APIOptimizer.instance = new APIOptimizer();
    }
    return APIOptimizer.instance;
  }

  async cachedRequest<T>(
    url: string, 
    options?: RequestInit, 
    ttl = 30000 // 30 seconds default
  ): Promise<T> {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    const now = Date.now();

    // Check cache
    const cached = this.requestCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < cached.ttl) {
      return cached.data;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // Make new request
    const requestPromise = fetch(url, options)
      .then(response => response.json())
      .then(data => {
        this.requestCache.set(cacheKey, { data, timestamp: now, ttl });
        this.pendingRequests.delete(cacheKey);
        return data;
      })
      .catch(error => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  clearCache() {
    this.requestCache.clear();
    this.pendingRequests.clear();
  }

  getCacheStats() {
    return {
      cachedRequests: this.requestCache.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}

// Bundle optimization utilities
export class BundleOptimizer {
  private static instance: BundleOptimizer;
  private loadedChunks = new Set<string>();

  static getInstance(): BundleOptimizer {
    if (!BundleOptimizer.instance) {
      BundleOptimizer.instance = new BundleOptimizer();
    }
    return BundleOptimizer.instance;
  }

  async loadChunk(chunkName: string, importFn: () => Promise<any>) {
    if (this.loadedChunks.has(chunkName)) {
      return;
    }

    try {
      await importFn();
      this.loadedChunks.add(chunkName);
      console.log(`📦 Loaded chunk: ${chunkName}`);
    } catch (error) {
      console.error(`❌ Failed to load chunk: ${chunkName}`, error);
    }
  }

  getLoadedChunks(): string[] {
    return Array.from(this.loadedChunks);
  }

  clearLoadedChunks() {
    this.loadedChunks.clear();
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: {
    memory: number[];
    renderTime: number[];
    apiCalls: number;
    errors: string[];
  } = {
    memory: [],
    renderTime: [],
    apiCalls: 0,
    errors: []
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordMemoryUsage(mb: number) {
    this.metrics.memory.push(mb);
    if (this.metrics.memory.length > 100) {
      this.metrics.memory.shift();
    }
  }

  recordRenderTime(ms: number) {
    this.metrics.renderTime.push(ms);
    if (this.metrics.renderTime.length > 100) {
      this.metrics.renderTime.shift();
    }
  }

  recordAPICall() {
    this.metrics.apiCalls++;
  }

  recordError(error: string) {
    this.metrics.errors.push(error);
    if (this.metrics.errors.length > 50) {
      this.metrics.errors.shift();
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      avgMemory: this.metrics.memory.length > 0 
        ? this.metrics.memory.reduce((a, b) => a + b, 0) / this.metrics.memory.length 
        : 0,
      avgRenderTime: this.metrics.renderTime.length > 0 
        ? this.metrics.renderTime.reduce((a, b) => a + b, 0) / this.metrics.renderTime.length 
        : 0
    };
  }

  clearMetrics() {
    this.metrics = {
      memory: [],
      renderTime: [],
      apiCalls: 0,
      errors: []
    };
  }
}

// Global performance optimization manager
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private memoryManager: MemoryManager;
  private componentOptimizer: ComponentOptimizer;
  private apiOptimizer: APIOptimizer;
  private bundleOptimizer: BundleOptimizer;
  private performanceMonitor: PerformanceMonitor;

  private constructor() {
    this.memoryManager = MemoryManager.getInstance();
    this.componentOptimizer = ComponentOptimizer.getInstance();
    this.apiOptimizer = APIOptimizer.getInstance();
    this.bundleOptimizer = BundleOptimizer.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  initialize() {
    // Start memory monitoring in production
    if (process.env.NODE_ENV === 'production') {
      this.memoryManager.startMonitoring(150, 30000);
    }

    // Set up global error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.performanceMonitor.recordError(event.error?.message || 'Unknown error');
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.performanceMonitor.recordError(event.reason?.message || 'Unhandled promise rejection');
      });
    }

    console.log('🚀 Performance optimizer initialized');
  }

  cleanup() {
    this.memoryManager.stopMonitoring();
    this.apiOptimizer.clearCache();
    this.bundleOptimizer.clearLoadedChunks();
    this.performanceMonitor.clearMetrics();
    console.log('🧹 Performance optimizer cleaned up');
  }

  getStatus() {
    return {
      memory: this.memoryManager.getCurrentMemoryUsage(),
      heavyComponents: this.componentOptimizer.getHeavyComponents(),
      cacheStats: this.apiOptimizer.getCacheStats(),
      loadedChunks: this.bundleOptimizer.getLoadedChunks(),
      metrics: this.performanceMonitor.getMetrics()
    };
  }
}

// Export singleton instances
export const performanceOptimizer = PerformanceOptimizer.getInstance();
export const memoryManager = MemoryManager.getInstance();
export const componentOptimizer = ComponentOptimizer.getInstance();
export const apiOptimizer = APIOptimizer.getInstance();
export const bundleOptimizer = BundleOptimizer.getInstance();
export const performanceMonitor = PerformanceMonitor.getInstance();
