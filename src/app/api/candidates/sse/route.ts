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
      console.log('[SSE] Client connected to /api/candidates/sse');
      addSseController(controller);

      // Send initial event
      try {
        const data = JSON.stringify({ type: 'connected', message: 'SSE connection established' });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        console.log('[SSE] Sent initial connection confirmation');
      } catch (error) {
        console.error('[SSE] Failed to send initial confirmation:', error);
      }

      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch (error) {
          console.error('[SSE] Keepalive failed:', error);
          clearInterval(keepaliveInterval);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        console.log('[SSE] Client disconnected from /api/candidates/sse');
        clearInterval(keepaliveInterval);
        removeSseController(thisController);
        controller.close();
      });
    },
    cancel() {
      console.log('[SSE] Stream cancelled');
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