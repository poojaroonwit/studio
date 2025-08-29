
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSafeEffect, useInfiniteLoopPrevention } from './use-safe-effect';

interface UnifiedRealtimeOptions {
  onCandidateUpdate?: (candidate: any) => void;
  onPositionUpdate?: (position: any) => void;
  onWarningUpdate?: () => void;
  onNotificationUpdate?: (notification: any) => void;
  onUploadQueueUpdate?: (queue: any) => void;
  onPresenceUpdate?: (presence: any) => void;
  onUserListUpdate?: (users: any[]) => void;
  onDashboardUpdate?: (dashboardData: any) => void;
  onSessionExpired?: () => void;
  onHealthCheck?: (healthData: any) => void;
  
  // Configuration
  showNotifications?: boolean;
  showErrorNotifications?: boolean;
  errorToastCooldownMs?: number;
}

// Global connection state to prevent multiple connections
let globalEventSource: EventSource | null = null;
let globalConnectionCount = 0;
let globalReconnectTimeout: NodeJS.Timeout | null = null;
let globalCleanupFunctions = new Map<EventSource, () => void>();
let globalConnectionTimeout: NodeJS.Timeout | null = null; // Add timeout protection

// Add global connection timeout protection
const GLOBAL_CONNECTION_TIMEOUT = 30000; // 30 seconds
const MAX_GLOBAL_CONNECTIONS = 10; // Prevent too many global connections

export function useUnifiedRealtime(options: UnifiedRealtimeOptions = {}) {
  // Defensive check to prevent initialization errors
  if (typeof window === 'undefined') {
    // Return safe defaults for SSR
    return {
      isConnected: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      lastUpdate: null,
      connectionHealth: 'disconnected' as const,
      connectedUsers: 0,
      totalConnections: 0,
      reconnect: () => {},
      disconnect: () => {}
    };
  }

  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionHealth, setConnectionHealth] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('disconnected');
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [totalConnections, setTotalConnections] = useState(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const lastMessageTimeRef = useRef<number>(Date.now());
  const lastErrorToastTimeRef = useRef<number>(0);
  const messageCountRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);

  // Add infinite loop prevention
  const { trackRun: trackConnectionAttempt } = useInfiniteLoopPrevention('UnifiedRealtimeConnection', 20, () => {
    console.error('🚨 Excessive connection attempts detected in useUnifiedRealtime');
  });

  const { trackRun: trackReconnectAttempt } = useInfiniteLoopPrevention('UnifiedRealtimeReconnect', 10, () => {
    console.error('🚨 Excessive reconnection attempts detected in useUnifiedRealtime');
  });

  // Set client flag to prevent SSR issues - FIXED: Use useEffect instead of useSafeEffect for this simple operation
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Use ref for options to avoid infinite loops - update directly without effect
  const optionsRef = useRef(options);
  optionsRef.current = options; // Direct assignment to avoid effect dependency issues

  // Defensive check to ensure options is valid
  if (!options || typeof options !== 'object') {
    console.warn('useUnifiedRealtime: Invalid options provided, using defaults');
    optionsRef.current = {};
  }

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
        if (globalConnectionTimeout) {
          clearTimeout(globalConnectionTimeout);
          globalConnectionTimeout = null;
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
    setIsReconnecting(false);
    setConnectionHealth('disconnected');
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(() => {
    if (!trackConnectionAttempt()) return;
    
    if (!session?.user || !mountedRef.current || isConnectingRef.current || !isClient) return;

    // Prevent excessive reconnection attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn('🚨 Maximum reconnection attempts reached, stopping reconnection');
      return;
    }

    // Prevent too many global connections
    if (globalConnectionCount >= MAX_GLOBAL_CONNECTIONS) {
      console.warn('🚨 Too many global connections, waiting for cleanup');
      return;
    }

    // Prevent multiple connection attempts
    if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.CONNECTING) {
      console.log('Connection already in progress, skipping duplicate attempt');
      return;
    }

    isConnectingRef.current = true;
    setIsReconnecting(true);

    // Add connection timeout protection
    if (globalConnectionTimeout) {
      clearTimeout(globalConnectionTimeout);
    }
    globalConnectionTimeout = setTimeout(() => {
      console.error('🚨 Global connection timeout, cleaning up');
      if (globalEventSource) {
        globalEventSource.close();
        globalEventSource = null;
      }
      globalConnectionCount = 0;
      isConnectingRef.current = false;
      setIsReconnecting(false);
    }, GLOBAL_CONNECTION_TIMEOUT);

    // Use global connection if available and ready
    if (globalEventSource && globalEventSource.readyState === EventSource.OPEN) {
      eventSourceRef.current = globalEventSource;
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionHealth('excellent');
      setLastUpdate(new Date());
      globalConnectionCount++;
      isConnectingRef.current = false;
      if (globalConnectionTimeout) {
        clearTimeout(globalConnectionTimeout);
        globalConnectionTimeout = null;
      }
      return;
    }

    try {
      const eventSource = new EventSource('/api/realtime/unified');
      if (!eventSource) {
        console.error('Failed to create EventSource');
        isConnectingRef.current = false;
        setIsReconnecting(false);
        return;
      }
      eventSourceRef.current = eventSource;
      globalEventSource = eventSource;

      eventSource.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        setIsReconnecting(false);
        setConnectionHealth('excellent');
        setLastUpdate(new Date());
        globalConnectionCount++;
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        isConnectingRef.current = false;
        lastMessageTimeRef.current = Date.now();
        messageCountRef.current = 0;
        errorCountRef.current = 0;
      };

      eventSource.onerror = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        setIsReconnecting(false);
        setConnectionHealth('disconnected');
        isConnectingRef.current = false;
        errorCountRef.current++;
        
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
          setReconnectAttempts(reconnectAttemptsRef.current);
          
          // Reconnect after 5 seconds, but only if under max attempts
          if (reconnectAttemptsRef.current < maxReconnectAttempts && trackReconnectAttempt()) {
            setIsReconnecting(true);
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
            messageCountRef.current++;
            lastMessageTimeRef.current = Date.now();
            
            // Update connection health based on message frequency
            const timeSinceLastMessage = Date.now() - lastMessageTimeRef.current;
            if (timeSinceLastMessage < 1000) {
              setConnectionHealth('excellent');
            } else if (timeSinceLastMessage < 5000) {
              setConnectionHealth('good');
            } else {
              setConnectionHealth('poor');
            }
            
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
      const userListHandler = handleEvent('user_list', optionsRef.current.onUserListUpdate);
      const dashboardHandler = handleEvent('dashboard', optionsRef.current.onDashboardUpdate);
      const sessionExpiredHandler = () => {
        if (mountedRef.current && optionsRef.current.onSessionExpired) {
          optionsRef.current.onSessionExpired();
        }
      };
      const healthCheckHandler = handleEvent('health_check', optionsRef.current.onHealthCheck);
      const keepaliveHandler = () => {
        if (mountedRef.current) {
          setLastUpdate(new Date());
          lastMessageTimeRef.current = Date.now();
        }
      };

      eventSource.addEventListener('candidate_update', candidateHandler);
      eventSource.addEventListener('position_update', positionHandler);
      eventSource.addEventListener('warning_update', warningHandler);
      eventSource.addEventListener('notification_update', notificationHandler);
      eventSource.addEventListener('upload_queue_update', uploadQueueHandler);
      eventSource.addEventListener('presence_update', presenceHandler);
      eventSource.addEventListener('user_list_update', userListHandler);
      eventSource.addEventListener('dashboard_update', dashboardHandler);
      eventSource.addEventListener('session_expired', sessionExpiredHandler);
      eventSource.addEventListener('health_check', healthCheckHandler);
      eventSource.addEventListener('keepalive', keepaliveHandler);

      // Store cleanup function for this EventSource
      const cleanupEventListeners = () => {
        try {
          if (eventSource) {
            eventSource.removeEventListener('candidate_update', candidateHandler);
            eventSource.removeEventListener('position_update', positionHandler);
            eventSource.removeEventListener('warning_update', warningHandler);
            eventSource.removeEventListener('notification_update', notificationHandler);
            eventSource.removeEventListener('upload_queue_update', uploadQueueHandler);
            eventSource.removeEventListener('presence_update', presenceHandler);
            eventSource.removeEventListener('user_list_update', userListHandler);
            eventSource.removeEventListener('dashboard_update', dashboardHandler);
            eventSource.removeEventListener('session_expired', sessionExpiredHandler);
            eventSource.removeEventListener('health_check', healthCheckHandler);
            eventSource.removeEventListener('keepalive', keepaliveHandler);
          }
        } catch (error) {
          console.warn('Error during event listener cleanup:', error);
        }
      };

      // Store cleanup function for later use
      globalCleanupFunctions.set(eventSource, cleanupEventListeners);

    } catch (error) {
      console.error('Failed to connect to unified real-time:', error);
      setIsConnected(false);
      setIsReconnecting(false);
      setConnectionHealth('disconnected');
      isConnectingRef.current = false;
    }
  }, [session?.user?.id, trackConnectionAttempt, trackReconnectAttempt, isClient]);

  // Connection effect - FIXED: Stabilize dependencies to prevent infinite loops
  useSafeEffect(() => {
    mountedRef.current = true;
    
    if (session?.user && isClient) {
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
  }, [session?.user?.id, isClient, connect, cleanup], 'UnifiedRealtimeConnection', 10);

  // Separate cleanup effect for unmounting - FIXED: Remove dependencies that cause loops
  useSafeEffect(() => {
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

      // Call cleanup function
      if (eventSourceRef.current) {
        cleanup();
      }
    };
  }, [], 'UnifiedRealtimeUnmount', 5);

  // Return early if not on client side to prevent SSR issues
  if (!isClient) {
    return {
      isConnected: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      lastUpdate: null,
      connectionHealth: 'disconnected' as const,
      connectedUsers: 0,
      totalConnections: 0,
      reconnect: () => {},
      disconnect: () => {}
    };
  }

  return {
    isConnected,
    isReconnecting,
    reconnectAttempts,
    lastUpdate,
    connectionHealth,
    connectedUsers,
    totalConnections,
    reconnect: connect,
    disconnect: cleanup
  };
}
