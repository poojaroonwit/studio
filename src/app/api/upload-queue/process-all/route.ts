import { NextRequest, NextResponse } from 'next/server';
import { getSafeDbClient } from '@/lib/db';
import { getSystemSetting } from '@/lib/settings';
import { processSingleUploadQueueJob } from '../process/route';

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

  const client = await getSafeDbClient();
  const processed: Array<any> = [];
  const messages: Array<string> = [];

  try {
    // Read max concurrent setting once per request
    let maxConcurrent = 5;
    try {
      const setting = await getSystemSetting('maxConcurrentProcessors');
      if (setting && !isNaN(Number(setting))) {
        maxConcurrent = Number(setting);
      }
    } catch (_) {}

    for (let i = 0; i < limit; i++) {
      // Enforce concurrency and atomically claim the next job
      await client.query('BEGIN');

      const countRes = await client.query(
        `SELECT id FROM upload_queue WHERE status = 'inprocess' FOR UPDATE`
      );
      const currentInProgress = countRes.rowCount;
      if (currentInProgress >= maxConcurrent) {
        await client.query('ROLLBACK');
        messages.push(`Max concurrent jobs running (${currentInProgress}/${maxConcurrent})`);
        break;
      }

      // Reset stuck jobs
      const stuckTimeoutHours = 1;
      await client.query(
        `UPDATE upload_queue 
         SET status = 'queued', process_date = NULL, updated_at = now(), error = 'Reset due to timeout'
         WHERE status = 'inprocess' 
         AND process_date < NOW() - INTERVAL '${stuckTimeoutHours} hours'`
      );

      const pickRes = await client.query(
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
        await client.query('COMMIT');
        messages.push('No queued jobs');
        break;
      }

      const job = pickRes.rows[0];
      await client.query('COMMIT');

      // Process the claimed job using existing single-job logic
      const result = await processSingleUploadQueueJob(job, client);

      // Normalize result structure for response
      if ((result as any)?.job) {
        processed.push((result as any).job);
      } else {
        processed.push({ id: job.id, status: 'error', error: (result as any)?.error || 'Unknown error' });
      }
    }

    return NextResponse.json({ processed_count: processed.length, processed, messages }, { status: 200 });
  } catch (err) {
    console.error('Batch upload-queue processing failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  } finally {
    try { client.release(); } catch (_) {}
  }
}


