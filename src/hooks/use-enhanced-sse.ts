import { useEventSource } from '@/hooks/useEventSource';

// Lightweight compatibility hook mapped to the new simple EventSource
export function useEnhancedSSE() {
  const { connected, lastEvent } = useEventSource('/api/sse');

  const connectionStatus = {
    totalEndpoints: 1,
    connectedEndpoints: connected ? 1 : 0,
    failedEndpoints: 0,
    disabledEndpoints: 0,
    endpoints: [
      {
        id: 'main-sse',
        name: 'Main SSE',
        url: '/api/sse',
        isConnected: connected,
        lastError: null,
        lastErrorEventType: null,
        lastErrorLocation: null,
      }
    ]
  } as any;

  return {
    isConnected: connected,
    isFullyConnected: connected,
    hasFailures: false,
    isConnecting: false,

    connectionStatus,
    totalEndpoints: connectionStatus.totalEndpoints,
    connectedEndpoints: connectionStatus.connectedEndpoints,
    failedEndpoints: connectionStatus.failedEndpoints,
    disabledEndpoints: connectionStatus.disabledEndpoints,

    // No-ops for legacy API
    getEndpointDetails: (_id: string) => connectionStatus.endpoints[0],
    isEndpointConnected: (_id: string) => connected,
    toggleEndpoint: (_id: string, _enabled: boolean) => {},
    reconnectEndpoint: (_id: string) => {},
    connect: () => {},
    disconnect: () => {},
    reconnect: () => {},

    error: null,
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

