import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useToastManager } from './use-toast-manager';

interface UnifiedRealtimeOptions {
  // Event handlers
  onCandidateUpdate?: (candidate: any) => void;
  onPositionUpdate?: (position: any) => void;
  onPresenceUpdate?: (presence: any) => void;
  onUserListUpdate?: (users: any[]) => void;
  onNotification?: (notification: any) => void;
  onUploadQueueUpdate?: (queueData: any) => void;
  onDashboardUpdate?: (dashboardData: any) => void;
  onWarningUpdate?: (warning: any) => void;
  onSessionExpired?: () => void;
  onHealthCheck?: (healthData: any) => void;

  // Configuration
  showNotifications?: boolean;
  showErrorNotifications?: boolean;
  errorToastCooldownMs?: number;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  enableHealthCheck?: boolean;
  healthCheckIntervalMs?: number;
}

interface RealtimeState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastUpdate: Date | null;
  connectionHealth: 'excellent' | 'good' | 'poor' | 'disconnected';
  connectedUsers: number;
  totalConnections: number;
}

export function useUnifiedRealtime(options: UnifiedRealtimeOptions = {}) {
  const {
    // Event handlers
    onCandidateUpdate,
    onPositionUpdate,
    onPresenceUpdate,
    onUserListUpdate,
    onNotification,
    onUploadQueueUpdate,
    onDashboardUpdate,
    onWarningUpdate,
    onSessionExpired,
    onHealthCheck,

    // Configuration
    showNotifications = true,
    showErrorNotifications = true,
    errorToastCooldownMs = 60000,
    maxReconnectAttempts = 10,
    reconnectDelayMs = 1000,
    maxReconnectDelayMs = 30000,
    enableHealthCheck = true,
    healthCheckIntervalMs = 30000,
  } = options;

  const mountedRef = useRef(true);

  const { data: session } = useSession();
  const { info: showInfoToast, error: showErrorToast } = useToastManager({ deduplicationWindowMs: 2000 });

  // State
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastUpdate: null,
    connectionHealth: 'disconnected',
    connectedUsers: 0,
    totalConnections: 0,
  });

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimeRef = useRef<number>(Date.now());
  const lastErrorToastTimeRef = useRef<number>(0);
  const messageCountRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);

  // Utility functions
  const showNotification = useCallback((message: string, icon: string = '🔄') => {
    if (showNotifications) {
      try {
        showInfoToast(message, {
          duration: 3000
        });
      } catch (error) {
        // Error showing toast notification
      }
    }
  }, [showNotifications, showInfoToast]);

  const showErrorNotification = useCallback((message: string) => {
    const now = Date.now();
    if (showErrorNotifications && (now - lastErrorToastTimeRef.current > errorToastCooldownMs)) {
      try {
        showErrorToast(message, {
          duration: 5000
        });
        lastErrorToastTimeRef.current = now;
      } catch (error) {
        // Error showing error toast notification
      }
    }
  }, [showErrorNotifications, errorToastCooldownMs, showErrorToast]);

  const updateConnectionHealth = useCallback(() => {
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTimeRef.current;
    const errorRate = errorCountRef.current / Math.max(messageCountRef.current, 1);

    let health: RealtimeState['connectionHealth'] = 'excellent';
    
    if (timeSinceLastMessage > 60000 || errorRate > 0.1) {
      health = 'poor';
    } else if (timeSinceLastMessage > 30000 || errorRate > 0.05) {
      health = 'good';
    }

    if (mountedRef.current) {
      setState(prev => ({ ...prev, connectionHealth: health }));
    }
  }, []);

  const cleanupConnection = useCallback(() => {
    if (eventSourceRef.current) {
      // Call stored cleanup function if it exists
      const cleanupFn = (eventSourceRef.current as any).cleanupEventListeners;
      if (cleanupFn) {
        cleanupFn();
      }
      
      try {
        eventSourceRef.current.close();
      } catch (error) {
        // Error closing SSE connection
      }
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    
    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isReconnecting: false,
        reconnectAttempts: 0
      }));
    }
  }, []);

  const startHealthCheck = useCallback(() => {
    if (!enableHealthCheck) return;

    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }

          healthCheckIntervalRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        
        const now = Date.now();
        const timeSinceLastMessage = now - lastMessageTimeRef.current;
        
        if (timeSinceLastMessage > 60000) {
          if (mountedRef.current) {
            setState(prev => ({ ...prev, isConnected: false }));
          }
          handleReconnect();
        } else {
          updateConnectionHealth();
        }
      }, healthCheckIntervalMs);
  }, [enableHealthCheck, healthCheckIntervalMs, updateConnectionHealth]);

  const handleReconnect = useCallback(() => {
    if (state.isReconnecting || state.reconnectAttempts >= maxReconnectAttempts) {
      return;
    }

    if (mountedRef.current) {
      setState(prev => ({ 
        ...prev, 
        isReconnecting: true,
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    }

    const delay = Math.min(
      reconnectDelayMs * Math.pow(2, state.reconnectAttempts),
      maxReconnectDelayMs
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && session?.user) {
        connectSSE();
      }
    }, delay);
  }, [state.isReconnecting, state.reconnectAttempts, maxReconnectAttempts, reconnectDelayMs, maxReconnectDelayMs, session?.user]);

  const connectSSE = useCallback(() => {
    if (!session?.user) return;

    try {
      const eventSource = new EventSource('/api/realtime/sse');
      eventSourceRef.current = eventSource;

      // Connection events
      eventSource.onopen = () => {
        if (!mountedRef.current) return;
        
        setState(prev => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          reconnectAttempts: 0,
          lastUpdate: new Date()
        }));
        lastMessageTimeRef.current = Date.now();
        lastErrorToastTimeRef.current = 0;
        messageCountRef.current = 0;
        errorCountRef.current = 0;
        startHealthCheck();
      };

      eventSource.onerror = (error) => {
        if (!mountedRef.current) return;
        
        errorCountRef.current++;
        
        setState(prev => ({
          ...prev,
          isConnected: false,
          isReconnecting: false
        }));
        
        if (!state.isReconnecting) {
          showErrorNotification('Real-time connection lost. Reconnecting...');
        }
        
        handleReconnect();
      };

      // Event listeners for all realtime events
      const eventHandlers = {
        candidate_update: (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            messageCountRef.current++;
            lastMessageTimeRef.current = Date.now();
            
            if (data.data?.candidate) {
              onCandidateUpdate?.(data.data.candidate);
              
              // Show notification for other users' actions
              if (data.data.actingUserId && data.data.actingUserId !== session?.user?.id) {
                const candidate = data.data.candidate;
                if (candidate.status) {
                  showNotification(`Candidate ${candidate.name} moved to ${candidate.status}`, '🔄');
                }
              }
            }
            
            setState(prev => ({ ...prev, lastUpdate: new Date() }));
          } catch (e) {
            // Error parsing candidate update
          }
        },

        position_update: (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            messageCountRef.current++;
            lastMessageTimeRef.current = Date.now();
            
            if (data.data?.position) {
              onPositionUpdate?.(data.data.position);
            }
            
            setState(prev => ({ ...prev, lastUpdate: new Date() }));
          } catch (e) {
            // Error parsing position update
          }
        },

        presence_update: (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            messageCountRef.current++;
            lastMessageTimeRef.current = Date.now();
            
            if (data.data?.presence) {
              onPresenceUpdate?.(data.data.presence);
            }
            
            setState(prev => ({ ...prev, lastUpdate: new Date() }));
          } catch (e) {
            // Error parsing presence update
          }
        },

        user_list_update: (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            messageCountRef.current++;
            lastMessageTimeRef.current = Date.now();
            
            if (data.data?.users) {
              onUserListUpdate?.(data.data.users);
              setState(prev => ({ 
                ...prev, 
                connectedUsers: data.data.users.length,
                lastUpdate: new Date() 
              }));
            }
          } catch (e) {
            // Silent error handling for parsing issues
          }
        },

        notification: (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            messageCountRef.current++;
            lastMessageTimeRef.current = Date.now();
            
            if (data.data?.notification) {
              onNotification?.(data.data.notification);
            }
            
            setState(prev => ({ ...prev, lastUpdate: new Date() }));
          } catch (e) {
            // Silent error handling for parsing issues
          }
        },

        upload_queue_update: (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            messageCountRef.current++;
            lastMessageTimeRef.current = Date.now();
            
            if (data.data?.queue) {
              onUploadQueueUpdate?.(data.data.queue);
            }
            
            setState(prev => ({ ...prev, lastUpdate: new Date() }));
          } catch (e) {
            // Silent error handling for parsing issues
          }
        },

        dashboard_update: (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            messageCountRef.current++;
            lastMessageTimeRef.current = Date.now();
            
            if (data.data?.dashboard) {
              onDashboardUpdate?.(data.data.dashboard);
            }
            
            setState(prev => ({ ...prev, lastUpdate: new Date() }));
          } catch (e) {
            // Silent error handling for parsing issues
          }
        },

        warning_update: (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            messageCountRef.current++;
            lastMessageTimeRef.current = Date.now();
            
            if (data.data?.warning) {
              onWarningUpdate?.(data.data.warning);
            }
            
            setState(prev => ({ ...prev, lastUpdate: new Date() }));
          } catch (e) {
            // Silent error handling for parsing issues
          }
        },

        session_expired: (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            messageCountRef.current++;
            lastMessageTimeRef.current = Date.now();
            
            if (data.data?.userId === session?.user?.id) {
              onSessionExpired?.();
              showErrorNotification('Your session has expired. Please log in again.');
            }
          } catch (e) {
            // Silent error handling for parsing issues
          }
        },

        health_check: (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          try {
            const data = JSON.parse(event.data);
            messageCountRef.current++;
            lastMessageTimeRef.current = Date.now();
            
            if (data.data?.health) {
              onHealthCheck?.(data.data.health);
            }
          } catch (e) {
            // Silent error handling for parsing issues
          }
        },

        keepalive: (event: MessageEvent) => {
          if (!mountedRef.current) return;
          
          messageCountRef.current++;
          lastMessageTimeRef.current = Date.now();
        }
      };

      // Add event listeners
      Object.entries(eventHandlers).forEach(([eventType, handler]) => {
        eventSource.addEventListener(eventType, handler);
      });

      // Store event handlers for cleanup
      const storedEventHandlers = eventHandlers;
      const cleanupEventListeners = () => {
        Object.entries(storedEventHandlers).forEach(([eventType, handler]) => {
          if (eventSource) {
            eventSource.removeEventListener(eventType, handler);
          }
        });
      };

      // Store cleanup function for later use
      if (eventSource) {
        (eventSource as any).cleanupEventListeners = cleanupEventListeners;
      }

    } catch (error) {
      handleReconnect();
    }
  }, [session?.user, showNotification, showErrorNotification, handleReconnect, startHealthCheck, state.isReconnecting]);

  // Connect on mount and session change
  useEffect(() => {
    mountedRef.current = true;
    
    if (session?.user) {
      connectSSE();
    } else {
      cleanupConnection();
    }

    return () => {
      mountedRef.current = false;
      cleanupConnection();
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [session?.user, connectSSE, cleanupConnection]);

  // Update connection health periodically
  useEffect(() => {
    const healthInterval = setInterval(updateConnectionHealth, 10000);
    
    return () => {
      if (healthInterval) {
        clearInterval(healthInterval);
      }
    };
  }, [updateConnectionHealth]);

  return {
    // State
    isConnected: state.isConnected,
    isReconnecting: state.isReconnecting,
    reconnectAttempts: state.reconnectAttempts,
    lastUpdate: state.lastUpdate,
    connectionHealth: state.connectionHealth,
    connectedUsers: state.connectedUsers,
    totalConnections: state.totalConnections,

    // Actions
    reconnect: handleReconnect,
    disconnect: cleanupConnection,
    
    // Statistics
    messageCount: messageCountRef.current,
    errorCount: errorCountRef.current,
    errorRate: errorCountRef.current / Math.max(messageCountRef.current, 1),
  };
}
