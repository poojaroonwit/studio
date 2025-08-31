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

// Process a single item with its own transaction and timeout
async function processSingleItem(
  itemId: string, 
  action: string, 
  pool: any
): Promise<{ success: boolean; reason?: string }> {
  const client = await pool.connect();
  let timeoutId: NodeJS.Timeout | null = null;
  
  try {
    // Set a timeout for the entire operation
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Operation timeout'));
      }, 300000); // 5 minutes timeout
    });

    const operationPromise = (async () => {
      // Set a longer statement timeout for bulk operations to prevent timeouts
      await client.query('SET statement_timeout = 600000'); // 10 minutes
      await client.query('BEGIN');

      // Fetch the job by ID
      const res = await client.query('SELECT * FROM upload_queue WHERE id = $1', [itemId]);
      if (res.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, reason: 'Item not found' };
      }

      const job = res.rows[0];

      switch (action) {
        case 'process':
          // Only allow process if job is queued
          if (job.status !== 'queued') {
            await client.query('ROLLBACK');
            return { success: false, reason: 'Job is not in a processable state (must be queued)' };
          }
          
          // Process the job directly
          await processSingleUploadQueueJob(job, client);
          await client.query('COMMIT');
          return { success: true };

        case 'retry':
          // Only allow retry if job is in error or fail state
          if (!['error', 'fail'].includes(job.status)) {
            await client.query('ROLLBACK');
            return { success: false, reason: 'Job is not in a retryable state' };
          }
          
          // Check if there's already a queued job with the same file path
          const existingQueuedJob = await client.query(
            'SELECT id FROM upload_queue WHERE file_path = $1 AND status = $2 AND id != $3',
            [job.file_path, 'queued', itemId]
          );
          
          if (existingQueuedJob.rows.length > 0) {
            await client.query('ROLLBACK');
            return { success: false, reason: 'Cannot retry: there is already a queued job with the same file path' };
          }
          
          // Reset job to queued status
          await client.query(
            'UPDATE upload_queue SET status = $1, error = NULL, error_details = NULL, updated_at = now() WHERE id = $2',
            ['queued', itemId]
          );
          
          // Process the job
          await processSingleUploadQueueJob(job, client);
          await client.query('COMMIT');
          return { success: true };

        case 'cancel':
          // Only allow cancel if job is queued or inprocess
          if (!['queued', 'inprocess'].includes(job.status)) {
            await client.query('ROLLBACK');
            return { success: false, reason: 'Job is not in a cancellable state' };
          }
          
          await client.query(
            'UPDATE upload_queue SET status = $1, updated_at = now() WHERE id = $2',
            ['cancelled', itemId]
          );
          await client.query('COMMIT');
          return { success: true };

        case 'delete':
          // Only allow delete if job is in a final state
          if (!['success', 'error', 'fail', 'cancelled'].includes(job.status)) {
            await client.query('ROLLBACK');
            return { success: false, reason: 'Job is not in a deletable state' };
          }
          
          await client.query('DELETE FROM upload_queue WHERE id = $1', [itemId]);
          await client.query('COMMIT');
          return { success: true };

        default:
          await client.query('ROLLBACK');
          return { success: false, reason: 'Invalid action' };
      }
    })();

    // Race between timeout and operation
    return await Promise.race([operationPromise, timeoutPromise]);

  } catch (error) {
    // Ensure we rollback on any error
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(`Failed to rollback transaction for item ${itemId}:`, rollbackError);
    }

    console.error(`Failed to process item ${itemId}:`, error);
    return { 
      success: false, 
      reason: error instanceof Error ? error.message : 'Unknown error' 
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    // Reset statement timeout to default
    try {
      await client.query('RESET statement_timeout');
    } catch (resetError) {
      console.error(`Failed to reset statement timeout for item ${itemId}:`, resetError);
    }
    client.release();
  }
}

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

  const pool = getPool();
  let successCount = 0;
  let failCount = 0;
  const failedDetails: { itemId: string; reason: string }[] = [];

  // Process items sequentially to avoid overwhelming the database
  // Each item gets its own transaction and timeout
  console.log(`[BULK-ACTION] Starting bulk ${action} operation for ${itemIds.length} items`);
  
  for (let i = 0; i < itemIds.length; i++) {
    const itemId = itemIds[i];
    console.log(`[BULK-ACTION] Processing item ${i + 1}/${itemIds.length}: ${itemId}`);
    
    try {
      const result = await processSingleItem(itemId, action, pool);
      
      if (result.success) {
        successCount++;
        console.log(`[BULK-ACTION] Successfully processed item ${itemId}`);
      } else {
        failCount++;
        failedDetails.push({ itemId, reason: result.reason || 'Unknown error' });
        console.log(`[BULK-ACTION] Failed to process item ${itemId}: ${result.reason}`);
      }
    } catch (error) {
      failCount++;
      failedDetails.push({ 
        itemId, 
        reason: error instanceof Error ? error.message : 'Unknown error' 
      });
      console.error(`[BULK-ACTION] Unexpected error processing item ${itemId}:`, error);
    }
  }
  
  console.log(`[BULK-ACTION] Completed bulk ${action} operation. Success: ${successCount}, Failed: ${failCount}`);

  // Broadcast queue update
  try {
    await broadcastUploadQueueUpdate();
  } catch (err) {
    console.error('Failed to broadcast upload queue update via SSE:', err);
  }

  let message = `Successfully ${action}ed ${successCount} item${successCount !== 1 ? 's' : ''}`;
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
}
