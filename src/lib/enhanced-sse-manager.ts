// Enhanced SSE Manager - Loads endpoints one by one with error handling
// Prevents application freezing by skipping problematic endpoints

export interface SSEEndpoint {
  id: string;
  url: string;
  name: string;
  priority: number; // Lower number = higher priority
  enabled: boolean;
  retryCount: number;
  maxRetries: number;
  // Per-endpoint connection timeout (ms). Defaults to manager's timeout.
  connectionTimeout: number;
  lastError?: string;
  lastErrorTime?: number;
  lastErrorEventType?: string;
  lastErrorLocation?: string;
  connectionAttempts: number;
  isConnected: boolean;
  eventSource?: EventSource;
  // True if the last failure was due to a timeout (hanging connection)
  isHanging?: boolean;
}

export interface SSEConnectionStatus {
  totalEndpoints: number;
  connectedEndpoints: number;
  failedEndpoints: number;
  disabledEndpoints: number;
  endpoints: SSEEndpoint[];
}

export class EnhancedSSEManager {
  private endpoints: Map<string, SSEEndpoint> = new Map();
  private connectionQueue: string[] = [];
  private isConnecting: boolean = false;
  private connectionTimeout: number = 10000; // 10 seconds timeout
  private retryDelay: number = 5000; // 5 seconds between retries
  private maxConcurrentConnections: number = 1; // Reduced from 2 to 1
  private debugMode: boolean = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SSE_DEBUG === '1');
  private subscriberCount: number = 0;
  private eventListeners: Set<(event: any) => void> = new Set();

  private info(...args: any[]) {
    if (this.debugMode) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  }
  private warn(...args: any[]) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
  private error(...args: any[]) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }

  constructor() {
    this.initializeEndpoints();
  }

  private initializeEndpoints() {
    // Initialize all SSE endpoints with priority order
    // Note: Only main-sse is now active; other endpoints have been deprecated
    // in favor of the unified SSE system
    const endpointConfigs = [
      {
        id: 'main-sse',
        url: '/api/sse',
        name: 'Main SSE',
        priority: 1,
        enabled: true,
        maxRetries: 3
      }
      // upload-queue-sse and dashboard-stream endpoints have been deprecated
      // and now redirect to the unified SSE endpoint at /api/sse
    ];

    endpointConfigs.forEach(config => {
      this.endpoints.set(config.id, {
        ...config,
        connectionTimeout: this.connectionTimeout,
        retryCount: 0,
        connectionAttempts: 0,
        isConnected: false
      });
    });

    // Sort endpoints by priority
    this.connectionQueue = Array.from(this.endpoints.keys())
      .sort((a, b) => {
        const endpointA = this.endpoints.get(a)!;
        const endpointB = this.endpoints.get(b)!;
        return endpointA.priority - endpointB.priority;
      });

    this.info('[Enhanced SSE Manager] Initialized with endpoints:', this.connectionQueue);
  }

  public async connectAll(): Promise<void> {
    if (this.isConnecting) {
      this.info('[Enhanced SSE Manager] Connection already in progress, skipping');
      return;
    }

    this.isConnecting = true;
    this.info('[Enhanced SSE Manager] Starting sequential connection of endpoints...');

    // Connect to endpoints one by one; do not abort the sequence on failure
    for (const endpointId of this.connectionQueue) {
      const endpoint = this.endpoints.get(endpointId);
      if (!endpoint || !endpoint.enabled) {
        this.info(`[Enhanced SSE Manager] Skipping disabled endpoint: ${endpointId}`);
        continue;
      }

      try {
        await this.connectToEndpoint(endpointId);
      } catch (error) {
        this.error(`[Enhanced SSE Manager] Error connecting ${endpoint?.name ?? endpointId}:`, error);
      }

      // Small delay between connections to avoid overwhelming the server
      await this.delay(1000);
    }

    this.isConnecting = false;
    this.info('[Enhanced SSE Manager] Connection sequence completed');
  }

  public addSubscriber(): void {
    this.subscriberCount++;
  }

  public removeSubscriber(): void {
    this.subscriberCount = Math.max(0, this.subscriberCount - 1);
    if (this.subscriberCount === 0) {
      this.disconnectAll();
    }
  }

  public addEventListener(listener: (event: any) => void): void {
    this.eventListeners.add(listener);
  }

  public removeEventListener(listener: (event: any) => void): void {
    this.eventListeners.delete(listener);
  }

  private notifyEventListeners(event: any): void {
    this.info(`[Enhanced SSE Manager] Notifying ${this.eventListeners.size} listeners with event:`, event);
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        this.error('[Enhanced SSE Manager] Error in event listener:', error);
      }
    });
  }

  public getSubscriberCount(): number {
    return this.subscriberCount;
  }

  private async connectToEndpoint(endpointId: string): Promise<void> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return;

    this.info(`[Enhanced SSE Manager] Connecting to ${endpoint.name} (${endpoint.url})`);

    try {
      // Check if endpoint is already connected
      if (endpoint.isConnected && endpoint.eventSource) {
        this.info(`[Enhanced SSE Manager] ${endpoint.name} already connected, skipping`);
        return;
      }

      // Check if endpoint has exceeded max retries
      if (endpoint.retryCount >= endpoint.maxRetries) {
        this.warn(`[Enhanced SSE Manager] ${endpoint.name} exceeded max retries (${endpoint.maxRetries}), disabling`);
        endpoint.enabled = false;
        endpoint.lastError = 'Max retries exceeded';
        endpoint.lastErrorTime = Date.now();
        return;
      }

      // Create connection with timeout
      const connectionPromise = this.createEventSourceConnection(endpoint);
      const timeoutPromise = this.createTimeoutPromise(endpoint.connectionTimeout);

      const result = await Promise.race([connectionPromise, timeoutPromise]);

      if (result === 'timeout') {
        // Mark timeout context so caller can record precise reason
        endpoint.lastErrorEventType = 'connection_timeout';
        endpoint.lastErrorLocation = endpoint.url;
        throw new Error(`Connection timeout after ${endpoint.connectionTimeout}ms`);
      }

      // Connection successful
      endpoint.isConnected = true;
      endpoint.retryCount = 0;
      endpoint.lastError = undefined;
      endpoint.lastErrorTime = undefined;
      endpoint.lastErrorEventType = undefined;
      endpoint.lastErrorLocation = undefined;
      endpoint.isHanging = false;
      endpoint.connectionAttempts++;

      this.info(`✅ [Enhanced SSE Manager] ${endpoint.name} connected successfully`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.error(`❌ [Enhanced SSE Manager] Failed to connect to ${endpoint.name}:`, errorMessage);

      // Update endpoint error state
      endpoint.isConnected = false;
      endpoint.retryCount++;
      endpoint.lastError = errorMessage;
      endpoint.lastErrorTime = Date.now();
      endpoint.isHanging = errorMessage.startsWith('Connection timeout');
      endpoint.connectionAttempts++;

      // Close any existing connection
      if (endpoint.eventSource) {
        try {
          endpoint.eventSource.close();
          endpoint.eventSource = undefined;
        } catch (closeError) {
          console.error(`[Enhanced SSE Manager] Error closing ${endpoint.name} connection:`, closeError);
        }
      }

      // Do not retry on error: disable endpoint to avoid repeated attempts
      endpoint.enabled = false;
      this.warn(`[Enhanced SSE Manager] ${endpoint.name} disabled after error (no retry policy)`);
    }
  }

  private async createEventSourceConnection(endpoint: SSEEndpoint): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.info(`[Enhanced SSE Manager] Creating EventSource for ${endpoint.name}`);
        
        const eventSource = new EventSource(endpoint.url);
        endpoint.eventSource = eventSource;

        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          this.error(`[Enhanced SSE Manager] ${endpoint.name} connection timeout`);
          endpoint.lastErrorEventType = 'connection_timeout';
          endpoint.lastErrorLocation = endpoint.url;
          eventSource.close();
          reject(new Error('Connection timeout'));
        }, endpoint.connectionTimeout);

        eventSource.onopen = () => {
          this.info(`[Enhanced SSE Manager] ${endpoint.name} EventSource opened`);
          clearTimeout(connectionTimeout);
          resolve();
        };

        eventSource.onerror = (error) => {
          this.error(`[Enhanced SSE Manager] ${endpoint.name} EventSource error:`, error);
          endpoint.lastErrorEventType = 'eventsource_error';
          endpoint.lastErrorLocation = endpoint.url;
          clearTimeout(connectionTimeout);
          eventSource.close();
          // Avoid stringifying the Event object in the error message; log above for details
          reject(new Error('EventSource error'));
        };

        eventSource.onmessage = (event) => {
          if (this.debugMode) {
            try {
              const data = JSON.parse(event.data);
              // eslint-disable-next-line no-console
              console.log(`[Enhanced SSE Manager] ${endpoint.name} received message:`, data);
            } catch (error) {
              endpoint.lastErrorEventType = 'message';
              endpoint.lastErrorLocation = endpoint.url;
              this.error(`[Enhanced SSE Manager] ${endpoint.name} error parsing message:`, error);
            }
          }
          
          // Always try to parse and notify listeners
          try {
            const data = JSON.parse(event.data);
            console.log(`[Enhanced SSE Manager] ${endpoint.name} parsed message:`, data);
            this.notifyEventListeners(data);
          } catch (error) {
            // Ignore parsing errors for non-JSON messages
          }
        };

        // Handle specific events
        const eventTypes = [
          'candidate_update',
          'position_update',
          'notification',
          'upload_queue_update',
          'dashboard_update',
          'keepalive'
        ];

        eventTypes.forEach(eventType => {
          eventSource.addEventListener(eventType, (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              if (this.debugMode) {
                // eslint-disable-next-line no-console
                console.log(`[Enhanced SSE Manager] ${endpoint.name} received ${eventType} event:`, data);
              }
              // Notify all listeners with the parsed data
              this.notifyEventListeners(data);
            } catch (error) {
              endpoint.lastErrorEventType = eventType;
              endpoint.lastErrorLocation = endpoint.url;
              this.error(`[Enhanced SSE Manager] ${endpoint.name} error parsing ${eventType} event:`, error);
            }
          });
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private createTimeoutPromise(timeout: number): Promise<'timeout'> {
    return new Promise(resolve => {
      setTimeout(() => resolve('timeout'), timeout);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public disconnectAll(): void {
    this.info('[Enhanced SSE Manager] Disconnecting all endpoints...');
    
    this.endpoints.forEach(endpoint => {
      if (endpoint.eventSource) {
        try {
          endpoint.eventSource.close();
          endpoint.eventSource = undefined;
          endpoint.isConnected = false;
          this.info(`[Enhanced SSE Manager] Disconnected ${endpoint.name}`);
        } catch (error) {
          this.error(`[Enhanced SSE Manager] Error disconnecting ${endpoint.name}:`, error);
        }
      }
    });
  }

  public disconnectEndpoint(endpointId: string): void {
    const endpoint = this.endpoints.get(endpointId);
    if (endpoint && endpoint.eventSource) {
      try {
        endpoint.eventSource.close();
        endpoint.eventSource = undefined;
        endpoint.isConnected = false;
        this.info(`[Enhanced SSE Manager] Disconnected ${endpoint.name}`);
      } catch (error) {
        this.error(`[Enhanced SSE Manager] Error disconnecting ${endpoint.name}:`, error);
      }
    }
  }

  public getConnectionStatus(): SSEConnectionStatus {
    let connectedCount = 0;
    let failedCount = 0;
    let disabledCount = 0;

    this.endpoints.forEach(endpoint => {
      if (endpoint.isConnected) {
        connectedCount++;
      } else if (!endpoint.enabled) {
        disabledCount++;
      } else if (endpoint.lastError) {
        failedCount++;
      }
    });

    return {
      totalEndpoints: this.endpoints.size,
      connectedEndpoints: connectedCount,
      failedEndpoints: failedCount,
      disabledEndpoints: disabledCount,
      endpoints: Array.from(this.endpoints.values())
    };
  }

  public enableEndpoint(endpointId: string): void {
    const endpoint = this.endpoints.get(endpointId);
    if (endpoint) {
      endpoint.enabled = true;
      endpoint.retryCount = 0;
      endpoint.lastError = undefined;
      endpoint.lastErrorTime = undefined;
      this.info(`[Enhanced SSE Manager] Enabled ${endpoint.name}`);
    }
  }

  public disableEndpoint(endpointId: string): void {
    const endpoint = this.endpoints.get(endpointId);
    if (endpoint) {
      endpoint.enabled = false;
      if (endpoint.eventSource) {
        try {
          endpoint.eventSource.close();
          endpoint.eventSource = undefined;
          endpoint.isConnected = false;
        } catch (error) {
          this.error(`[Enhanced SSE Manager] Error closing ${endpoint.name}:`, error);
        }
      }
      this.info(`[Enhanced SSE Manager] Disabled ${endpoint.name}`);
    }
  }

  public forceReconnect(endpointId: string): void {
    const endpoint = this.endpoints.get(endpointId);
    if (endpoint) {
      this.info(`[Enhanced SSE Manager] Force reconnecting ${endpoint.name}`);
      endpoint.retryCount = 0;
      endpoint.lastError = undefined;
      endpoint.lastErrorTime = undefined;
      
      if (endpoint.eventSource) {
        try {
          endpoint.eventSource.close();
          endpoint.eventSource = undefined;
          endpoint.isConnected = false;
        } catch (error) {
          this.error(`[Enhanced SSE Manager] Error closing ${endpoint.name}:`, error);
        }
      }

      // Schedule immediate reconnection
      setTimeout(() => {
        if (endpoint.enabled) {
          this.connectToEndpoint(endpointId);
        }
      }, 100);
    }
  }

  public getEndpointDetails(endpointId: string): SSEEndpoint | undefined {
    return this.endpoints.get(endpointId);
  }

  public isEndpointConnected(endpointId: string): boolean {
    const endpoint = this.endpoints.get(endpointId);
    return endpoint ? endpoint.isConnected : false;
  }
}

// Global instance
export const enhancedSSEManager = new EnhancedSSEManager();

// Export for use in components
export default enhancedSSEManager;
