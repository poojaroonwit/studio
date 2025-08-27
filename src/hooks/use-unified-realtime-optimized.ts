
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
  const optionsRef = useRef(options);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef(false);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      // Call stored cleanup function if it exists
      const cleanupFn = globalCleanupFunctions.get(eventSourceRef.current);
      if (cleanupFn) {
        try {
          cleanupFn();
        } catch (error) {
          console.warn('Error during event listener cleanup:', error);
        }
        globalCleanupFunctions.delete(eventSourceRef.current);
      }

      // Decrement global connection count safely
      globalConnectionCount = Math.max(0, globalConnectionCount - 1);
      
      // Only close global connection if no other components are using it
      if (globalConnectionCount === 0) {
        if (globalEventSource && globalEventSource.readyState !== EventSource.CLOSED) {
          globalEventSource.close();
          globalEventSource = null;
        }
        if (globalReconnectTimeout) {
          clearTimeout(globalReconnectTimeout);
          globalReconnectTimeout = null;
        }
      }

      // Close local reference safely
      if (eventSourceRef.current.readyState !== EventSource.CLOSED) {
        eventSourceRef.current.close();
      }
      eventSourceRef.current = null;
    }
    
    // Clear all timeout references
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (healthCheckRef.current) {
      clearTimeout(healthCheckRef.current);
      healthCheckRef.current = null;
    }
    
    // Reset connection state
    setIsConnected(false);
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(() => {
    if (!session?.user || !mountedRef.current || isConnectingRef.current) return;

    // Prevent excessive reconnection attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn('🚨 Maximum reconnection attempts reached, stopping reconnection');
      return;
    }

    // Prevent multiple connection attempts
    if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.CONNECTING) {
      console.log('Connection already in progress, skipping duplicate attempt');
      return;
    }

    isConnectingRef.current = true;

    // Use global connection if available and ready
    if (globalEventSource && globalEventSource.readyState === EventSource.OPEN) {
      eventSourceRef.current = globalEventSource;
      setIsConnected(true);
      setLastUpdate(new Date());
      globalConnectionCount++;
      isConnectingRef.current = false;
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
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        isConnectingRef.current = false;
      };

      eventSource.onerror = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        isConnectingRef.current = false;
        
        // Decrement global connection count
        globalConnectionCount = Math.max(0, globalConnectionCount - 1);

        // Only attempt reconnection if this is the last component using the connection
        if (globalConnectionCount === 0) {
          globalEventSource = null;
          if (globalReconnectTimeout) {
            clearTimeout(globalReconnectTimeout);
            globalReconnectTimeout = null;
          }
          
          // Increment reconnect attempts
          reconnectAttemptsRef.current++;
          
          // Reconnect after 5 seconds, but only if under max attempts
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            globalReconnectTimeout = setTimeout(() => {
              if (session?.user && mountedRef.current) {
                connect();
              }
            }, 5000);
          } else {
            console.warn('🚨 Maximum reconnection attempts reached, stopping reconnection');
          }
        }
      };

      // Handle different event types with optimized parsing
      const handleEvent = (eventType: string, handler?: (data: any) => void) => {
        return (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            // Use current options from ref
            const currentOptions = optionsRef.current;
            if (handler) {
              handler(data);
            }
            setLastUpdate(new Date());
          } catch (error) {
            console.error(`Error parsing ${eventType} update:`, error);
          }
        };
      };

      const candidateHandler = handleEvent('candidate', optionsRef.current.onCandidateUpdate);
      const positionHandler = handleEvent('position', optionsRef.current.onPositionUpdate);
      const warningHandler = handleEvent('warning', optionsRef.current.onWarningUpdate);
      const notificationHandler = handleEvent('notification', optionsRef.current.onNotificationUpdate);
      const uploadQueueHandler = handleEvent('upload_queue', optionsRef.current.onUploadQueueUpdate);
      const presenceHandler = handleEvent('presence', optionsRef.current.onPresenceUpdate);
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
  }, [session?.user]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (session?.user) {
      // Add small delay to prevent rapid connection attempts
      const connectTimeout = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, 100);
      
      return () => {
        clearTimeout(connectTimeout);
        mountedRef.current = false;
        cleanup();
      };
    } else {
      cleanup();
    }
  }, [session?.user, connect, cleanup]);

  // Separate cleanup effect for unmounting
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      globalConnectionCount = Math.max(0, globalConnectionCount - 1);
      
      // Only cleanup global connection if no other components are using it
      if (globalConnectionCount === 0) {
        if (globalEventSource && globalEventSource.readyState !== EventSource.CLOSED) {
          globalEventSource.close();
          globalEventSource = null;
        }
        if (globalReconnectTimeout) {
          clearTimeout(globalReconnectTimeout);
          globalReconnectTimeout = null;
        }
        // Clear all global cleanup functions
        globalCleanupFunctions.clear();
      }

      cleanup();
    };
  }, [cleanup]);

  return {
    isConnected,
    lastUpdate,
    reconnect: connect,
    disconnect: cleanup
  };
}
