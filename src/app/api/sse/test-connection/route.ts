import { NextRequest } from 'next/server';
import { auth } from '@/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({
        error: 'Authentication required',
        message: 'No valid user session found',
        timestamp: new Date().toISOString()
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;
    
    // Test SSE connection by sending a simple event stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection test
        const testData = JSON.stringify({
          type: 'connection_test',
          message: 'SSE connection test successful',
          timestamp: new Date().toISOString(),
          userId,
          testId: `test-${Date.now()}`
        });
        
        controller.enqueue(encoder.encode(`data: ${testData}\n\n`));
        
        // Send a few test events
        let eventCount = 0;
        const testInterval = setInterval(() => {
          eventCount++;
          const eventData = JSON.stringify({
            type: 'test_event',
            message: `Test event ${eventCount}`,
            timestamp: new Date().toISOString(),
            eventNumber: eventCount
          });
          
          try {
            controller.enqueue(encoder.encode(`event: test_event\ndata: ${eventData}\n\n`));
          } catch (error) {
            clearInterval(testInterval);
            controller.close();
            return;
          }
          
          // Stop after 5 test events
          if (eventCount >= 5) {
            clearInterval(testInterval);
            
            // Send completion event
            const completionData = JSON.stringify({
              type: 'test_complete',
              message: 'SSE connection test completed successfully',
              timestamp: new Date().toISOString(),
              totalEvents: eventCount
            });
            
            try {
              controller.enqueue(encoder.encode(`data: ${completionData}\n\n`));
              controller.close();
            } catch (error) {
              controller.close();
            }
          }
        }, 1000); // Send event every second
        
        // Cleanup on abort
        request.signal.addEventListener('abort', () => {
          clearInterval(testInterval);
          controller.close();
        });
      }
    });

    // SECURITY: Use proper CORS validation instead of wildcard
    const { getAllowedOrigin } = await import('@/lib/cors');
    const allowedOrigin = getAllowedOrigin(request);
    
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Accel-Buffering': 'no',
      // CRITICAL: Disable chunked encoding for SSE streams
      'Transfer-Encoding': 'identity',
      'Content-Length': '0' // Set to 0 for streaming responses
    };
    
    if (allowedOrigin) {
      headers['Access-Control-Allow-Origin'] = allowedOrigin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
    
    return new Response(stream, { headers });

  } catch (error) {
    console.error('[SSE Test] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: 'Failed to establish test SSE connection',
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
