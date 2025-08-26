export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server';
import { broadcastDashboardUpdate, clients } from './broadcastDashboardUpdate';

export async function GET(req: NextRequest) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  let keepAlive: NodeJS.Timeout | null = null;

  try {
    // Write initial headers for SSE
    writer.write(new TextEncoder().encode('retry: 10000\n\n'));

    // Add this client to the list
    clients.push(writer);

    // Keep-alive ping every 30s
    keepAlive = setInterval(() => {
      try {
        writer.write(new TextEncoder().encode(':\n\n'));
      } catch (error) {
        console.error('[Dashboard Stream] Keepalive failed:', error);
        // Clear interval if write fails
        if (keepAlive) {
          clearInterval(keepAlive);
          keepAlive = null;
        }
        // Remove client from list
        const idx = clients.indexOf(writer);
        if (idx !== -1) clients.splice(idx, 1);
      }
    }, 30000);

    // Cleanup on connection close
    req.signal.addEventListener('abort', () => {
      if (keepAlive) {
        clearInterval(keepAlive);
        keepAlive = null;
      }
      const idx = clients.indexOf(writer);
      if (idx !== -1) clients.splice(idx, 1);
      writer.close();
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    // Cleanup on error
    if (keepAlive) {
      clearInterval(keepAlive);
      keepAlive = null;
    }
    const idx = clients.indexOf(writer);
    if (idx !== -1) clients.splice(idx, 1);
    writer.close();
    throw error;
  }
} 