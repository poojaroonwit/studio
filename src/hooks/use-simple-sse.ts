import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Simple SSE hook - easy to use and understand
export function useSimpleSSE() {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5; // Increased from 3 to 5

  // Connect to SSE
  const connect = useCallback(() => {
    if (!session?.user?.id) {
      console.log('[SSE Client] No session, skipping connection');
      return;
    }

    if (eventSourceRef.current) {
      console.log('[SSE Client] Connection already exists, skipping');
      return;
    }

    try {
      console.log('[SSE Client] Attempting to connect to SSE...');
      const eventSource = new EventSource('/api/sse');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ SSE connected successfully');
        setIsConnected(true);
        setError(null);
        setConnectionAttempts(prev => prev + 1);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE Client] Received message:', data);
          setLastMessage(data);
        } catch (error) {
          console.error('[SSE Client] Error parsing SSE message:', error);
        }
      };

      // Handle specific events
      const eventTypes = [
        'candidate_update',
        'position_update', 
        'notification',
        'upload_queue_update',
        'dashboard_update',
        'keepalive'
      ];

      eventTypes.forEach(eventType => {
        eventSource.addEventListener(eventType, (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            console.log(`[SSE Client] Received ${eventType} event:`, data);
            setLastMessage(data);
          } catch (error) {
            console.error(`[SSE Client] Error parsing ${eventType} event:`, error);
          }
        });
      });

      eventSource.onerror = (error) => {
        console.error('[SSE Client] SSE connection error:', error);
        setIsConnected(false);
        setError('Connection failed');
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Max 30 seconds
          
          console.log(`[SSE Client] Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            eventSource.close();
            eventSourceRef.current = null;
            connect();
          }, delay);
        } else {
          console.error('[SSE Client] Max reconnection attempts reached');
          setError('Max reconnection attempts reached');
        }
      }

    } catch (error) {
      console.error('[SSE Client] Failed to create SSE connection:', error);
      setError('Failed to connect');
    }
  }, [session?.user?.id]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    console.log('[SSE Client] Disconnecting from SSE');
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    setError(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Manual reconnect
  const reconnect = useCallback(() => {
    console.log('[SSE Client] Manual reconnect requested');
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  // Connect on mount
  useEffect(() => {
    if (session?.user?.id) {
      console.log('[SSE Client] Session available, connecting...');
      connect();
    } else {
      console.log('[SSE Client] No session available');
    }

    return () => {
      disconnect();
    };
  }, [session?.user?.id, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    connectionAttempts,
    reconnect,
    disconnect
  };
}

// Specialized hooks for specific event types
export function useCandidateUpdates() {
  const { isConnected, lastMessage } = useSimpleSSE();
  
  return {
    isConnected,
    candidateUpdate: lastMessage?.type === 'candidate_update' ? lastMessage : null
  };
}

export function usePositionUpdates() {
  const { isConnected, lastMessage } = useSimpleSSE();
  
  return {
    isConnected,
    positionUpdate: lastMessage?.type === 'position_update' ? lastMessage : null
  };
}

export function useUploadQueueUpdates() {
  const { isConnected, lastMessage } = useSimpleSSE();
  
  return {
    isConnected,
    uploadQueueUpdate: lastMessage?.type === 'upload_queue_update' ? lastMessage : null
  };
}

export function useDashboardUpdates() {
  const { isConnected, lastMessage } = useSimpleSSE();
  
  return {
    isConnected,
    dashboardUpdate: lastMessage?.type === 'dashboard_update' ? lastMessage : null
  };
}
