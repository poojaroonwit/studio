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
  lastError?: string;
  lastErrorTime?: number;
  connectionAttempts: number;
  isConnected: boolean;
  eventSource?: EventSource;
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
  private maxConcurrentConnections: number = 2; // Max 2 connections at once

  constructor() {
    this.initializeEndpoints();
  }

  private initializeEndpoints() {
    // Initialize all SSE endpoints with priority order
    const endpointConfigs = [
      {
        id: 'main-sse',
        url: '/api/sse',
        name: 'Main SSE',
        priority: 1,
        enabled: true,
        maxRetries: 3
      },
      {
        id: 'upload-queue-sse',
        url: '/api/upload-queue/sse',
        name: 'Upload Queue SSE',
        priority: 2,
        enabled: true,
        maxRetries: 2
      },
      {
        id: 'dashboard-stream',
        url: '/api/dashboard/stream',
        name: 'Dashboard Stream',
        priority: 3,
        enabled: true,
        maxRetries: 2
      }
    ];

    endpointConfigs.forEach(config => {
      this.endpoints.set(config.id, {
        ...config,
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

    console.log('[Enhanced SSE Manager] Initialized with endpoints:', this.connectionQueue);
  }

  public async connectAll(): Promise<void> {
    if (this.isConnecting) {
      console.log('[Enhanced SSE Manager] Connection already in progress, skipping');
      return;
    }

    this.isConnecting = true;
    console.log('[Enhanced SSE Manager] Starting sequential connection of endpoints...');

    try {
      // Connect to endpoints one by one
      for (const endpointId of this.connectionQueue) {
        const endpoint = this.endpoints.get(endpointId);
        if (!endpoint || !endpoint.enabled) {
          console.log(`[Enhanced SSE Manager] Skipping disabled endpoint: ${endpointId}`);
          continue;
        }

        await this.connectToEndpoint(endpointId);
        
        // Small delay between connections to avoid overwhelming the server
        await this.delay(1000);
      }
    } catch (error) {
      console.error('[Enhanced SSE Manager] Error during connection sequence:', error);
    } finally {
      this.isConnecting = false;
      console.log('[Enhanced SSE Manager] Connection sequence completed');
    }
  }

  private async connectToEndpoint(endpointId: string): Promise<void> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return;

    console.log(`[Enhanced SSE Manager] Connecting to ${endpoint.name} (${endpoint.url})`);

    try {
      // Check if endpoint is already connected
      if (endpoint.isConnected && endpoint.eventSource) {
        console.log(`[Enhanced SSE Manager] ${endpoint.name} already connected, skipping`);
        return;
      }

      // Check if endpoint has exceeded max retries
      if (endpoint.retryCount >= endpoint.maxRetries) {
        console.warn(`[Enhanced SSE Manager] ${endpoint.name} exceeded max retries (${endpoint.maxRetries}), disabling`);
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
        throw new Error(`Connection timeout after ${endpoint.connectionTimeout}ms`);
      }

      // Connection successful
      endpoint.isConnected = true;
      endpoint.retryCount = 0;
      endpoint.lastError = undefined;
      endpoint.lastErrorTime = undefined;
      endpoint.connectionAttempts++;

      console.log(`✅ [Enhanced SSE Manager] ${endpoint.name} connected successfully`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [Enhanced SSE Manager] Failed to connect to ${endpoint.name}:`, errorMessage);

      // Update endpoint error state
      endpoint.isConnected = false;
      endpoint.retryCount++;
      endpoint.lastError = errorMessage;
      endpoint.lastErrorTime = Date.now();
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

      // Schedule retry if within retry limit
      if (endpoint.retryCount < endpoint.maxRetries) {
        const retryDelay = this.retryDelay * Math.pow(2, endpoint.retryCount - 1); // Exponential backoff
        console.log(`[Enhanced SSE Manager] Scheduling retry for ${endpoint.name} in ${retryDelay}ms`);
        
        setTimeout(() => {
          if (endpoint.enabled) {
            this.connectToEndpoint(endpointId);
          }
        }, retryDelay);
      } else {
        console.warn(`[Enhanced SSE Manager] ${endpoint.name} reached max retries, will not retry`);
      }
    }
  }

  private async createEventSourceConnection(endpoint: SSEEndpoint): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[Enhanced SSE Manager] Creating EventSource for ${endpoint.name}`);
        
        const eventSource = new EventSource(endpoint.url);
        endpoint.eventSource = eventSource;

        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          console.error(`[Enhanced SSE Manager] ${endpoint.name} connection timeout`);
          eventSource.close();
          reject(new Error('Connection timeout'));
        }, endpoint.connectionTimeout);

        eventSource.onopen = () => {
          console.log(`[Enhanced SSE Manager] ${endpoint.name} EventSource opened`);
          clearTimeout(connectionTimeout);
          resolve();
        };

        eventSource.onerror = (error) => {
          console.error(`[Enhanced SSE Manager] ${endpoint.name} EventSource error:`, error);
          clearTimeout(connectionTimeout);
          eventSource.close();
          reject(new Error(`EventSource error: ${error}`));
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log(`[Enhanced SSE Manager] ${endpoint.name} received message:`, data);
          } catch (error) {
            console.error(`[Enhanced SSE Manager] ${endpoint.name} error parsing message:`, error);
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
              console.log(`[Enhanced SSE Manager] ${endpoint.name} received ${eventType} event:`, data);
            } catch (error) {
              console.error(`[Enhanced SSE Manager] ${endpoint.name} error parsing ${eventType} event:`, error);
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
    console.log('[Enhanced SSE Manager] Disconnecting all endpoints...');
    
    this.endpoints.forEach(endpoint => {
      if (endpoint.eventSource) {
        try {
          endpoint.eventSource.close();
          endpoint.eventSource = undefined;
          endpoint.isConnected = false;
          console.log(`[Enhanced SSE Manager] Disconnected ${endpoint.name}`);
        } catch (error) {
          console.error(`[Enhanced SSE Manager] Error disconnecting ${endpoint.name}:`, error);
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
        console.log(`[Enhanced SSE Manager] Disconnected ${endpoint.name}`);
      } catch (error) {
        console.error(`[Enhanced SSE Manager] Error disconnecting ${endpoint.name}:`, error);
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
      console.log(`[Enhanced SSE Manager] Enabled ${endpoint.name}`);
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
          console.error(`[Enhanced SSE Manager] Error closing ${endpoint.name}:`, error);
        }
      }
      console.log(`[Enhanced SSE Manager] Disabled ${endpoint.name}`);
    }
  }

  public forceReconnect(endpointId: string): void {
    const endpoint = this.endpoints.get(endpointId);
    if (endpoint) {
      console.log(`[Enhanced SSE Manager] Force reconnecting ${endpoint.name}`);
      endpoint.retryCount = 0;
      endpoint.lastError = undefined;
      endpoint.lastErrorTime = undefined;
      
      if (endpoint.eventSource) {
        try {
          endpoint.eventSource.close();
          endpoint.eventSource = undefined;
          endpoint.isConnected = false;
        } catch (error) {
          console.error(`[Enhanced SSE Manager] Error closing ${endpoint.name}:`, error);
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
