/**
 * Connection Pool Manager
 * 
 * Manages browser connection pool efficiently to work around browser connection limits
 * and prevent the 205MB memory freeze issue.
 */

interface ConnectionConfig {
  maxConcurrent: number;
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  priority: 'high' | 'medium' | 'low';
}

interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  retryCount: number;
}

interface ConnectionInfo {
  id: string;
  type: 'http' | 'sse';
  url: string;
  startTime: number;
  lastActivity: number;
  priority: 'high' | 'medium' | 'low';
  timeoutId?: NodeJS.Timeout;
  cleanupId?: NodeJS.Timeout;
}

class ConnectionPoolManager {
  private static instance: ConnectionPoolManager;
  private activeConnections = 0;
  private maxConcurrentConnections = 150; // Increased from 8 to 150
  private requestQueue: QueuedRequest[] = [];
  private processingQueue = false;
  private connectionTimeout = 30000; // 30 seconds
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  // Connection tracking and cleanup
  private connectionInfo = new Map<string, ConnectionInfo>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private inactivityTimeout = 3000; // Reduced from 60000 to 3000 (3 seconds)
  private maxConnectionLifetime = 300000; // 5 minutes max lifetime

  // Connection cleanup callbacks
  private cleanupCallbacks = new Set<(connectionId: string, url: string, type: string) => void>();

  // Connection health monitoring
  private connectionHealth = new Map<string, {
    lastSuccess: number;
    lastError: number;
    errorCount: number;
    successCount: number;
    averageResponseTime: number;
  }>();

  // SSE connection management
  private sseConnections = new Map<string, EventSource>();
  private maxSseConnections = 50; // Increased from 4 to 50

  private constructor() {
    this.startHealthMonitoring();
    this.startConnectionCleanup();
  }

  static getInstance(): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager();
    }
    return ConnectionPoolManager.instance;
  }

  /**
   * Make HTTP request with connection pool management
   */
  async request(url: string, options: RequestInit = {}, config: Partial<ConnectionConfig> = {}): Promise<Response> {
    const requestConfig: ConnectionConfig = {
      maxConcurrent: config.maxConcurrent || this.maxConcurrentConnections,
      timeoutMs: config.timeoutMs || this.connectionTimeout,
      retryAttempts: config.retryAttempts || this.retryAttempts,
      retryDelayMs: config.retryDelayMs || this.retryDelay,
      priority: config.priority || 'medium'
    };

    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const queuedRequest: QueuedRequest = {
        id: requestId,
        url,
        options,
        resolve,
        reject,
        priority: requestConfig.priority,
        timestamp: Date.now(),
        retryCount: 0
      };

      this.queueRequest(queuedRequest, requestConfig);
    });
  }

  /**
   * Create SSE connection with connection pool management
   */
  createSSEConnection(url: string, options: { 
    timeout?: number;
    retryAttempts?: number;
    priority?: 'high' | 'medium' | 'low';
    autoCleanup?: boolean;
    inactivityTimeout?: number;
  } = {}): Promise<EventSource> {
    return new Promise((resolve, reject) => {
      // Check if we can create a new SSE connection
      if (this.sseConnections.size >= this.maxSseConnections) {
        // Close oldest connection if at limit
        const oldestConnection = Array.from(this.sseConnections.entries())[0];
        if (oldestConnection) {
          this.closeSSEConnection(oldestConnection[0]);
        }
      }

      try {
        const eventSource = new EventSource(url);
        const connectionId = this.generateRequestId();
        
        // Set up connection timeout
        const timeout = setTimeout(() => {
          eventSource.close();
          this.removeConnectionInfo(connectionId);
          reject(new Error('SSE connection timeout'));
        }, options.timeout || 30000);

        // Track connection info for cleanup
        const connectionInfo: ConnectionInfo = {
          id: connectionId,
          type: 'sse',
          url,
          startTime: Date.now(),
          lastActivity: Date.now(),
          priority: options.priority || 'high',
          timeoutId: timeout,
          cleanupId: options.autoCleanup !== false ? 
            setTimeout(() => this.cleanupInactiveConnection(connectionId), 
              options.inactivityTimeout || this.inactivityTimeout) : undefined
        };
        
        this.connectionInfo.set(connectionId, connectionInfo);
        this.sseConnections.set(url, eventSource);
        
        eventSource.onopen = () => {
          clearTimeout(timeout);
          connectionInfo.lastActivity = Date.now();
          this.sseConnections.set(url, eventSource);
          resolve(eventSource);
        };

        eventSource.onmessage = (event) => {
          // Update last activity on any message
          connectionInfo.lastActivity = Date.now();
          
          // Reset inactivity timeout with 3-second interval
          if (connectionInfo.cleanupId) {
            clearTimeout(connectionInfo.cleanupId);
            connectionInfo.cleanupId = setTimeout(() => 
              this.cleanupInactiveConnection(connectionId), 
              options.inactivityTimeout || this.inactivityTimeout
            );
          }
        };

        eventSource.onerror = (error) => {
          clearTimeout(timeout);
          this.recordConnectionError(url, error);
          this.removeConnectionInfo(connectionId);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Close SSE connection
   */
  closeSSEConnection(url: string): void {
    const connection = this.sseConnections.get(url);
    if (connection) {
      try {
        connection.close();
      } catch (error) {
        console.error('Error closing SSE connection:', error);
      }
      this.sseConnections.delete(url);
      
      // Remove connection info
      for (const [id, info] of this.connectionInfo.entries()) {
        if (info.url === url && info.type === 'sse') {
          this.removeConnectionInfo(id);
          break;
        }
      }
    }
  }

  /**
   * Close all SSE connections
   */
  closeAllSSEConnections(): void {
    for (const [url] of this.sseConnections) {
      this.closeSSEConnection(url);
    }
  }

  /**
   * Cleanup inactive connection
   */
  private cleanupInactiveConnection(connectionId: string): void {
    const info = this.connectionInfo.get(connectionId);
    if (!info) return;

    const now = Date.now();
    const timeSinceActivity = now - info.lastActivity;
    const connectionAge = now - info.startTime;

    // Cleanup if inactive for too long or too old
    if (timeSinceActivity > this.inactivityTimeout || connectionAge > this.maxConnectionLifetime) {
      console.log(`🧹 Cleaning up inactive connection: ${connectionId} (inactive: ${timeSinceActivity}ms, age: ${connectionAge}ms)`);
      
      if (info.type === 'sse') {
        // Find and close SSE connection
        for (const [url, connection] of this.sseConnections.entries()) {
          if (url === info.url) {
            this.closeSSEConnection(url);
            break;
          }
        }
      }
      
      // Notify cleanup callbacks before removing connection info
      this.notifyCleanupCallbacks(connectionId, info.url, info.type);
      
      this.removeConnectionInfo(connectionId);
    }
  }

  /**
   * Remove connection info and cleanup timeouts
   */
  private removeConnectionInfo(connectionId: string): void {
    const info = this.connectionInfo.get(connectionId);
    if (info) {
      if (info.timeoutId) {
        clearTimeout(info.timeoutId);
      }
      if (info.cleanupId) {
        clearTimeout(info.cleanupId);
      }
      this.connectionInfo.delete(connectionId);
    }
  }

  /**
   * Start connection cleanup monitoring
   */
  private startConnectionCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.performConnectionCleanup();
    }, 3000); // Check every 3 seconds (reduced from 30 seconds)
  }

  /**
   * Perform periodic connection cleanup
   */
  private performConnectionCleanup(): void {
    const now = Date.now();
    const connectionsToCleanup: string[] = [];

    for (const [id, info] of this.connectionInfo.entries()) {
      const timeSinceActivity = now - info.lastActivity;
      const connectionAge = now - info.startTime;

      // Mark for cleanup if inactive or too old
      if (timeSinceActivity > this.inactivityTimeout || connectionAge > this.maxConnectionLifetime) {
        connectionsToCleanup.push(id);
      }
    }

    // Cleanup marked connections
    connectionsToCleanup.forEach(id => this.cleanupInactiveConnection(id));

    // Log cleanup stats
    if (connectionsToCleanup.length > 0) {
      console.log(`🧹 Cleaned up ${connectionsToCleanup.length} inactive connections`);
    }
  }

  /**
   * Queue request for processing
   */
  private queueRequest(request: QueuedRequest, config: ConnectionConfig): void {
    // Add to queue based on priority
    if (request.priority === 'high') {
      this.requestQueue.unshift(request);
    } else {
      this.requestQueue.push(request);
    }

    // Start processing if not already running
    if (!this.processingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    while (this.requestQueue.length > 0 && this.activeConnections < this.maxConcurrentConnections) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      this.activeConnections++;
      this.executeRequest(request).finally(() => {
        this.activeConnections--;
        // Continue processing queue
        if (this.requestQueue.length > 0) {
          this.processQueue();
        } else {
          this.processingQueue = false;
        }
      });
    }

    this.processingQueue = false;
  }

  /**
   * Execute a single request with retry logic
   */
  private async executeRequest(request: QueuedRequest): Promise<void> {
    const startTime = Date.now();
    const connectionId = this.generateRequestId();

    // Track connection info
    const connectionInfo: ConnectionInfo = {
      id: connectionId,
      type: 'http',
      url: request.url,
      startTime: Date.now(),
      lastActivity: Date.now(),
      priority: request.priority,
      cleanupId: setTimeout(() => this.cleanupInactiveConnection(connectionId), this.inactivityTimeout)
    };
    
    this.connectionInfo.set(connectionId, connectionInfo);

    try {
      // Add timeout to request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 30000);

      const response = await fetch(request.url, {
        ...request.options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Update last activity
      connectionInfo.lastActivity = Date.now();

      // Record success
      this.recordConnectionSuccess(request.url, Date.now() - startTime);

      if (response.ok) {
        request.resolve(response);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      // Record error
      this.recordConnectionError(request.url, error);

      // Retry logic
      if (request.retryCount < 3 && this.shouldRetry(error)) {
        request.retryCount++;
        console.log(`Retrying request ${request.id} (attempt ${request.retryCount}/3)`);
        
        // Add back to queue with delay
        setTimeout(() => {
          this.queueRequest(request, {
            maxConcurrent: 150,
            timeoutMs: 30000,
            retryAttempts: 3,
            retryDelayMs: 1000,
            priority: request.priority
          });
        }, 1000 * request.retryCount); // Exponential backoff
      } else {
        request.reject(error);
      }
    } finally {
      // Cleanup connection info
      this.removeConnectionInfo(connectionId);
    }
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: any): boolean {
    // Don't retry on abort (timeout)
    if (error.name === 'AbortError') {
      return false;
    }

    // Don't retry on network errors
    if (error.message?.includes('Failed to fetch')) {
      return false;
    }

    return true;
  }

  /**
   * Record successful connection
   */
  private recordConnectionSuccess(url: string, responseTime: number): void {
    const hostname = new URL(url).hostname;
    const health = this.connectionHealth.get(hostname) || {
      lastSuccess: 0,
      lastError: 0,
      errorCount: 0,
      successCount: 0,
      averageResponseTime: 0
    };

    health.lastSuccess = Date.now();
    health.successCount++;
    health.averageResponseTime = (health.averageResponseTime + responseTime) / 2;

    this.connectionHealth.set(hostname, health);
  }

  /**
   * Record connection error
   */
  private recordConnectionError(url: string, error: any): void {
    const hostname = new URL(url).hostname;
    const health = this.connectionHealth.get(hostname) || {
      lastSuccess: 0,
      lastError: 0,
      errorCount: 0,
      successCount: 0,
      averageResponseTime: 0
    };

    health.lastError = Date.now();
    health.errorCount++;

    this.connectionHealth.set(hostname, health);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.monitorConnectionHealth();
    }, 3000); // Check every 3 seconds (reduced from 30 seconds)
  }

  /**
   * Monitor connection health and take action if needed
   */
  private monitorConnectionHealth(): void {
    const now = Date.now();
    
    for (const [hostname, health] of this.connectionHealth.entries()) {
      // If too many errors recently, reduce connection limit temporarily
      if (health.errorCount > 10 && (now - health.lastError) < 60000) {
        console.warn(`High error rate detected for ${hostname}, reducing connection limit`);
        this.maxConcurrentConnections = Math.max(50, this.maxConcurrentConnections - 10);
      }

      // If good performance, gradually increase connection limit
      if (health.successCount > 20 && health.errorCount < 2 && (now - health.lastSuccess) < 300000) {
        this.maxConcurrentConnections = Math.min(200, this.maxConcurrentConnections + 10);
      }
    }
  }

  /**
   * Get connection pool status
   */
  getStatus() {
    const now = Date.now();
    const activeConnections = Array.from(this.connectionInfo.values()).filter(info => 
      now - info.lastActivity < this.inactivityTimeout
    );

    return {
      activeConnections: this.activeConnections,
      maxConcurrentConnections: this.maxConcurrentConnections,
      queuedRequests: this.requestQueue.length,
      sseConnections: this.sseConnections.size,
      maxSseConnections: this.maxSseConnections,
      trackedConnections: this.connectionInfo.size,
      activeTrackedConnections: activeConnections.length,
      connectionHealth: Object.fromEntries(this.connectionHealth),
      cleanupStats: {
        inactivityTimeout: this.inactivityTimeout,
        maxConnectionLifetime: this.maxConnectionLifetime
      }
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register cleanup callback
   */
  registerCleanupCallback(callback: (connectionId: string, url: string, type: string) => void): () => void {
    this.cleanupCallbacks.add(callback);
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  /**
   * Notify cleanup callbacks
   */
  private notifyCleanupCallbacks(connectionId: string, url: string, type: string): void {
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback(connectionId, url, type);
      } catch (error) {
        console.error('Error in cleanup callback:', error);
      }
    });
  }

  /**
   * Cleanup all connections
   */
  cleanup(): void {
    this.closeAllSSEConnections();
    this.requestQueue = [];
    this.activeConnections = 0;
    this.processingQueue = false;
    
    // Clear all connection info
    for (const [id] of this.connectionInfo) {
      this.removeConnectionInfo(id);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Force cleanup of all inactive connections
   */
  forceCleanup(): void {
    console.log('🧹 Force cleaning up all connections...');
    this.performConnectionCleanup();
    this.closeAllSSEConnections();
  }
}

// Export singleton instance
export const connectionPoolManager = ConnectionPoolManager.getInstance();

// Export convenience functions
export const optimizedFetch = (url: string, options?: RequestInit, config?: Partial<ConnectionConfig>) => {
  return connectionPoolManager.request(url, options, config);
};

export const createOptimizedSSE = (url: string, options?: any) => {
  return connectionPoolManager.createSSEConnection(url, options);
};

export const getConnectionStatus = () => {
  return connectionPoolManager.getStatus();
};

export const forceConnectionCleanup = () => {
  connectionPoolManager.forceCleanup();
};

export const registerConnectionCleanupCallback = (callback: (connectionId: string, url: string, type: string) => void) => {
  return connectionPoolManager.registerCleanupCallback(callback);
};
