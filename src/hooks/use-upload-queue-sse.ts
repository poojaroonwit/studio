import { useEffect, useRef, useState, useCallback } from 'react';

interface UploadQueueSSEMessage {
  type: 'queue' | 'error';
  data?: any;
}

interface UseUploadQueueSSEReturn {
  isConnected: boolean;
  lastMessage: UploadQueueSSEMessage | null;
  reconnect: () => void;
}

// Global SSE connection manager to prevent multiple connections
class UploadQueueSSEManager {
  private static instance: UploadQueueSSEManager;
  private eventSource: EventSource | null = null;
  private subscribers = new Set<(message: UploadQueueSSEMessage) => void>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;

  static getInstance(): UploadQueueSSEManager {
    if (!UploadQueueSSEManager.instance) {
      UploadQueueSSEManager.instance = new UploadQueueSSEManager();
    }
    return UploadQueueSSEManager.instance;
  }

  subscribe(callback: (message: UploadQueueSSEMessage) => void): () => void {
    this.subscribers.add(callback);
    
    // Connect if this is the first subscriber
    if (this.subscribers.size === 1) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
      
      // Disconnect if no more subscribers
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  private connect(): void {
    if (this.isConnecting || this.eventSource) return;
    
    this.isConnecting = true;
    
    try {
      this.eventSource = new EventSource('/api/upload-queue/sse');
      
      this.eventSource.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notifySubscribers({ type: 'queue', data: { connected: true } });
      };

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        this.notifySubscribers({ type: 'error', data: { connected: false } });
        
        // Attempt to reconnect if under max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = Math.min(1000 * this.reconnectAttempts, 10000);
          
          this.reconnectTimeout = setTimeout(() => {
            if (this.eventSource) {
              this.disconnect();
              this.connect();
            }
          }, delay);
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.notifySubscribers(message);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };
    } catch (error) {
      this.isConnecting = false;
      console.error('Failed to create SSE connection:', error);
    }
  }

  private disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private notifySubscribers(message: UploadQueueSSEMessage): void {
    this.subscribers.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in SSE subscriber callback:', error);
      }
    });
  }

  reconnect(): void {
    this.reconnectAttempts = 0;
    this.disconnect();
    this.connect();
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

export function useUploadQueueSSE(): UseUploadQueueSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<UploadQueueSSEMessage | null>(null);
  const managerRef = useRef<UploadQueueSSEManager>();

  const reconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.reconnect();
    }
  }, []);

  useEffect(() => {
    const manager = UploadQueueSSEManager.getInstance();
    managerRef.current = manager;

    const unsubscribe = manager.subscribe((message) => {
      setLastMessage(message);
      
      if (message.type === 'queue' && message.data?.connected !== undefined) {
        setIsConnected(message.data.connected);
      } else if (message.type === 'error') {
        setIsConnected(false);
      }
    });

    // Set initial connection state
    setIsConnected(manager.isConnected());

    return unsubscribe;
  }, []);

  return {
    isConnected,
    lastMessage,
    reconnect
  };
}
