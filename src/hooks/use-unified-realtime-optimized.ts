
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

export function useUnifiedRealtime(options: UnifiedRealtimeOptions = {}) {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
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
    if (!session?.user) return;

    try {
      const eventSource = new EventSource('/api/realtime/unified');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setLastUpdate(new Date());
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        cleanup();
        
        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (session?.user) {
            connect();
          }
        }, 5000);
      };

      // Handle different event types
      eventSource.addEventListener('candidate_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onCandidateUpdate?.(data);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing candidate update:', error);
        }
      });

      eventSource.addEventListener('position_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onPositionUpdate?.(data);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing position update:', error);
        }
      });

      eventSource.addEventListener('warning_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onWarningUpdate?.();
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing warning update:', error);
        }
      });

      eventSource.addEventListener('notification_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onNotificationUpdate?.(data);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing notification update:', error);
        }
      });

      eventSource.addEventListener('upload_queue_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onUploadQueueUpdate?.(data);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing upload queue update:', error);
        }
      });

      eventSource.addEventListener('presence_update', (event) => {
        try {
          const data = JSON.parse(event.data);
          options.onPresenceUpdate?.(data);
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Error parsing presence update:', error);
        }
      });

      eventSource.addEventListener('keepalive', () => {
        setLastUpdate(new Date());
      });

    } catch (error) {
      console.error('Failed to connect to unified real-time:', error);
      setIsConnected(false);
    }
  }, [session?.user, options, cleanup]);

  useEffect(() => {
    if (session?.user) {
      connect();
    } else {
      cleanup();
    }

    return cleanup;
  }, [session?.user, connect, cleanup]);

  return {
    isConnected,
    lastUpdate,
    reconnect: connect,
    disconnect: cleanup
  };
}
