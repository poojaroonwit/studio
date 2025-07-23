import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { getRedisClient } from '@/lib/redis';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
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

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      
      // Helper function to safely enqueue data
      const safeEnqueue = (data: Uint8Array) => {
        if (!isClosed) {
          try {
            controller.enqueue(data);
          } catch (error) {
            if (error instanceof Error && error.message.includes('ERR_INVALID_STATE')) {
              // Controller is closed, mark as closed and stop trying
              isClosed = true;
              console.log('[SSE] Connection closed by client');
            } else {
              console.error('[SSE] Error enqueuing data:', error);
            }
            return false;
          }
        }
        return !isClosed;
      };

      // Send initial data
      try {
        const client = await getPool().connect();
        const { whereSQL, values, paramIdx } = buildWhere();
        values.push(limit.toString());
        values.push(offset.toString());
        const res = await client.query(
          `SELECT * FROM upload_queue ${whereSQL} ORDER BY upload_date DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
          values
        );
        // Fetch total count for pagination
        const countRes = await client.query(
          `SELECT COUNT(*) FROM upload_queue ${whereSQL}`,
          values.slice(0, values.length - 2)
        );
        const total = parseInt(countRes.rows[0].count, 10);
        client.release();
        const data = JSON.stringify({ type: 'queue', data: res.rows, total });
        safeEnqueue(encoder.encode(`data: ${data}\n\n`));
      } catch (error) {
        console.error('[SSE] Failed to send initial data:', error);
        const errorData = JSON.stringify({ type: 'error', message: 'Failed to load queue data' });
        safeEnqueue(encoder.encode(`data: ${errorData}\n\n`));
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
            if (isClosed) return; // Skip if connection is closed
            
            try {
              const msg = JSON.parse(message);
              if (msg.type === 'queue_updated') {
                // Fetch updated data and send to client
                const client = await getPool().connect();
                const { whereSQL, values, paramIdx } = buildWhere();
                values.push(limit.toString());
                values.push(offset.toString());
                const res = await client.query(
                  `SELECT * FROM upload_queue ${whereSQL} ORDER BY upload_date DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
                  values
                );
                // Fetch total count for pagination
                const countRes = await client.query(
                  `SELECT COUNT(*) FROM upload_queue ${whereSQL}`,
                  values.slice(0, values.length - 2)
                );
                const total = parseInt(countRes.rows[0].count, 10);
                client.release();
                const data = JSON.stringify({ type: 'queue', data: res.rows, total });
                safeEnqueue(encoder.encode(`data: ${data}\n\n`));
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
        if (isClosed) {
          clearInterval(keepaliveInterval);
          return;
        }
        
        if (!safeEnqueue(encoder.encode(`: keepalive\n\n`))) {
          clearInterval(keepaliveInterval);
        }
      }, 30000);
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(keepaliveInterval);
        if (redisSubscription) {
          redisSubscription.unsubscribe();
          redisSubscription.disconnect();
        }
        try {
          controller.close();
        } catch (error) {
          // Controller might already be closed, ignore the error
        }
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