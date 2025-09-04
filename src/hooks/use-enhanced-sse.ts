import { useEventSource } from '@/hooks/useEventSource';
import { useSSEFallback } from '@/hooks/use-sse-fallback';
import { useEffect } from 'react';

// Lightweight compatibility hook mapped to the new robust EventSource
export function useEnhancedSSE() {
  const { 
    connected, 
    lastEvent, 
    error, 
    retryCount, 
    isCircuitOpen,
    reconnect 
  } = useEventSource('/api/sse', {
    timeoutMs: 20000, // 20 second timeout for SSE
    maxRetries: 2, // Only 2 retries to prevent infinite loops
    retryDelayMs: 10000, // 10 second delay between retries
    enableCircuitBreaker: true
  });

  const { startPolling, stopPolling, isPolling } = useSSEFallback({
    fallbackIntervalMs: 30000, // 30 second polling
    enableFallback: true
  });

  // Start fallback polling when SSE fails
  useEffect(() => {
    if (isCircuitOpen || (error && retryCount >= 2)) {
      console.log('[EnhancedSSE] SSE failed, starting fallback polling');
      startPolling();
    } else if (connected) {
      console.log('[EnhancedSSE] SSE connected, stopping fallback polling');
      stopPolling();
    }
  }, [connected, error, retryCount, isCircuitOpen, startPolling, stopPolling]);

  const connectionStatus = {
    totalEndpoints: 1,
    connectedEndpoints: connected ? 1 : 0,
    failedEndpoints: connected ? 0 : 1,
    disabledEndpoints: 0,
    endpoints: [
      {
        id: 'main-sse',
        name: 'Main SSE',
        url: '/api/sse',
        isConnected: connected,
        lastError: error,
        lastErrorEventType: null,
        lastErrorLocation: null,
        retryCount,
        isCircuitOpen
      }
    ]
  } as any;

  return {
    isConnected: connected || isPolling, // Consider polling as connected
    isFullyConnected: connected,
    hasFailures: !!error || isCircuitOpen,
    isConnecting: retryCount > 0 && !connected,

    connectionStatus,
    totalEndpoints: connectionStatus.totalEndpoints,
    connectedEndpoints: connectionStatus.connectedEndpoints,
    failedEndpoints: connectionStatus.failedEndpoints,
    disabledEndpoints: connectionStatus.disabledEndpoints,

    // No-ops for legacy API
    getEndpointDetails: (_id: string) => connectionStatus.endpoints[0],
    isEndpointConnected: (_id: string) => connected || isPolling,
    toggleEndpoint: (_id: string, _enabled: boolean) => {},
    reconnectEndpoint: (_id: string) => {},
    connect: () => {},
    disconnect: () => {},
    reconnect,

    error: isPolling ? 'Using fallback polling' : error,
    lastMessage: lastEvent
  };
}

export function useEnhancedCandidateUpdates() {
  const { isConnected, connectionStatus } = useEnhancedSSE();
  return { isConnected, hasMainSSE: connectionStatus.endpoints[0]?.isConnected };
}

export function useEnhancedPositionUpdates() {
  const { isConnected, connectionStatus } = useEnhancedSSE();
  return { isConnected, hasMainSSE: connectionStatus.endpoints[0]?.isConnected };
}

export function useEnhancedUploadQueueUpdates() {
  const { isConnected, connectionStatus } = useEnhancedSSE();
  return { isConnected, hasMainSSE: connectionStatus.endpoints[0]?.isConnected };
}

export function useEnhancedDashboardUpdates() {
  const { isConnected, connectionStatus } = useEnhancedSSE();
  return { isConnected, hasMainSSE: connectionStatus.endpoints[0]?.isConnected };
}

