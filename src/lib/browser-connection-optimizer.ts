/**
 * Browser Connection Optimizer
 * 
 * Optimizes browser connection usage to work around browser connection pool limits
 * and prevent the 205MB memory freeze issue.
 */

interface ConnectionStrategy {
  name: string;
  description: string;
  maxConnections: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  timeout: number;
  retryAttempts: number;
  autoCleanup: boolean;
  inactivityTimeout: number;
}

interface ActiveConnection {
  id: string;
  strategy: string;
  startTime: number;
  lastActivity: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  cleanupTimeout?: NodeJS.Timeout;
}

class BrowserConnectionOptimizer {
  private static instance: BrowserConnectionOptimizer;
  private strategies: Map<string, ConnectionStrategy> = new Map();
  private activeConnections = new Map<string, ActiveConnection>();
  private connectionLimits = new Map<string, number>();

  // Browser-specific connection limits (dramatically increased)
  private readonly BROWSER_LIMITS = {
    chrome: 200,     // Increased from 12 to 200
    firefox: 200,    // Increased from 12 to 200
    safari: 200,     // Increased from 12 to 200
    edge: 200,       // Increased from 12 to 200
    mobile: 100      // Increased from 8 to 100
  };

  // Cleanup monitoring
  private cleanupInterval: NodeJS.Timeout | null = null;
  private defaultInactivityTimeout = 3000; // Reduced from 60000 to 3000 (3 seconds)
  private maxConnectionLifetime = 300000; // 5 minutes

  private constructor() {
    this.initializeStrategies();
    this.detectBrowser();
    this.startMonitoring();
    this.startCleanupMonitoring();
  }

  static getInstance(): BrowserConnectionOptimizer {
    if (!BrowserConnectionOptimizer.instance) {
      BrowserConnectionOptimizer.instance = new BrowserConnectionOptimizer();
    }
    return BrowserConnectionOptimizer.instance;
  }

  /**
   * Initialize connection strategies
   */
  private initializeStrategies(): void {
    // Critical connections (SSE, real-time)
    this.strategies.set('sse', {
      name: 'Server-Sent Events',
      description: 'Real-time connections for live updates',
      maxConnections: 50, // Increased from 4 to 50
      priority: 'critical',
      timeout: 30000,
      retryAttempts: 3,
      autoCleanup: true,
      inactivityTimeout: 3000 // Reduced to 3 seconds
    });

    // High priority connections (API calls)
    this.strategies.set('api', {
      name: 'API Requests',
      description: 'Critical API endpoints',
      maxConnections: 100, // Increased from 6 to 100
      priority: 'high',
      timeout: 15000,
      retryAttempts: 2,
      autoCleanup: true,
      inactivityTimeout: 3000 // Reduced to 3 seconds
    });

    // Medium priority connections (data fetching)
    this.strategies.set('data', {
      name: 'Data Fetching',
      description: 'Background data loading',
      maxConnections: 75, // Increased from 4 to 75
      priority: 'medium',
      timeout: 10000,
      retryAttempts: 1,
      autoCleanup: true,
      inactivityTimeout: 3000 // Reduced to 3 seconds
    });

    // Low priority connections (non-critical)
    this.strategies.set('background', {
      name: 'Background Tasks',
      description: 'Non-critical background operations',
      maxConnections: 50, // Increased from 2 to 50
      priority: 'low',
      timeout: 5000,
      retryAttempts: 0,
      autoCleanup: true,
      inactivityTimeout: 3000 // Reduced to 3 seconds
    });
  }

  /**
   * Detect browser and set appropriate limits
   */
  private detectBrowser(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    let browserType = 'chrome'; // Default
    let maxConnections = this.BROWSER_LIMITS.chrome;

    if (userAgent.includes('firefox')) {
      browserType = 'firefox';
      maxConnections = this.BROWSER_LIMITS.firefox;
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      browserType = 'safari';
      maxConnections = this.BROWSER_LIMITS.safari;
    } else if (userAgent.includes('edge')) {
      browserType = 'edge';
      maxConnections = this.BROWSER_LIMITS.edge;
    }

    // Check if mobile
    if (/android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent)) {
      browserType = 'mobile';
      maxConnections = this.BROWSER_LIMITS.mobile;
    }

    console.log(`Browser detected: ${browserType}, max connections: ${maxConnections}`);
    this.connectionLimits.set('browser', maxConnections);
  }

  /**
   * Check if connection can be made
   */
  canMakeConnection(strategy: string): boolean {
    const strategyConfig = this.strategies.get(strategy);
    if (!strategyConfig) {
      console.warn(`Unknown connection strategy: ${strategy}`);
      return false;
    }

    const currentConnections = this.getActiveConnectionsForStrategy(strategy);
    const browserLimit = this.connectionLimits.get('browser') || 200;
    const totalConnections = this.getTotalActiveConnections();

    // Check strategy limit
    if (currentConnections >= strategyConfig.maxConnections) {
      return false;
    }

    // Check browser limit
    if (totalConnections >= browserLimit) {
      return false;
    }

    return true;
  }

  /**
   * Reserve a connection
   */
  reserveConnection(strategy: string, connectionId?: string): boolean {
    if (!this.canMakeConnection(strategy)) {
      return false;
    }

    const id = connectionId || this.generateConnectionId();
    const strategyConfig = this.strategies.get(strategy);
    
    if (!strategyConfig) {
      return false;
    }

    const connection: ActiveConnection = {
      id,
      strategy,
      startTime: Date.now(),
      lastActivity: Date.now(),
      priority: strategyConfig.priority
    };

    // Set up auto-cleanup if enabled
    if (strategyConfig.autoCleanup) {
      connection.cleanupTimeout = setTimeout(() => {
        this.cleanupInactiveConnection(id);
      }, strategyConfig.inactivityTimeout);
    }

    this.activeConnections.set(id, connection);
    return true;
  }

  /**
   * Release a connection
   */
  releaseConnection(strategy: string, connectionId?: string): void {
    if (connectionId) {
      // Release specific connection
      const connection = this.activeConnections.get(connectionId);
      if (connection) {
        this.cleanupConnection(connectionId);
      }
    } else {
      // Release oldest connection for strategy
      const connectionsForStrategy = Array.from(this.activeConnections.entries())
        .filter(([_, conn]) => conn.strategy === strategy)
        .sort((a, b) => a[1].startTime - b[1].startTime);

      if (connectionsForStrategy.length > 0) {
        const [oldestId] = connectionsForStrategy[0];
        this.cleanupConnection(oldestId);
      }
    }
  }

  /**
   * Update connection activity
   */
  updateConnectionActivity(connectionId: string): void {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      connection.lastActivity = Date.now();
      
      // Reset cleanup timeout
      if (connection.cleanupTimeout) {
        clearTimeout(connection.cleanupTimeout);
        const strategyConfig = this.strategies.get(connection.strategy);
        if (strategyConfig?.autoCleanup) {
          connection.cleanupTimeout = setTimeout(() => {
            this.cleanupInactiveConnection(connectionId);
          }, strategyConfig.inactivityTimeout);
        }
      }
    }
  }

  /**
   * Cleanup inactive connection
   */
  private cleanupInactiveConnection(connectionId: string): void {
    const connection = this.activeConnections.get(connectionId);
    if (!connection) return;

    const now = Date.now();
    const timeSinceActivity = now - connection.lastActivity;
    const connectionAge = now - connection.startTime;
    const strategyConfig = this.strategies.get(connection.strategy);

    // Check if connection should be cleaned up
    const inactivityLimit = strategyConfig?.inactivityTimeout || this.defaultInactivityTimeout;
    
    if (timeSinceActivity > inactivityLimit || connectionAge > this.maxConnectionLifetime) {
      console.log(`🧹 Cleaning up inactive connection: ${connectionId} (strategy: ${connection.strategy}, inactive: ${timeSinceActivity}ms, age: ${connectionAge}ms)`);
      this.cleanupConnection(connectionId);
    }
  }

  /**
   * Cleanup specific connection
   */
  private cleanupConnection(connectionId: string): void {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      if (connection.cleanupTimeout) {
        clearTimeout(connection.cleanupTimeout);
      }
      this.activeConnections.delete(connectionId);
    }
  }

  /**
   * Get active connections for a strategy
   */
  private getActiveConnectionsForStrategy(strategy: string): number {
    return Array.from(this.activeConnections.values())
      .filter(conn => conn.strategy === strategy).length;
  }

  /**
   * Get total active connections
   */
  private getTotalActiveConnections(): number {
    return this.activeConnections.size;
  }

  /**
   * Get connection strategy configuration
   */
  getStrategy(strategy: string): ConnectionStrategy | undefined {
    return this.strategies.get(strategy);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    const totalConnections = this.getTotalActiveConnections();
    const browserLimit = this.connectionLimits.get('browser') || 200;

    const connectionsByStrategy = new Map<string, number>();
    for (const [strategy] of this.strategies) {
      connectionsByStrategy.set(strategy, this.getActiveConnectionsForStrategy(strategy));
    }

    return {
      activeConnections: Object.fromEntries(connectionsByStrategy),
      totalConnections,
      browserLimit,
      availableConnections: browserLimit - totalConnections,
      strategies: Object.fromEntries(this.strategies),
      connectionDetails: Array.from(this.activeConnections.values()).map(conn => ({
        id: conn.id,
        strategy: conn.strategy,
        priority: conn.priority,
        age: Date.now() - conn.startTime,
        lastActivity: Date.now() - conn.lastActivity
      }))
    };
  }

  /**
   * Start connection monitoring
   */
  private startMonitoring(): void {
    setInterval(() => {
      this.monitorConnections();
    }, 3000); // Check every 3 seconds (reduced from 10 seconds)
  }

  /**
   * Start cleanup monitoring
   */
  private startCleanupMonitoring(): void {
    this.cleanupInterval = setInterval(() => {
      this.performPeriodicCleanup();
    }, 3000); // Check every 3 seconds (reduced from 30 seconds)
  }

  /**
   * Monitor connection usage and take action if needed
   */
  private monitorConnections(): void {
    const status = this.getConnectionStatus();
    
    // Warn if approaching browser limit
    if (status.totalConnections >= status.browserLimit * 0.8) {
      console.warn(`⚠️ Approaching browser connection limit: ${status.totalConnections}/${status.browserLimit}`);
    }

    // Log connection usage for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Connection status:', status);
    }
  }

  /**
   * Perform periodic cleanup of inactive connections
   */
  private performPeriodicCleanup(): void {
    const now = Date.now();
    const connectionsToCleanup: string[] = [];

    for (const [id, connection] of this.activeConnections.entries()) {
      const timeSinceActivity = now - connection.lastActivity;
      const connectionAge = now - connection.startTime;
      const strategyConfig = this.strategies.get(connection.strategy);
      
      const inactivityLimit = strategyConfig?.inactivityTimeout || this.defaultInactivityTimeout;
      
      if (timeSinceActivity > inactivityLimit || connectionAge > this.maxConnectionLifetime) {
        connectionsToCleanup.push(id);
      }
    }

    // Cleanup marked connections
    connectionsToCleanup.forEach(id => this.cleanupInactiveConnection(id));

    if (connectionsToCleanup.length > 0) {
      console.log(`🧹 Periodic cleanup: removed ${connectionsToCleanup.length} inactive connections`);
    }
  }

  /**
   * Optimize connection usage by prioritizing critical connections
   */
  optimizeConnections(): void {
    const status = this.getConnectionStatus();
    
    if (status.availableConnections <= 0) {
      // Force release low priority connections
      const lowPriorityConnections = Array.from(this.activeConnections.entries())
        .filter(([_, conn]) => conn.priority === 'low')
        .sort((a, b) => a[1].lastActivity - b[1].lastActivity);

      for (const [id, connection] of lowPriorityConnections) {
        console.log(`Forcing release of low priority connection: ${id} (strategy: ${connection.strategy})`);
        this.cleanupConnection(id);
        
        // Check if we have enough connections now
        if (this.getTotalActiveConnections() < (status.browserLimit * 0.8)) {
          break;
        }
      }
    }
  }

  /**
   * Get optimized fetch configuration
   */
  getOptimizedFetchConfig(strategy: string): {
    timeout: number;
    retryAttempts: number;
    priority: 'high' | 'medium' | 'low';
    autoCleanup: boolean;
    inactivityTimeout: number;
  } {
    const strategyConfig = this.strategies.get(strategy);
    if (!strategyConfig) {
      return {
        timeout: 10000,
        retryAttempts: 1,
        priority: 'medium',
        autoCleanup: true,
        inactivityTimeout: this.defaultInactivityTimeout
      };
    }

    return {
      timeout: strategyConfig.timeout,
      retryAttempts: strategyConfig.retryAttempts,
      priority: strategyConfig.priority as 'high' | 'medium' | 'low',
      autoCleanup: strategyConfig.autoCleanup,
      inactivityTimeout: strategyConfig.inactivityTimeout
    };
  }

  /**
   * Force cleanup of all connections
   */
  forceCleanup(): void {
    console.log('🧹 Force cleaning up all browser connections...');
    const connectionIds = Array.from(this.activeConnections.keys());
    connectionIds.forEach(id => this.cleanupConnection(id));
    console.log(`Cleaned up ${connectionIds.length} connections`);
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup all connections
   */
  cleanup(): void {
    this.forceCleanup();
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export singleton instance
export const browserConnectionOptimizer = BrowserConnectionOptimizer.getInstance();

// Export convenience functions
export const canMakeConnection = (strategy: string) => {
  return browserConnectionOptimizer.canMakeConnection(strategy);
};

export const reserveConnection = (strategy: string, connectionId?: string) => {
  return browserConnectionOptimizer.reserveConnection(strategy, connectionId);
};

export const releaseConnection = (strategy: string, connectionId?: string) => {
  browserConnectionOptimizer.releaseConnection(strategy, connectionId);
};

export const updateConnectionActivity = (connectionId: string) => {
  browserConnectionOptimizer.updateConnectionActivity(connectionId);
};

export const getConnectionStatus = () => {
  return browserConnectionOptimizer.getConnectionStatus();
};

export const getOptimizedFetchConfig = (strategy: string) => {
  return browserConnectionOptimizer.getOptimizedFetchConfig(strategy);
};

export const forceBrowserConnectionCleanup = () => {
  browserConnectionOptimizer.forceCleanup();
};
