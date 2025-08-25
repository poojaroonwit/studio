
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const connections = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      connections.set(userId, controller);
      
      // Send initial connection confirmation
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`));
      
      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: keepalive\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`));
        } catch (error) {
          clearInterval(keepaliveInterval);
          connections.delete(userId);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
        connections.delete(userId);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Broadcast function for other parts of the application
export function broadcastToUser(userId: string, eventType: string, data: any) {
  const controller = connections.get(userId);
  if (controller) {
    try {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch (error) {
      connections.delete(userId);
    }
  }
}

// Broadcast to all connected users
export function broadcastToAll(eventType: string, data: any) {
  const encoder = new TextEncoder();
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  
  for (const [userId, controller] of connections.entries()) {
    try {
      controller.enqueue(encoder.encode(message));
    } catch (error) {
      connections.delete(userId);
    }
  }
}
