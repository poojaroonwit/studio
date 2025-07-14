import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { getRedisClient } from '@/lib/redis';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial data
      try {
        const client = await getPool().connect();
        const res = await client.query('SELECT * FROM upload_queue ORDER BY upload_date DESC');
        client.release();
        
        const data = JSON.stringify({ type: 'queue', data: res.rows });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      } catch (error) {
        console.error('[SSE] Failed to send initial data:', error);
        const errorData = JSON.stringify({ type: 'error', message: 'Failed to load queue data' });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
      }
      
      // Set up Redis subscription for real-time updates
      let redisClient = null;
      let redisSubscription = null;
      
      try {
        redisClient = await getRedisClient();
        if (redisClient) {
          redisSubscription = redisClient.duplicate();
          await redisSubscription.connect();
          
          await redisSubscription.subscribe('candidate_upload_queue', async (message) => {
            try {
              const msg = JSON.parse(message);
              if (msg.type === 'queue_updated') {
                // Fetch updated data and send to client
                const client = await getPool().connect();
                const res = await client.query('SELECT * FROM upload_queue ORDER BY upload_date DESC');
                client.release();
                
                const data = JSON.stringify({ type: 'queue', data: res.rows });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            } catch (error) {
              console.error('[SSE] Error processing Redis message:', error);
            }
          });
        }
      } catch (error) {
        console.error('[SSE] Failed to subscribe to Redis:', error);
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
        clearInterval(keepaliveInterval);
        if (redisSubscription) {
          redisSubscription.unsubscribe();
          redisSubscription.disconnect();
        }
        controller.close();
      });
    }
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