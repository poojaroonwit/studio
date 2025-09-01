import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Simple SSE hook - easy to use and understand
export function useSimpleSSE() {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  // Connect to SSE
  const connect = useCallback(() => {
    if (!session?.user?.id || eventSourceRef.current) return;

    try {
      const eventSource = new EventSource('/api/sse');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ SSE connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
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
            setLastMessage(data);
          } catch (error) {
            console.error(`Error parsing ${eventType} event:`, error);
          }
        });
      });

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsConnected(false);
        setError('Connection failed');
        
        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            eventSource.close();
            eventSourceRef.current = null;
            connect();
          }, delay);
        }
      };

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setError('Failed to connect');
    }
  }, [session?.user?.id]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
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
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  // Connect on mount
  useEffect(() => {
    if (session?.user?.id) {
      connect();
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
    reconnect,
    disconnect
  };
}

// Specialized hooks for specific event types
export function useCandidateUpdates() {
  const { isConnected, lastMessage } = useSimpleSSE();
  const [candidateUpdates, setCandidateUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (lastMessage?.type === 'candidate_update') {
      setCandidateUpdates(prev => [...prev, lastMessage.data]);
    }
  }, [lastMessage]);

  return {
    isConnected,
    candidateUpdates,
    latestUpdate: lastMessage?.type === 'candidate_update' ? lastMessage.data : null
  };
}

export function usePositionUpdates() {
  const { isConnected, lastMessage } = useSimpleSSE();
  const [positionUpdates, setPositionUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (lastMessage?.type === 'position_update') {
      setPositionUpdates(prev => [...prev, lastMessage.data]);
    }
  }, [lastMessage]);

  return {
    isConnected,
    positionUpdates,
    latestUpdate: lastMessage?.type === 'position_update' ? lastMessage.data : null
  };
}

export function useNotifications() {
  const { isConnected, lastMessage } = useSimpleSSE();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (lastMessage?.type === 'notification') {
      setNotifications(prev => [...prev, lastMessage.data]);
    }
  }, [lastMessage]);

  return {
    isConnected,
    notifications,
    latestNotification: lastMessage?.type === 'notification' ? lastMessage.data : null
  };
}

export function useUploadQueueUpdates() {
  const { isConnected, lastMessage } = useSimpleSSE();
  const [queueUpdates, setQueueUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (lastMessage?.type === 'upload_queue_update') {
      setQueueUpdates(prev => [...prev, lastMessage.data]);
    }
  }, [lastMessage]);

  return {
    isConnected,
    queueUpdates,
    latestUpdate: lastMessage?.type === 'upload_queue_update' ? lastMessage.data : null
  };
}
