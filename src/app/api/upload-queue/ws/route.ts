/**
 * @openapi
 * /api/upload-queue/ws:
 *   get:
 *     summary: WebSocket for real-time upload queue updates
 *     description: |
 *       Upgrade to a WebSocket connection to receive real-time updates about the upload queue. Not available for Try it out in Swagger UI.
 *       
 *       **Message format:**
 *       ```json
 *       { "type": "queue", "data": [ ... ] }
 *       ```
 *     responses:
 *       426:
 *         description: Expected websocket upgrade
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { clients } from './clients';
import { subscribeToChannel } from '@/lib/redis';
import { broadcastQueueUpdate } from './broadcastQueueUpdate';

export async function GET(request: NextRequest) {
  try {
    // Check if WebSocket is supported
    const { webSocket } = request as any;
    if (!webSocket) {
      return new Response('Expected websocket', { status: 426 });
    }

    webSocket.accept();

    // Parse filters from query string
    const url = new URL(request.url);
    const fileName = url.searchParams.get('file_name');
    const status = url.searchParams.get('status');
    const dateStart = url.searchParams.get('date_start');
    const dateEnd = url.searchParams.get('date_end');
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Helper to build WHERE clause
    function buildWhere() {
      const whereClauses = [];
      const values = [];
      let paramIdx = 1;
      if (fileName) {
        whereClauses.push(`file_name ILIKE $${paramIdx++}`);
        values.push(`%${fileName}%`);
      }
      if (status) {
        whereClauses.push(`status = $${paramIdx++}`);
        values.push(status);
      }
      if (dateStart) {
        whereClauses.push(`upload_date >= $${paramIdx++}`);
        values.push(dateStart);
      }
      if (dateEnd) {
        whereClauses.push(`upload_date <= $${paramIdx++}`);
        values.push(dateEnd);
      }
      return { whereSQL: whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '', values, paramIdx };
    }

    // Add to clients set
    clients.add(webSocket);

    // Handle client disconnect
    webSocket.addEventListener('close', () => {
      clients.delete(webSocket);
    });

    // Handle client errors
    webSocket.addEventListener('error', (error: any) => {
      console.error('[WEBSOCKET] Client error:', error);
      clients.delete(webSocket);
    });

    // Send initial queue data
    try {
      await sendQueue(webSocket, buildWhere, limit, offset);
    } catch (error) {
      console.error('[WEBSOCKET] Failed to send initial queue data:', error);
      webSocket.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to load queue data' 
      }));
    }

    // Set up Redis subscription for real-time updates
    setupRedisSubscription(webSocket, buildWhere, limit, offset);

    return new Response(null, { status: 101 });
  } catch (error) {
    console.error('[WEBSOCKET] WebSocket setup error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function sendQueue(socket: WebSocket, buildWhere: () => { whereSQL: string, values: any[], paramIdx: number }, limit: number, offset: number) {
  try {
    const client = await getPool().connect();
    try {
      const { whereSQL, values, paramIdx } = buildWhere();
      values.push(limit);
      values.push(offset);
      const res = await client.query(
        `SELECT * FROM upload_queue ${whereSQL} ORDER BY upload_date DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        values
      );
      const message = JSON.stringify({ type: 'queue', data: res.rows });
      socket.send(message);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[WEBSOCKET] Database error while sending queue:', error);
    socket.send(JSON.stringify({ 
      type: 'error', 
      message: 'Database connection error' 
    }));
  }
}

// Subscribe to Redis channel for queue updates and broadcast to this client
function setupRedisSubscription(socket: WebSocket, buildWhere: () => { whereSQL: string, values: any[], paramIdx: number }, limit: number, offset: number) {
  subscribeToChannel('candidate_upload_queue', async (message) => {
    try {
      // Only broadcast if the message is a queue_updated event
      const msg = JSON.parse(message);
      if (msg.type === 'queue_updated') {
        await sendQueue(socket, buildWhere, limit, offset);
      }
    } catch (e) {
      console.error('[WEBSOCKET] Error processing Redis message:', e);
      // fallback: always broadcast
      await sendQueue(socket, buildWhere, limit, offset);
    }
  }).catch(error => {
    console.error('[WEBSOCKET] Failed to subscribe to Redis channel:', error);
  });
} 