// src/app/api/candidates/[id]/avatar/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { minioClient, MINIO_BUCKET, MINIO_PUBLIC_BASE_URL, ensureBucketExists } from '@/lib/minio';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

export const dynamic = "force-dynamic";

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.url.match(/\/candidates\/([^/]+)/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to manage candidates
  if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    await logAudit('WARN', `Forbidden attempt to upload avatar by ${actingUserName}.`, 'API:Candidates:Avatar:Upload', actingUserId);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to upload avatars' }, { status: 403 });
  }

  const candidateId = extractIdFromUrl(request);
  if (!candidateId) {
    return NextResponse.json({ message: 'Missing candidateId' }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('avatar');
    
    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Invalid file type. Only image files are allowed.' }, { status: 400 });
    }

    // Check file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ message: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    // Ensure MinIO bucket exists
    try {
      await ensureBucketExists();
    } catch (minioError) {
      console.error('[AVATAR UPLOAD] MinIO bucket error:', minioError);
      await logAudit('ERROR', `Avatar upload failed - MinIO bucket error: ${minioError}`, 'API:Candidates:Avatar:Upload', actingUserId, { candidateId });
      return NextResponse.json({ message: 'Storage service unavailable' }, { status: 503 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const objectName = `avatars/${candidateId}/${randomUUID()}.${ext}`;

    // Upload to MinIO with error handling
    try {
      await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
        'Content-Type': file.type,
        'x-amz-meta-originalname': file.name,
        'x-amz-meta-uploaded-by': actingUserId,
        'x-amz-meta-upload-date': new Date().toISOString(),
      });
    } catch (minioError) {
      console.error('[AVATAR UPLOAD] MinIO upload error:', minioError);
      await logAudit('ERROR', `Avatar upload failed - MinIO upload error: ${minioError}`, 'API:Candidates:Avatar:Upload', actingUserId, { candidateId, fileName: file.name });
      return NextResponse.json({ message: 'Failed to upload file to storage' }, { status: 500 });
    }

    const avatarUrl = `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}`;

    // Update candidate in DB
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if candidate exists first
      const candidateCheck = await client.query('SELECT id, name FROM "Candidate" WHERE id = $1', [candidateId]);
      if (candidateCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        await logAudit('WARN', `Avatar upload attempted for non-existent candidate ${candidateId} by ${actingUserName}`, 'API:Candidates:Avatar:Upload', actingUserId, { candidateId });
        return NextResponse.json({ message: 'Candidate not found' }, { status: 404 });
      }

      // Update with correct field name (avatarUrl in Prisma schema)
      const updateQuery = `UPDATE "Candidate" SET "avatarUrl" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *;`;
      const result = await client.query(updateQuery, [avatarUrl, candidateId]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        await logAudit('ERROR', `Avatar upload failed - candidate update failed for ${candidateId} by ${actingUserName}`, 'API:Candidates:Avatar:Upload', actingUserId, { candidateId });
        return NextResponse.json({ message: 'Failed to update candidate' }, { status: 500 });
      }

      await client.query('COMMIT');
      
      // Log successful upload
      await logAudit('AUDIT', `Avatar uploaded successfully for candidate ${candidateCheck.rows[0].name} (${candidateId}) by ${actingUserName}`, 'API:Candidates:Avatar:Upload', actingUserId, { 
        candidateId, 
        candidateName: candidateCheck.rows[0].name,
        fileName: file.name,
        fileSize: file.size,
        avatarUrl 
      });

      return NextResponse.json({ 
        message: 'Avatar uploaded successfully', 
        avatar_url: avatarUrl,
        candidate: {
          id: candidateId,
          name: candidateCheck.rows[0].name,
          avatarUrl: avatarUrl
        }
      });

    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error('[AVATAR UPLOAD] Database error:', dbError);
      await logAudit('ERROR', `Avatar upload failed - database error: ${dbError}`, 'API:Candidates:Avatar:Upload', actingUserId, { candidateId });
      return NextResponse.json({ message: 'Database error', error: String(dbError) }, { status: 500 });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('[AVATAR UPLOAD] Unexpected error:', error);
    await logAudit('ERROR', `Avatar upload failed - unexpected error: ${error}`, 'API:Candidates:Avatar:Upload', actingUserId, { candidateId });
    return NextResponse.json({ message: 'Internal server error', error: String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const candidateId = extractIdFromUrl(request);
  if (!candidateId) {
    return NextResponse.json({ message: 'Missing candidateId' }, { status: 400 });
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT "avatarUrl" FROM "Candidate" WHERE id = $1', [candidateId]);
    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Candidate not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      avatar_url: result.rows[0].avatarUrl || null 
    });
  } catch (error) {
    console.error('[AVATAR GET] Database error:', error);
    return NextResponse.json({ message: 'Database error', error: String(error) }, { status: 500 });
  } finally {
    client.release();
  }
}
