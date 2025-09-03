import { NextRequest } from 'next-server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Create a simple SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        console.log(`[Simple SSE Test] Connection established for user ${userId}`);
        
        // Send initial connection message
        const initialData = JSON.stringify({
          type: 'connected',
          message: 'Simple SSE test connection established',
          timestamp: new Date().toISOString(),
          userId
        });
        controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

        // Send a test message every 2 seconds
        const interval = setInterval(() => {
          try {
            const testData = JSON.stringify({
              type: 'test_message',
              message: 'This is a test SSE message',
              timestamp: new Date().toISOString(),
              userId
            });
            controller.enqueue(encoder.encode(`data: ${testData}\n\n`));
          } catch (error) {
            console.error('[Simple SSE Test] Error sending test message:', error);
            clearInterval(interval);
          }
        }, 2000);

        // Cleanup on connection close
        request.signal.addEventListener('abort', () => {
          console.log(`[Simple SSE Test] Connection closed for user ${userId}`);
          clearInterval(interval);
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('[Simple SSE Test] Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
