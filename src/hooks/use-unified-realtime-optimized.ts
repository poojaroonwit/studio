
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSafeEffect } from './use-safe-effect';

// Singleton class for managing global real-time connection
class UnifiedRealtimeManager {
  private static instance: UnifiedRealtimeManager;
  private eventSource: EventSource | null = null;
  private connectionCount = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private cleanupFunctions = new Map<EventSource, () => void>();
  private connectedSessions = new Set<string>();
  private connectionAttempts = new Map<string, number>();
  private maxAttempts = 3;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners = new Map<string, Set<(data: any) => void>>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastMessageTime = Date.now();
  private messageCount = 0;
  private errorCount = 0;

  private constructor() {}

  static getInstance(): UnifiedRealtimeManager {
    if (!UnifiedRealtimeManager.instance) {
      UnifiedRealtimeManager.instance = new UnifiedRealtimeManager();
    }
    return UnifiedRealtimeManager.instance;
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

  // Connect to real-time service
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

    // Check connection attempts
    const attempts = this.connectionAttempts.get(sessionId) || 0;
    if (attempts >= this.maxAttempts) {
      console.warn(`🚨 Maximum connection attempts reached for session ${sessionId}`);
      return false;
    }

    this.isConnecting = true;
    this.connectionAttempts.set(sessionId, attempts + 1);

    try {
      // CRITICAL: Ensure global objects are protected before creating EventSource
      if (typeof window !== 'undefined') {
        // Import and ensure global objects are safe
        try {
          const { ensureGlobalObjects } = await import('@/lib/t-object-init');
          ensureGlobalObjects();
        } catch (error) {
          console.warn('Failed to ensure global objects before real-time connection:', error);
        }
      }

      // Clear existing connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        console.error('🚨 Connection timeout');
        this.cleanup();
        this.isConnecting = false;
      }, 30000);

      // Create new EventSource
      const eventSource = new EventSource('/api/realtime/unified');
      this.eventSource = eventSource;

      return new Promise((resolve) => {
        eventSource.onopen = () => {
          console.log('✅ Real-time connection established');
          
          // CRITICAL: Ensure global objects are safe after connection is established
          if (typeof window !== 'undefined') {
            try {
              const { ensureGlobalObjects } = require('@/lib/t-object-init');
              ensureGlobalObjects();
            } catch (error) {
              console.warn('Failed to ensure global objects after connection:', error);
            }
          }
          
          this.connectedSessions.add(sessionId);
          this.connectionCount++;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.lastMessageTime = Date.now();
          this.messageCount = 0;
          this.errorCount = 0;

          // Clear connection timeout
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }

          // Start health check
          this.startHealthCheck();

          // Setup event listeners
          this.setupEventListeners(eventSource);

          resolve(true);
        };

        eventSource.onerror = () => {
          console.error('❌ Real-time connection error');
          this.handleConnectionError(sessionId);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      this.isConnecting = false;
      return false;
    }
  }

  // Setup event listeners
  private setupEventListeners(eventSource: EventSource) {
    // CRITICAL: Ensure global objects are safe before setting up event listeners
    if (typeof window !== 'undefined') {
      try {
        const { ensureGlobalObjects } = require('@/lib/t-object-init');
        ensureGlobalObjects();
      } catch (error) {
        console.warn('Failed to ensure global objects before event listener setup:', error);
      }
    }

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

    // Store cleanup function
    const cleanup = () => {
      eventTypes.forEach(eventType => {
        eventSource.removeEventListener(eventType, () => {});
      });
    };
    this.cleanupFunctions.set(eventSource, cleanup);
  }

  // Handle incoming events
  private handleEvent(eventType: string, event: MessageEvent) {
    this.messageCount++;
    this.lastMessageTime = Date.now();

    // CRITICAL: Ensure global objects are safe before processing events
    if (typeof window !== 'undefined') {
      try {
        // Ensure global objects are protected before processing any real-time events
        const { ensureGlobalObjects } = require('@/lib/t-object-init');
        ensureGlobalObjects();
      } catch (error) {
        console.warn('Failed to ensure global objects in event handler:', error);
      }
    }

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
    this.errorCount++;

    // Cleanup current connection
    this.cleanup();

    // Attempt reconnection if under max attempts
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      this.reconnectTimeout = setTimeout(() => {
        this.isConnecting = false;
        // Reconnection will be handled by components that are still mounted
      }, 5000);
    } else {
      console.warn('🚨 Maximum reconnection attempts reached');
    }
  }

  // Start health check
  private startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      const timeSinceLastMessage = Date.now() - this.lastMessageTime;
      
      // If no messages for 30 seconds, consider connection unhealthy
      if (timeSinceLastMessage > 30000) {
        console.warn('⚠️ No real-time messages received for 30 seconds');
      }
    }, 10000);
  }

  // Disconnect a component
  disconnect(sessionId: string) {
    this.connectedSessions.delete(sessionId);
    this.connectionCount = Math.max(0, this.connectionCount - 1);

    // If no more components are connected, cleanup
    if (this.connectionCount === 0) {
      this.cleanup();
    }
  }

  // Cleanup all connections
  private cleanup() {
    // Clear timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Close EventSource
    if (this.eventSource) {
      const cleanupFn = this.cleanupFunctions.get(this.eventSource);
      if (cleanupFn) {
        cleanupFn();
        this.cleanupFunctions.delete(this.eventSource);
      }
      
      if (this.eventSource.readyState !== EventSource.CLOSED) {
        this.eventSource.close();
      }
      this.eventSource = null;
    }

    // Reset state
    this.isConnecting = false;
    this.connectedSessions.clear();
    this.connectionAttempts.clear();
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.eventSource?.readyState === EventSource.OPEN,
      isConnecting: this.isConnecting,
      connectionCount: this.connectionCount,
      reconnectAttempts: this.reconnectAttempts,
      lastMessageTime: this.lastMessageTime,
      messageCount: this.messageCount,
      errorCount: this.errorCount
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

      // Update connection health based on message frequency
      const timeSinceLastMessage = Date.now() - status.lastMessageTime;
      if (timeSinceLastMessage < 1000) {
        setConnectionHealth('excellent');
      } else if (timeSinceLastMessage < 5000) {
        setConnectionHealth('good');
      } else if (timeSinceLastMessage < 30000) {
        setConnectionHealth('poor');
      } else {
        setConnectionHealth('disconnected');
      }
    }, 1000);

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
