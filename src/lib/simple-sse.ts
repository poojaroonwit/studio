// Simple SSE Implementation - Easy to manage and understand
// Follows best practices without over-engineering

import { auth } from '@/auth';
import type { EventPayload } from './realtime-event-types';

// Simple connection store
const connections = new Map<string, ReadableStreamDefaultController>();

// Event types
export type SSEEventType = 
  | 'Applicant_update'
  | 'position_update'
  | 'notification'
  | 'upload_queue_update'
  | 'dashboard_update'
  | 'keepalive';

// Simple event interface
export interface SSEEvent {
  type: SSEEventType;
  data: EventPayload;
  timestamp: string;
  targetUserId?: string;
}

// Simple broadcast function
export function broadcastEvent(event: SSEEvent) {
  const encoder = new TextEncoder();
  const message = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  const encodedMessage = encoder.encode(message);

  if (event.targetUserId) {
    // Send to specific user
    const controller = connections.get(event.targetUserId);
    if (controller) {
      try {
        controller.enqueue(encodedMessage);
      } catch (error) {
        console.error(`Failed to send ${event.type} to user ${event.targetUserId}:`, error);
        connections.delete(event.targetUserId!);
      }
    }
  } else {
    // Broadcast to all users
    for (const [userId, controller] of connections.entries()) {
      try {
        controller.enqueue(encodedMessage);
      } catch (error) {
        console.error(`Failed to broadcast ${event.type} to user ${userId}:`, error);
        connections.delete(userId);
      }
    }
  }
}

// Convenience functions
export function broadcastToUser(userId: string, eventType: SSEEventType, data: EventPayload) {
  broadcastEvent({
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
    targetUserId: userId
  });
}

export function broadcastToAll(eventType: SSEEventType, data: EventPayload) {
  broadcastEvent({
    type: eventType,
    data,
    timestamp: new Date().toISOString()
  });
}

// Connection management
export function addConnection(userId: string, controller: ReadableStreamDefaultController) {
  connections.set(userId, controller);
}

export function removeConnection(userId: string) {
  connections.delete(userId);
}

// Get connection stats
export function getConnectionStats() {
  return {
    totalConnections: connections.size,
    connectedUsers: Array.from(connections.keys())
  };
}

// SSE Route Handler
export async function handleSSEConnection(request: Request) {
  
  try {
    // Authenticate user
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }


    const encoder = new TextEncoder();
    let keepaliveInterval: NodeJS.Timeout;
    let connectionStartTime = Date.now();

    const stream = new ReadableStream({
      start(controller) {
        
        // Add connection
        addConnection(userId, controller);

        // Send initial connection confirmation
        const initialData = JSON.stringify({
          type: 'connected',
          message: 'SSE connection established',
          timestamp: new Date().toISOString(),
          userId,
          connectionId: `${userId}-${Date.now()}`
        });
        controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

        // Send keepalive every 30 seconds - reduced frequency for lower CPU/RAM usage
        // Actual data updates are pushed immediately via broadcastEvent
        keepaliveInterval = setInterval(() => {
          try {
            const keepaliveData = JSON.stringify({
              type: 'keepalive',
              timestamp: new Date().toISOString(),
              uptime: Date.now() - connectionStartTime
            });
            controller.enqueue(encoder.encode(`event: keepalive\ndata: ${keepaliveData}\n\n`));
          } catch (error) {
            clearInterval(keepaliveInterval);
            removeConnection(userId);
          }
        }, 30000); // Optimized: 30s keepalive (was 500ms) - actual updates push immediately

        // Cleanup on connection close
        request.signal.addEventListener('abort', () => {
          clearInterval(keepaliveInterval);
          removeConnection(userId);
          try { controller.close(); } catch (e) {
          }
        });
      },
      cancel() {
        clearInterval(keepaliveInterval);
        removeConnection(userId);
      }
    });


    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'X-Accel-Buffering': 'no',
        'Keep-Alive': 'timeout=180, max=1000',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        // CRITICAL: Disable chunked encoding for SSE streams
        'Transfer-Encoding': 'identity',
        'Content-Length': '0' // Set to 0 for streaming responses
      },
    });
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 });
  }
}
