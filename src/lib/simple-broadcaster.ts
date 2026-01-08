// Simple Broadcasting Utility
// Easy way to send SSE events from anywhere in your application

import { broadcast as broadcastAll } from './realtime';
type UnifiedEventType = string;
import { 
  broadcastCandidateUpdateIfChanged, 
  broadcastPositionUpdateIfChanged, 
  broadcastUploadQueueUpdateIfChanged,
  broadcastDashboardUpdateIfChanged
} from './data-change-tracker';
import { broadcastHighPriority, broadcastMediumPriority, broadcastLowPriority, forceBroadcast } from './aggressive-sse-optimizer';

// Candidate-related broadcasts
export function broadcastCandidateUpdate(candidate: any, actingUserId?: string) {
  // Use smart change detection - only broadcast if data actually changed
  broadcastCandidateUpdateIfChanged(candidate, actingUserId);
  
  // Also trigger dashboard refresh for real-time updates
  broadcastDashboardRefresh('candidate_updated');
}

export function broadcastCandidateCreated(candidate: any, actingUserId?: string) {
  // High priority for new candidates (always meaningful)
  broadcastHighPriority('candidate_update', {
    candidate,
    actingUserId,
    action: 'created',
    timestamp: new Date().toISOString()
  });
  
  // Also trigger dashboard refresh for real-time updates
  broadcastDashboardRefresh('candidate_created');
}

export function broadcastCandidateDeleted(candidateId: string, actingUserId?: string) {
  // High priority for deletions (always meaningful)
  broadcastHighPriority('candidate_update', {
    candidateId,
    actingUserId,
    action: 'deleted',
    timestamp: new Date().toISOString()
  });
  
  // Also trigger dashboard refresh for real-time updates
  broadcastDashboardRefresh('candidate_deleted');
}

export function broadcastCandidateStatusChanged(candidate: any, oldStatus: string, newStatus: string, actingUserId?: string) {
  // Force immediate broadcast for status changes (bypasses all optimizations)
  forceBroadcast('candidate_update', {
    candidate,
    actingUserId,
    action: 'status_changed',
    oldStatus,
    newStatus,
    timestamp: new Date().toISOString()
  });
  
  // Also trigger dashboard refresh for real-time updates
  broadcastDashboardRefresh('candidate_status_changed');
}

// Position-related broadcasts
export function broadcastPositionUpdate(position: any, actingUserId?: string) {
  // Use smart change detection - only broadcast if data actually changed
  broadcastPositionUpdateIfChanged(position, actingUserId);
  
  // Also trigger dashboard refresh for real-time updates
  broadcastDashboardRefresh('position_updated');
}

export function broadcastPositionCreated(position: any, actingUserId?: string) {
  // High priority for new positions (always meaningful)
  broadcastHighPriority('position_update', {
    position,
    actingUserId,
    action: 'created',
    timestamp: new Date().toISOString()
  });
  
  // Also trigger dashboard refresh for real-time updates
  broadcastDashboardRefresh('position_created');
}

export function broadcastPositionDeleted(positionId: string, actingUserId?: string) {
  // High priority for deletions (always meaningful)
  broadcastHighPriority('position_update', {
    positionId,
    actingUserId,
    action: 'deleted',
    timestamp: new Date().toISOString()
  });
  
  // Also trigger dashboard refresh for real-time updates
  broadcastDashboardRefresh('position_deleted');
}

export function broadcastPositionListUpdated() {
  // Force immediate broadcast for list updates (bypasses all optimizations)
  forceBroadcast('position_update', {
    action: 'list_updated',
    timestamp: new Date().toISOString()
  });
  
  // Also trigger dashboard refresh for real-time updates
  broadcastDashboardRefresh('position_list_updated');
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
    level: type,
    timestamp: new Date().toISOString()
  };
  // Simplified: global broadcast only
  broadcastAll({ type: 'notification', ...notification }, 'notification');
}

export function broadcastSystemNotification(message: string, level: string = 'info') {
  broadcastAll({ type: 'notification',
    message,
    level,
    source: 'system',
    timestamp: new Date().toISOString()
  }, 'notification');
}

// Upload queue broadcasts
export function broadcastUploadStarted(fileName: string, userId: string) {
  broadcastAll({ type: 'upload_queue_update',
    action: 'started',
    fileName,
    timestamp: new Date().toISOString(),
    userId
  }, 'upload_queue_update');
}

export function broadcastUploadCompleted(fileName: string, userId: string, result: any) {
  broadcastAll({ type: 'upload_queue_update',
    action: 'completed',
    fileName,
    result,
    timestamp: new Date().toISOString(),
    userId
  }, 'upload_queue_update');
}

export function broadcastUploadFailed(fileName: string, userId: string, error: string) {
  broadcastAll({ type: 'upload_queue_update',
    action: 'failed',
    fileName,
    error,
    timestamp: new Date().toISOString(),
    userId
  }, 'upload_queue_update');
}

// Dashboard broadcasts
export function broadcastDashboardUpdate(data: any) {
  // Use smart change detection for dashboard updates with 500ms interval for better real-time updates
  broadcastDashboardUpdateIfChanged(data, { minBroadcastInterval: 500 });
}

// Force dashboard refresh when candidates or positions change
export function broadcastDashboardRefresh(reason: string = 'data_changed') {
  // Force broadcast dashboard refresh without change detection
  forceBroadcast('dashboard_update', {
    type: 'refresh',
    reason,
    timestamp: new Date().toISOString()
  });
}

// Generic broadcast function
export function broadcast(eventType: UnifiedEventType, data: any, targetUserId?: string) {
  // Lightweight path: global broadcast only
  if (!targetUserId) broadcastAll({ type: eventType, ...data }, eventType);
}

// Batch broadcast for multiple events
export function broadcastBatch(events: Array<{ type: UnifiedEventType; data: any; targetUserId?: string }>) {
  events.forEach(event => {
    broadcast(event.type, event.data, event.targetUserId);
  });
}
