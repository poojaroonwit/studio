import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = "force-dynamic";

// --- SSE Controller Management ---
const uploadQueueControllers = new Set<ReadableStreamDefaultController<any>>();

export function broadcastUploadQueueUpdate() {
  for (const controller of uploadQueueControllers) {
    sendUploadQueueUpdate(controller);
  }
}

async function sendUploadQueueUpdate(controller: ReadableStreamDefaultController<any>, queryParams?: { fileName?: string, status?: string, dateStart?: string, dateEnd?: string, limit?: number, offset?: number }) {
  const encoder = new TextEncoder();
  try {
    const client = await getPool().connect();
    // Use queryParams if provided, otherwise send all
    const fileName = queryParams?.fileName;
    const status = queryParams?.status;
    const dateStart = queryParams?.dateStart;
    const dateEnd = queryParams?.dateEnd;
    const limit = queryParams?.limit || 20;
    const offset = queryParams?.offset || 0;
    // Build WHERE clause
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
    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    values.push(limit);
    values.push(offset);
    const res = await client.query(
      `SELECT * FROM upload_queue ${whereSQL} ORDER BY upload_date DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      values
    );
    const countRes = await client.query(
      `SELECT COUNT(*) FROM upload_queue ${whereSQL}`,
      values.slice(0, values.length - 2)
    );
    const total = parseInt(countRes.rows[0].count, 10);
    client.release();
    const data = JSON.stringify({ type: 'queue', data: res.rows, total });
    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
  } catch (error) {
    const encoder = new TextEncoder();
    const errorData = JSON.stringify({ type: 'error', message: 'Failed to load queue data' });
    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const url = new URL(request.url);
  const fileName = url.searchParams.get('file_name');
  const status = url.searchParams.get('status');
  const dateStart = url.searchParams.get('date_start');
  const dateEnd = url.searchParams.get('date_end');
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      uploadQueueControllers.add(controller);
      // Send initial data
      await sendUploadQueueUpdate(controller, { fileName, status, dateStart, dateEnd, limit, offset });
      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(keepaliveInterval);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          isClosed = true;
          clearInterval(keepaliveInterval);
        }
      }, 30000);
      // Cleanup on close
      request.signal.addEventListener('abort', async () => {
        isClosed = true;
        clearInterval(keepaliveInterval);
        uploadQueueControllers.delete(controller);
        try { controller.close(); } catch {}
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
      'X-Accel-Buffering': 'no',
    },
  });
} 