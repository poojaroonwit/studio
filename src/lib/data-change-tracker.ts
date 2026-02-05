// Data Change Detection System for SSE Events
// Only broadcasts when there are actual meaningful changes

import { broadcast as broadcastAll } from './realtime';
type UnifiedEventType = string;
import { broadcastLowPriority, broadcastMediumPriority, broadcastHighPriority } from './aggressive-sse-optimizer';

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
    minBroadcastInterval = 1000, // Default 1 second between broadcasts
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
export function broadcastApplicantUpdateIfChanged(
  Applicant: any, 
  actingUserId?: string,
  options: { minBroadcastInterval?: number; ignoreFields?: string[] } = {}
) {
  const trackerKey = `Applicant_${applicant.id}`;
  
  if (hasDataChanged(trackerKey, Applicant, {
    minBroadcastInterval: options.minBroadcastInterval || 500, // 500ms for Applicants
    ignoreFields: ['updated_at', 'last_activity', ...(options.ignoreFields || [])]
  })) {
    broadcastMediumPriority('Applicant_update', {
      Applicant,
      actingUserId,
      action: 'updated',
      timestamp: new Date().toISOString()
    });
  }
}

export function broadcastPositionUpdateIfChanged(
  position: any, 
  actingUserId?: string,
  options: { minBroadcastInterval?: number; ignoreFields?: string[] } = {}
) {
  const trackerKey = `position_${position.id}`;
  
  if (hasDataChanged(trackerKey, position, {
    minBroadcastInterval: options.minBroadcastInterval || 500, // 500ms for positions
    ignoreFields: ['updated_at', 'last_activity', ...(options.ignoreFields || [])]
  })) {
    broadcastHighPriority('position_update', {
      position,
      actingUserId,
      action: 'updated',
      timestamp: new Date().toISOString()
    });
  }
}

export function broadcastUploadQueueUpdateIfChanged(
  summary: any,
  options: { minBroadcastInterval?: number; ignoreFields?: string[] } = {}
) {
  const trackerKey = 'upload_queue_summary';
  
  if (hasDataChanged(trackerKey, summary, {
    minBroadcastInterval: options.minBroadcastInterval || 100, // Reduced to 100ms for faster updates
    ignoreFields: ['timestamp', ...(options.ignoreFields || [])]
  })) {
    // Use forceBroadcast to bypass all throttling for upload queue updates
    forceBroadcast('upload_queue_update', {
      type: 'queue',
      summary,
      timestamp: new Date().toISOString()
    });
  }
}

export function broadcastDashboardUpdateIfChanged(
  data: any,
  options: { minBroadcastInterval?: number; ignoreFields?: string[] } = {}
) {
  const trackerKey = 'dashboard_data';
  
  if (hasDataChanged(trackerKey, data, {
    minBroadcastInterval: options.minBroadcastInterval || 200, // 200ms for dashboard (reduced for better real-time updates)
    ignoreFields: ['timestamp', 'last_updated', ...(options.ignoreFields || [])]
  })) {
    broadcastMediumPriority('dashboard_update', { // Changed from low to medium priority
      ...data,
      timestamp: new Date().toISOString()
    });
  }
}

// Batch change detection for multiple items
export function broadcastBatchUpdateIfChanged(
  items: any[],
  itemType: 'Applicant' | 'position',
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
    minBroadcastInterval: options.minBroadcastInterval || 500, // 500ms for batch updates
    ignoreFields: ['timestamp', ...(options.ignoreFields || [])]
  })) {
    broadcastAll({ type: `${itemType}_update`, items, actingUserId, action: 'batch_updated', timestamp: new Date().toISOString() }, `${itemType}_update`);
  }
}

// Force broadcast (bypass change detection)
export function forceBroadcast(eventType: UnifiedEventType, data: any, targetUserId?: string) {
  if (!targetUserId) {
    broadcastAll({ type: eventType, ...data }, eventType);
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
  
  
  return cleaned;
}

// Auto-cleanup every 10 minutes
setInterval(() => {
  cleanupOldTrackers();
}, 10 * 60 * 1000);
