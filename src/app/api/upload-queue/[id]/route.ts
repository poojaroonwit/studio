import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { processSingleUploadQueueJob } from '@/lib/uploadQueueProcessor';
import { broadcastUploadQueueUpdate } from '../sse/broadcastUploadQueueUpdate';
import { hasAnyPermission } from '@/lib/permissions';

/**
 * @openapi
 * /api/upload-queue/{id}:
 *   patch:
 *     summary: Update an upload queue job by ID
 *     description: Updates fields of an upload queue job by its ID. Requires authentication.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the upload queue job
 *         example: "uuid"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *           examples:
 *             example:
 *               summary: Example request
 *               value:
 *                 status: "processing"
 *     responses:
 *       200:
 *         description: Upload queue job updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *             examples:
 *               success:
 *                 summary: Example response
 *                 value:
 *                   id: "uuid"
 *                   status: "processing"
 *       400:
 *         description: No fields to update
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const data = await request.json();
  const fields = [];
  const values = [];
  let idx = 1;
  for (const key of Object.keys(data)) {
    fields.push(`${key} = $${idx}`);
    values.push(data[key]);
    idx++;
  }
  if (fields.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }
  values.push(id);
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `UPDATE upload_queue SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`,
      values
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    // Publish queue update event
    try {
      await broadcastUploadQueueUpdate();
    } catch (err) {
      console.error('Failed to broadcast upload queue update via SSE:', err);
    }
    return NextResponse.json(res.rows[0]);
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `DELETE FROM upload_queue WHERE id = $1 RETURNING *`,
      [id]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    // Publish queue update event
    try {
      await broadcastUploadQueueUpdate();
    } catch (err) {
      console.error('Failed to broadcast upload queue update via SSE:', err);
    }
    return NextResponse.json({ success: true });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Only allow users with UPLOAD_QUEUE_MANAGE permission
  const canProcess = hasAnyPermission(session.user, ['UPLOAD_QUEUE_MANAGE']);
  if (!canProcess) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }
  const { id } = await params;

  
  const client = await getPool().connect();
  try {
    // Fetch the job by ID
    const res = await client.query('SELECT * FROM upload_queue WHERE id = $1', [id]);
    if (res.rows.length === 0) {

      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const job = res.rows[0];

    
    // Check if this is a retry operation (job is in failed state)
    const isRetry = ['failed'].includes(job.status);

    
    // Only allow processing if job is queued, error, or failed state
    if (!['queued', 'error', 'failed'].includes(job.status)) {

      return NextResponse.json({ error: 'Job is not in a processable state' }, { status: 400 });
    }
    
    // If this is a retry, reset the job status to queued and clear error fields
    if (isRetry) {
      
      // Check if there's already a queued job with the same file path
      const existingQueuedJob = await client.query(
        'SELECT id FROM upload_queue WHERE file_path = $1 AND status = $2 AND id != $3',
        [job.file_path, 'queued', id]
      );
      
      if (existingQueuedJob.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          error: 'Cannot retry job: there is already a queued job with the same file path' 
        }, { status: 400 });
      }
      
      // Check retry count to prevent infinite retries
      const currentRetryCount = job.webhook_payload?.retry_count || 0;
      if (currentRetryCount >= 3) { // MAX_RETRY_ATTEMPTS
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          error: 'Cannot retry job: maximum retry attempts (3) exceeded' 
        }, { status: 400 });
      }
      
      // Reset job to queued status and clear error fields
      await client.query(
        `UPDATE upload_queue SET 
         status = $1, 
         error = NULL, 
         error_details = NULL, 
         updated_at = now(),
         webhook_payload = jsonb_set(
           COALESCE(webhook_payload, '{}'::jsonb), 
           '{retry_count}', 
           '${currentRetryCount + 1}'::jsonb
         )
         WHERE id = $2`,
        ['queued', id]
      );
      
      // Fetch the updated job
      const updatedRes = await client.query('SELECT * FROM upload_queue WHERE id = $1', [id]);
      if (updatedRes.rows.length > 0) {
        job.status = 'queued';
        job.error = null;
        job.error_details = null;
        job.webhook_payload = updatedRes.rows[0].webhook_payload;
      }
    }
    
    // Process the job (send to webhook)

    const result = await processSingleUploadQueueJob(job, client);

    
    try {
      await broadcastUploadQueueUpdate();
    } catch (err) {
      console.error('Failed to broadcast upload queue update via SSE:', err);
    }
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error(`Error processing job ${id}:`, err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
} 