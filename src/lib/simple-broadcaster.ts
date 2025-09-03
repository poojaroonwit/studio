// Simple Broadcasting Utility
// Easy way to send SSE events from anywhere in your application

import { broadcastToAll, broadcastToUser } from './unified-connection-manager';
import type { UnifiedEventType } from './unified-connection-manager';

// Candidate-related broadcasts
export function broadcastCandidateUpdate(candidate: any, actingUserId?: string) {
      console.log('[Broadcaster] Broadcasting candidate update:', candidate.id, 'statusId:', candidate.statusId, 'actingUserId:', actingUserId);
  broadcastToAll('candidate_update', {
    candidate,
    actingUserId,
    action: 'updated',
    timestamp: new Date().toISOString()
  });
}

export function broadcastCandidateCreated(candidate: any, actingUserId?: string) {
  broadcastToAll('candidate_update', {
    candidate,
    actingUserId,
    action: 'created',
    timestamp: new Date().toISOString()
  });
}

export function broadcastCandidateDeleted(candidateId: string, actingUserId?: string) {
  broadcastToAll('candidate_update', {
    candidateId,
    actingUserId,
    action: 'deleted',
    timestamp: new Date().toISOString()
  });
}

export function broadcastCandidateStatusChanged(candidate: any, oldStatus: string, newStatus: string, actingUserId?: string) {
  broadcastToAll('candidate_update', {
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
  broadcastToAll('position_update', {
    position,
    actingUserId,
    action: 'updated',
    timestamp: new Date().toISOString()
  });
}

export function broadcastPositionCreated(position: any, actingUserId?: string) {
  broadcastToAll('position_update', {
    position,
    actingUserId,
    action: 'created',
    timestamp: new Date().toISOString()
  });
}

export function broadcastPositionDeleted(positionId: string, actingUserId?: string) {
  broadcastToAll('position_update', {
    positionId,
    actingUserId,
    action: 'deleted',
    timestamp: new Date().toISOString()
  });
}

export function broadcastPositionListUpdated() {
  broadcastToAll('position_update', {
    action: 'list_updated',
    timestamp: new Date().toISOString()
  });
}

export function broadcastPositionStatisticsUpdated(statistics: any) {
  broadcastToAll('position_update', {
    action: 'statistics_updated',
    statistics,
    timestamp: new Date().toISOString()
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
  broadcastToAll('dashboard_update', {
    ...data,
    timestamp: new Date().toISOString()
  });
}

// Generic broadcast function
export function broadcast(eventType: SSEEventType, data: any, targetUserId?: string) {
  if (targetUserId) {
    broadcastToUser(targetUserId, eventType, data);
  } else {
    broadcastToAll(eventType, data);
  }
}

// Batch broadcast for multiple events
export function broadcastBatch(events: Array<{ type: SSEEventType; data: any; targetUserId?: string }>) {
  events.forEach(event => {
    broadcast(event.type, event.data, event.targetUserId);
  });
}
