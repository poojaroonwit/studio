// Robust SSE Manager - Enhanced error handling and connection stability
// Handles EventSource readyState transitions and provides detailed debugging

export interface RobustSSEOptions {
  url: string;
  retryDelay?: number;
  maxRetries?: number;
  debugMode?: boolean;
  onOpen?: () => void;
  onMessage?: (data: any) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  readyState: number;
  readyStateText: string;
  retryCount: number;
  lastError?: string;
  lastErrorTime?: number;
  connectionStartTime?: number;
  totalReconnects: number;
}

export class RobustSSEManager {
  private eventSource: EventSource | null = null;
  private options: RobustSSEOptions;
  private state: SSEConnectionState;
  private retryTimeout: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private debugMode: boolean;

  constructor(options: RobustSSEOptions) {
    this.options = {
      retryDelay: 1000,
      maxRetries: 10,
      debugMode: false,
      ...options
    };
    
    this.debugMode = this.options.debugMode || false;
    
    this.state = {
      isConnected: false,
      isConnecting: false,
      readyState: 0,
      readyStateText: 'CONNECTING',
      retryCount: 0,
      totalReconnects: 0
    };
  }

  private log(message: string, ...args: any[]) {
    if (this.debugMode) {
      console.log(`[RobustSSE] ${message}`, ...args);
    }
  }

  private error(message: string, ...args: any[]) {
    console.error(`[RobustSSE] ${message}`, ...args);
  }

  private updateReadyState(readyState: number) {
    const readyStateText = this.getReadyStateText(readyState);
    
    if (this.state.readyState !== readyState) {
      this.log(`ReadyState changed: ${this.state.readyStateText} → ${readyStateText}`);
      this.state.readyState = readyState;
      this.state.readyStateText = readyStateText;
    }
  }

  private getReadyStateText(readyState: number): string {
    switch (readyState) {
      case EventSource.CONNECTING: return 'CONNECTING';
      case EventSource.OPEN: return 'OPEN';
      case EventSource.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  public connect(): void {
    if (this.state.isConnecting || this.state.isConnected) {
      this.log('Already connecting or connected, skipping');
      return;
    }

    this.log(`Connecting to ${this.options.url} (attempt ${this.state.retryCount + 1})`);
    
    this.state.isConnecting = true;
    this.state.connectionStartTime = Date.now();
    
    try {
      this.eventSource = new EventSource(this.options.url);
      this.setupEventHandlers();
      
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        this.error('Connection timeout - no response from server');
        this.handleConnectionError('Connection timeout');
      }, 15000); // 15 second timeout
      
    } catch (error) {
      this.error('Failed to create EventSource:', error);
      this.handleConnectionError('Failed to create EventSource');
    }
  }

  private setupEventHandlers(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      this.log('Connection opened successfully');
      
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      this.state.isConnected = true;
      this.state.isConnecting = false;
      this.state.retryCount = 0; // Reset retry count on successful connection
      this.updateReadyState(this.eventSource!.readyState);
      
      // Start keep-alive monitoring
      this.startKeepAliveMonitoring();
      
      this.options.onOpen?.();
    };

    this.eventSource.onmessage = (event) => {
      this.log('Message received:', event.data);
      
      try {
        const data = JSON.parse(event.data);
        this.options.onMessage?.(data);
      } catch (error) {
        this.log('Failed to parse message data:', event.data);
        this.options.onMessage?.(event.data);
      }
    };

    this.eventSource.onerror = (error) => {
      this.error('EventSource error occurred:', {
        type: error.type,
        readyState: this.eventSource?.readyState,
        readyStateText: this.getReadyStateText(this.eventSource?.readyState || 0),
        url: this.options.url,
        retryCount: this.state.retryCount
      });
      
      this.updateReadyState(this.eventSource?.readyState || 0);
      this.handleConnectionError('EventSource error');
    };
  }

  private handleConnectionError(errorMessage: string): void {
    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.lastError = errorMessage;
    this.state.lastErrorTime = Date.now();
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    this.stopKeepAliveMonitoring();
    
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (error) {
        this.error('Error closing EventSource:', error);
      }
      this.eventSource = null;
    }
    
    this.options.onError?.(errorMessage);
    
    // Attempt reconnection if under retry limit
    if (this.state.retryCount < (this.options.maxRetries || 10)) {
      this.scheduleReconnection();
    } else {
      this.error(`Max retries (${this.options.maxRetries}) reached. Giving up.`);
      this.options.onClose?.();
    }
  }

  private scheduleReconnection(): void {
    this.state.retryCount++;
    this.state.totalReconnects++;
    
    // Exponential backoff with jitter
    const baseDelay = this.options.retryDelay || 1000;
    const exponentialDelay = baseDelay * Math.pow(2, this.state.retryCount - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
    
    this.log(`Scheduling reconnection in ${Math.round(delay)}ms (retry ${this.state.retryCount})`);
    
    this.retryTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startKeepAliveMonitoring(): void {
    this.stopKeepAliveMonitoring();
    
    this.keepAliveInterval = setInterval(() => {
      if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
        this.log('Keep-alive check: Connection is healthy');
      } else {
        this.error('Keep-alive check: Connection is not healthy, readyState:', this.eventSource?.readyState);
        this.handleConnectionError('Keep-alive check failed');
      }
    }, 30000); // Check every 30 seconds
  }

  private stopKeepAliveMonitoring(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  public disconnect(): void {
    this.log('Disconnecting SSE connection');
    
    this.state.isConnected = false;
    this.state.isConnecting = false;
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    this.stopKeepAliveMonitoring();
    
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (error) {
        this.error('Error closing EventSource:', error);
      }
      this.eventSource = null;
    }
    
    this.options.onClose?.();
  }

  public getState(): SSEConnectionState {
    return { ...this.state };
  }

  public isConnected(): boolean {
    return this.state.isConnected && this.eventSource?.readyState === EventSource.OPEN;
  }

  public getConnectionInfo(): any {
    return {
      url: this.options.url,
      state: this.getState(),
      eventSourceReadyState: this.eventSource?.readyState,
      eventSourceReadyStateText: this.getReadyStateText(this.eventSource?.readyState || 0),
      connectionAge: this.state.connectionStartTime ? Date.now() - this.state.connectionStartTime : 0
    };
  }
}

// Global instance for easy access
let globalRobustSSE: RobustSSEManager | null = null;

export function createRobustSSE(options: RobustSSEOptions): RobustSSEManager {
  return new RobustSSEManager(options);
}

export function getGlobalRobustSSE(): RobustSSEManager | null {
  return globalRobustSSE;
}

export function setGlobalRobustSSE(sse: RobustSSEManager): void {
  globalRobustSSE = sse;
}

export function disconnectGlobalRobustSSE(): void {
  if (globalRobustSSE) {
    globalRobustSSE.disconnect();
    globalRobustSSE = null;
  }
}
