export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server';
import { broadcastDashboardUpdate, clients } from './broadcastDashboardUpdate';

export async function GET(req: NextRequest) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Write initial headers for SSE
  writer.write(new TextEncoder().encode('retry: 10000\n\n'));

  // Add this client to the list
  clients.push(writer);

  // Keep-alive ping every 30s
  const keepAlive = setInterval(() => {
    writer.write(new TextEncoder().encode(':\n\n'));
  }, 30000);

  // Cleanup on connection close
  req.signal.addEventListener('abort', () => {
    clearInterval(keepAlive);
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
} 