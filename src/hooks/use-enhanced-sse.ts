import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import enhancedSSEManager, { SSEConnectionStatus, SSEEndpoint } from '@/lib/enhanced-sse-manager';

// Enhanced SSE hook that uses the enhanced SSE manager
export function useEnhancedSSE() {
  const debugMode = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SSE_DEBUG === '1');
  const info = (...args: any[]) => { if (debugMode) { /* eslint-disable no-console */ console.log(...args); /* eslint-enable no-console */ } };
  const warn = (...args: any[]) => { /* eslint-disable no-console */ console.warn(...args); /* eslint-enable no-console */ };
  const errorLog = (...args: any[]) => { /* eslint-disable no-console */ console.error(...args); /* eslint-enable no-console */ };

  const { data: session, status } = useSession();
  const [connectionStatus, setConnectionStatus] = useState<SSEConnectionStatus>(enhancedSSEManager.getConnectionStatus());
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const statusUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectingRef = useRef<boolean>(false);
  const isInitializedRef = useRef(false);

  // Enhanced initialization guard to prevent early access errors
  const isReady = useMemo(() => {
    return status !== 'loading' && (status === 'authenticated' ? !!session?.user?.id : false);
  }, [status, session?.user?.id]);

  // Update connection status periodically
  const updateConnectionStatus = useCallback(() => {
    try {
      if (!isInitializedRef.current) return;
      const newStatus = enhancedSSEManager.getConnectionStatus();
      setConnectionStatus(newStatus);
      
      // Check if any endpoints have errors
      const hasErrors = newStatus.endpoints.some(endpoint => endpoint.lastError);
      if (hasErrors) {
        const errorMessages = newStatus.endpoints
          .filter(endpoint => endpoint.lastError)
          .map(endpoint => `${endpoint.name}: ${endpoint.lastError}${endpoint.lastErrorEventType ? ` [${endpoint.lastErrorEventType}]` : ''}${endpoint.lastErrorLocation ? ` @ ${endpoint.lastErrorLocation}` : ''}`)
          .join('; ');
        
        setError(errorMessages);
      } else {
        setError(null);
      }
    } catch (error) {
      console.warn('useEnhancedSSE: Error updating connection status:', error);
    }
  }, []);

  // Connect to SSE endpoints
  const connect = useCallback(async () => {
    try {
      if (!isReady || !isInitializedRef.current || connectingRef.current) {
        return;
      }

      connectingRef.current = true;
      setIsConnecting(true);
      setError(null);

      await enhancedSSEManager.connectAll();
      
      // Update connection status after connection
      updateConnectionStatus();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      setError(errorMessage);
      errorLog('[Enhanced SSE Hook] Connection failed:', error);
    } finally {
      setIsConnecting(false);
      connectingRef.current = false;
    }
  }, [isReady, updateConnectionStatus]);

  // Disconnect from SSE endpoints
  const disconnect = useCallback(async () => {
    try {
      if (!isInitializedRef.current) return;
      await enhancedSSEManager.disconnectAll();
      updateConnectionStatus();
    } catch (error) {
      console.warn('useEnhancedSSE: Error disconnecting:', error);
    }
  }, [updateConnectionStatus]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    info('[Enhanced SSE Hook] Manual reconnect requested');
    
    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Disconnect first, then reconnect after a short delay
    disconnect();
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, 1000);
  }, [connect, disconnect]);

  // Force reconnect specific endpoint
  const reconnectEndpoint = useCallback((endpointId: string) => {
    info(`[Enhanced SSE Hook] Force reconnecting endpoint: ${endpointId}`);
    enhancedSSEManager.forceReconnect(endpointId);
    
    // Update status after a short delay to allow reconnection
    setTimeout(() => {
      updateConnectionStatus();
    }, 500);
  }, [updateConnectionStatus]);

  // Enable/disable specific endpoint
  const toggleEndpoint = useCallback((endpointId: string, enabled: boolean) => {
    if (enabled) {
      enhancedSSEManager.enableEndpoint(endpointId);
    } else {
      enhancedSSEManager.disableEndpoint(endpointId);
    }
    updateConnectionStatus();
  }, [updateConnectionStatus]);

  // Get endpoint details
  const getEndpointDetails = useCallback((endpointId: string): SSEEndpoint | undefined => {
    return enhancedSSEManager.getEndpointDetails(endpointId);
  }, []);

  // Check if specific endpoint is connected
  const isEndpointConnected = useCallback((endpointId: string): boolean => {
    try {
      if (!isInitializedRef.current) return false;
      return enhancedSSEManager.isEndpointConnected(endpointId);
    } catch (error) {
      console.warn('useEnhancedSSE: Error checking endpoint connection:', error);
      return false;
    }
  }, []);

  // Subscribe once per mount
  useEffect(() => {
    try {
      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
      }
      
      enhancedSSEManager.addSubscriber();
      
      // Add event listener to receive SSE events
      const handleSSEEvent = (event: any) => {
        try {
          // Reduce noisy logs in production; enable with NEXT_PUBLIC_SSE_DEBUG=1
          if (debugMode) {
            // eslint-disable-next-line no-console
            info('[Enhanced SSE Hook] Received event:', event);
          }
          setLastMessage(event);
        } catch (error) {
          console.warn('useEnhancedSSE: Error handling SSE event:', error);
        }
      };
      
      enhancedSSEManager.addEventListener(handleSSEEvent);
      
      return () => {
        try {
          enhancedSSEManager.removeSubscriber();
          enhancedSSEManager.removeEventListener(handleSSEEvent);
        } catch (error) {
          console.warn('useEnhancedSSE: Error cleaning up event listeners:', error);
        }
      };
    } catch (error) {
      console.error('useEnhancedSSE: Error during initialization:', error);
    }
  }, [debugMode]);

  // Connect on mount when session is available
  useEffect(() => {
    if (isReady && session?.user?.id) {
      info('[Enhanced SSE Hook] Session available, connecting...');
      connect();
    } else {
      info('[Enhanced SSE Hook] No session available or not ready');
    }

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isReady, session?.user?.id, connect]);

  // Set up periodic status updates
  useEffect(() => {
    if (!isInitializedRef.current) return;
    
    // Update status every 10 seconds
    statusUpdateIntervalRef.current = setInterval(updateConnectionStatus, 10000); // 10 seconds for better performance

    return () => {
      if (statusUpdateIntervalRef.current) {
        clearInterval(statusUpdateIntervalRef.current);
      }
    };
  }, [updateConnectionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusUpdateIntervalRef.current) {
        clearInterval(statusUpdateIntervalRef.current);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Calculate overall connection status
  const isConnected = connectionStatus.connectedEndpoints > 0;
  const hasFailures = connectionStatus.failedEndpoints > 0;
  const isFullyConnected = connectionStatus.connectedEndpoints === connectionStatus.totalEndpoints;

  return {
    // Connection status
    isConnected,
    isFullyConnected,
    hasFailures,
    isConnecting,
    
    // Connection details
    connectionStatus,
    totalEndpoints: connectionStatus.totalEndpoints,
    connectedEndpoints: connectionStatus.connectedEndpoints,
    failedEndpoints: connectionStatus.failedEndpoints,
    disabledEndpoints: connectionStatus.disabledEndpoints,
    
    // Endpoint management
    getEndpointDetails,
    isEndpointConnected,
    toggleEndpoint,
    reconnectEndpoint,
    
    // Global actions
    connect,
    disconnect,
    reconnect,
    
    // Error handling
    error,
    lastMessage
  };
}

// Specialized hooks for specific event types
export function useEnhancedCandidateUpdates() {
  const { isConnected, connectionStatus } = useEnhancedSSE();
  
  return {
    isConnected,
    hasMainSSE: connectionStatus.endpoints.some(e => e.id === 'main-sse' && e.isConnected)
    // Note: upload-queue-sse endpoint has been deprecated in favor of unified SSE
  };
}

export function useEnhancedPositionUpdates() {
  const { isConnected, connectionStatus } = useEnhancedSSE();
  
  return {
    isConnected,
    hasMainSSE: connectionStatus.endpoints.some(e => e.id === 'main-sse' && e.isConnected)
  };
}

export function useEnhancedUploadQueueUpdates() {
  const { isConnected, connectionStatus } = useEnhancedSSE();
  
  return {
    isConnected,
    hasMainSSE: connectionStatus.endpoints.some(e => e.id === 'main-sse' && e.isConnected)
    // Note: upload-queue-sse endpoint has been deprecated in favor of unified SSE
  };
}

export function useEnhancedDashboardUpdates() {
  const { isConnected, connectionStatus } = useEnhancedSSE();
  
  return {
    isConnected,
    hasMainSSE: connectionStatus.endpoints.some(e => e.id === 'main-sse' && e.isConnected)
    // Note: dashboard-stream endpoint has been deprecated in favor of unified SSE
  };
}

// Export the manager for direct access if needed
export { enhancedSSEManager };
