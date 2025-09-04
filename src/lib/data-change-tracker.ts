// Data Change Detection System for SSE Events
// Only broadcasts when there are actual meaningful changes

import { broadcastToAll, broadcastToUser } from './unified-connection-manager';
import type { UnifiedEventType } from './unified-connection-manager';

// Change tracking interfaces
interface DataSnapshot {
  timestamp: number;
  data: any;
  hash: string;
}

interface ChangeTracker {
  lastSnapshot: DataSnapshot | null;
  lastBroadcast: number;
  minBroadcastInterval: number; // Minimum time between broadcasts (ms)
}

// Global change trackers for different data types
const changeTrackers = new Map<string, ChangeTracker>();

// Hash function for data comparison
function generateHash(data: any): string {
  return JSON.stringify(data, Object.keys(data).sort());
}

// Check if data has meaningfully changed
function hasDataChanged(trackerKey: string, newData: any, options: {
  minBroadcastInterval?: number;
  ignoreFields?: string[];
} = {}): boolean {
  const {
    minBroadcastInterval = 2000, // Default 2 seconds between broadcasts
    ignoreFields = []
  } = options;

  const now = Date.now();
  let tracker = changeTrackers.get(trackerKey);
  
  if (!tracker) {
    tracker = {
      lastSnapshot: null,
      lastBroadcast: 0,
      minBroadcastInterval
    };
    changeTrackers.set(trackerKey, tracker);
  }

  // Check minimum broadcast interval
  if (now - tracker.lastBroadcast < minBroadcastInterval) {
    return false;
  }

  // Create filtered data (remove ignored fields)
  const filteredData = { ...newData };
  ignoreFields.forEach(field => {
    delete filteredData[field];
  });

  const newHash = generateHash(filteredData);

  // If no previous snapshot, this is the first time
  if (!tracker.lastSnapshot) {
    tracker.lastSnapshot = {
      timestamp: now,
      data: filteredData,
      hash: newHash
    };
    return true;
  }

  // Check if hash has changed (meaningful data change)
  if (tracker.lastSnapshot.hash !== newHash) {
    tracker.lastSnapshot = {
      timestamp: now,
      data: filteredData,
      hash: newHash
    };
    tracker.lastBroadcast = now;
    return true;
  }

  return false;
}

// Smart broadcast functions that only send when data changes
export function broadcastCandidateUpdateIfChanged(
  candidate: any, 
  actingUserId?: string,
  options: { minBroadcastInterval?: number; ignoreFields?: string[] } = {}
) {
  const trackerKey = `candidate_${candidate.id}`;
  
  if (hasDataChanged(trackerKey, candidate, {
    minBroadcastInterval: options.minBroadcastInterval || 3000, // 3 seconds for candidates
    ignoreFields: ['updated_at', 'last_activity', ...(options.ignoreFields || [])]
  })) {
    console.log('[DataChange] Broadcasting candidate update:', candidate.id);
    broadcastToAll('candidate_update', {
      candidate,
      actingUserId,
      action: 'updated',
      timestamp: new Date().toISOString()
    });
  } else {
    console.log('[DataChange] Skipping candidate update - no meaningful change:', candidate.id);
  }
}

export function broadcastPositionUpdateIfChanged(
  position: any, 
  actingUserId?: string,
  options: { minBroadcastInterval?: number; ignoreFields?: string[] } = {}
) {
  const trackerKey = `position_${position.id}`;
  
  if (hasDataChanged(trackerKey, position, {
    minBroadcastInterval: options.minBroadcastInterval || 5000, // 5 seconds for positions
    ignoreFields: ['updated_at', 'last_activity', ...(options.ignoreFields || [])]
  })) {
    console.log('[DataChange] Broadcasting position update:', position.id);
    broadcastToAll('position_update', {
      position,
      actingUserId,
      action: 'updated',
      timestamp: new Date().toISOString()
    });
  } else {
    console.log('[DataChange] Skipping position update - no meaningful change:', position.id);
  }
}

export function broadcastUploadQueueUpdateIfChanged(
  summary: any,
  options: { minBroadcastInterval?: number; ignoreFields?: string[] } = {}
) {
  const trackerKey = 'upload_queue_summary';
  
  if (hasDataChanged(trackerKey, summary, {
    minBroadcastInterval: options.minBroadcastInterval || 2000, // 2 seconds for upload queue
    ignoreFields: ['timestamp', ...(options.ignoreFields || [])]
  })) {
    console.log('[DataChange] Broadcasting upload queue update:', summary);
    broadcastToAll('upload_queue_update', {
      type: 'queue',
      summary,
      timestamp: new Date().toISOString()
    });
  } else {
    console.log('[DataChange] Skipping upload queue update - no meaningful change');
  }
}

export function broadcastDashboardUpdateIfChanged(
  data: any,
  options: { minBroadcastInterval?: number; ignoreFields?: string[] } = {}
) {
  const trackerKey = 'dashboard_data';
  
  if (hasDataChanged(trackerKey, data, {
    minBroadcastInterval: options.minBroadcastInterval || 10000, // 10 seconds for dashboard
    ignoreFields: ['timestamp', 'last_updated', ...(options.ignoreFields || [])]
  })) {
    console.log('[DataChange] Broadcasting dashboard update');
    broadcastToAll('dashboard_update', {
      ...data,
      timestamp: new Date().toISOString()
    });
  } else {
    console.log('[DataChange] Skipping dashboard update - no meaningful change');
  }
}

// Batch change detection for multiple items
export function broadcastBatchUpdateIfChanged(
  items: any[],
  itemType: 'candidate' | 'position',
  actingUserId?: string,
  options: { minBroadcastInterval?: number; ignoreFields?: string[] } = {}
) {
  const trackerKey = `${itemType}_batch_${items.length}`;
  const batchData = {
    items: items.map(item => ({ id: item.id, status: item.status, updated_at: item.updated_at })),
    count: items.length,
    timestamp: new Date().toISOString()
  };
  
  if (hasDataChanged(trackerKey, batchData, {
    minBroadcastInterval: options.minBroadcastInterval || 5000,
    ignoreFields: ['timestamp', ...(options.ignoreFields || [])]
  })) {
    console.log(`[DataChange] Broadcasting ${itemType} batch update:`, items.length, 'items');
    broadcastToAll(`${itemType}_update` as UnifiedEventType, {
      items,
      actingUserId,
      action: 'batch_updated',
      timestamp: new Date().toISOString()
    });
  } else {
    console.log(`[DataChange] Skipping ${itemType} batch update - no meaningful change`);
  }
}

// Force broadcast (bypass change detection)
export function forceBroadcast(eventType: UnifiedEventType, data: any, targetUserId?: string) {
  console.log('[DataChange] Force broadcasting:', eventType);
  if (targetUserId) {
    broadcastToUser(targetUserId, eventType, data);
  } else {
    broadcastToAll(eventType, data);
  }
}

// Get change tracking statistics
export function getChangeTrackingStats() {
  const stats = {
    totalTrackers: changeTrackers.size,
    trackers: Array.from(changeTrackers.entries()).map(([key, tracker]) => ({
      key,
      lastBroadcast: tracker.lastBroadcast,
      lastBroadcastAgo: Date.now() - tracker.lastBroadcast,
      hasSnapshot: !!tracker.lastSnapshot
    }))
  };
  
  return stats;
}

// Clear old trackers (cleanup)
export function cleanupOldTrackers(maxAge: number = 30 * 60 * 1000) { // 30 minutes
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, tracker] of changeTrackers.entries()) {
    if (now - tracker.lastBroadcast > maxAge) {
      changeTrackers.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[DataChange] Cleaned up ${cleaned} old change trackers`);
  }
  
  return cleaned;
}

// Auto-cleanup every 10 minutes
setInterval(() => {
  cleanupOldTrackers();
}, 10 * 60 * 1000);
