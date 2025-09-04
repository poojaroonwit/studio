// SSE Connection Utilities
// Provides robust SSE connection management with enhanced error handling and reconnection logic

export interface SSEConnectionOptions {
  url: string;
  maxRetries?: number;
  baseRetryDelay?: number;
  maxRetryDelay?: number;
  onOpen?: () => void;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
  debug?: boolean;
}

export interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  retryCount: number;
  lastError: string | null;
}

export class SSEConnectionManager {
  private eventSource: EventSource | null = null;
  private options: Required<SSEConnectionOptions>;
  private state: SSEConnectionState;
  private retryTimeout: NodeJS.Timeout | null = null;
  private keepaliveInterval: NodeJS.Timeout | null = null;
  private connectionStartTime: number = 0;

  constructor(options: SSEConnectionOptions) {
    this.options = {
      maxRetries: 10,
      baseRetryDelay: 1000,
      maxRetryDelay: 30000,
      onOpen: () => {},
      onMessage: () => {},
      onError: () => {},
      onClose: () => {},
      debug: false,
      ...options
    };

    this.state = {
      isConnected: false,
      isConnecting: false,
      error: null,
      retryCount: 0,
      lastError: null
    };
  }

  public connect(): void {
    if (this.state.isConnecting || this.state.isConnected) {
      this.log('Connection already in progress or established');
      return;
    }

    this.state.isConnecting = true;
    this.state.error = null;
    this.connectionStartTime = Date.now();

    try {
      this.log(`Connecting to SSE endpoint: ${this.options.url}`);
      this.eventSource = new EventSource(this.options.url);

      this.eventSource.onopen = () => {
        this.log('SSE connection established');
        this.state.isConnected = true;
        this.state.isConnecting = false;
        this.state.retryCount = 0;
        this.state.error = null;
        this.state.lastError = null;
        
        // Clear any existing retry timeout
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
          this.retryTimeout = null;
        }

        // Set up keepalive monitoring
        this.setupKeepalive();
        
        this.options.onOpen();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.log('SSE message received:', data);
          this.options.onMessage(data);
        } catch (error) {
          this.log('Error parsing SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        this.log('SSE connection error:', error);
        this.state.isConnected = false;
        this.state.isConnecting = false;
        
        // Determine error type and message
        let errorMessage = 'Connection failed';
        if (this.eventSource?.readyState === EventSource.CONNECTING) {
          errorMessage = 'Connecting...';
        } else if (this.eventSource?.readyState === EventSource.CLOSED) {
          errorMessage = 'Connection closed - check authentication';
        } else {
          errorMessage = 'Connection failed - retrying...';
        }
        
        this.state.error = errorMessage;
        this.state.lastError = errorMessage;
        
        this.options.onError(error);
        
        // Attempt reconnection with exponential backoff
        this.scheduleReconnection();
      };

    } catch (error) {
      this.log('Failed to create SSE connection:', error);
      this.state.isConnecting = false;
      this.state.error = 'Failed to create SSE connection';
      this.state.lastError = 'Failed to create SSE connection';
    }
  }

  public disconnect(): void {
    this.log('Disconnecting SSE connection');
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }
    
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.retryCount = 0;
    this.state.error = null;
    
    this.options.onClose();
  }

  public getState(): SSEConnectionState {
    return { ...this.state };
  }

  public isConnected(): boolean {
    return this.state.isConnected;
  }

  public getConnectionInfo() {
    return {
      url: this.options.url,
      isConnected: this.state.isConnected,
      isConnecting: this.state.isConnecting,
      retryCount: this.state.retryCount,
      connectionAge: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0,
      lastError: this.state.lastError,
      readyState: this.eventSource?.readyState
    };
  }

  private scheduleReconnection(): void {
    if (this.state.retryCount >= this.options.maxRetries) {
      this.log(`Max retry attempts (${this.options.maxRetries}) reached`);
      this.state.error = 'Connection failed - max retries reached';
      return;
    }

    this.state.retryCount++;
    const retryDelay = Math.min(
      this.options.baseRetryDelay * Math.pow(2, this.state.retryCount - 1),
      this.options.maxRetryDelay
    );

    this.log(`Scheduling reconnection attempt ${this.state.retryCount}/${this.options.maxRetries} in ${retryDelay}ms`);
    
    this.retryTimeout = setTimeout(() => {
      this.log(`Attempting reconnection (${this.state.retryCount}/${this.options.maxRetries})`);
      this.connect();
    }, retryDelay);
  }

  private setupKeepalive(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
    }

    // Monitor connection health every 30 seconds
    this.keepaliveInterval = setInterval(() => {
      if (this.eventSource?.readyState === EventSource.OPEN) {
        this.log('Connection health check: OK');
      } else {
        this.log('Connection health check: FAILED - connection lost');
        this.state.isConnected = false;
        this.scheduleReconnection();
      }
    }, 30000);
  }

  private log(message: string, ...args: any[]): void {
    if (this.options.debug) {
      console.log(`[SSE Connection Manager] ${message}`, ...args);
    }
  }
}

// Utility function to create a managed SSE connection
export function createSSEConnection(options: SSEConnectionOptions): SSEConnectionManager {
  return new SSEConnectionManager(options);
}

// Hook for React components
export function useSSEConnection(options: SSEConnectionOptions) {
  const [connectionManager] = React.useState(() => new SSEConnectionManager(options));
  const [state, setState] = React.useState<SSEConnectionState>(connectionManager.getState());

  React.useEffect(() => {
    const updateState = () => {
      setState(connectionManager.getState());
    };

    // Update state when connection changes
    const interval = setInterval(updateState, 1000);

    return () => {
      clearInterval(interval);
      connectionManager.disconnect();
    };
  }, [connectionManager]);

  const connect = React.useCallback(() => {
    connectionManager.connect();
  }, [connectionManager]);

  const disconnect = React.useCallback(() => {
    connectionManager.disconnect();
  }, [connectionManager]);

  return {
    ...state,
    connect,
    disconnect,
    getConnectionInfo: () => connectionManager.getConnectionInfo()
  };
}

// Import React for the hook
import React from 'react';
