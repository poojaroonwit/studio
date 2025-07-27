import { getPool } from '@/lib/db';

const uploadQueueControllers = new Set<ReadableStreamDefaultController<any>>();

export async function sendUploadQueueUpdate(controller: ReadableStreamDefaultController<any>, queryParams?: { fileName?: string, status?: string, dateStart?: string, dateEnd?: string, limit?: number, offset?: number }) {
  const encoder = new TextEncoder();
  try {
    const client = await getPool().connect();
    const fileName = queryParams?.fileName;
    const status = queryParams?.status;
    const dateStart = queryParams?.dateStart;
    const dateEnd = queryParams?.dateEnd;
    const limit = queryParams?.limit || 20;
    const offset = queryParams?.offset || 0;
    const whereClauses = [];
    const values = [];
    let paramIdx = 1;
    if (fileName) {
      whereClauses.push(`file_name ILIKE $${paramIdx++}`);
      values.push(`%${fileName}%`);
    }
    if (status) {
      // Handle special case for "error" status which includes both "error" and "fail"
      if (status === 'error') {
        whereClauses.push(`(status = $${paramIdx++} OR status = $${paramIdx++})`);
        values.push('error');
        values.push('fail');
      } else {
        whereClauses.push(`status = $${paramIdx++}`);
        values.push(status);
      }
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
    // Add summary counts by status
    const summaryRes = await client.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'queued') as queued,
        COUNT(*) FILTER (WHERE status = 'inprocess') as inprocess,
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status = 'error' OR status = 'fail') as error
      FROM upload_queue 
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
    try {
      controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
    } catch (controllerError) {
      // Controller might be closed, remove it from the set
      uploadQueueControllers.delete(controller);
    }
  }
}

export function broadcastUploadQueueUpdate() {
  // Create a copy of controllers to safely iterate over
  const controllersCopy = Array.from(uploadQueueControllers);
  
  for (const controller of controllersCopy) {
    try {
      sendUploadQueueUpdate(controller);
    } catch (error) {
      console.error('Failed to broadcast to controller:', error);
      // Remove failed controllers from the set
      uploadQueueControllers.delete(controller);
    }
  }
}

// Export the controllers set for use in the route
export { uploadQueueControllers }; 