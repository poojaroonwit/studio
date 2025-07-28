import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions, validateUserSession } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { uploadToMinIO } from '@/lib/minio';
import { retryWithErrorChecking } from '@/lib/uploadQueueRetry';

/**
 * @openapi
 * /api/upload-queue/fast-bulk-insert:
 *   post:
 *     summary: Fast bulk insert - upload files to MinIO and database without queue processing
 *     description: Uploads multiple files to MinIO storage and inserts into database queue immediately. Queue processing happens asynchronously.
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
 *               position_id:
 *                 type: string
 *               batch_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Files uploaded and queued successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check permissions
  const canManageUploadQueue = session.user.role === 'Admin' || 
    session.user.modulePermissions?.includes('UPLOAD_QUEUE_MANAGE');
  
  if (!canManageUploadQueue) {
    await logAudit('WARN', `Forbidden attempt to fast bulk insert by ${session.user.name || session.user.email || 'Unknown'}`, 'API:UploadQueue:FastBulkInsert', session.user.id);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to manage upload queue' }, { status: 403 });
  }

  const validation = await validateUserSession(session);
  if (!validation.isValid) {
    await logAudit('ERROR', `Fast bulk insert attempted with invalid session by ${validation.userName || 'Unknown'}`, 'API:UploadQueue:FastBulkInsert', null, { 
      invalidUserId: validation.userId,
      sessionUser: validation.userName,
      error: validation.error
    });
    return NextResponse.json({ error: validation.error }, { status: 401 });
  }

  const actingUserId = validation.userId!;
  const actingUserName = validation.userName!;

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const positionId = formData.get('position_id') as string;
    const batchId = formData.get('batch_id') as string || crypto.randomUUID();
    const source = formData.get('source') as string || 'bulk';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > 1000) {
      return NextResponse.json({ error: 'Maximum 1000 files per bulk upload' }, { status: 400 });
    }

    const client = await getPool().connect();
    const results = [];
    const errors = [];
    const uploadPromises = [];

    try {
      await client.query('BEGIN');

      // Process each file: upload to MinIO and insert to database
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;
        const fileSize = file.size;
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        // Generate unique file path
        const timestamp = Date.now();
        const filePath = `uploads/${batchId}/${timestamp}-${fileName}`;

        // Upload to MinIO and insert to database concurrently
        const uploadPromise = (async () => {
          try {
            // Upload to MinIO with retry
            const minioResult = await retryWithErrorChecking(
              async () => {
                return await uploadToMinIO(filePath, fileBuffer, file.type || 'application/octet-stream');
              },
              { maxRetries: 2, baseDelay: 500 },
              `MinIO:${fileName}`
            );

            if (!minioResult.success) {
              throw new Error(`MinIO upload failed: ${minioResult.error}`);
            }

            // Insert into database with retry
            const dbResult = await retryWithErrorChecking(
              async () => {
                const res = await client.query(
                  `INSERT INTO upload_queue (id, file_name, file_size, status, source, upload_id, created_by, file_path, webhook_payload, position_id)
                   VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
                   RETURNING *`,
                  [
                    fileName,
                    fileSize,
                    'queued', // Start as queued, processor will handle later
                    source,
                    batchId,
                    actingUserId,
                    filePath,
                    JSON.stringify({
                      targetPositionId: positionId || null,
                      uploadBatch: batchId,
                      uploadedAt: new Date().toISOString()
                    }),
                    positionId
                  ]
                );
                return res.rows[0];
              },
              { maxRetries: 2, baseDelay: 500 },
              `DB:${fileName}`
            );

            if (!dbResult.success) {
              // If DB insert fails, we should clean up the MinIO file
              try {
                // Note: You might want to implement a cleanup function for MinIO
                console.warn(`Database insert failed for ${fileName}, MinIO file may need cleanup: ${filePath}`);
              } catch (cleanupError) {
                console.error(`Failed to cleanup MinIO file ${filePath}:`, cleanupError);
              }
              throw new Error(`Database insert failed: ${dbResult.error}`);
            }

            return {
              index: i,
              fileName,
              success: true,
              filePath,
              queueId: dbResult.data.id,
              minioRetries: minioResult.retries,
              dbRetries: dbResult.retries
            };

          } catch (error) {
            return {
              index: i,
              fileName,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })();

        uploadPromises.push(uploadPromise);
      }

      // Wait for all uploads to complete
      const uploadResults = await Promise.all(uploadPromises);

      // Process results
      for (const result of uploadResults) {
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      }

      if (results.length > 0) {
        await client.query('COMMIT');

        // Log successful bulk upload
        await logAudit('AUDIT', `Fast bulk uploaded ${results.length} files by ${actingUserName}`, 'API:UploadQueue:FastBulkInsert', actingUserId, { 
          totalFiles: files.length,
          successfulFiles: results.length,
          failedFiles: errors.length,
          batchId
        });

        // Auto-trigger processing (non-blocking)
        try {
          const processUrl = process.env.UPLOAD_QUEUE_PROCESS_URL || `${request.nextUrl.origin}/api/upload-queue/process`;
          fetch(processUrl, {
            method: 'POST',
            headers: {
              'x-api-key': process.env.PROCESSOR_API_KEY || '',
            },
          }).catch(error => {
            console.error('Failed to auto-trigger processing:', error);
            // Don't fail the request if auto-trigger fails
          });
        } catch (autoProcessError) {
          console.error('Failed to auto-trigger upload queue processing:', autoProcessError);
        }

        return NextResponse.json({
          success: true,
          total: files.length,
          successful: results.length,
          failed: errors.length,
          batchId,
          results: results,
          errors: errors,
          message: `${results.length} files uploaded and queued successfully. ${errors.length} files failed. Processing will start automatically.`
        }, { status: 201 });

      } else {
        await client.query('ROLLBACK');
        return NextResponse.json({
          success: false,
          error: 'All file uploads failed',
          errors: errors
        }, { status: 500 });
      }

    } catch (error) {
      await client.query('ROLLBACK');
      
      await logAudit('ERROR', `Fast bulk upload failed by ${actingUserName}. Error: ${(error as Error).message}`, 'API:UploadQueue:FastBulkInsert', actingUserId, { 
        totalFiles: files.length,
        error: (error as Error).message 
      });

      return NextResponse.json({
        success: false,
        error: 'Bulk upload failed',
        details: (error as Error).message
      }, { status: 500 });
    } finally {
      client.release();
    }

  } catch (error) {
    await logAudit('ERROR', `Fast bulk upload request failed by ${actingUserName}. Error: ${(error as Error).message}`, 'API:UploadQueue:FastBulkInsert', actingUserId, { 
      error: (error as Error).message 
    });

    return NextResponse.json({
      success: false,
      error: 'Request processing failed',
      details: (error as Error).message
    }, { status: 500 });
  }
} 