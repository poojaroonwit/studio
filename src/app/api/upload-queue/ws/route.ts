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
    console.log('[WEBSOCKET] WebSocket connection attempt');
    
    // Check if WebSocket is supported
    const { webSocket } = request as any;
    if (!webSocket) {
      console.log('[WEBSOCKET] WebSocket not supported, returning 426');
      return new Response('Expected websocket', { status: 426 });
    }

    console.log('[WEBSOCKET] Accepting WebSocket connection');
    webSocket.accept();
    
    // Add to clients set
    clients.add(webSocket);
    console.log(`[WEBSOCKET] Client connected. Total clients: ${clients.size}`);

    // Handle client disconnect
    webSocket.addEventListener('close', () => {
      console.log('[WEBSOCKET] Client disconnected');
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
      console.log('[WEBSOCKET] Initial queue data sent');
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
      console.log(`[WEBSOCKET] Sent ${res.rows.length} queue items`);
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
    console.log('[WEBSOCKET] Redis subscription already active');
    return;
  }

  console.log('[WEBSOCKET] Setting up Redis subscription');
  subscribed = true;

  subscribeToChannel('candidate_upload_queue', async (message) => {
    try {
      console.log('[WEBSOCKET] Received Redis message:', message);
      
      // Only broadcast if the message is a queue_updated event
      const msg = JSON.parse(message);
      if (msg.type === 'queue_updated') {
        console.log('[WEBSOCKET] Broadcasting queue update to all clients');
        await broadcastQueueUpdate();
      }
    } catch (e) {
      console.error('[WEBSOCKET] Error processing Redis message:', e);
      // fallback: always broadcast
      console.log('[WEBSOCKET] Broadcasting queue update (fallback)');
      await broadcastQueueUpdate();
    }
  }).catch(error => {
    console.error('[WEBSOCKET] Failed to subscribe to Redis channel:', error);
    subscribed = false; // Allow retry
  });
} 