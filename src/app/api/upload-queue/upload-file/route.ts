import { NextRequest, NextResponse } from 'next/server';
import { minioClient, MINIO_BUCKET, ensureBucketExists } from '@/lib/minio';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions, validateUserSession } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { hasAnyPermission } from '@/lib/permissions';
// import { dispatchWebhooks } from '@/lib/webhookDispatcher'; // Disabled for simplicity
import { broadcastUploadQueueUpdate } from '../sse/broadcastUploadQueueUpdate';
import { retryMinIOUpload, retryDatabaseOperation } from '@/lib/uploadRetry';
import { generateUniqueFilename } from '@/lib/fileUtils';

// Configuration constants
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_FILE_TYPES = ['application/pdf'];
const MAX_FILES_PER_REQUEST = 200; // Increased to handle larger batches

// File validation interface
interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

// Upload result interface
interface UploadResult {
  file_name: string;
  status: 'success' | 'failed';
  file_path?: string;
  file_size?: number;
  error?: string;
  queue_id?: string;
}

// Request validation interface
interface UploadRequest {
  files: File[];
  position_id?: string;
  batch_id?: string;
  source?: string;
  webhook_payload?: any;
}

/**
 * Validates a single file for upload
 */
function validateFile(file: File): FileValidationResult {
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Only PDF files are allowed. Got: ${file.type}`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB. Got: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
    };
  }

  // Check file name
  if (!file.name || file.name.trim().length === 0) {
    return {
      isValid: false,
      error: 'File name is required'
    };
  }

  // Check for potentially dangerous file names
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      isValid: false,
      error: 'File name contains invalid characters'
    };
  }

  return { isValid: true };
}

/**
 * Uploads a single file to MinIO with retry logic
 */
async function uploadToMinIO(file: File, objectName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const result = await retryMinIOUpload(
      async () => {
        await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
          'Content-Type': file.type || 'application/pdf',
          'Content-Disposition': file.type === 'application/pdf' 
            ? `inline; filename="${encodeURIComponent(file.name)}"`
            : `attachment; filename="${encodeURIComponent(file.name)}"`,
        });
      },
      file.name
    );
    
    return result;
  } catch (error) {
    console.error(`[UPLOAD] Error in uploadToMinIO for ${file.name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown MinIO upload error'
    };
  }
}

/**
 * Inserts a job into the upload queue database
 */
async function insertIntoUploadQueue(
  client: any,
  jobData: {
    id: string;
    file_name: string;
    file_size: number;
    file_path: string;
    position_id?: string;
    batch_id?: string;
    source?: string;
    source_id?: string;
    sub_source?: string;
    webhook_payload?: any;
    created_by: string;
  }
): Promise<{ success: boolean; error?: string; job?: any }> {
  const result = await retryDatabaseOperation(
    async () => {
      const res = await client.query(
        `INSERT INTO upload_queue (
          id, file_name, file_size, status, source, upload_id, created_by, 
          file_path, webhook_payload, position_id, source_id, sub_source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          jobData.id,
          jobData.file_name,
          jobData.file_size,
          'queued',
          jobData.source || 'bulk',
          jobData.batch_id || uuidv4(),
          jobData.created_by,
          jobData.file_path,
          jobData.webhook_payload ? JSON.stringify(jobData.webhook_payload) : null,
          jobData.position_id || null,
          jobData.source_id || null,
          jobData.sub_source || null
        ]
      );
      return res.rows[0];
    },
    `insert_upload_queue_${jobData.file_name}`
  );

  return {
    success: result.success,
    job: result.data,
    error: result.success ? undefined : result.error
  };
}

/**
 * Processes a single file upload with atomic MinIO+DB operations
 */
async function processFileUpload(
  file: File,
  client: any,
  options: {
    position_id?: string;
    batch_id?: string;
    source?: string;
    source_id?: string;
    sub_source?: string;
    webhook_payload?: any;
    created_by: string;
  }
): Promise<UploadResult> {
  const jobId = uuidv4();
  
  // Generate filename that preserves the original name
  const fileName = generateUniqueFilename(file.name);
  const objectName = `uploads/${fileName}`;

  // Step 1: Validate file
  const validation = validateFile(file);
  if (!validation.isValid) {
    return {
      file_name: file.name,
      status: 'failed',
      error: validation.error
    };
  }

  // Step 2: Upload to MinIO
  const minioResult = await uploadToMinIO(file, objectName);
  if (!minioResult.success) {
    return {
      file_name: file.name,
      status: 'failed',
      error: minioResult.error
    };
  }

  // Step 3: Insert into upload queue
  const dbResult = await insertIntoUploadQueue(client, {
    id: jobId,
    file_name: file.name,
    file_size: file.size,
    file_path: objectName,
    position_id: options.position_id,
    batch_id: options.batch_id,
    source: options.source,
    source_id: options.source_id,
    sub_source: options.sub_source,
    webhook_payload: options.webhook_payload,
    created_by: options.created_by
  });

  if (!dbResult.success) {
    // If DB insert fails, we should clean up the MinIO file
    try {
      await minioClient.removeObject(MINIO_BUCKET, objectName);
    } catch (cleanupError) {
      console.error(`[UPLOAD] Failed to cleanup MinIO file after DB failure: ${objectName}`, cleanupError);
    }

    return {
      file_name: file.name,
      status: 'failed',
      error: dbResult.error
    };
  }

  return {
    file_name: file.name,
    status: 'success',
    file_path: objectName,
    file_size: file.size,
    queue_id: jobId
  };
}

/**
 * @openapi
 * /api/upload-queue/upload-file:
 *   post:
 *     summary: Upload multiple files to MinIO and add to processing queue
 *     description: Uploads multiple PDF files to MinIO storage and adds them to the upload queue for processing. Requires authentication.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: PDF files to upload
 *               position_id:
 *                 type: string
 *                 description: Optional position ID to assign files to
 *               batch_id:
 *                 type: string
 *                 description: Optional batch ID for grouping uploads
 *               source:
 *                 type: string
 *                 description: Source of the upload (e.g., 'bulk', 'manual')
 *               source_id:
 *                 type: string
 *                 description: Candidate source ID for tracking
 *               sub_source:
 *                 type: string
 *                 description: Sub-source information (optional)
 *     responses:
 *       200:
 *         description: Files uploaded with detailed results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       file_name:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [success, failed]
 *                       file_path:
 *                         type: string
 *                       file_size:
 *                         type: number
 *                       error:
 *                         type: string
 *                       queue_id:
 *                         type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     success:
 *                       type: number
 *                     failed:
 *                       type: number
 *       400:
 *         description: Invalid request (no files, too many files, validation errors)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let client: any = null;
  let session: any = null;
  let dbTimeout: NodeJS.Timeout | undefined = undefined;

  try {
    // Step 1: Authentication and authorization
    session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validation = await validateUserSession(session);
    if (!validation.isValid) {
      console.error(`Upload attempt with invalid session by ${validation.userName || 'Unknown'}`, { 
        invalidUserId: validation.userId,
        sessionUser: validation.userName,
        error: validation.error
      });
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const actingUserId = validation.userId!;
    const actingUserName = validation.userName!;

    // Check permissions using the new permission system
    const canUpload = hasAnyPermission(
      session.user,
      ['USERS_MANAGE', 'BULK_UPLOAD_EXECUTE', 'UPLOAD_QUEUE_MANAGE']
    );
    
    if (!canUpload) {
      console.warn(`Forbidden upload attempt by ${actingUserName}`);
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to upload files' }, { status: 403 });
    }

    // Step 2: Parse and validate request
    const formData = await request.formData();
    
    // Extract files
    let files = formData.getAll('files') as File[];
    if (!files.length) {
      // Fallback to single file field for backward compatibility
      const singleFile = formData.get('file');
      if (singleFile && typeof singleFile !== 'string') {
        files = [singleFile as File];
      }
    }
    
    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate number of files
    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json({ 
        error: `Too many files. Maximum ${MAX_FILES_PER_REQUEST} files per request. Got: ${files.length}` 
      }, { status: 400 });
    }

    // Extract additional parameters
    const position_id = formData.get('position_id') as string || undefined;
    const batch_id = formData.get('batch_id') as string || uuidv4();
    const source = formData.get('source') as string || 'bulk';
    const source_id = formData.get('source_id') as string || undefined;
    const sub_source = formData.get('sub_source') as string || undefined;
    const webhook_payload = formData.get('webhook_payload') ? 
      JSON.parse(formData.get('webhook_payload') as string) : undefined;

    // Step 3: Ensure MinIO bucket exists
    try {
      const bucketResult = await ensureBucketExists();
    } catch (minioError) {
      console.error('[UPLOAD] MinIO bucket check error:', minioError);
      console.error(`MinIO bucket access failed during upload by ${actingUserName}`, {
        error: minioError instanceof Error ? minioError.message : 'Unknown error',
        stack: minioError instanceof Error ? minioError.stack : undefined
      });
      return NextResponse.json({
        error: 'Storage service unavailable. Please try again later.',
        details: 'Failed to access file storage'
      }, { status: 503 });
    }

    // Step 4: Process files with database transaction
    client = await getPool().connect();
    
    // Set a timeout for database operations
    dbTimeout = setTimeout(() => {
      console.error('[UPLOAD] Database operation timeout - forcing rollback');
      if (client) {
        client.query('ROLLBACK').catch((rollbackError: any) => {
          console.error('[UPLOAD] Error during forced rollback:', rollbackError);
        });
      }
    }, 60000); // 1 minute timeout
    
    try {
      await client.query('BEGIN');
    } catch (beginError) {
      clearTimeout(dbTimeout);
      throw beginError;
    }

    const results: UploadResult[] = [];
    const uploadPromises = files.map(async (file, index) => {
      return await processFileUpload(file, client, {
        position_id,
        batch_id,
        source,
        source_id,
        sub_source,
        webhook_payload,
        created_by: actingUserId
      });
    });
    const uploadResults = await Promise.all(uploadPromises);
    results.push(...uploadResults);

    // Step 5: Commit transaction if all operations succeeded
    clearTimeout(dbTimeout);
    await client.query('COMMIT');

    // Step 6: Calculate summary
    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'failed').length;
    
    // Step 7: Log audit events
    const processingTime = Date.now() - startTime;

    // Step 8: Webhooks disabled for simplicity
    // (Webhooks can be re-enabled later when external services are available)

    // Step 9: Broadcast SSE update for real-time UI updates
    try {
      await broadcastUploadQueueUpdate();
    } catch (sseError) {
      console.error('[UPLOAD] Failed to broadcast upload queue update via SSE:', sseError);
    }

    // Step 10: Auto-trigger queue processing if there are successful uploads (fire-and-forget)
    if (successCount > 0) {
      try {
        const processUrl = process.env.UPLOAD_QUEUE_PROCESS_URL || `${request.nextUrl.origin}/api/upload-queue/process`;
        // Fire-and-forget: don't await the fetch to return response immediately
        fetch(processUrl, {
          method: 'POST',
          headers: {
            'x-api-key': process.env.PROCESSOR_API_KEY || '',
          },
        }).catch(autoProcessError => {
          console.error('[UPLOAD] Failed to auto-trigger upload queue processing:', autoProcessError);
        });
      } catch (autoProcessError) {
        console.error('[UPLOAD] Failed to auto-trigger upload queue processing:', autoProcessError);
        // Don't fail the request if auto-processing fails
      }
    }

    // Step 11: Return response
    const response = {
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failureCount
      },
      batch_id,
      processing_time_ms: processingTime
    };

    return NextResponse.json(response, { 
      status: failureCount === 0 ? 200 : 207 // 207 Multi-Status if some files failed
    });

  } catch (error) {
    // Clear database timeout
    if (typeof dbTimeout !== 'undefined') {
      clearTimeout(dbTimeout);
    }
    
    // Rollback transaction if it was started
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('[UPLOAD] Error during transaction rollback:', rollbackError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const processingTime = Date.now() - startTime;

    console.error('[UPLOAD] Upload files error:', error);
    
    // Log the error
    try {
      console.error(`Bulk file upload failed`, {
        error: errorMessage,
        processingTimeMs: processingTime
      });
    } catch (logError) {
      console.error('[UPLOAD] Failed to log audit event:', logError);
    }

    return NextResponse.json({
      error: 'Internal server error during file upload',
      details: errorMessage,
      processing_time_ms: processingTime
    }, { status: 500 });

  } finally {
    // Release database client
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('[UPLOAD] Error releasing database client:', releaseError);
      }
    }
  }
} 
