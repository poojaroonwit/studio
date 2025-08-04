import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { minioClient, ensureBucketExists } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const user = token ? await verifyApiToken(token) : null;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
    }

    if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), { status: 403, headers: handleCors(req) });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: 'Content-Type must be multipart/form-data' }), { status: 400, headers: handleCors(req) });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const positionId = formData.get('positionId');

    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400, headers: handleCors(req) });
    }
    if (!positionId || typeof positionId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing positionId' }), { status: 400, headers: handleCors(req) });
    }

  // Store file in MinIO
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop() || 'pdf';
  const uploadId = uuidv4();
  const objectName = `resumes/upload-queue/${uploadId}.${ext}`;
  
  try {
    await ensureBucketExists();
    await minioClient.putObject(
      MINIO_BUCKET,
      objectName,
      buffer,
      buffer.length,
      {
        'Content-Type': file.type || 'application/pdf',
        'x-amz-meta-originalname': file.name,
        'x-amz-meta-uploaded-by': user.id,
        'x-amz-meta-upload-date': new Date().toISOString(),
      }
    );
  } catch (minioError) {
    console.error('MinIO upload error:', minioError);
    return new Response(JSON.stringify({ 
      error: 'Failed to upload file to storage',
      details: minioError instanceof Error ? minioError.message : 'Storage error'
    }), { 
      status: 500, 
      headers: handleCors(req) 
    });
  }
  
  const filePath = `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}`;

  // Prepare upload queue job
  const uploadQueueJob = {
    file_name: file.name,
    file_size: buffer.length,
    status: 'queued',
    source: 'bulk',
    upload_id: uploadId,
    file_path: filePath,
    webhook_payload: { targetPositionId: positionId },
  };

  // Call the upload queue API (internal call)
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/upload-queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('authorization') || '',
      },
      body: JSON.stringify(uploadQueueJob),
    });
    
    if (!res.ok) {
      let errorMessage = 'Failed to add to upload queue';
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.error('Failed to parse upload queue error response:', parseError);
      }
      return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: handleCors(req) });
    }
    
    const data = await res.json();

  return new Response(JSON.stringify({ success: true, uploadQueueJob: data }), {
    status: 201,
    headers: handleCors(req),
  });
  } catch (uploadQueueError) {
    console.error('Upload queue API error:', uploadQueueError);
    return new Response(JSON.stringify({ 
      error: 'Failed to add file to upload queue',
      details: uploadQueueError instanceof Error ? uploadQueueError.message : 'Upload queue error'
    }), { 
      status: 500, 
      headers: handleCors(req) 
    });
  }
  } catch (error) {
    console.error('Bulk upload CV error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500, 
      headers: handleCors(req) 
    });
  }
} 