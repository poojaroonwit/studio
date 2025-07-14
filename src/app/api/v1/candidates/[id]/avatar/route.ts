import { NextRequest } from 'next/server';
import { minioClient, MINIO_BUCKET, MINIO_PUBLIC_BASE_URL, ensureBucketExists } from '@/lib/minio';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: candidateId } = params;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  if (user.role !== 'Admin' && !user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions to upload avatars' }), { status: 403, headers: handleCors(req) });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('avatar');
    
    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400, headers: handleCors(req) });
    }

    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Only image files are allowed.' }), { status: 400, headers: handleCors(req) });
    }

    // Check file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum size is 5MB.' }), { status: 400, headers: handleCors(req) });
    }

    // Ensure MinIO bucket exists
    try {
      await ensureBucketExists();
    } catch (minioError) {
      console.error('[V1 AVATAR UPLOAD] MinIO bucket error:', minioError);
      return new Response(JSON.stringify({ error: 'Storage service unavailable' }), { status: 503, headers: handleCors(req) });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const objectName = `avatars/${candidateId}/${randomUUID()}.${ext}`;

    // Upload to MinIO with error handling
    try {
      await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
        'Content-Type': file.type,
        'x-amz-meta-originalname': file.name,
        'x-amz-meta-uploaded-by': user.id,
        'x-amz-meta-upload-date': new Date().toISOString(),
      });
    } catch (minioError) {
      console.error('[V1 AVATAR UPLOAD] MinIO upload error:', minioError);
      return new Response(JSON.stringify({ error: 'Failed to upload file to storage' }), { status: 500, headers: handleCors(req) });
    }

    const avatarUrl = `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}`;

    // Update candidate in DB
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      
      // Check if candidate exists first
      const candidateCheck = await client.query('SELECT id, name FROM "Candidate" WHERE id = $1', [candidateId]);
      if (candidateCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: handleCors(req) });
      }

      // Update with correct field name (avatarUrl in Prisma schema)
      const updateQuery = `UPDATE "Candidate" SET "avatarUrl" = $1 WHERE id = $2 RETURNING *;`;
      const result = await client.query(updateQuery, [avatarUrl, candidateId]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return new Response(JSON.stringify({ error: 'Failed to update candidate' }), { status: 500, headers: handleCors(req) });
      }

      await client.query('COMMIT');
      
      return new Response(JSON.stringify({ 
        message: 'Avatar uploaded successfully', 
        avatar_url: avatarUrl,
        candidate: {
          id: candidateId,
          name: candidateCheck.rows[0].name,
          avatarUrl: avatarUrl
        }
      }), { status: 200, headers: handleCors(req) });

    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error('[V1 AVATAR UPLOAD] Database error:', dbError);
      return new Response(JSON.stringify({ error: 'Database error', details: String(dbError) }), { status: 500, headers: handleCors(req) });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[V1 AVATAR UPLOAD] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), { status: 500, headers: handleCors(req) });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id: candidateId } = params;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: handleCors(req) });
  }

  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT "avatarUrl" FROM "Candidate" WHERE id = $1', [candidateId]);
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Candidate not found' }), { status: 404, headers: handleCors(req) });
    }
    
    return new Response(JSON.stringify({ 
      avatar_url: result.rows[0].avatarUrl || null 
    }), { status: 200, headers: handleCors(req) });
  } catch (error) {
    console.error('[V1 AVATAR GET] Database error:', error);
    return new Response(JSON.stringify({ error: 'Database error', details: String(error) }), { status: 500, headers: handleCors(req) });
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 