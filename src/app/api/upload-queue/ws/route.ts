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
      await sendQueue(webSocket);
    } catch (error) {
      console.error('[WEBSOCKET] Failed to send initial queue data:', error);
      webSocket.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to load queue data' 
      }));
    }

    // Set up Redis subscription for real-time updates
    setupRedisSubscription();

    return new Response(null, { status: 101 });
  } catch (error) {
    console.error('[WEBSOCKET] WebSocket setup error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function sendQueue(socket: WebSocket) {
  try {
    const client = await getPool().connect();
    try {
      const res = await client.query('SELECT * FROM upload_queue ORDER BY upload_date DESC');
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

// Subscribe to Redis channel for queue updates and broadcast to all clients
let subscribed = false;

function setupRedisSubscription() {
  if (subscribed) {
    return;
  }

  subscribed = true;

  subscribeToChannel('candidate_upload_queue', async (message) => {
    try {
      // Only broadcast if the message is a queue_updated event
      const msg = JSON.parse(message);
      if (msg.type === 'queue_updated') {
        await broadcastQueueUpdate();
      }
    } catch (e) {
      console.error('[WEBSOCKET] Error processing Redis message:', e);
      // fallback: always broadcast
      await broadcastQueueUpdate();
    }
  }).catch(error => {
    console.error('[WEBSOCKET] Failed to subscribe to Redis channel:', error);
    subscribed = false; // Allow retry
  });
} 