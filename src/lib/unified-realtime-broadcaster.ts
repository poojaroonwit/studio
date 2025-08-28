// Broadcasting functions are now implemented directly in this file
// since Next.js API routes should only export HTTP handlers

// Global SSE controllers management (shared with SSE route)
export const sseControllers = new Map<string, ReadableStreamDefaultController<any>>();
export const userControllers = new Map<string, Set<ReadableStreamDefaultController<any>>>();

// Event types for different realtime features
type EventType = 
  | 'candidate_update'
  | 'position_update'
  | 'presence_update'
  | 'session_expired'
  | 'health_check'
  | 'warning_update'
  | 'notification'
  | 'upload_queue_update'
  | 'dashboard_update'
  | 'user_list_update'
  | 'keepalive'
  | 'heartbeat';

interface SSEEvent {
  type: EventType;
  data: any;
  timestamp: string;
  targetUserId?: string;
  actingUserId?: string;
}

// Core broadcasting function
function broadcastEvent(event: SSEEvent) {
  const encoder = new TextEncoder();
  const eventData = JSON.stringify(event);
  const message = `event: ${event.type}\ndata: ${eventData}\n\n`;

  if (event.targetUserId) {
    // Send to specific user
    const userControllerSet = userControllers.get(event.targetUserId);
    if (userControllerSet) {
      for (const controller of userControllerSet) {
        try {
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error(`[SSE] Failed to send ${event.type} to user ${event.targetUserId}:`, error);
        }
      }
    }
  } else {
    // Broadcast to all connected clients
    for (const controller of sseControllers.values()) {
      try {
        controller.enqueue(encoder.encode(message));
      } catch (error) {
        console.error(`[SSE] Failed to broadcast ${event.type}:`, error);
      }
    }
  }
}

// Specific broadcasting functions
function broadcastCandidateUpdate(candidate: any, actingUserId?: string) {
  broadcastEvent({
    type: 'candidate_update',
    data: { candidate, actingUserId },
    timestamp: new Date().toISOString(),
    actingUserId
  });
}

function broadcastPositionUpdate(position: any, actingUserId?: string) {
  broadcastEvent({
    type: 'position_update',
    data: { position, actingUserId },
    timestamp: new Date().toISOString(),
    actingUserId
  });
}

function broadcastPresenceUpdate(userId: string, presence: any) {
  broadcastEvent({
    type: 'presence_update',
    data: { userId, presence },
    timestamp: new Date().toISOString(),
    targetUserId: userId
  });
}

function broadcastUserListUpdate(users: any[]) {
  broadcastEvent({
    type: 'user_list_update',
    data: { users },
    timestamp: new Date().toISOString()
  });
}

function broadcastNotification(notification: any, targetUserId?: string) {
  broadcastEvent({
    type: 'notification',
    data: { notification },
    timestamp: new Date().toISOString(),
    targetUserId
  });
}

function broadcastUploadQueueUpdate(queueData: any) {
  broadcastEvent({
    type: 'upload_queue_update',
    data: { queue: queueData },
    timestamp: new Date().toISOString()
  });
}

function broadcastDashboardUpdate(dashboardData: any) {
  broadcastEvent({
    type: 'dashboard_update',
    data: { dashboard: dashboardData },
    timestamp: new Date().toISOString()
  });
}

function broadcastWarningUpdate(warning: any) {
  broadcastEvent({
    type: 'warning_update',
    data: { warning },
    timestamp: new Date().toISOString()
  });
}

function broadcastSessionExpired(userId: string) {
  broadcastEvent({
    type: 'session_expired',
    data: { userId },
    timestamp: new Date().toISOString(),
    targetUserId: userId
  });
}

function broadcastHealthCheck(healthData: any) {
  broadcastEvent({
    type: 'health_check',
    data: { health: healthData },
    timestamp: new Date().toISOString()
  });
}

function getConnectedUsersCount(): number {
  return userControllers.size;
}

function getTotalConnectionsCount(): number {
  return sseControllers.size;
}

// Enhanced broadcasting interface
interface BroadcastOptions {
  targetUserId?: string;
  actingUserId?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  retryOnFailure?: boolean;
  maxRetries?: number;
}

interface BroadcastResult {
  success: boolean;
  recipients: number;
  error?: string;
  timestamp: string;
}

// Unified Realtime Broadcaster Class
export class UnifiedRealtimeBroadcaster {
  private static instance: UnifiedRealtimeBroadcaster;
  private retryQueue: Array<{
    event: any;
    options: BroadcastOptions;
    retryCount: number;
    maxRetries: number;
  }> = [];
  private isProcessingRetries = false;

  static getInstance(): UnifiedRealtimeBroadcaster {
    if (!UnifiedRealtimeBroadcaster.instance) {
      UnifiedRealtimeBroadcaster.instance = new UnifiedRealtimeBroadcaster();
    }
    return UnifiedRealtimeBroadcaster.instance;
  }

  // Enhanced broadcast method with options
  async broadcast(
    eventType: string,
    data: any,
    options: BroadcastOptions = {}
  ): Promise<BroadcastResult> {
    const {
      targetUserId,
      actingUserId,
      priority = 'normal',
      retryOnFailure = false,
      maxRetries = 3
    } = options;

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<BroadcastResult>((_, reject) => {
      setTimeout(() => reject(new Error('Broadcast timeout')), 10000); // 10 second timeout
    });

    const broadcastPromise = (async () => {
      try {
        const event = {
          type: eventType as EventType,
          data,
          timestamp: new Date().toISOString(),
          targetUserId,
          actingUserId
        };

        broadcastEvent(event);

        const recipients = targetUserId ? 1 : getConnectedUsersCount();
        
        return {
          success: true,
          recipients,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error(`Failed to broadcast ${eventType}:`, error);
        
        if (retryOnFailure) {
          this.addToRetryQueue(eventType, data, options, maxRetries);
        }

        return {
          success: false,
          recipients: 0,
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        };
      }
    })();

    try {
      return await Promise.race([broadcastPromise, timeoutPromise]);
    } catch (error) {
      console.error(`Broadcast timeout for ${eventType}:`, error);
      return {
        success: false,
        recipients: 0,
        error: 'Broadcast timeout',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Candidate-related broadcasts
  async broadcastCandidateCreated(candidate: any, actingUserId?: string, options?: BroadcastOptions) {
    return this.broadcast('candidate_update', { 
      candidate, 
      action: 'created',
      actingUserId 
    }, options);
  }

  async broadcastCandidateUpdated(candidate: any, actingUserId?: string, options?: BroadcastOptions) {
    return this.broadcast('candidate_update', { 
      candidate, 
      action: 'updated',
      actingUserId 
    }, options);
  }

  async broadcastCandidateDeleted(candidateId: string, actingUserId?: string, options?: BroadcastOptions) {
    return this.broadcast('candidate_update', { 
      candidateId, 
      action: 'deleted',
      actingUserId 
    }, options);
  }

  async broadcastCandidateStatusChanged(candidate: any, oldStatus: string, newStatus: string, actingUserId?: string, options?: BroadcastOptions) {
    return this.broadcast('candidate_update', { 
      candidate, 
      action: 'status_changed',
      oldStatus,
      newStatus,
      actingUserId 
    }, options);
  }

  async broadcastCandidateTransitionUpdated(transition: any, actingUserId?: string, options?: BroadcastOptions) {
    return this.broadcast('candidate_update', { 
      transition, 
      action: 'transition_updated',
      actingUserId 
    }, options);
  }

  // Position-related broadcasts
  async broadcastPositionCreated(position: any, actingUserId?: string, options?: BroadcastOptions) {
    return this.broadcast('position_update', { 
      position, 
      action: 'created',
      actingUserId 
    }, options);
  }

  async broadcastPositionUpdated(position: any, actingUserId?: string, options?: BroadcastOptions) {
    return this.broadcast('position_update', { 
      position, 
      action: 'updated',
      actingUserId 
    }, options);
  }

  async broadcastPositionDeleted(positionId: string, actingUserId?: string, options?: BroadcastOptions) {
    return this.broadcast('position_update', { 
      positionId, 
      action: 'deleted',
      actingUserId 
    }, options);
  }

  async broadcastPositionListUpdated(options?: BroadcastOptions) {
    return this.broadcast('position_update', { 
      action: 'list_updated'
    }, options);
  }

  async broadcastPositionStatisticsUpdated(statistics: any, options?: BroadcastOptions) {
    return this.broadcast('position_update', { 
      action: 'statistics_updated',
      statistics 
    }, options);
  }

  // User presence broadcasts
  async broadcastUserJoined(userId: string, userData: any, options?: BroadcastOptions) {
    return this.broadcast('presence_update', { 
      userId, 
      action: 'joined',
      userData 
    }, options);
  }

  async broadcastUserLeft(userId: string, options?: BroadcastOptions) {
    return this.broadcast('presence_update', { 
      userId, 
      action: 'left' 
    }, options);
  }

  async broadcastUserPageChanged(userId: string, page: string, options?: BroadcastOptions) {
    return this.broadcast('presence_update', { 
      userId, 
      action: 'page_changed',
      page 
    }, options);
  }

  // Notification broadcasts
  async broadcastSystemNotification(message: string, type: string = 'info', targetUserId?: string, options?: BroadcastOptions) {
    return this.broadcast('notification', { 
      type: 'system',
      message,
      notificationType: type,
      targetUserId 
    }, options);
  }

  async broadcastUserNotification(userId: string, message: string, type: string = 'info', options?: BroadcastOptions) {
    return this.broadcast('notification', { 
      type: 'user',
      message,
      notificationType: type,
      targetUserId: userId 
    }, options);
  }

  // Upload queue broadcasts
  async broadcastUploadStarted(fileName: string, userId: string, options?: BroadcastOptions) {
    return this.broadcast('upload_queue_update', { 
      action: 'started',
      fileName,
      userId 
    }, options);
  }

  async broadcastUploadCompleted(fileName: string, userId: string, result: any, options?: BroadcastOptions) {
    return this.broadcast('upload_queue_update', { 
      action: 'completed',
      fileName,
      userId,
      result 
    }, options);
  }

  async broadcastUploadFailed(fileName: string, userId: string, error: string, options?: BroadcastOptions) {
    return this.broadcast('upload_queue_update', { 
      action: 'failed',
      fileName,
      userId,
      error 
    }, options);
  }

  // Dashboard broadcasts
  async broadcastDashboardMetrics(metrics: any, options?: BroadcastOptions) {
    return this.broadcast('dashboard_update', { 
      type: 'metrics',
      metrics 
    }, options);
  }

  async broadcastDashboardChartUpdate(chartId: string, data: any, options?: BroadcastOptions) {
    return this.broadcast('dashboard_update', { 
      type: 'chart_update',
      chartId,
      data 
    }, options);
  }

  // Warning broadcasts
  async broadcastWarningCreated(warning: any, options?: BroadcastOptions) {
    return this.broadcast('warning_update', { 
      warning, 
      action: 'created' 
    }, options);
  }

  async broadcastWarningResolved(warningId: string, resolvedBy: string, options?: BroadcastOptions) {
    return this.broadcast('warning_update', { 
      warningId, 
      action: 'resolved',
      resolvedBy 
    }, options);
  }

  // Session broadcasts
  async broadcastSessionExpired(userId: string, options?: BroadcastOptions) {
    return this.broadcast('session_expired', { 
      userId 
    }, { ...options, targetUserId: userId });
  }

  // Health check broadcasts
  async broadcastHealthStatus(healthData: any, options?: BroadcastOptions) {
    return this.broadcast('health_check', { 
      health: healthData 
    }, options);
  }

  // Bulk broadcasts for multiple events
  async broadcastBulk(events: Array<{ type: string; data: any; options?: BroadcastOptions }>): Promise<BroadcastResult[]> {
    const results: BroadcastResult[] = [];
    
    for (const event of events) {
      const result = await this.broadcast(event.type, event.data, event.options);
      results.push(result);
    }
    
    return results;
  }

  // Retry queue management
  private addToRetryQueue(eventType: string, data: any, options: BroadcastOptions, maxRetries: number) {
    this.retryQueue.push({
      event: { type: eventType, data },
      options,
      retryCount: 0,
      maxRetries
    });

    if (!this.isProcessingRetries) {
      this.processRetryQueue();
    }
  }

  private async processRetryQueue() {
    if (this.isProcessingRetries || this.retryQueue.length === 0) {
      return;
    }

    this.isProcessingRetries = true;

    while (this.retryQueue.length > 0) {
      const item = this.retryQueue.shift();
      if (!item) continue;

      if (item.retryCount < item.maxRetries) {
        try {
          await this.broadcast(item.event.type, item.event.data, item.options);
        } catch (error) {
          item.retryCount++;
          if (item.retryCount < item.maxRetries) {
            this.retryQueue.push(item);
          }
        }
      }

      // Wait a bit between retries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isProcessingRetries = false;
  }

  // Statistics and monitoring
  getStatistics() {
    return {
      connectedUsers: getConnectedUsersCount(),
      totalConnections: getTotalConnectionsCount(),
      retryQueueLength: this.retryQueue.length,
      isProcessingRetries: this.isProcessingRetries
    };
  }

  // Clear retry queue
  clearRetryQueue() {
    this.retryQueue = [];
  }
}

// Export singleton instance
export const unifiedBroadcaster = UnifiedRealtimeBroadcaster.getInstance();

// Convenience functions for backward compatibility
export const broadcastCandidate = (candidate: any, actingUserId?: string) => {
  broadcastCandidateUpdate(candidate, actingUserId);
};

export const broadcastPosition = (position: any, actingUserId?: string) => {
  broadcastPositionUpdate(position, actingUserId);
};

export const broadcastPresence = (userId: string, presence: any) => {
  broadcastPresenceUpdate(userId, presence);
};

export const broadcastUsers = (users: any[]) => {
  broadcastUserListUpdate(users);
};

export const broadcastNotificationEvent = (notification: any, targetUserId?: string) => {
  broadcastNotification(notification, targetUserId);
};

export const broadcastQueue = (queueData: any) => {
  broadcastUploadQueueUpdate(queueData);
};

export const broadcastDashboard = (dashboardData: any) => {
  broadcastDashboardUpdate(dashboardData);
};

export const broadcastWarning = (warning: any) => {
  broadcastWarningUpdate(warning);
};

export const broadcastSession = (userId: string) => {
  broadcastSessionExpired(userId);
};

export const broadcastHealth = (healthData: any) => {
  broadcastHealthCheck(healthData);
};
