export const dynamic = "force-dynamic";

import { addSseController, removeSseController } from '@/lib/candidateSse';
import { NextRequest } from 'next/server';

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let thisController: ReadableStreamDefaultController<any>;

  const stream = new ReadableStream({
    start(controller) {
      thisController = controller;
      addSseController(controller);

      // Send initial event
      try {
        // Hint the browser to wait longer before retrying to reduce reconnect thrash
        controller.enqueue(encoder.encode(`retry: 5000\n\n`));
        const data = JSON.stringify({ 
          type: 'connected', 
          message: 'SSE connection established',
          timestamp: new Date().toISOString()
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      } catch (error) {
        console.error('[SSE] Failed to send initial confirmation:', error);
      }

      // Send keepalive every 10 seconds for more responsive connection
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
      }, 10000); // Reduced to 10 seconds for better responsiveness

      // Send heartbeat every 5 seconds to maintain connection
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (error) {
          console.error('[SSE] Heartbeat failed:', error);
          clearInterval(heartbeatInterval);
        }
      }, 5000); // Every 5 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
        clearInterval(heartbeatInterval);
        removeSseController(thisController);
        controller.close();
      });
    },
    cancel() {
      removeSseController(thisController);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Keep-Alive': 'timeout=120, max=1000', // Keep connection alive for 2 minutes
    },
  });
} 