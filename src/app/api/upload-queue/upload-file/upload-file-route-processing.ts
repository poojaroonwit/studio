import type { NextRequest } from 'next/server';

import { getPool } from '@/lib/db';
import { broadcastUploadQueueUpdate } from '../sse/broadcastUploadQueueUpdate';
import { getProcessorApiKey } from '@/lib/processor-auth';
import type { UploadResult } from './upload-file-route-types';
import { processFileUpload } from './upload-file-route-storage';
import type { ParsedUploadRequest } from './upload-file-route-request';

export async function processUploadsInTransaction(
  parsed: ParsedUploadRequest,
  actingUserId: string,
): Promise<UploadResult[]> {
  const client = await getPool().connect();
  const dbTimeout = setTimeout(() => {
    console.error('[UPLOAD] Database operation timeout - forcing rollback');
    client.query('ROLLBACK').catch((rollbackError: unknown) => {
      console.error('[UPLOAD] Error during forced rollback:', rollbackError);
    });
  }, 60000);

  try {
    await client.query('BEGIN');

    const results = await Promise.all(
      parsed.files.map((file) => processFileUpload(file, client, {
        position_id: parsed.position_id,
        batch_id: parsed.batch_id,
        source: parsed.source,
        source_id: parsed.source_id,
        sub_source: parsed.sub_source,
        webhook_payload: parsed.webhook_payload,
        created_by: actingUserId,
      })),
    );

    clearTimeout(dbTimeout);
    await client.query('COMMIT');
    return results;
  } catch (error) {
    clearTimeout(dbTimeout);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function broadcastUploadQueueChange(): Promise<void> {
  try {
    await broadcastUploadQueueUpdate();
  } catch (sseError) {
    console.error('[UPLOAD] Failed to broadcast upload queue update via SSE:', sseError);
  }
}

export async function triggerUploadQueueProcessing(request: NextRequest): Promise<void> {
  const processUrl = `${request.nextUrl.origin}/api/upload-queue/process-all`;
  const processorApiKey = getProcessorApiKey();

  await fetch(processUrl, {
    method: 'POST',
    headers: {
      'x-api-key': processorApiKey || '',
    },
  });
}
