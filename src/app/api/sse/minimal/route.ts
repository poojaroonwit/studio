import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('[MINIMAL SSE] Connection request received');
    
    // Create a simple SSE stream without any database calls
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        console.log('[MINIMAL SSE] Starting stream');
        
        // Send initial connection message
        const initialData = JSON.stringify({
          type: 'connected',
          message: 'Minimal SSE connection established',
          timestamp: new Date().toISOString()
        });
        
        try {
          controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));
        } catch (error) {
          console.error('[MINIMAL SSE] Error sending initial data:', error);
        }
        
        // Send keepalive every 5 seconds
        const keepaliveInterval = setInterval(() => {
          try {
            const keepaliveData = JSON.stringify({
              type: 'keepalive',
              timestamp: new Date().toISOString()
            });
            controller.enqueue(encoder.encode(`data: ${keepaliveData}\n\n`));
          } catch (error) {
            console.error('[MINIMAL SSE] Keepalive error:', error);
            clearInterval(keepaliveInterval);
          }
        }, 5000);
        
        // Cleanup on abort
        request.signal.addEventListener('abort', () => {
          console.log('[MINIMAL SSE] Connection aborted');
          clearInterval(keepaliveInterval);
        });
      },
      cancel() {
        console.log('[MINIMAL SSE] Stream cancelled');
      }
    });

    console.log('[MINIMAL SSE] Returning response');
    
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
        // Note: Keep proxy-friendly headers only; avoid Transfer-Encoding and Content-Length
      },
    });
  } catch (error) {
    console.error('[MINIMAL SSE] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Minimal SSE connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
