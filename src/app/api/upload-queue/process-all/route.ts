import { NextRequest, NextResponse } from 'next/server';
import { getSafeDbClient } from '@/lib/db';
import { getSystemSetting } from '@/lib/systemSettings';
import { processSingleUploadQueueJob } from '@/lib/uploadQueueProcessor';

export const dynamic = 'force-dynamic';

// Processing constants
const MAX_PROCESSING_TIME_MS = 30 * 60 * 1000; // 30 minutes
const STUCK_JOB_TIMEOUT_HOURS = 1; // Reduced from 4 to 1 hour
const RECENT_PROCESSING_TIMEOUT_MINUTES = 5; // Prevent reprocessing recent jobs
const MAX_CONCURRENT_JOBS = 10; // Maximum jobs to process in one batch

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
  const limit = Math.max(1, Math.min(MAX_CONCURRENT_JOBS, limitParam ? parseInt(limitParam, 10) || 0 : 0)) || 50;

  const processed: Array<any> = [];
  const messages: Array<string> = [];
  const startTime = Date.now();

  // Check if process queue is enabled
  try {
    const queueEnabled = await getSystemSetting('processQueueEnabled');
    if (queueEnabled === 'false') {
      return NextResponse.json({ 
        message: 'Process queue is disabled',
        enabled: false,
        processed_count: 0,
        processed: [],
        messages: ['Process queue is disabled']
      }, { status: 200 });
    }
  } catch (error) {
    console.warn('Failed to check process queue enabled status:', error);
    // Continue processing if we can't check the setting
  }

  try {
    // NEW: Check processing time limit early
    const processingTime = Date.now() - startTime;
    if (processingTime > MAX_PROCESSING_TIME_MS) {
      console.error(`Batch processing time exceeded limit: ${processingTime}ms`);
      return NextResponse.json({ 
        error: 'Processing time exceeded limit', 
        processed_count: processed.length,
        processed,
        messages: [...messages, 'Processing time exceeded limit']
      }, { status: 408 });
    }

    // Read max concurrent setting once per request
    let maxConcurrent = 5;
    try {
      const setting = await getSystemSetting('maxConcurrentProcessors');
      if (setting && !isNaN(Number(setting)) && Number(setting) > 0) {
        maxConcurrent = Number(setting);
      } else {
        console.warn(`[Process-All] Invalid maxConcurrentProcessors setting: ${setting}, using default: ${maxConcurrent}`);
      }
    } catch (error) {
      console.error('[Process-All] Failed to get maxConcurrentProcessors setting:', error);
    }

    // Validate maxConcurrent is not 0
    if (maxConcurrent <= 0) {
      console.error('[Process-All] maxConcurrentProcessors is 0 or negative, forcing to 1');
      maxConcurrent = 1;
    }

    // NEW: Enhanced stuck job reset with better logic
    const resetClient = await getSafeDbClient();
    try {
      await resetClient.query('BEGIN');
      
      // Reset jobs that have been stuck in 'inprocess' for too long
      const resetRes = await resetClient.query(
        `UPDATE upload_queue 
         SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to timeout'
         WHERE status = 'inprocess' 
         AND process_date < NOW() - INTERVAL '${STUCK_JOB_TIMEOUT_HOURS} hours'`
      );
      
      if (resetRes.rowCount > 0) {
        messages.push(`Reset ${resetRes.rowCount} stuck jobs`);
      }
      
      // NEW: Reset jobs that have been in 'inprocess' for too long (prevent infinite processing)
      const longProcessingRes = await resetClient.query(
        `UPDATE upload_queue 
         SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to long processing time'
         WHERE status = 'inprocess' 
         AND process_date < NOW() - INTERVAL '30 minutes'
         AND process_date > NOW() - INTERVAL '${STUCK_JOB_TIMEOUT_HOURS} hours'`
      );
      
      if (longProcessingRes.rowCount > 0) {
        messages.push(`Reset ${longProcessingRes.rowCount} long-processing jobs`);
      }
      
      // NEW: Prevent processing jobs that were recently completed to avoid infinite loops
      const recentProcessingRes = await resetClient.query(
        `UPDATE upload_queue 
         SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to recent processing'
         WHERE status = 'inprocess' 
         AND completed_date IS NOT NULL
         AND completed_date > NOW() - INTERVAL '${RECENT_PROCESSING_TIMEOUT_MINUTES} minutes'`
      );
      
      if (recentProcessingRes.rowCount > 0) {
        messages.push(`Reset ${recentProcessingRes.rowCount} recently completed jobs`);
      }
      
      await resetClient.query('COMMIT');
    } catch (error) {
      await resetClient.query('ROLLBACK');
      console.error('[Process-All] Error resetting stuck jobs:', error);
      messages.push(`Error resetting stuck jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      resetClient.release();
    }

    // FIXED: Always try to claim up to maxConcurrent jobs (not limited by 'limit' parameter)
    // This ensures we utilize the full concurrent capacity
    const jobsToClaim = maxConcurrent;

    // Claim multiple jobs atomically
    const selectionClient = await getSafeDbClient();
    let claimedJobs: Array<any> = [];
    
    try {
      await selectionClient.query('BEGIN');

      // Check current in-process count with SKIP LOCKED
      const countRes = await selectionClient.query(
        `SELECT id FROM upload_queue WHERE status = 'inprocess' FOR UPDATE SKIP LOCKED`
      );
      const currentInProgress = countRes.rowCount;
  
      if (currentInProgress >= maxConcurrent) {
        await selectionClient.query('ROLLBACK');
        messages.push(`Max concurrent jobs running (${currentInProgress}/${maxConcurrent})`);
    
        return NextResponse.json({ processed_count: 0, processed, messages }, { status: 200 });
      }

      // Calculate how many jobs we can claim (use full capacity)
      const availableSlots = maxConcurrent - currentInProgress;
      const actualJobsToClaim = Math.min(jobsToClaim, availableSlots);
      
      if (actualJobsToClaim <= 0) {
        await selectionClient.query('ROLLBACK');
        messages.push(`No available slots for processing`);
    
        return NextResponse.json({ processed_count: 0, processed, messages }, { status: 200 });
      }

      // NEW: Reset jobs that have been in 'inprocess' for too long (prevent infinite processing)
      await selectionClient.query(
        `UPDATE upload_queue 
         SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to long processing time'
         WHERE status = 'inprocess' 
         AND process_date < NOW() - INTERVAL '30 minutes'
         AND process_date > NOW() - INTERVAL '${STUCK_JOB_TIMEOUT_HOURS} hours'`
      );
      
      // NEW: Prevent processing jobs that were recently completed to avoid infinite loops
      await selectionClient.query(
        `UPDATE upload_queue 
         SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to recent processing'
         WHERE status = 'inprocess' 
         AND completed_date IS NOT NULL
         AND completed_date > NOW() - INTERVAL '${RECENT_PROCESSING_TIMEOUT_MINUTES} minutes'`
      );

      // Note: Automatic retry logic removed - failed jobs will remain failed until manually retried

      // Enhanced job selection - NO AUTOMATIC RETRY
      const claimRes = await selectionClient.query(
        `UPDATE upload_queue
         SET status = 'inprocess', process_date = now(), updated_at = now()
         WHERE id IN (
           SELECT id FROM upload_queue 
           WHERE status = 'queued' 
           AND (
             -- Allow reprocess jobs to be processed even if file_path was processed before
             source = 'reprocess' 
             OR webhook_payload->>'source' = 'reprocess'
             OR (
               -- For non-reprocess jobs, ensure file_path hasn't been successfully processed before
               file_path NOT IN (
                 SELECT file_path FROM upload_queue 
                 WHERE status = 'success'
                 AND file_path IS NOT NULL
                 AND file_path != ''
               )
               AND file_path IS NOT NULL
               AND file_path != ''
             )
           )
           -- Additional duplicate prevention: check webhook_payload flags
           AND (
             webhook_payload->>'processed_by_external_webhook' IS NULL
             OR webhook_payload->>'processed_by_external_webhook' = 'false'
             OR source = 'reprocess'
             OR webhook_payload->>'source' = 'reprocess'
           )
           -- Prevent processing recently completed jobs
           AND (
             completed_date IS NULL
             OR completed_date < NOW() - INTERVAL '${RECENT_PROCESSING_TIMEOUT_MINUTES} minutes'
           )
           ORDER BY upload_date ASC LIMIT $1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING *`,
        [actualJobsToClaim]
      );

      claimedJobs = claimRes.rows;
  
      await selectionClient.query('COMMIT');
    } catch (error) {
      console.error(`[Process-All] Error during job selection:`, error);
      await selectionClient.query('ROLLBACK');
      messages.push(`Error selecting jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return NextResponse.json({ processed_count: 0, processed, messages }, { status: 500 });
    } finally {
      selectionClient.release();
    }

    if (claimedJobs.length === 0) {
      messages.push('No queued jobs');
  
      return NextResponse.json({ processed_count: 0, processed, messages }, { status: 200 });
    }

    // FIXED: Process all claimed jobs concurrently (this will be up to maxConcurrent jobs)
    const processingPromises = claimedJobs.map(async (job) => {
      const processingClient = await getSafeDbClient();
      try {
        // NEW: Check processing time limit for each job
        const jobProcessingTime = Date.now() - startTime;
        if (jobProcessingTime > MAX_PROCESSING_TIME_MS) {
          console.error(`Job ${job.id} processing time exceeded limit: ${jobProcessingTime}ms`);
          return { 
            id: job.id, 
            status: 'error', 
            error: 'Processing time exceeded limit' 
          };
        }
        
        // Additional duplicate check before processing
        const duplicateCheck = await processingClient.query(
          `SELECT status, webhook_payload->>'processed_by_external_webhook' as processed_flag 
           FROM upload_queue WHERE id = $1`,
          [job.id]
        );
        
        if (duplicateCheck.rows.length > 0) {
          const currentJob = duplicateCheck.rows[0];
          
          // Skip if job is no longer in 'inprocess' status (was claimed by another process)
          if (currentJob.status !== 'inprocess') {
            return { 
              id: job.id, 
              status: 'skipped', 
              error: `Job status changed to ${currentJob.status} during processing` 
            };
          }
          
          // Skip if already processed by external webhook (unless it's a reprocess job)
          if (currentJob.processed_flag === 'true' && 
              job.source !== 'reprocess' && 
              job.webhook_payload?.source !== 'reprocess') {
            return { 
              id: job.id, 
              status: 'skipped', 
              error: 'Already processed by external webhook' 
            };
          }
        }
        
        // Process job without automatic retry tracking

        const result = await processSingleUploadQueueJob(job, processingClient);

        // Normalize result structure for response
        if ((result as any)?.job) {
          return (result as any).job;
        } else {
          const errorResult = { id: job.id, status: 'error', error: (result as any)?.error || 'Unknown error' };
          console.error(`[Process-All] Job ${job.id} failed:`, (result as any)?.error || 'Unknown error');
          return errorResult;
        }
      } catch (error) {
        console.error(`[Process-All] Error processing job ${job.id}:`, error);
        return { 
          id: job.id, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      } finally {
        processingClient.release();
      }
    });

    // Wait for all jobs to complete
    const results = await Promise.all(processingPromises);
    processed.push(...results);

    // NEW: Final processing time check
    const totalProcessingTime = Date.now() - startTime;
    if (totalProcessingTime > MAX_PROCESSING_TIME_MS) {
      console.warn(`[Process-All] Total processing time exceeded limit: ${totalProcessingTime}ms`);
      messages.push(`Warning: Processing time exceeded limit (${totalProcessingTime}ms)`);
    }

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


