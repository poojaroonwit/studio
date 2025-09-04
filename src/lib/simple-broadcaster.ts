// Simple Broadcasting Utility
// Easy way to send SSE events from anywhere in your application

import { broadcastToAll, broadcastToUser } from './unified-connection-manager';
import type { UnifiedEventType } from './unified-connection-manager';
import { 
  broadcastCandidateUpdateIfChanged, 
  broadcastPositionUpdateIfChanged, 
  broadcastUploadQueueUpdateIfChanged,
  broadcastDashboardUpdateIfChanged,
  forceBroadcast 
} from './data-change-tracker';
import { broadcastHighPriority, broadcastMediumPriority, broadcastLowPriority } from './aggressive-sse-optimizer';

// Candidate-related broadcasts
export function broadcastCandidateUpdate(candidate: any, actingUserId?: string) {
  // Use smart change detection - only broadcast if data actually changed
  broadcastCandidateUpdateIfChanged(candidate, actingUserId);
}

export function broadcastCandidateCreated(candidate: any, actingUserId?: string) {
  // High priority for new candidates (always meaningful)
  broadcastHighPriority('candidate_update', {
    candidate,
    actingUserId,
    action: 'created',
    timestamp: new Date().toISOString()
  });
}

export function broadcastCandidateDeleted(candidateId: string, actingUserId?: string) {
  // High priority for deletions (always meaningful)
  broadcastHighPriority('candidate_update', {
    candidateId,
    actingUserId,
    action: 'deleted',
    timestamp: new Date().toISOString()
  });
}

export function broadcastCandidateStatusChanged(candidate: any, oldStatus: string, newStatus: string, actingUserId?: string) {
  // High priority for status changes (always meaningful)
  broadcastHighPriority('candidate_update', {
    candidate,
    actingUserId,
    action: 'status_changed',
    oldStatus,
    newStatus,
    timestamp: new Date().toISOString()
  });
}

// Position-related broadcasts
export function broadcastPositionUpdate(position: any, actingUserId?: string) {
  // Use smart change detection - only broadcast if data actually changed
  broadcastPositionUpdateIfChanged(position, actingUserId);
}

export function broadcastPositionCreated(position: any, actingUserId?: string) {
  // High priority for new positions (always meaningful)
  broadcastHighPriority('position_update', {
    position,
    actingUserId,
    action: 'created',
    timestamp: new Date().toISOString()
  });
}

export function broadcastPositionDeleted(positionId: string, actingUserId?: string) {
  // High priority for deletions (always meaningful)
  broadcastHighPriority('position_update', {
    positionId,
    actingUserId,
    action: 'deleted',
    timestamp: new Date().toISOString()
  });
}

export function broadcastPositionListUpdated() {
  // High priority for list updates
  broadcastHighPriority('position_update', {
    action: 'list_updated',
    timestamp: new Date().toISOString()
  });
}

export function broadcastPositionStatisticsUpdated(statistics: any) {
  // Use smart change detection for statistics
  broadcastPositionUpdateIfChanged({ statistics }, undefined, {
    minBroadcastInterval: 1000, // 1 second for statistics
    ignoreFields: ['timestamp']
  });
}

// Notification broadcasts
export function broadcastNotification(message: string, type: string = 'info', targetUserId?: string) {
  const notification = {
    message,
    type,
    timestamp: new Date().toISOString()
  };

  if (targetUserId) {
    broadcastToUser(targetUserId, 'notification', notification);
  } else {
    broadcastToAll('notification', notification);
  }
}

export function broadcastSystemNotification(message: string, type: string = 'info') {
  broadcastToAll('notification', {
    message,
    type,
    source: 'system',
    timestamp: new Date().toISOString()
  });
}

// Upload queue broadcasts
export function broadcastUploadStarted(fileName: string, userId: string) {
  broadcastToUser(userId, 'upload_queue_update', {
    action: 'started',
    fileName,
    timestamp: new Date().toISOString()
  });
}

export function broadcastUploadCompleted(fileName: string, userId: string, result: any) {
  broadcastToUser(userId, 'upload_queue_update', {
    action: 'completed',
    fileName,
    result,
    timestamp: new Date().toISOString()
  });
}

export function broadcastUploadFailed(fileName: string, userId: string, error: string) {
  broadcastToUser(userId, 'upload_queue_update', {
    action: 'failed',
    fileName,
    error,
    timestamp: new Date().toISOString()
  });
}

// Dashboard broadcasts
export function broadcastDashboardUpdate(data: any) {
  // Use smart change detection for dashboard updates with 1 second interval
  broadcastDashboardUpdateIfChanged(data, { minBroadcastInterval: 1000 });
}

// Generic broadcast function
export function broadcast(eventType: UnifiedEventType, data: any, targetUserId?: string) {
  if (targetUserId) {
    broadcastToUser(targetUserId, eventType, data);
  } else {
    broadcastToAll(eventType, data);
  }
}

// Batch broadcast for multiple events
export function broadcastBatch(events: Array<{ type: UnifiedEventType; data: any; targetUserId?: string }>) {
  events.forEach(event => {
    broadcast(event.type, event.data, event.targetUserId);
  });
}
