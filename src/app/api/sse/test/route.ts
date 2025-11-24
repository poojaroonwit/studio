import { NextRequest } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('[SSE Test] Connection attempt received');
  
  // Create a simple SSE stream that just sends a few messages and closes
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      try {
        // Send initial message
        controller.enqueue(encoder.encode(`data: {"type": "test", "message": "SSE test started"}\n\n`));
        
        // Send a few more messages
        let count = 0;
        const interval = setInterval(() => {
          count++;
          try {
            controller.enqueue(encoder.encode(`data: {"type": "test", "count": ${count}, "message": "Test message ${count}"}\n\n`));
            
            // Close after 5 messages
            if (count >= 5) {
              clearInterval(interval);
              controller.enqueue(encoder.encode(`data: {"type": "test", "message": "Test completed"}\n\n`));
              controller.close();
            }
          } catch (error) {
            console.error('[SSE Test] Error sending message:', error);
            clearInterval(interval);
            controller.close();
          }
        }, 1000);
        
        // Cleanup on abort
        request.signal.addEventListener('abort', () => {
          console.log('[SSE Test] Connection aborted');
          clearInterval(interval);
        });
        
      } catch (error) {
        console.error('[SSE Test] Error in stream start:', error);
        controller.close();
      }
    }
  });

  // SECURITY: Use proper CORS validation instead of wildcard
  const { getAllowedOrigin } = await import('@/lib/cors');
  const allowedOrigin = getAllowedOrigin(request);
  
  const headers: Record<string, string> = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'X-Accel-Buffering': 'no',
  };
  
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return new Response(stream, { headers });
}
