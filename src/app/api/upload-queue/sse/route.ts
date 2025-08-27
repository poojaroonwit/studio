import { NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { broadcastUploadQueueUpdate, uploadQueueControllers } from './broadcastUploadQueueUpdate';
import { getServerSession } from 'next-auth/next';
import { authOptions, validateUserSession } from '@/lib/auth';

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
    // Add summary counts by status - optimized query
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
    const data = JSON.stringify({ 
      type: 'queue', 
      jobs: res.rows, 
      total, 
      summary: safeSummary,
      statusSummary: safeSummary 
    });
    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
  } catch (error) {
    const encoder = new TextEncoder();
    const errorData = JSON.stringify({ type: 'error', message: 'Failed to load queue data' });
    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
  }
}

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session || !validateUserSession(session)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const url = new URL(request.url);
  // Handle both parameter naming conventions
  const fileName = url.searchParams.get('file_name') || url.searchParams.get('filter') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const dateStart = url.searchParams.get('date_start') || url.searchParams.get('dateRangeStart') || undefined;
  const dateEnd = url.searchParams.get('date_end') || url.searchParams.get('dateRangeEnd') || undefined;
  const positionId = url.searchParams.get('position_id') || url.searchParams.get('positionId') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || url.searchParams.get('pageSize') || '20', 10);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const offset = parseInt(url.searchParams.get('offset') || String((page - 1) * limit), 10);

  let keepaliveInterval: NodeJS.Timeout | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      uploadQueueControllers.add(controller);
 
      // Send initial data
      await sendUploadQueueUpdate(controller, { fileName, status, dateStart, dateEnd, positionId, limit, offset });
      
      // Send keepalive every 10 seconds for more responsive connection
      keepaliveInterval = setInterval(() => {
        if (isClosed) {
          if (keepaliveInterval) {
            clearInterval(keepaliveInterval);
            keepaliveInterval = null;
          }
          return;
        }
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch (error) {
          console.error('[Upload Queue SSE] Keepalive failed:', error);
          isClosed = true;
          if (keepaliveInterval) {
            clearInterval(keepaliveInterval);
            keepaliveInterval = null;
          }
          uploadQueueControllers.delete(controller);
        }
      }, 10000); // Reduced to 10 seconds for better responsiveness
      
      // Cleanup on close
      request.signal.addEventListener('abort', async () => {
        isClosed = true;
        if (keepaliveInterval) {
          clearInterval(keepaliveInterval);
          keepaliveInterval = null;
        }
        uploadQueueControllers.delete(controller);
      });
    },
    cancel() {
      isClosed = true;
      if (keepaliveInterval) {
        clearInterval(keepaliveInterval);
        keepaliveInterval = null;
      }
      // Note: controller is not available in cancel() method, so we can't remove it from uploadQueueControllers here
      // The controller will be cleaned up when the connection is actually closed
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