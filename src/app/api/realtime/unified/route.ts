
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addConnection, removeConnection } from '@/lib/realtime';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      addConnection(userId, controller);
      
      // Send initial connection confirmation
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`));
      
      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: keepalive\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`));
        } catch (error) {
          clearInterval(keepaliveInterval);
          removeConnection(userId);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
        removeConnection(userId);
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
