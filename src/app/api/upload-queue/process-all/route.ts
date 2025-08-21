import { NextRequest, NextResponse } from 'next/server';
import { getSafeDbClient } from '@/lib/db';
import { getSystemSetting } from '@/lib/settings';
import { processSingleUploadQueueJob } from '../process/route';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.PROCESSOR_API_KEY) {
    console.warn('Unauthorized attempt to batch process upload queue with invalid API key', {
      providedKey: apiKey ? 'present' : 'missing'
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = request.nextUrl;
  const limitParam = url.searchParams.get('limit');
  const limit = Math.max(1, Math.min(100, limitParam ? parseInt(limitParam, 10) || 0 : 0)) || 50;

  const processed: Array<any> = [];
  const messages: Array<string> = [];

  try {
    console.log('[Process-All] Starting batch processing with limit:', limit);
    
    // Read max concurrent setting once per request
    let maxConcurrent = 5;
    try {
      const setting = await getSystemSetting('maxConcurrentProcessors');
      if (setting && !isNaN(Number(setting))) {
        maxConcurrent = Number(setting);
      }
    } catch (error) {
      console.warn('[Process-All] Failed to get maxConcurrentProcessors setting:', error);
    }

    console.log('[Process-All] Max concurrent processors:', maxConcurrent);

    for (let i = 0; i < limit; i++) {
      console.log(`[Process-All] Processing job ${i + 1}/${limit}`);
      
      // Use a separate client for job selection to avoid transaction conflicts
      const selectionClient = await getSafeDbClient();
      let job = null;
      
      try {
        // Enforce concurrency and atomically claim the next job
        await selectionClient.query('BEGIN');

        const countRes = await selectionClient.query(
          `SELECT id FROM upload_queue WHERE status = 'inprocess' FOR UPDATE`
        );
        const currentInProgress = countRes.rowCount;
        console.log(`[Process-All] Current in-process jobs: ${currentInProgress}/${maxConcurrent}`);
        
        if (currentInProgress >= maxConcurrent) {
          await selectionClient.query('ROLLBACK');
          messages.push(`Max concurrent jobs running (${currentInProgress}/${maxConcurrent})`);
          console.log(`[Process-All] Max concurrent limit reached, stopping`);
          break;
        }

        // Reset stuck jobs
        const stuckTimeoutHours = 1;
        const resetRes = await selectionClient.query(
          `UPDATE upload_queue 
           SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to timeout'
           WHERE status = 'inprocess' 
           AND process_date < NOW() - INTERVAL '${stuckTimeoutHours} hours'`
        );
        
        if (resetRes.rowCount > 0) {
          console.log(`[Process-All] Reset ${resetRes.rowCount} stuck jobs`);
        }

        const pickRes = await selectionClient.query(
          `UPDATE upload_queue
           SET status = 'inprocess', process_date = now(), updated_at = now()
           WHERE id = (
             SELECT id FROM upload_queue 
             WHERE status = 'queued' 
             AND (
               source = 'reprocess' 
               OR webhook_payload->>'source' = 'reprocess'
               OR file_path NOT IN (
                 SELECT file_path FROM upload_queue 
                 WHERE status IN ('success', 'fail', 'error')
                 AND file_path IS NOT NULL
               )
             )
             ORDER BY upload_date ASC LIMIT 1
             FOR UPDATE SKIP LOCKED
           )
           RETURNING *`
        );

        if (pickRes.rows.length === 0) {
          await selectionClient.query('COMMIT');
          messages.push('No queued jobs');
          console.log(`[Process-All] No queued jobs found, stopping`);
          break;
        }

        job = pickRes.rows[0];
        console.log(`[Process-All] Selected job: ${job.id} (${job.file_name})`);
        await selectionClient.query('COMMIT');
      } catch (error) {
        console.error(`[Process-All] Error during job selection:`, error);
        await selectionClient.query('ROLLBACK');
        messages.push(`Error selecting job: ${error instanceof Error ? error.message : 'Unknown error'}`);
        break;
      } finally {
        selectionClient.release();
      }

      if (!job) {
        console.log(`[Process-All] No job selected, stopping`);
        break;
      }

      // Process the claimed job using a fresh client to avoid transaction conflicts
      const processingClient = await getSafeDbClient();
      try {
        console.log(`[Process-All] Processing job ${job.id} with file: ${job.file_name}`);
        const result = await processSingleUploadQueueJob(job, processingClient);

        // Normalize result structure for response
        if ((result as any)?.job) {
          processed.push((result as any).job);
          console.log(`[Process-All] Job ${job.id} processed successfully`);
        } else {
          const errorResult = { id: job.id, status: 'error', error: (result as any)?.error || 'Unknown error' };
          processed.push(errorResult);
          console.error(`[Process-All] Job ${job.id} failed:`, (result as any)?.error || 'Unknown error');
        }
      } catch (error) {
        console.error(`[Process-All] Error processing job ${job.id}:`, error);
        processed.push({ 
          id: job.id, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      } finally {
        processingClient.release();
      }
    }

    console.log(`[Process-All] Batch processing completed. Processed: ${processed.length}, Messages:`, messages);
    return NextResponse.json({ processed_count: processed.length, processed, messages }, { status: 200 });
  } catch (err) {
    console.error('[Process-All] Batch upload-queue processing failed:', err);
    return NextResponse.json({ 
      error: (err as Error).message, 
      stack: (err as Error).stack,
      processed_count: processed.length,
      processed,
      messages
    }, { status: 500 });
  }
}


