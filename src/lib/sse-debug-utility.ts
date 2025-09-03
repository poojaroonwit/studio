// SSE Debug Utility - Helps identify and diagnose hanging EventSource connections
// This utility can be used to debug SSE connection issues and prevent application freezing

export interface EventSourceDebugInfo {
  url: string;
  readyState: number;
  readyStateText: string;
  hasError: boolean;
  errorCount: number;
  messageCount: number;
  lastMessageTime: number;
  connectionTime: number;
  isHanging: boolean;
  hangingScore: number;
}

export interface SSEDebugReport {
  timestamp: number;
  totalConnections: number;
  hangingConnections: number;
  connections: EventSourceDebugInfo[];
  recommendations: string[];
}

export class SSEDebugUtility {
  private static instance: SSEDebugUtility;
  private connections: Map<string, EventSourceDebugInfo> = new Map();
  private debugMode: boolean = false;
  private hangingThreshold: number = 5000; // 5 seconds
  private messageThreshold: number = 1000; // 1 second between messages

  private constructor() {
    this.setupGlobalMonitoring();
  }

  public static getInstance(): SSEDebugUtility {
    if (!SSEDebugUtility.instance) {
      SSEDebugUtility.instance = new SSEDebugUtility();
    }
    return SSEDebugUtility.instance;
  }

  private setupGlobalMonitoring() {
    if (typeof window !== 'undefined') {
      // Monitor for new EventSource connections
      const originalEventSource = window.EventSource;
      
      window.EventSource = class extends originalEventSource {
        constructor(url: string, eventSourceInitDict?: EventSourceInit) {
          super(url, eventSourceInitDict);
          SSEDebugUtility.getInstance().trackConnection(this, url);
        }
      };

      // Monitor for page unload to detect hanging connections
      window.addEventListener('beforeunload', () => {
        this.detectHangingConnections();
      });

      // Periodic monitoring
      setInterval(() => {
        this.monitorConnections();
      }, 10000); // Check every 10 seconds
    }
  }

  public trackConnection(eventSource: EventSource, url: string): void {
    const connectionId = `${url}-${Date.now()}`;
    const debugInfo: EventSourceDebugInfo = {
      url,
      readyState: eventSource.readyState,
      readyStateText: this.getReadyStateText(eventSource.readyState),
      hasError: false,
      errorCount: 0,
      messageCount: 0,
      lastMessageTime: Date.now(),
      connectionTime: Date.now(),
      isHanging: false,
      hangingScore: 0
    };

    this.connections.set(connectionId, debugInfo);

    // Set up event listeners for monitoring
    eventSource.addEventListener('message', () => {
      this.updateConnectionInfo(connectionId, 'message');
    });

    eventSource.addEventListener('error', () => {
      this.updateConnectionInfo(connectionId, 'error');
    });

    eventSource.addEventListener('open', () => {
      this.updateConnectionInfo(connectionId, 'open');
    });

    // Monitor readyState changes
    this.monitorReadyState(eventSource, connectionId);

    console.log(`[SSE Debug] Tracking new connection: ${url}`);
  }

  private updateConnectionInfo(connectionId: string, eventType: 'message' | 'error' | 'open'): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    switch (eventType) {
      case 'message':
        connection.messageCount++;
        connection.lastMessageTime = Date.now();
        break;
      case 'error':
        connection.errorCount++;
        connection.hasError = true;
        break;
      case 'open':
        connection.readyState = 1; // OPEN
        connection.readyStateText = 'OPEN';
        break;
    }

    // Update hanging status
    this.updateHangingStatus(connection);
  }

  private monitorReadyState(eventSource: EventSource, connectionId: string): void {
    const checkReadyState = () => {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      const newReadyState = eventSource.readyState;
      if (newReadyState !== connection.readyState) {
        connection.readyState = newReadyState;
        connection.readyStateText = this.getReadyStateText(newReadyState);
        
        console.log(`[SSE Debug] ${connection.url} readyState changed to: ${connection.readyStateText}`);
      }

      // Continue monitoring if connection is still active
      if (newReadyState !== 2) { // Not CLOSED
        setTimeout(checkReadyState, 1000);
      }
    };

    checkReadyState();
  }

  private updateHangingStatus(connection: EventSourceDebugInfo): void {
    const now = Date.now();
    const timeSinceLastMessage = now - connection.lastMessageTime;
    const connectionAge = now - connection.connectionTime;

    // Calculate hanging score based on various factors
    let hangingScore = 0;

    // Factor 1: Time since last message
    if (timeSinceLastMessage > this.messageThreshold) {
      hangingScore += Math.min((timeSinceLastMessage - this.messageThreshold) / 1000, 10);
    }

    // Factor 2: Connection age
    if (connectionAge > this.hangingThreshold) {
      hangingScore += Math.min((connectionAge - this.hangingThreshold) / 10000, 5);
    }

    // Factor 3: Error count
    hangingScore += connection.errorCount * 2;

    // Factor 4: ReadyState issues
    if (connection.readyState === 0) { // CONNECTING
      hangingScore += 3;
    }

    connection.hangingScore = Math.round(hangingScore);
    connection.isHanging = hangingScore > 5;

    if (connection.isHanging && this.debugMode) {
      console.warn(`[SSE Debug] Potential hanging connection detected: ${connection.url}`, {
        hangingScore: connection.hangingScore,
        timeSinceLastMessage,
        connectionAge,
        errorCount: connection.errorCount,
        readyState: connection.readyStateText
      });
    }
  }

  private getReadyStateText(readyState: number): string {
    switch (readyState) {
      case 0: return 'CONNECTING';
      case 1: return 'OPEN';
      case 2: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  private monitorConnections(): void {
    const now = Date.now();
    let hangingCount = 0;

    this.connections.forEach((connection, connectionId) => {
      // Update hanging status
      this.updateHangingStatus(connection);

      if (connection.isHanging) {
        hangingCount++;
      }

      // Clean up closed connections
      if (connection.readyState === 2) { // CLOSED
        this.connections.delete(connectionId);
      }
    });

    if (hangingCount > 0) {
      console.warn(`[SSE Debug] Detected ${hangingCount} potentially hanging connections`);
    }
  }

  public detectHangingConnections(): SSEDebugReport {
    const now = Date.now();
    const connections = Array.from(this.connections.values());
    const hangingConnections = connections.filter(c => c.isHanging);

    const recommendations: string[] = [];

    if (hangingConnections.length > 0) {
      recommendations.push(`Found ${hangingConnections.length} hanging connections that should be closed`);
      
      hangingConnections.forEach(connection => {
        recommendations.push(`- Close connection to ${connection.url} (hanging score: ${connection.hangingScore})`);
      });
    }

    if (connections.length > 5) {
      recommendations.push('Too many SSE connections open - consider connection pooling');
    }

    if (connections.some(c => c.errorCount > 3)) {
      recommendations.push('Some connections have high error rates - check server health');
    }

    const report: SSEDebugReport = {
      timestamp: now,
      totalConnections: connections.length,
      hangingConnections: hangingConnections.length,
      connections: connections.map(c => ({ ...c })),
      recommendations
    };

    if (this.debugMode) {
      console.log('[SSE Debug] Debug Report:', report);
    }

    return report;
  }

  public enableDebugMode(): void {
    this.debugMode = true;
    console.log('[SSE Debug] Debug mode enabled');
  }

  public disableDebugMode(): void {
    this.debugMode = false;
    console.log('[SSE Debug] Debug mode disabled');
  }

  public getConnectionStats(): { total: number; hanging: number; healthy: number } {
    const connections = Array.from(this.connections.values());
    const hanging = connections.filter(c => c.isHanging).length;
    const healthy = connections.filter(c => !c.isHanging).length;

    return {
      total: connections.length,
      hanging,
      healthy
    };
  }

  public forceCloseHangingConnections(): void {
    console.log('[SSE Debug] Force closing hanging connections...');
    
    this.connections.forEach((connection, connectionId) => {
      if (connection.isHanging) {
        console.warn(`[SSE Debug] Force closing hanging connection: ${connection.url}`);
        this.connections.delete(connectionId);
      }
    });
  }

  public getDetailedReport(): SSEDebugReport {
    return this.detectHangingConnections();
  }

  public static logConnectionSummary(): void {
    const utility = SSEDebugUtility.getInstance();
    const stats = utility.getConnectionStats();
    const report = utility.getDetailedReport();

    console.group('🔍 SSE Connection Summary');
    console.log(`Total Connections: ${stats.total}`);
    console.log(`Healthy: ${stats.healthy}`);
    console.log(`Potentially Hanging: ${stats.hanging}`);
    
    if (report.recommendations.length > 0) {
      console.log('Recommendations:');
      report.recommendations.forEach(rec => console.log(`- ${rec}`));
    }
    
    console.groupEnd();
  }
}

// Global instance
export const sseDebugUtility = SSEDebugUtility.getInstance();

// Export for use in components
export default sseDebugUtility;
