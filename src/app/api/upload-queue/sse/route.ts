import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { broadcastUploadQueueUpdate, uploadQueueControllers } from './broadcastUploadQueueUpdate';

export const dynamic = "force-dynamic";

async function sendUploadQueueUpdate(controller: ReadableStreamDefaultController<any>, queryParams?: { fileName?: string, status?: string, dateStart?: string, dateEnd?: string, positionId?: string, limit?: number, offset?: number }) {
  const encoder = new TextEncoder();
  try {
    const client = await getPool().connect();
    // Use queryParams if provided, otherwise send all
    const fileName = queryParams?.fileName;
    const status = queryParams?.status;
    const dateStart = queryParams?.dateStart;
    const dateEnd = queryParams?.dateEnd;
    const positionId = queryParams?.positionId;
    const limit = queryParams?.limit || 20;
    const offset = queryParams?.offset || 0;
    // Build WHERE clause
    const whereClauses = [];
    const values = [];
    let paramIdx = 1;
    if (fileName) {
      whereClauses.push(`uq.file_name ILIKE $${paramIdx++}`);
      values.push(`%${fileName}%`);
    }
    if (status) {
      // Handle multiple status codes (e.g., "error,fail" for Error filter)
      const statusCodes = status.split(',').map(s => s.trim());
      if (statusCodes.length === 1) {
      whereClauses.push(`uq.status = $${paramIdx++}`);
      values.push(status);
      } else {
        const placeholders = statusCodes.map(() => `$${paramIdx++}`).join(', ');
        whereClauses.push(`uq.status IN (${placeholders})`);
        values.push(...statusCodes);
      }
    }
    if (dateStart) {
      whereClauses.push(`uq.upload_date >= $${paramIdx++}`);
      values.push(dateStart);
    }
    if (dateEnd) {
      whereClauses.push(`uq.upload_date <= $${paramIdx++}`);
      values.push(dateEnd);
    }
    if (positionId) {
      whereClauses.push(`uq.position_id = $${paramIdx++}`);
      values.push(positionId);
    }
    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    values.push(limit);
    values.push(offset);
    const res = await client.query(
      `SELECT uq.*, p.title as position_title 
       FROM upload_queue uq 
       LEFT JOIN "Position" p ON uq.position_id = p.id 
       ${whereSQL} ORDER BY uq.upload_date DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      values
    );
    const countRes = await client.query(
      `SELECT COUNT(*) 
       FROM upload_queue uq 
       LEFT JOIN "Position" p ON uq.position_id = p.id 
       ${whereSQL}`,
      values.slice(0, values.length - 2)
    );
    // Add summary counts by status
    const summaryRes = await client.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE uq.status = 'queued') as queued,
        COUNT(*) FILTER (WHERE uq.status = 'inprocess') as inprocess,
        COUNT(*) FILTER (WHERE uq.status = 'success') as success,
        COUNT(*) FILTER (WHERE uq.status = 'error' OR uq.status = 'fail') as error
      FROM upload_queue uq 
      LEFT JOIN "Position" p ON uq.position_id = p.id 
      ${whereSQL}`,
      values.slice(0, values.length - 2)
    );
    const summary = summaryRes.rows[0];
    const safeSummary = {
      total: Number(summary.total) || 0,
      queued: Number(summary.queued) || 0,
      inprocess: Number(summary.inprocess) || 0,
      success: Number(summary.success) || 0,
      error: Number(summary.error) || 0,
    };
    // Fix: define total from countRes
    const total = Number(countRes.rows[0]?.count) || 0;
    client.release();
    const data = JSON.stringify({ type: 'queue', data: res.rows, total, summary: safeSummary });
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
  const fileName = url.searchParams.get('file_name') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const dateStart = url.searchParams.get('date_start') || undefined;
  const dateEnd = url.searchParams.get('date_end') || undefined;
  const positionId = url.searchParams.get('position_id') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  console.log('[SSE] New client connected to upload queue SSE');

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      uploadQueueControllers.add(controller);
      console.log(`[SSE] Client added to controllers. Total clients: ${uploadQueueControllers.size}`);
      
      // Send initial data
      await sendUploadQueueUpdate(controller, { fileName, status, dateStart, dateEnd, positionId, limit, offset });
      
      // Send keepalive every 10 seconds for more responsive connection
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
      }, 10000); // Reduced to 10 seconds for better responsiveness
      
      // Cleanup on close
      request.signal.addEventListener('abort', async () => {
        isClosed = true;
        clearInterval(keepaliveInterval);
        uploadQueueControllers.delete(controller);
        console.log(`[SSE] Client disconnected. Remaining clients: ${uploadQueueControllers.size}`);
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