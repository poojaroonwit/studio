// Aggressive SSE Optimizer - Dramatically reduce event frequency
// This implements strict rate limiting and event batching

import { broadcastToAll, broadcastToUser } from './unified-connection-manager';
import type { UnifiedEventType } from './unified-connection-manager';

// Global event throttling
interface EventThrottle {
  lastSent: number;
  count: number;
  windowStart: number;
}

const eventThrottles = new Map<string, EventThrottle>();
const GLOBAL_EVENT_LIMIT = 5; // Max 5 events per second globally (reduced from 10)
const GLOBAL_WINDOW_MS = 1000; // 1 second window

// Event batching
interface BatchedEvent {
  type: UnifiedEventType;
  data: any;
  targetUserId?: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

const eventBatch = new Map<string, BatchedEvent[]>();
const BATCH_FLUSH_INTERVAL = 5000; // Flush every 5 seconds (increased from 2s)
const MAX_BATCH_SIZE = 50; // Max 50 events per batch

// Priority-based event handling
const PRIORITY_DELAYS = {
  high: 0,      // Immediate
  medium: 1000, // 1 second delay
  low: 3000     // 3 second delay
};

// Check if we can send an event (global throttling)
function canSendEvent(eventType: string): boolean {
  const now = Date.now();
  const throttle = eventThrottles.get(eventType) || {
    lastSent: 0,
    count: 0,
    windowStart: now
  };

  // Reset window if needed
  if (now - throttle.windowStart >= GLOBAL_WINDOW_MS) {
    throttle.count = 0;
    throttle.windowStart = now;
  }

  // Check global limit
  if (throttle.count >= GLOBAL_EVENT_LIMIT) {
    return false;
  }

  // Update throttle
  throttle.count++;
  throttle.lastSent = now;
  eventThrottles.set(eventType, throttle);
  return true;
}

// Add event to batch
function addToBatch(event: BatchedEvent): void {
  const batchKey = `${event.type}_${event.targetUserId || 'global'}`;
  const batch = eventBatch.get(batchKey) || [];
  
  // Remove duplicate events (same type and data)
  const existingIndex = batch.findIndex(e => 
    e.type === event.type && 
    JSON.stringify(e.data) === JSON.stringify(event.data)
  );
  
  if (existingIndex >= 0) {
    // Update existing event with higher priority
    const existingPriority = batch[existingIndex].priority;
    const newPriority = event.priority;
    
    // Determine higher priority (high > medium > low)
    let higherPriority: 'high' | 'medium' | 'low';
    if (newPriority === 'high' || existingPriority === 'high') {
      higherPriority = 'high';
    } else if (newPriority === 'medium' || existingPriority === 'medium') {
      higherPriority = 'medium';
    } else {
      higherPriority = 'low';
    }
    
    batch[existingIndex] = {
      ...event,
      priority: higherPriority
    };
  } else {
    batch.push(event);
  }
  
  // Limit batch size
  if (batch.length > MAX_BATCH_SIZE) {
    batch.splice(0, batch.length - MAX_BATCH_SIZE);
  }
  
  eventBatch.set(batchKey, batch);
}

// Flush event batches
function flushEventBatches(): void {
  const now = Date.now();
  
  for (const [batchKey, events] of eventBatch.entries()) {
    if (events.length === 0) continue;
    
    // Sort by priority and timestamp
    events.sort((a, b) => {
      if (a.priority !== b.priority) {
        return PRIORITY_DELAYS[a.priority] - PRIORITY_DELAYS[b.priority];
      }
      return a.timestamp - b.timestamp;
    });
    
    // Process events based on priority and timing
    const eventsToSend = events.filter(event => {
      const delay = PRIORITY_DELAYS[event.priority];
      return now - event.timestamp >= delay;
    });
    
    if (eventsToSend.length > 0) {
      // Send events
      for (const event of eventsToSend) {
        if (canSendEvent(event.type)) {
          if (event.targetUserId) {
            broadcastToUser(event.targetUserId, event.type, event.data);
          } else {
            broadcastToAll(event.type, event.data);
          }
        }
      }
      
      // Remove sent events from batch
      const remainingEvents = events.filter(event => !eventsToSend.includes(event));
      eventBatch.set(batchKey, remainingEvents);
    }
  }
}

// Start batch flushing
setInterval(flushEventBatches, BATCH_FLUSH_INTERVAL);

// Aggressive broadcast functions
export function aggressiveBroadcast(
  eventType: UnifiedEventType, 
  data: any, 
  options: {
    targetUserId?: string;
    priority?: 'high' | 'medium' | 'low';
    throttle?: boolean;
  } = {}
): void {
  const {
    targetUserId,
    priority = 'medium',
    throttle = true
  } = options;

  // Check throttling
  if (throttle && !canSendEvent(eventType)) {
    console.log(`[AggressiveSSE] Event ${eventType} throttled - rate limit exceeded`);
    return;
  }

  // Add to batch for processing
  addToBatch({
    type: eventType,
    data,
    targetUserId,
    priority,
    timestamp: Date.now()
  });
}

// High-priority events (immediate)
export function broadcastHighPriority(
  eventType: UnifiedEventType, 
  data: any, 
  targetUserId?: string
): void {
  aggressiveBroadcast(eventType, data, { 
    targetUserId, 
    priority: 'high',
    throttle: false // Bypass throttling for high-priority events
  });
}

// Medium-priority events (1 second delay)
export function broadcastMediumPriority(
  eventType: UnifiedEventType, 
  data: any, 
  targetUserId?: string
): void {
  aggressiveBroadcast(eventType, data, { 
    targetUserId, 
    priority: 'medium',
    throttle: true
  });
}

// Low-priority events (3 second delay, heavily throttled)
export function broadcastLowPriority(
  eventType: UnifiedEventType, 
  data: any, 
  targetUserId?: string
): void {
  aggressiveBroadcast(eventType, data, { 
    targetUserId, 
    priority: 'low',
    throttle: true
  });
}

// Force immediate broadcast (bypasses all optimizations)
export function forceBroadcast(
  eventType: UnifiedEventType, 
  data: any, 
  targetUserId?: string
): void {
  if (targetUserId) {
    broadcastToUser(targetUserId, eventType, data);
  } else {
    broadcastToAll(eventType, data);
  }
}

// Get optimization statistics
export function getOptimizationStats() {
  const now = Date.now();
  const stats = {
    globalThrottles: Array.from(eventThrottles.entries()).map(([type, throttle]) => ({
      type,
      count: throttle.count,
      lastSent: throttle.lastSent,
      lastSentAgo: now - throttle.lastSent,
      windowAge: now - throttle.windowStart
    })),
    eventBatches: Array.from(eventBatch.entries()).map(([key, events]) => ({
      key,
      count: events.length,
      priorities: events.reduce((acc, event) => {
        acc[event.priority] = (acc[event.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    })),
    totalBatchedEvents: Array.from(eventBatch.values()).reduce((sum, batch) => sum + batch.length, 0)
  };
  
  return stats;
}

// Emergency reset (use when events are still too frequent)
export function emergencyReset(): void {
  console.warn('[AggressiveSSE] EMERGENCY: Resetting all throttles and batches');
  
  // Clear all throttles
  eventThrottles.clear();
  
  // Clear all batches
  eventBatch.clear();
  
  console.log('[AggressiveSSE] Emergency reset completed');
}

// Auto-reset throttles every minute
setInterval(() => {
  const now = Date.now();
  for (const [type, throttle] of eventThrottles.entries()) {
    if (now - throttle.windowStart >= GLOBAL_WINDOW_MS) {
      throttle.count = 0;
      throttle.windowStart = now;
    }
  }
}, 60000);
