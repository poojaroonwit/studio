import { NextRequest } from 'next/server';
import { auth } from '@/auth';
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let interval: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const message = `data: ${JSON.stringify({ type: 'connected', message: 'Warning stream connected' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));

      // Set up periodic updates (every 30 seconds)
      interval = setInterval(() => {
        try {
          const updateMessage = `data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`;
          controller.enqueue(new TextEncoder().encode(updateMessage));
        } catch (error) {
          console.error('[Warnings Stream] Ping failed:', error);
          // Clear interval if write fails
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        }
      }, 5000);

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        controller.close();
      });
    },
    cancel() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }
  });

  // SECURITY: Use proper CORS validation instead of wildcard
  const { getAllowedOrigin } = await import('@/lib/cors');
  const allowedOrigin = getAllowedOrigin(request);
  
  const headers: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Headers': 'Cache-Control',
    // CRITICAL: Disable chunked encoding for SSE streams
    'Transfer-Encoding': 'identity',
    'Content-Length': '0' // Set to 0 for streaming responses
  };
  
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return new Response(stream, { headers });
}



