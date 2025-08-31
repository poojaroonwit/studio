
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSafeEffect } from './use-safe-effect';
import { createOptimizedSSE, connectionPoolManager } from '@/lib/connection-pool-manager';

// Singleton class for managing global real-time connection
class UnifiedRealtimeManager {
  private static instance: UnifiedRealtimeManager;
  private eventSource: EventSource | null = null;
  private isConnecting = false;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners = new Map<string, Set<(data: any) => void>>();
  private connectedSessions = new Set<string>();
  private connectionAttempts = new Map<string, number>();
  private maxAttempts = 3;
  private connectionCount = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Add connection health monitoring
  private lastHeartbeat = Date.now();
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private isHealthy = true;

  private constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000); // Clean up every 30 seconds
  }

  static getInstance(): UnifiedRealtimeManager {
    if (!UnifiedRealtimeManager.instance) {
      UnifiedRealtimeManager.instance = new UnifiedRealtimeManager();
    }
    return UnifiedRealtimeManager.instance;
  }

  // Enhanced cleanup method
  private cleanupStaleConnections() {
    // Clear old connection attempts
    const now = Date.now();
    for (const [sessionId, lastAttempt] of this.connectionAttempts.entries()) {
      if (now - lastAttempt > 60000) { // Clear attempts older than 1 minute
        this.connectionAttempts.delete(sessionId);
      }
    }

    // Check connection health
    if (this.eventSource && this.isHealthy) {
      const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;
      if (timeSinceHeartbeat > 30000) { // No heartbeat for 30 seconds
        console.warn('🚨 SSE connection appears stale, reconnecting...');
        this.cleanup();
        this.isHealthy = false;
      }
    }
  }

  // Add event listener
  addEventListener(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return cleanup function
    return () => {
      const eventListeners = this.listeners.get(eventType);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  // Connect to real-time service with enhanced error handling
  async connect(sessionId: string): Promise<boolean> {
    // Prevent multiple connection attempts
    if (this.isConnecting) {
      return false;
    }

    // Check if already connected for this session
    if (this.connectedSessions.has(sessionId)) {
      this.connectionCount++;
      return true;
    }

    // Check connection attempts with exponential backoff
    const attempts = this.connectionAttempts.get(sessionId) || 0;
    if (attempts >= this.maxAttempts) {
      console.warn(`🚨 Maximum connection attempts reached for session ${sessionId}`);
      return false;
    }

    this.isConnecting = true;
    this.connectionAttempts.set(sessionId, attempts + 1);

    try {
      // Clear existing connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }

      // Set connection timeout with exponential backoff
      const timeoutDuration = Math.min(30000 * Math.pow(2, attempts), 120000); // Max 2 minutes
      this.connectionTimeout = setTimeout(() => {
        console.error(`🚨 Connection timeout after ${timeoutDuration}ms`);
        this.cleanup();
        this.isConnecting = false;
      }, timeoutDuration);

      // Create new EventSource with connection pool management
      const eventSource = await createOptimizedSSE('/api/realtime/unified', {
        timeout: timeoutDuration,
        retryAttempts: this.maxReconnectAttempts,
        priority: 'high'
      });
      this.eventSource = eventSource;

      // Enhanced event handling
      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        this.isConnecting = false;
        this.connectedSessions.add(sessionId);
        this.connectionCount++;
        this.isHealthy = true;
        this.lastHeartbeat = Date.now();
        
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Update heartbeat on any message
          this.lastHeartbeat = Date.now();
          
          // Handle different message types
          if (data.type === 'keepalive' || data.type === 'heartbeat') {
            // Just update heartbeat, don't broadcast
            return;
          }
          
          // Broadcast to listeners
          const eventListeners = this.listeners.get(data.type || 'message');
          if (eventListeners) {
            eventListeners.forEach(callback => {
              try {
                callback(data);
              } catch (error) {
                console.error('Error in SSE listener callback:', error);
              }
            });
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('🚨 SSE connection error:', error);
        this.isHealthy = false;
        
        // Don't immediately reconnect on 401 errors (auth issues)
        if (eventSource.readyState === EventSource.CONNECTING) {
          console.log('SSE connection is reconnecting...');
        } else if (eventSource.readyState === EventSource.CLOSED) {
          console.log('SSE connection closed');
          this.cleanup();
        }
        
        this.isConnecting = false;
      };

      return true;
    } catch (error) {
      console.error('�� Failed to create SSE connection:', error);
      this.cleanup();
      this.isConnecting = false;
      return false;
    }
  }

  // Setup event listeners
  private setupEventListeners(eventSource: EventSource) {
    const eventTypes = [
      'candidate_update',
      'position_update', 
      'warning_update',
      'notification_update',
      'upload_queue_update',
      'presence_update',
      'user_list_update',
      'dashboard_update',
      'session_expired',
      'health_check',
      'keepalive'
    ];

    eventTypes.forEach(eventType => {
      eventSource.addEventListener(eventType, (event: MessageEvent) => {
        this.handleEvent(eventType, event);
      });
    });
  }

  // Handle incoming events
  private handleEvent(eventType: string, event: MessageEvent) {
    this.lastHeartbeat = Date.now();

    try {
      const data = eventType === 'session_expired' ? null : JSON.parse(event.data);
      
      // Notify all listeners for this event type
      const eventListeners = this.listeners.get(eventType);
      if (eventListeners) {
        eventListeners.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in ${eventType} listener:`, error);
          }
        });
      }
    } catch (error) {
      console.error(`Error parsing ${eventType} event:`, error);
    }
  }

  // Handle connection errors
  private handleConnectionError(sessionId: string) {
    this.connectedSessions.delete(sessionId);
    this.connectionCount = Math.max(0, this.connectionCount - 1);

    // Cleanup current connection
    this.cleanup();

    // Attempt reconnection if under max attempts
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.isConnecting = false;
        // Reconnection will be handled by components that are still mounted
      }, 5000);
    } else {
      console.warn('🚨 Maximum reconnection attempts reached');
    }
  }

  // Enhanced cleanup method
  cleanup() {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (error) {
        console.error('Error closing SSE connection:', error);
      }
      this.eventSource = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }

    this.isConnecting = false;
    this.isHealthy = false;
    this.connectedSessions.clear();
    this.connectionCount = 0;
  }

  // Enhanced disconnect method
  disconnect(sessionId: string) {
    this.connectedSessions.delete(sessionId);
    this.connectionCount = Math.max(0, this.connectionCount - 1);
    
    if (this.connectionCount === 0) {
      this.cleanup();
    }
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.eventSource?.readyState === EventSource.OPEN,
      isConnecting: this.isConnecting,
      isHealthy: this.isHealthy,
      connectionCount: this.connectionCount,
      lastHeartbeat: this.lastHeartbeat,
      timeSinceHeartbeat: Date.now() - this.lastHeartbeat,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

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
  const [isClient, setIsClient] = useState(false);
  
  const mountedRef = useRef(true);
  const sessionIdRef = useRef<string | null>(null);
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);
  const managerRef = useRef<UnifiedRealtimeManager | null>(null);
  const optionsRef = useRef(options);

  // Update options ref to avoid dependency issues
  useEffect(() => {
    optionsRef.current = options;
  });

  // Set client flag to prevent SSR issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize manager
  useEffect(() => {
    if (isClient) {
      managerRef.current = UnifiedRealtimeManager.getInstance();
    }
  }, [isClient]);

  // Setup event listeners - FIXED: Use useEffect instead of useSafeEffect to prevent infinite loops
  useEffect(() => {
    if (!isClient || !managerRef.current || !session?.user?.id) return;

    const manager = managerRef.current;
    const currentOptions = optionsRef.current;
    const cleanupFunctions: Array<() => void> = [];

    // Setup event listeners
    if (currentOptions.onCandidateUpdate) {
      cleanupFunctions.push(manager.addEventListener('candidate_update', currentOptions.onCandidateUpdate));
    }
    if (currentOptions.onPositionUpdate) {
      cleanupFunctions.push(manager.addEventListener('position_update', currentOptions.onPositionUpdate));
    }
    if (currentOptions.onWarningUpdate) {
      cleanupFunctions.push(manager.addEventListener('warning_update', currentOptions.onWarningUpdate));
    }
    if (currentOptions.onNotificationUpdate) {
      cleanupFunctions.push(manager.addEventListener('notification_update', currentOptions.onNotificationUpdate));
    }
    if (currentOptions.onUploadQueueUpdate) {
      cleanupFunctions.push(manager.addEventListener('upload_queue_update', currentOptions.onUploadQueueUpdate));
    }
    if (currentOptions.onPresenceUpdate) {
      cleanupFunctions.push(manager.addEventListener('presence_update', currentOptions.onPresenceUpdate));
    }
    if (currentOptions.onUserListUpdate) {
      cleanupFunctions.push(manager.addEventListener('user_list_update', currentOptions.onUserListUpdate));
    }
    if (currentOptions.onDashboardUpdate) {
      cleanupFunctions.push(manager.addEventListener('dashboard_update', currentOptions.onDashboardUpdate));
    }
    if (currentOptions.onSessionExpired) {
      cleanupFunctions.push(manager.addEventListener('session_expired', currentOptions.onSessionExpired));
    }
    if (currentOptions.onHealthCheck) {
      cleanupFunctions.push(manager.addEventListener('health_check', currentOptions.onHealthCheck));
    }

    // Add general update listener
    cleanupFunctions.push(manager.addEventListener('keepalive', () => {
      setLastUpdate(new Date());
    }));

    cleanupFunctionsRef.current = cleanupFunctions;

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
      cleanupFunctionsRef.current = [];
    };
  }, [isClient, session?.user?.id]); // FIXED: Remove options from dependencies

  // Connection management effect - FIXED: Use useEffect instead of useSafeEffect to prevent infinite loops
  useEffect(() => {
    if (!isClient || !session?.user?.id || !managerRef.current) {
      return;
    }

    const sessionId = session.user.id;
    sessionIdRef.current = sessionId;
    mountedRef.current = true;

    const manager = UnifiedRealtimeManager.getInstance();

    // Connect to real-time service
    const connect = async () => {
      if (!mountedRef.current) return;

      const success = await manager.connect(sessionId);
      if (success && mountedRef.current) {
        setIsConnected(true);
        setIsReconnecting(false);
        setConnectionHealth('excellent');
        setLastUpdate(new Date());
      }
    };

    connect();

    // Update status periodically
    const statusInterval = setInterval(() => {
      if (!mountedRef.current) return;

      const status = manager.getStatus();
      setIsConnected(status.isConnected);
      setIsReconnecting(status.isConnecting);
      setReconnectAttempts(status.reconnectAttempts);
      setTotalConnections(status.connectionCount);

      // Update connection health based on heartbeat frequency
      const timeSinceHeartbeat = status.timeSinceHeartbeat;
      if (timeSinceHeartbeat < 1000) {
        setConnectionHealth('excellent');
      } else if (timeSinceHeartbeat < 5000) {
        setConnectionHealth('good');
      } else if (timeSinceHeartbeat < 30000) {
        setConnectionHealth('poor');
      } else {
        setConnectionHealth('disconnected');
      }
    }, 3000);

    return () => {
      mountedRef.current = false;
      clearInterval(statusInterval);
      
      // Disconnect from manager
      if (sessionIdRef.current) {
        manager.disconnect(sessionIdRef.current);
      }
    };
  }, [session?.user?.id, isClient]); // FIXED: Remove useSafeEffect and simplify dependencies

  // Manual reconnect function
  const reconnect = useCallback(async () => {
    if (!isClient || !session?.user?.id || !managerRef.current) return;

    const manager = UnifiedRealtimeManager.getInstance();
    const success = await manager.connect(session.user.id);
    
    if (success) {
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionHealth('excellent');
      setLastUpdate(new Date());
    }
  }, [isClient, session?.user?.id]);

  // Manual disconnect function
  const disconnect = useCallback(() => {
    if (!isClient || !session?.user?.id || !managerRef.current) return;

    const manager = UnifiedRealtimeManager.getInstance();
    manager.disconnect(session.user.id);
    
    setIsConnected(false);
    setIsReconnecting(false);
    setConnectionHealth('disconnected');
  }, [isClient, session?.user?.id]);

  // Return early if not on client side
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
    reconnect,
    disconnect
  };
}
