import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Immediate comment frame to flush through proxies
        try {
          controller.enqueue(encoder.encode(`: pong ${Date.now()}\n\n`));
        } catch {}

        // Periodic lightweight keepalive
        const interval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
          } catch {
            clearInterval(interval);
          }
        }, 15000);

        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'identity',
        'Content-Length': '0'
      },
    });
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 });
  }
}


