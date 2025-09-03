import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions, validateUserSession } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { hasAnyPermission } from '@/lib/permissions';
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
 *         description: Number of items per page (max 1000)
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
  // Session-based authentication only
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const validation = await validateUserSession(session);
  if (!validation.isValid) {
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

  // Validate and cap limit to prevent performance issues
  const safeLimit = Math.min(Math.max(limit, 1), 1000); // Up to 1000 for all requests
  const safeOffset = Math.max(offset, 0);

  // Build dynamic WHERE clause
  const whereClauses = [];
  const values = [];
  let paramIdx = 1;
  if (fileName) {
    whereClauses.push(`file_name ILIKE $${paramIdx++}`);
    values.push(`%${fileName}%`);
  }
  if (status) {
    // Handle multiple status codes (e.g., "error,fail" for Error filter)
    const statusCodes = status.split(',').map(s => s.trim());
    if (statusCodes.length === 1) {
      whereClauses.push(`status = $${paramIdx++}`);
      values.push(status);
    } else {
      const placeholders = statusCodes.map(() => `$${paramIdx++}`).join(', ');
      whereClauses.push(`status IN (${placeholders})`);
      values.push(...statusCodes);
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
  if (positionId) {
    whereClauses.push(`position_id = $${paramIdx++}`);
    values.push(positionId);
  }
  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Add pagination
  values.push(safeLimit);
  values.push(safeOffset);

  const client = await getPool().connect();
  try {
    // Set a longer statement timeout for this specific request to prevent 504 errors
          await client.query('SET statement_timeout = \'60000ms\''); // 60 seconds (increased from 15)

    // Main query - only fetches records for the current page using LIMIT and OFFSET
    const dataRes = await client.query(
      `SELECT uq.*, p.title as position_title 
       FROM upload_queue uq 
       LEFT JOIN "Position" p ON uq.position_id = p.id 
       ${whereSQL} 
       ORDER BY uq.upload_date DESC 
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      values
    );

    // Get total count for pagination (only if needed)
    let totalCount = 0;
    let safeSummary = {
      total: 0,
      queued: 0,
      inprocess: 0,
      success: 0,
      error: 0,
    };

    // For first page, get both count and summary in one query
    if (safeOffset === 0) {
      const summaryRes = await client.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE uq.status = 'queued') as queued,
          COUNT(*) FILTER (WHERE uq.status = 'inprocess') as inprocess,
          COUNT(*) FILTER (WHERE uq.status = 'success') as success,
          COUNT(*) FILTER (WHERE uq.status = 'error' OR uq.status = 'fail') as error
        FROM upload_queue uq 
        ${whereSQL}`,
        values.slice(0, values.length - 2)
      );
      const summary = summaryRes.rows[0];
      totalCount = parseInt(summary.total, 10);
      safeSummary = {
        total: totalCount,
        queued: Number(summary.queued) || 0,
        inprocess: Number(summary.inprocess) || 0,
        success: Number(summary.success) || 0,
        error: Number(summary.error) || 0,
      };
    } else {
      // For non-first pages, only get count if we have results
      if (dataRes.rows.length > 0) {
        const countRes = await client.query(
          `SELECT COUNT(*) 
           FROM upload_queue uq 
           ${whereSQL}`,
          values.slice(0, values.length - 2)
        );
        totalCount = parseInt(countRes.rows[0].count, 10);
      }
      safeSummary.total = totalCount;
    }



    // Add url field to each job
    const jobsWithUrl = dataRes.rows.map(job => ({
      ...job,
      url: job.file_path ? `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${job.file_path}` : null,
    }));

    return NextResponse.json({ 
      data: jobsWithUrl, 
      total: totalCount, 
      summary: safeSummary 
    });
  } catch (error) {
    console.error('Upload queue API error:', error);
    
    // Return a more specific error for timeouts
    if ((error as any).code === '57014') { // PostgreSQL statement timeout
      return NextResponse.json({ 
        error: 'Request timeout - the query took too long to complete. Please try with a smaller limit or different filters.',
        details: 'Database query timeout - the upload queue query exceeded the 60-second timeout limit. This may be due to a large number of records or missing database indexes.',
        suggestion: 'Try reducing the page size, adding more specific filters, or contact an administrator to optimize the database.'
      }, { status: 504 });
    }
    
    // Handle connection errors
    if ((error as any).code === 'ECONNREFUSED' || (error as any).code === 'ENOTFOUND') {
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: 'Unable to connect to the database. Please check if the database is running and accessible.',
        suggestion: 'Contact an administrator to check database connectivity.'
      }, { status: 503 });
    }
    
    // Handle other database errors
    if ((error as any).code && (error as any).code.startsWith('5')) {
      return NextResponse.json({ 
        error: 'Database error occurred',
        details: `Database error: ${(error as any).message || 'Unknown database error'}`,
        suggestion: 'Please try again later or contact an administrator if the problem persists.'
      }, { status: 500 });
    }
    
    throw error;
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  // Session-based authentication only
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check permissions using the new permission system
  const canManageUploadQueue = hasAnyPermission(
    session.user,
    ['UPLOAD_QUEUE_MANAGE']
  );
  
  if (!canManageUploadQueue) {
    await logAudit(
      'WARN',
      `Forbidden attempt to manage upload queue by ${session.user.name || session.user.email}.`,
      'API:UploadQueue:Manage',
      session.user.id
    );
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to manage upload queue' }, { status: 403 });
  }

  const validation = await validateUserSession(session);
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.error }, { status: 401 });
  }

  const actingUserId = validation.userId!;
  const actingUserName = validation.userName!;
  
  const data = await request.json();
  let { file_name, file_size, status, source, upload_id, file_path, position_id, applied_position_id, webhook_payload } = data;
  
  // Ensure file_size is a number (handle string "0" from reprocess jobs)
  if (typeof file_size === 'string') {
    file_size = parseInt(file_size, 10) || 0;
  }
  
  // If position_id and applied_position_id are not set, try to get from webhook_payload.targetPositionId
  let finalPositionId = position_id || applied_position_id || null;
  if (!finalPositionId && webhook_payload && typeof webhook_payload === 'object' && webhook_payload.targetPositionId) {
    finalPositionId = webhook_payload.targetPositionId;
  }

  if (!file_path) {
    return NextResponse.json({ error: 'file_path is required' }, { status: 400 });
  }
  
  const id = uuidv4();
  const client = await getPool().connect();
  try {
    // For reprocess jobs, we need to handle the unique constraint differently
    // Check if this is a reprocess job
    const isReprocessJob = source === 'reprocess' || (webhook_payload && webhook_payload.source === 'reprocess');
    
    let res;
    if (isReprocessJob) {
      // For reprocess jobs, we need to handle potential unique constraint violations
      try {
        res = await client.query(
          `INSERT INTO upload_queue (id, file_name, file_size, status, source, upload_id, created_by, file_path, webhook_payload, position_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [id, file_name, file_size, status, source, upload_id, actingUserId, file_path, webhook_payload ? JSON.stringify(webhook_payload) : null, finalPositionId]
        );
      } catch (insertError: any) {
        // If unique constraint violation, try to update the existing job instead
        if (insertError.code === '23505' && insertError.constraint === 'upload_queue_file_path_status_key') {
          
          // Update the existing job to be a reprocess job
          res = await client.query(
            `UPDATE upload_queue 
             SET source = $1, webhook_payload = $2, updated_at = now()
             WHERE file_path = $3 AND status = $4
             RETURNING *`,
            [source, webhook_payload ? JSON.stringify(webhook_payload) : null, file_path, status]
          );
          
          if (res.rows.length === 0) {
            throw new Error('Failed to update existing job for reprocess');
          }
        } else {
          throw insertError;
        }
      }
    } else {
      // For regular jobs, use normal insert
      res = await client.query(
        `INSERT INTO upload_queue (id, file_name, file_size, status, source, upload_id, created_by, file_path, webhook_payload, position_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [id, file_name, file_size, status, source, upload_id, actingUserId, file_path, webhook_payload ? JSON.stringify(webhook_payload) : null, finalPositionId]
      );
    }
    


    // Dispatch webhook for upload queue created event
    try {
      await dispatchWebhooks.uploadQueueCreated(res.rows[0]);
    } catch (webhookError) {
      // Failed to dispatch upload queue created webhook
    }
    // Broadcast SSE update for real-time updates
    try {
      await broadcastUploadQueueUpdate();
    } catch (sseError) {
      // Failed to broadcast upload queue update via SSE
    }

    // Automatically trigger processing of the queue (fire-and-forget)
    try {
  
      const processUrl = process.env.PROCESSOR_URL || `${request.nextUrl.origin}/api/upload-queue/process`;
      
      // Fire-and-forget: don't await the fetch to return response immediately
      fetch(processUrl, {
        method: 'POST',
        headers: {
          'x-api-key': process.env.PROCESSOR_API_KEY || '',
        },
      }).catch(autoProcessError => {
        // Failed to auto-trigger upload queue processing
      });
    } catch (autoProcessError) {
      // Failed to auto-trigger upload queue processing
    }
    
    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ 
      error: (error as Error).message || 'Internal server error',
      details: 'Failed to add file to upload queue'
    }, { status: 500 });
  } finally {
    client.release();
  }
} 