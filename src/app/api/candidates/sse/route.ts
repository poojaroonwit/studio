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
        const data = JSON.stringify({ type: 'connected', message: 'SSE connection established' });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      } catch (error) {
        console.error('[SSE] Failed to send initial confirmation:', error);
      }

      // Send keepalive every 15 seconds for more responsive connection (reduced from 30 seconds)
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch (error) {
          console.error('[SSE] Keepalive failed:', error);
          clearInterval(keepaliveInterval);
        }
      }, 15000); // Reduced from 30000ms to 15000ms for better responsiveness

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
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
    },
  });
} 