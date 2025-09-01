import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import enhancedSSEManager, { SSEConnectionStatus, SSEEndpoint } from '@/lib/enhanced-sse-manager';

// Enhanced SSE hook that uses the enhanced SSE manager
export function useEnhancedSSE() {
  const debugMode = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SSE_DEBUG === '1');
  const info = (...args: any[]) => { if (debugMode) { /* eslint-disable no-console */ console.log(...args); /* eslint-enable no-console */ } };
  const warn = (...args: any[]) => { /* eslint-disable no-console */ console.warn(...args); /* eslint-enable no-console */ };
  const errorLog = (...args: any[]) => { /* eslint-disable no-console */ console.error(...args); /* eslint-enable no-console */ };

  const { data: session } = useSession();
  const [connectionStatus, setConnectionStatus] = useState<SSEConnectionStatus>(enhancedSSEManager.getConnectionStatus());
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const statusUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectingRef = useRef<boolean>(false);

  // Update connection status periodically
  const updateConnectionStatus = useCallback(() => {
    const status = enhancedSSEManager.getConnectionStatus();
    setConnectionStatus(status);
    
    // Check if any endpoints have errors
    const hasErrors = status.endpoints.some(endpoint => endpoint.lastError);
    if (hasErrors) {
      const errorMessages = status.endpoints
        .filter(endpoint => endpoint.lastError)
        .map(endpoint => `${endpoint.name}: ${endpoint.lastError}${endpoint.lastErrorEventType ? ` [${endpoint.lastErrorEventType}]` : ''}${endpoint.lastErrorLocation ? ` @ ${endpoint.lastErrorLocation}` : ''}`)
        .join('; ');
      
      setError(errorMessages);
    } else {
      setError(null);
    }
  }, []);

  // Connect to all SSE endpoints
  const connect = useCallback(async () => {
    if (!session?.user?.id) {
      info('[Enhanced SSE Hook] No session, skipping connection');
      return;
    }

    if (connectingRef.current) {
      info('[Enhanced SSE Hook] Connection already in progress, skipping');
      return;
    }

    connectingRef.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      info('[Enhanced SSE Hook] Starting connection to all SSE endpoints...');
      
      // Connect to all endpoints sequentially
      await enhancedSSEManager.connectAll();
      
      // Update status after connection
      updateConnectionStatus();
      
      info('[Enhanced SSE Hook] Connection sequence completed');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorLog('[Enhanced SSE Hook] Connection error:', errorMessage);
      setError(errorMessage);
    } finally {
      connectingRef.current = false;
      setIsConnecting(false);
    }
  }, [session?.user?.id, updateConnectionStatus]);

  // Disconnect from all SSE endpoints
  const disconnect = useCallback(() => {
    info('[Enhanced SSE Hook] Disconnecting from all SSE endpoints');
    
    enhancedSSEManager.disconnectAll();
    updateConnectionStatus();
    setError(null);
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
    return enhancedSSEManager.isEndpointConnected(endpointId);
  }, []);

  // Subscribe once per mount
  useEffect(() => {
    enhancedSSEManager.addSubscriber();
    return () => {
      enhancedSSEManager.removeSubscriber();
    };
  }, []);

  // Connect on mount when session is available
  useEffect(() => {
    if (session?.user?.id) {
      info('[Enhanced SSE Hook] Session available, connecting...');
      connect();
    } else {
      info('[Enhanced SSE Hook] No session available');
    }

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [session?.user?.id]);

  // Set up periodic status updates
  useEffect(() => {
    // Update status every 5 seconds
    statusUpdateIntervalRef.current = setInterval(updateConnectionStatus, 5000);

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
    hasMainSSE: connectionStatus.endpoints.some(e => e.id === 'main-sse' && e.isConnected),
    hasUploadQueueSSE: connectionStatus.endpoints.some(e => e.id === 'upload-queue-sse' && e.isConnected)
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
    hasMainSSE: connectionStatus.endpoints.some(e => e.id === 'main-sse' && e.isConnected),
    hasUploadQueueSSE: connectionStatus.endpoints.some(e => e.id === 'upload-queue-sse' && e.isConnected)
  };
}

export function useEnhancedDashboardUpdates() {
  const { isConnected, connectionStatus } = useEnhancedSSE();
  
  return {
    isConnected,
    hasMainSSE: connectionStatus.endpoints.some(e => e.id === 'main-sse' && e.isConnected),
    hasDashboardStream: connectionStatus.endpoints.some(e => e.id === 'dashboard-stream' && e.isConnected)
  };
}

// Export the manager for direct access if needed
export { enhancedSSEManager };
