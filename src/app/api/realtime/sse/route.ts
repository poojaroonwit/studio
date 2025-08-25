export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TextEncoder } from 'util';

// Import shared controllers from the broadcaster
import { sseControllers, userControllers } from '@/lib/unified-realtime-broadcaster';

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

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let thisController: ReadableStreamDefaultController<any>;

  // Get user session for user-specific notifications
  let userId: string;
  
  try {
    const session = await getServerSession(authOptions);
    userId = session?.user?.id;

    if (!userId) {
      console.error('[SSE] Unauthorized access attempt from:', request.headers.get('user-agent'));
      return new Response('Unauthorized', { status: 401 });
    }

    console.log(`[SSE] User ${userId} connecting to SSE endpoint`);
  } catch (error) {
    console.error('[SSE] Error during session validation:', error);
    return new Response('Internal Server Error', { status: 500 });
  }

  const stream = new ReadableStream({
    start(controller) {
      thisController = controller;
      
      // Add to global controllers
      const controllerId = `${userId}-${Date.now()}-${Math.random()}`;
      sseControllers.set(controllerId, controller);
      
      // Add to user-specific controllers
      if (!userControllers.has(userId)) {
        userControllers.set(userId, new Set());
      }
      userControllers.get(userId)!.add(controller);

      // Send initial connection event
      try {
        controller.enqueue(encoder.encode(`retry: 5000\n\n`));
        const data = JSON.stringify({ 
          type: 'connected', 
          message: 'Unified SSE connection established',
          timestamp: new Date().toISOString(),
          userId
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      } catch (error) {
        console.error('[SSE] Failed to send initial confirmation:', error);
      }

      // Send keepalive every 10 seconds
      const keepaliveInterval = setInterval(() => {
        try {
          const keepaliveData = JSON.stringify({ 
            type: 'keepalive', 
            timestamp: new Date().toISOString() 
          });
          controller.enqueue(encoder.encode(`event: keepalive\ndata: ${keepaliveData}\n\n`));
        } catch (error) {
          console.error('[SSE] Keepalive failed:', error);
          clearInterval(keepaliveInterval);
        }
      }, 10000);

      // Send heartbeat every 5 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (error) {
          console.error('[SSE] Heartbeat failed:', error);
          clearInterval(heartbeatInterval);
        }
      }, 5000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
        clearInterval(heartbeatInterval);
        sseControllers.delete(controllerId);
        userControllers.get(userId)?.delete(controller);
        if (userControllers.get(userId)?.size === 0) {
          userControllers.delete(userId);
        }
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      // Cleanup handled in abort listener
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
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

// Broadcasting functions moved to unified-realtime-broadcaster.ts
// Only HTTP handlers (GET, OPTIONS) should be exported from API routes
