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

// Candidate-related broadcasts
export function broadcastCandidateUpdate(candidate: any, actingUserId?: string) {
  // Use smart change detection - only broadcast if data actually changed
  broadcastCandidateUpdateIfChanged(candidate, actingUserId);
}

export function broadcastCandidateCreated(candidate: any, actingUserId?: string) {
  // Force broadcast for new candidates (always meaningful)
  forceBroadcast('candidate_update', {
    candidate,
    actingUserId,
    action: 'created',
    timestamp: new Date().toISOString()
  });
}

export function broadcastCandidateDeleted(candidateId: string, actingUserId?: string) {
  // Force broadcast for deletions (always meaningful)
  forceBroadcast('candidate_update', {
    candidateId,
    actingUserId,
    action: 'deleted',
    timestamp: new Date().toISOString()
  });
}

export function broadcastCandidateStatusChanged(candidate: any, oldStatus: string, newStatus: string, actingUserId?: string) {
  // Force broadcast for status changes (always meaningful)
  forceBroadcast('candidate_update', {
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
  // Force broadcast for new positions (always meaningful)
  forceBroadcast('position_update', {
    position,
    actingUserId,
    action: 'created',
    timestamp: new Date().toISOString()
  });
}

export function broadcastPositionDeleted(positionId: string, actingUserId?: string) {
  // Force broadcast for deletions (always meaningful)
  forceBroadcast('position_update', {
    positionId,
    actingUserId,
    action: 'deleted',
    timestamp: new Date().toISOString()
  });
}

export function broadcastPositionListUpdated() {
  // Force broadcast for list updates (always meaningful)
  forceBroadcast('position_update', {
    action: 'list_updated',
    timestamp: new Date().toISOString()
  });
}

export function broadcastPositionStatisticsUpdated(statistics: any) {
  // Use smart change detection for statistics
  broadcastPositionUpdateIfChanged({ statistics }, undefined, {
    minBroadcastInterval: 5000, // 5 seconds for statistics
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
  // Use smart change detection for dashboard updates
  broadcastDashboardUpdateIfChanged(data);
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
