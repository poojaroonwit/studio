
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface UnifiedRealtimeOptions {
  onCandidateUpdate?: (candidate: any) => void;
  onPositionUpdate?: (position: any) => void;
  onWarningUpdate?: () => void;
  onNotificationUpdate?: (notification: any) => void;
  onUploadQueueUpdate?: (queue: any) => void;
  onPresenceUpdate?: (presence: any) => void;
}

// Global connection state to prevent multiple connections
let globalEventSource: EventSource | null = null;
let globalConnectionCount = 0;
let globalReconnectTimeout: NodeJS.Timeout | null = null;
let globalCleanupFunctions = new Map<EventSource, () => void>();

export function useUnifiedRealtime(options: UnifiedRealtimeOptions = {}) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      // Call stored cleanup function if it exists
      const cleanupFn = globalCleanupFunctions.get(eventSourceRef.current);
      if (cleanupFn) {
        cleanupFn();
        globalCleanupFunctions.delete(eventSourceRef.current);
      }
      
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (healthCheckRef.current) {
      clearTimeout(healthCheckRef.current);
      healthCheckRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!session?.user || !mountedRef.current) return;

    // Use global connection if available
    if (globalEventSource && globalEventSource.readyState === EventSource.OPEN) {
      eventSourceRef.current = globalEventSource;
      setIsConnected(true);
      setLastUpdate(new Date());
      globalConnectionCount++;
      return;
    }

    try {
      const eventSource = new EventSource('/api/realtime/unified');
      eventSourceRef.current = eventSource;
      globalEventSource = eventSource;

      eventSource.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        setLastUpdate(new Date());
        globalConnectionCount++;
      };

      eventSource.onerror = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        globalConnectionCount = Math.max(0, globalConnectionCount - 1);
        
        // Only cleanup global connection if no other components are using it
        if (globalConnectionCount === 0) {
          globalEventSource = null;
          if (globalReconnectTimeout) {
            clearTimeout(globalReconnectTimeout);
          }
          
          // Reconnect after 5 seconds
          globalReconnectTimeout = setTimeout(() => {
            if (session?.user && mountedRef.current) {
              connect();
            }
          }, 5000);
        }
      };

      // Handle different event types with optimized parsing
      const handleEvent = (eventType: string, handler?: (data: any) => void) => {
        return (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            handler?.(data);
            setLastUpdate(new Date());
          } catch (error) {
            console.error(`Error parsing ${eventType} update:`, error);
          }
        };
      };

      const candidateHandler = handleEvent('candidate', options.onCandidateUpdate);
      const positionHandler = handleEvent('position', options.onPositionUpdate);
      const warningHandler = handleEvent('warning', options.onWarningUpdate);
      const notificationHandler = handleEvent('notification', options.onNotificationUpdate);
      const uploadQueueHandler = handleEvent('upload_queue', options.onUploadQueueUpdate);
      const presenceHandler = handleEvent('presence', options.onPresenceUpdate);
      const keepaliveHandler = () => {
        if (mountedRef.current) {
          setLastUpdate(new Date());
        }
      };

      eventSource.addEventListener('candidate_update', candidateHandler);
      eventSource.addEventListener('position_update', positionHandler);
      eventSource.addEventListener('warning_update', warningHandler);
      eventSource.addEventListener('notification_update', notificationHandler);
      eventSource.addEventListener('upload_queue_update', uploadQueueHandler);
      eventSource.addEventListener('presence_update', presenceHandler);
      eventSource.addEventListener('keepalive', keepaliveHandler);

      // Store handlers for cleanup
      const handlers = {
        candidate: candidateHandler,
        position: positionHandler,
        warning: warningHandler,
        notification: notificationHandler,
        upload_queue: uploadQueueHandler,
        presence: presenceHandler,
        keepalive: keepaliveHandler
      };

      // Store cleanup function
      const cleanupEventListeners = () => {
        if (eventSource) {
          eventSource.removeEventListener('candidate_update', handlers.candidate);
          eventSource.removeEventListener('position_update', handlers.position);
          eventSource.removeEventListener('warning_update', handlers.warning);
          eventSource.removeEventListener('notification_update', handlers.notification);
          eventSource.removeEventListener('upload_queue_update', handlers.upload_queue);
          eventSource.removeEventListener('presence_update', handlers.presence);
          eventSource.removeEventListener('keepalive', handlers.keepalive);
        }
      };

      // Store cleanup function for later use
      globalCleanupFunctions.set(eventSource, cleanupEventListeners);

    } catch (error) {
      console.error('Failed to connect to unified real-time:', error);
      setIsConnected(false);
    }
  }, [session?.user, options]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (session?.user) {
      connect();
    } else {
      cleanup();
    }

    return () => {
      mountedRef.current = false;
      globalConnectionCount = Math.max(0, globalConnectionCount - 1);
      
      // Only cleanup global connection if no other components are using it
      if (globalConnectionCount === 0) {
        if (globalEventSource) {
          globalEventSource.close();
          globalEventSource = null;
        }
        if (globalReconnectTimeout) {
          clearTimeout(globalReconnectTimeout);
          globalReconnectTimeout = null;
        }
      }
      
      cleanup();
    };
  }, [session?.user, connect, cleanup]);

  return {
    isConnected,
    lastUpdate,
    reconnect: connect,
    disconnect: cleanup
  };
}
