import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions, validateUserSession } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';
import { broadcastUploadQueueUpdate } from './sse/broadcastUploadQueueUpdate';
import { MINIO_PUBLIC_BASE_URL, MINIO_BUCKET } from '@/lib/minio-constants';

/**
 * @openapi
 * /api/upload-queue:
 *   get:
 *     summary: Get paginated upload queue
 *     description: Returns a paginated list of upload queue jobs. Requires authentication.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *         example: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset for pagination
 *         example: 0
 *     responses:
 *       200:
 *         description: Paginated upload queue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *             examples:
 *               success:
 *                 summary: Example response
 *                 value:
 *                   data:
 *                     - id: "uuid"
 *                       file_name: "resume.pdf"
 *                       file_size: 123456
 *                       status: "queued"
 *                       source: "bulk"
 *                       upload_id: "uuid"
 *                       created_by: "user-uuid"
 *                   total: 1
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Add a file to the upload queue
 *     description: Adds a new file to the upload queue. Requires authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               file_name:
 *                 type: string
 *                 example: "resume.pdf"
 *               file_size:
 *                 type: integer
 *                 example: 123456
 *               status:
 *                 type: string
 *                 example: "queued"
 *               source:
 *                 type: string
 *                 example: "bulk"
 *               upload_id:
 *                 type: string
 *                 example: "uuid"
 *               file_path:
 *                 type: string
 *                 example: "/path/to/resume.pdf"
 *               webhook_payload:
 *                 type: object
 *                 example: { "targetPositionId": "uuid", "uploadBatch": "uuid" }
 *     responses:
 *       201:
 *         description: Upload queue job created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               success:
 *                 summary: Example response
 *                 value:
 *                   id: "uuid"
 *                   file_name: "resume.pdf"
 *                   file_size: 123456
 *                   status: "queued"
 *                   source: "bulk"
 *                   upload_id: "uuid"
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const validation = await validateUserSession(session);
  if (!validation.isValid) {
    await logAudit('ERROR', `Upload queue access attempted with invalid session by ${validation.userName || 'Unknown'}`, 'API:UploadQueue:Get', null, { 
      invalidUserId: validation.userId,
      sessionUser: validation.userName,
      error: validation.error
    });
    return NextResponse.json({ error: validation.error }, { status: 401 });
  }

  const actingUserId = validation.userId!;
  const actingUserName = validation.userName!;
  
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const fileName = url.searchParams.get('file_name');
  const status = url.searchParams.get('status');
  const dateStart = url.searchParams.get('date_start');
  const dateEnd = url.searchParams.get('date_end');
  const positionId = url.searchParams.get('position_id');

  // Build dynamic WHERE clause
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
  if (positionId) { // <-- Add this block
    whereClauses.push(`position_id = $${paramIdx++}`);
    values.push(positionId);
  }
  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Add pagination
  values.push(limit);
  values.push(offset);

  const client = await getPool().connect();
  try {
    const dataRes = await client.query(
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
    await logAudit('AUDIT', `Upload queue accessed by ${actingUserName}. Retrieved ${dataRes.rows.length} items.`, 'API:UploadQueue:Get', actingUserId, { 
      limit, 
      offset, 
      totalCount: parseInt(countRes.rows[0].count, 10),
      returnedCount: dataRes.rows.length 
    });
    // Add url field to each job
    const jobsWithUrl = dataRes.rows.map(job => ({
      ...job,
      url: job.file_path ? `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${job.file_path}` : null,
    }));
    return NextResponse.json({ data: jobsWithUrl, total: parseInt(countRes.rows[0].count, 10), summary: safeSummary });
  } catch (error) {
    await logAudit('ERROR', `Failed to fetch upload queue by ${actingUserName}. Error: ${(error as Error).message}`, 'API:UploadQueue:Get', actingUserId);
    throw error;
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check permissions
  const canManageUploadQueue = session.user.role === 'Admin' || 
    session.user.modulePermissions?.includes('UPLOAD_QUEUE_MANAGE');
  
  if (!canManageUploadQueue) {
    await logAudit('WARN', `Forbidden attempt to add to upload queue by ${session.user.name || session.user.email || 'Unknown'}`, 'API:UploadQueue:Post', session.user.id);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to manage upload queue' }, { status: 403 });
  }

  const validation = await validateUserSession(session);
  if (!validation.isValid) {
    await logAudit('ERROR', `Upload queue entry attempted with invalid session by ${validation.userName || 'Unknown'}`, 'API:UploadQueue:Post', null, { 
      invalidUserId: validation.userId,
      sessionUser: validation.userName,
      error: validation.error
    });
    return NextResponse.json({ error: validation.error }, { status: 401 });
  }

  const actingUserId = validation.userId!;
  const actingUserName = validation.userName!;
  
  const data = await request.json();
  let { file_name, file_size, status, source, upload_id, file_path, position_id, applied_position_id, webhook_payload } = data;
  // If position_id and applied_position_id are not set, try to get from webhook_payload.targetPositionId
  let finalPositionId = position_id || applied_position_id || null;
  if (!finalPositionId && webhook_payload && typeof webhook_payload === 'object' && webhook_payload.targetPositionId) {
    finalPositionId = webhook_payload.targetPositionId;
  }
  console.log('Upload queue POST received:', data);
  console.log('Parsed values:', { file_name, file_size, status, source, upload_id, file_path, position_id, applied_position_id, webhook_payload, finalPositionId });
  if (!file_path) {
    await logAudit('WARN', `Upload queue entry attempted without file_path by ${actingUserName}`, 'API:UploadQueue:Post', actingUserId, { data });
    return NextResponse.json({ error: 'file_path is required' }, { status: 400 });
  }
  
  const id = uuidv4();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `INSERT INTO upload_queue (id, file_name, file_size, status, source, upload_id, created_by, file_path, webhook_payload, position_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, file_name, file_size, status, source, upload_id, actingUserId, file_path, webhook_payload ? JSON.stringify(webhook_payload) : null, finalPositionId]
    );
    
    await logAudit('AUDIT', `File '${file_name}' added to upload queue by ${actingUserName}`, 'API:UploadQueue:Post', actingUserId, { 
      queueId: id,
      fileName: file_name,
      fileSize: file_size,
      status,
      source,
      uploadId: upload_id,
      filePath: file_path
    });

    // Dispatch webhook for upload queue created event
    try {
      await dispatchWebhooks.uploadQueueCreated(res.rows[0]);
    } catch (webhookError) {
      console.error('Failed to dispatch upload queue created webhook:', webhookError);
      // Don't fail the request if webhook fails
    }
    // Broadcast SSE update for real-time updates
    try {
      broadcastUploadQueueUpdate();
    } catch (sseError) {
      console.error('Failed to broadcast upload queue update via SSE:', sseError);
    }

    // Automatically trigger processing of the queue
    try {
      console.log('process.env.PROCESSOR_URL:', process.env.PROCESSOR_URL); // Debug log
      const processUrl = process.env.PROCESSOR_URL || `${request.nextUrl.origin}/api/upload-queue/process`;
      console.log('Auto-triggering upload queue processing at:', processUrl); // Debug log
      await fetch(processUrl, {
        method: 'POST',
        headers: {
          'x-api-key': process.env.PROCESSOR_API_KEY || '',
        },
      });
    } catch (autoProcessError) {
      console.error('Failed to auto-trigger upload queue processing:', autoProcessError);
    }
    
    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error) {
    await logAudit('ERROR', `Failed to add file '${file_name}' to upload queue by ${actingUserName}. Error: ${(error as Error).message}`, 'API:UploadQueue:Post', actingUserId, { 
      fileName: file_name,
      error: (error as Error).message 
    });
    console.error('Upload queue POST error:', error);
    throw error;
  } finally {
    client.release();
  }
} 