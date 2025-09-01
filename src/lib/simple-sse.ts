// Simple SSE Implementation - Easy to manage and understand
// Follows best practices without over-engineering

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Simple connection store
const connections = new Map<string, ReadableStreamDefaultController>();

// Event types
export type SSEEventType = 
  | 'candidate_update'
  | 'position_update'
  | 'notification'
  | 'upload_queue_update'
  | 'dashboard_update'
  | 'keepalive';

// Simple event interface
export interface SSEEvent {
  type: SSEEventType;
  data: any;
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
export function broadcastToUser(userId: string, eventType: SSEEventType, data: any) {
  broadcastEvent({
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
    targetUserId: userId
  });
}

export function broadcastToAll(eventType: SSEEventType, data: any) {
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
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const encoder = new TextEncoder();
    let keepaliveInterval: NodeJS.Timeout;

    const stream = new ReadableStream({
      start(controller) {
        // Add connection
        addConnection(userId, controller);

        // Send initial connection confirmation
        const initialData = JSON.stringify({
          type: 'connected',
          message: 'SSE connection established',
          timestamp: new Date().toISOString(),
          userId
        });
        controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

        // Send keepalive every 30 seconds
        keepaliveInterval = setInterval(() => {
          try {
            const keepaliveData = JSON.stringify({
              type: 'keepalive',
              timestamp: new Date().toISOString()
            });
            controller.enqueue(encoder.encode(`event: keepalive\ndata: ${keepaliveData}\n\n`));
          } catch (error) {
            console.error('Keepalive failed:', error);
            clearInterval(keepaliveInterval);
          }
        }, 30000);

        // Cleanup on connection close
        request.signal.addEventListener('abort', () => {
          clearInterval(keepaliveInterval);
          removeConnection(userId);
          try { controller.close(); } catch {}
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
        'Keep-Alive': 'timeout=120, max=1000',
      },
    });
  } catch (error) {
    console.error('SSE connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
