import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { processSingleUploadQueueJob } from '@/lib/uploadQueueProcessor';
import { broadcastUploadQueueUpdate } from '../sse/broadcastUploadQueueUpdate';

/**
 * @openapi
 * /api/upload-queue/bulk-action:
 *   post:
 *     summary: Perform bulk actions on upload queue items
 *     description: Perform bulk retry, cancel, or delete operations on multiple upload queue items. Requires authentication and UPLOAD_QUEUE_MANAGE permission.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [retry, cancel, delete]
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Bulk action completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 successCount:
 *                   type: integer
 *                 failCount:
 *                   type: integer
 *                 failedDetails:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       itemId:
 *                         type: string
 *                       reason:
 *                         type: string
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       500:
 *         description: Server error
 */

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only allow Admin or users with UPLOAD_QUEUE_MANAGE
  const canProcess = session.user.role === 'Admin' || session.user.modulePermissions?.includes('UPLOAD_QUEUE_MANAGE');
  if (!canProcess) {
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, itemIds } = body;

  if (!action || !['retry', 'cancel', 'delete', 'process'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action. Must be retry, cancel, delete, or process' }, { status: 400 });
  }

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return NextResponse.json({ error: 'Invalid itemIds. Must be a non-empty array' }, { status: 400 });
  }

  const client = await getPool().connect();
  let successCount = 0;
  let failCount = 0;
  const failedDetails: { itemId: string; reason: string }[] = [];

  try {
    await client.query('BEGIN');

    for (const itemId of itemIds) {
      try {
        // Fetch the job by ID
        const res = await client.query('SELECT * FROM upload_queue WHERE id = $1', [itemId]);
        if (res.rows.length === 0) {
          failedDetails.push({ itemId, reason: 'Item not found' });
          failCount++;
          continue;
        }

        const job = res.rows[0];

        switch (action) {
          case 'process':
            // Only allow process if job is queued
            if (job.status !== 'queued') {
              failedDetails.push({ itemId, reason: 'Job is not in a processable state (must be queued)' });
              failCount++;
              continue;
            }
            
            // Process the job directly
            await processSingleUploadQueueJob(job, client);
            successCount++;
            break;

          case 'retry':
            // Only allow retry if job is in error or fail state
            if (!['error', 'fail'].includes(job.status)) {
              failedDetails.push({ itemId, reason: 'Job is not in a retryable state' });
              failCount++;
              continue;
            }
            
            // Reset job to queued status
            await client.query(
              'UPDATE upload_queue SET status = $1, error = NULL, error_details = NULL, updated_at = now() WHERE id = $2',
              ['queued', itemId]
            );
            
            // Process the job
            await processSingleUploadQueueJob(job, client);
            successCount++;
            break;

          case 'cancel':
            // Only allow cancel if job is queued or inprocess
            if (!['queued', 'inprocess'].includes(job.status)) {
              failedDetails.push({ itemId, reason: 'Job is not in a cancellable state' });
              failCount++;
              continue;
            }
            
            await client.query(
              'UPDATE upload_queue SET status = $1, updated_at = now() WHERE id = $2',
              ['cancelled', itemId]
            );
            successCount++;
            break;

          case 'delete':
            // Only allow delete if job is in a final state
            if (!['success', 'error', 'fail', 'cancelled'].includes(job.status)) {
              failedDetails.push({ itemId, reason: 'Job is not in a deletable state' });
              failCount++;
              continue;
            }
            
            await client.query('DELETE FROM upload_queue WHERE id = $1', [itemId]);
            successCount++;
            break;

          default:
            failedDetails.push({ itemId, reason: 'Invalid action' });
            failCount++;
        }
      } catch (error) {
        console.error(`Failed to process item ${itemId}:`, error);
        failedDetails.push({ itemId, reason: (error as Error).message });
        failCount++;
      }
    }

    await client.query('COMMIT');

    // Broadcast queue update
    try {
      await broadcastUploadQueueUpdate();
    } catch (err) {
      console.error('Failed to broadcast upload queue update via SSE:', err);
    }

    const message = `Successfully ${action}ed ${successCount} item${successCount !== 1 ? 's' : ''}`;
    if (failCount > 0) {
      message += `, failed ${failCount} item${failCount !== 1 ? 's' : ''}`;
    }

    return NextResponse.json({
      success: true,
      message,
      successCount,
      failCount,
      failedDetails
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk action error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }, { status: 500 });
  } finally {
    client.release();
  }
}
