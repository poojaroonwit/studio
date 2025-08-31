import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  optimizedFetch, 
  createOptimizedSSE, 
  getConnectionStatus,
  connectionPoolManager 
} from '@/lib/connection-pool-manager';
import { 
  canMakeConnection, 
  reserveConnection, 
  releaseConnection, 
  updateConnectionActivity,
  getOptimizedFetchConfig,
  browserConnectionOptimizer 
} from '@/lib/browser-connection-optimizer';

interface UseOptimizedConnectionOptions {
  strategy?: 'sse' | 'api' | 'data' | 'background';
  autoReserve?: boolean;
  timeout?: number;
  retryAttempts?: number;
  priority?: 'high' | 'medium' | 'low';
  autoCleanup?: boolean;
  inactivityTimeout?: number;
}

export function useOptimizedConnection(options: UseOptimizedConnectionOptions = {}) {
  const {
    strategy = 'api',
    autoReserve = true,
    timeout,
    retryAttempts,
    priority,
    autoCleanup = true,
    inactivityTimeout
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(getConnectionStatus());
  const [lastError, setLastError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const connectionRef = useRef<EventSource | null>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionIdRef = useRef<string | null>(null);
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-reserve connection on mount
  useEffect(() => {
    if (autoReserve) {
      const connectionId = `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const reserved = reserveConnection(strategy, connectionId);
      if (reserved) {
        connectionIdRef.current = connectionId;
        setIsConnected(true);
        
        // Start activity monitoring with 3-second intervals
        if (autoCleanup) {
          activityIntervalRef.current = setInterval(() => {
            if (connectionIdRef.current) {
              updateConnectionActivity(connectionIdRef.current);
            }
          }, 3000); // Update activity every 3 seconds (reduced from 10 seconds)
        }
      } else {
        setLastError(`Cannot reserve connection for strategy: ${strategy}`);
      }
    }

    // Start status monitoring with 3-second intervals
    statusIntervalRef.current = setInterval(() => {
      setConnectionStatus(getConnectionStatus());
    }, 3000); // Check status every 3 seconds (reduced from 5 seconds)

    return () => {
      if (autoReserve && connectionIdRef.current) {
        releaseConnection(strategy, connectionIdRef.current);
        setIsConnected(false);
        connectionIdRef.current = null;
      }
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
    };
  }, [strategy, autoReserve, autoCleanup]);

  // Optimized fetch function
  const fetch = useCallback(async (url: string, fetchOptions: RequestInit = {}) => {
    if (!canMakeConnection(strategy)) {
      throw new Error(`Cannot make connection for strategy: ${strategy}`);
    }

    setIsLoading(true);
    setLastError(null);

    try {
      const config = getOptimizedFetchConfig(strategy);
      const response = await optimizedFetch(url, fetchOptions, {
        timeoutMs: timeout || config.timeout,
        retryAttempts: retryAttempts || config.retryAttempts,
        priority: priority || config.priority
      });

      // Update connection activity
      if (connectionIdRef.current) {
        updateConnectionActivity(connectionIdRef.current);
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [strategy, timeout, retryAttempts, priority]);

  // Optimized SSE connection
  const createSSE = useCallback(async (url: string, sseOptions: any = {}) => {
    if (!canMakeConnection('sse')) {
      throw new Error('Cannot make SSE connection - limit reached');
    }

    setIsLoading(true);
    setLastError(null);

    try {
      const config = getOptimizedFetchConfig('sse');
      const eventSource = await createOptimizedSSE(url, {
        timeout: sseOptions.timeout || config.timeout,
        retryAttempts: sseOptions.retryAttempts || config.retryAttempts,
        priority: 'high',
        autoCleanup: autoCleanup,
        inactivityTimeout: inactivityTimeout || config.inactivityTimeout
      });

      connectionRef.current = eventSource;
      setIsConnected(true);
      
      // Update connection activity on messages with 3-second intervals
      eventSource.onmessage = (event) => {
        if (connectionIdRef.current) {
          updateConnectionActivity(connectionIdRef.current);
        }
        // Call original onmessage if provided
        if (sseOptions.onmessage) {
          sseOptions.onmessage(event);
        }
      };

      return eventSource;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [autoCleanup, inactivityTimeout]);

  // Close SSE connection
  const closeSSE = useCallback(() => {
    if (connectionRef.current) {
      try {
        connectionRef.current.close();
      } catch (error) {
        console.error('Error closing SSE connection:', error);
      }
      connectionRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Manual connection reservation
  const reserve = useCallback(() => {
    const connectionId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reserved = reserveConnection(strategy, connectionId);
    if (reserved) {
      connectionIdRef.current = connectionId;
      setIsConnected(true);
      setLastError(null);
      return true;
    } else {
      setLastError(`Cannot reserve connection for strategy: ${strategy}`);
      return false;
    }
  }, [strategy]);

  // Manual connection release
  const release = useCallback(() => {
    if (connectionIdRef.current) {
      releaseConnection(strategy, connectionIdRef.current);
      connectionIdRef.current = null;
      setIsConnected(false);
    }
  }, [strategy]);

  // Get connection pool status
  const getStatus = useCallback(() => {
    return {
      connectionStatus: getConnectionStatus(),
      poolStatus: connectionPoolManager.getStatus(),
      strategy,
      isConnected,
      isLoading,
      lastError,
      connectionId: connectionIdRef.current
    };
  }, [strategy, isConnected, isLoading, lastError]);

  // Optimize connections (force release low priority if needed)
  const optimize = useCallback(() => {
    browserConnectionOptimizer.optimizeConnections();
  }, []);

  // Force cleanup all connections
  const forceCleanup = useCallback(() => {
    browserConnectionOptimizer.forceCleanup();
    connectionPoolManager.forceCleanup();
  }, []);

  return {
    // State
    isConnected,
    connectionStatus,
    lastError,
    isLoading,

    // Actions
    fetch,
    createSSE,
    closeSSE,
    reserve,
    release,
    getStatus,
    optimize,
    forceCleanup,

    // Utilities
    canMakeConnection: () => canMakeConnection(strategy),
    getOptimizedConfig: () => getOptimizedFetchConfig(strategy),
    connectionId: connectionIdRef.current
  };
}

// Export convenience hook for SSE connections
export function useOptimizedSSE(url: string, options: any = {}) {
  const { createSSE, closeSSE, isConnected, lastError, isLoading } = useOptimizedConnection({
    strategy: 'sse',
    autoReserve: false,
    autoCleanup: options.autoCleanup !== false,
    inactivityTimeout: options.inactivityTimeout
  });

  useEffect(() => {
    if (url) {
      createSSE(url, options).catch(console.error);
    }

    return () => {
      closeSSE();
    };
  }, [url, createSSE, closeSSE]);

  return {
    isConnected,
    lastError,
    isLoading,
    closeSSE
  };
}

// Export convenience hook for API calls
export function useOptimizedAPI() {
  return useOptimizedConnection({
    strategy: 'api',
    autoReserve: true,
    autoCleanup: true
  });
}
