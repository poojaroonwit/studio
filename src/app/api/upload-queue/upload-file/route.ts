import { NextRequest, NextResponse } from 'next/server';
import { minioClient, MINIO_BUCKET, ensureBucketExists } from '@/lib/minio';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * @openapi
 * /api/upload-queue/upload-file:
 *   post:
 *     summary: Upload multiple files to MinIO
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
 *     responses:
 *       200:
 *         description: Files uploaded with status
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
 *                       file_path:
 *                         type: string
 *                       error:
 *                         type: string
 *       400:
 *         description: No files uploaded
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {

    
    const session = await getServerSession(authOptions);
    if (!session) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[UPLOAD] Processing upload for user: ${session.user?.email}`);

    const formData = await request.formData();
    // Accept both 'files' (array) and fallback to 'file' (single) for backward compatibility
    let files = formData.getAll('files');
    if (!files.length) {
      // fallback to single file field
      const singleFile = formData.get('file');
      if (singleFile && typeof singleFile !== 'string') {
        files = [singleFile];
      }
    }
    
    console.log(`[UPLOAD] Found ${files.length} files to process`);
    
    if (!files.length) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    // Ensure bucket exists before uploading
    console.log('[UPLOAD] Ensuring MinIO bucket exists...');
    try {
      await ensureBucketExists();
      console.log('[UPLOAD] MinIO bucket is ready');
    } catch (minioError) {
      console.error('[UPLOAD] MinIO bucket check error:', minioError);
      return NextResponse.json({
        error: 'Failed to access storage. Please check your MinIO configuration.',
        details: minioError instanceof Error ? minioError.message : 'Unknown error'
      }, { status: 500 });
    }

    const results = await Promise.all(files.map(async (file: any, index: number) => {
      console.log(`[UPLOAD] Processing file ${index + 1}/${files.length}: ${file?.name || 'unknown'}`);
      
      if (!file || typeof file === 'string') {
        console.log(`[UPLOAD] Invalid file object for file ${index + 1}`);
        return {
          file_name: typeof file === 'string' ? file : 'unknown',
          status: 'failed',
          error: 'Invalid file object',
        };
      }

      const ext = file.name.split('.').pop() || 'bin';
      const objectName = `uploads/${uuidv4()}.${ext}`;
      
      let buffer;
      try {
        console.log(`[UPLOAD] Reading file buffer for: ${file.name}`);
        buffer = Buffer.from(await file.arrayBuffer());
        console.log(`[UPLOAD] File buffer size: ${buffer.length} bytes`);
      } catch (err) {
        console.error(`[UPLOAD] Failed to read file buffer for ${file.name}:`, err);
        return {
          file_name: file.name,
          status: 'failed',
          error: 'Failed to read file buffer',
        };
      }

      try {
        console.log(`[UPLOAD] Uploading ${file.name} to MinIO as ${objectName}`);
        await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
          'Content-Type': file.type || 'application/octet-stream',
        });
        console.log(`[UPLOAD] Successfully uploaded ${file.name}`);
        return {
          file_name: file.name,
          status: 'success',
          file_path: objectName,
        };
      } catch (minioError) {
        console.error(`[UPLOAD] MinIO upload error for ${file.name}:`, minioError);
        return {
          file_name: file.name,
          status: 'failed',
          error: `Failed to upload file to storage: ${minioError instanceof Error ? minioError.message : 'Unknown error'}`,
        };
      }
    }));

    const successCount = results.filter(r => r.status === 'success').length;
    const failureCount = results.filter(r => r.status === 'failed').length;
    
    console.log(`[UPLOAD] Upload completed. Success: ${successCount}, Failed: ${failureCount}`);

    return NextResponse.json({ 
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failureCount
      }
    });
  } catch (error) {
    console.error('[UPLOAD] Upload files error:', error);
    return NextResponse.json({
      error: 'Internal server error during file upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 