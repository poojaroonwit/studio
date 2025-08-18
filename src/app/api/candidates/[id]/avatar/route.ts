// src/app/api/candidates/[id]/avatar/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { minioClient, ensureBucketExists } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

// Helper to extract candidateId from the URL
function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.url.match(/\/candidates\/([\w-]+)\/avatar/);
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

    // Ensure MinIO bucket exists and has public read access
    try {
      await ensureBucketExists();
      
      // Set bucket policy for public read access
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${MINIO_BUCKET}/*`]
          }
        ]
      };
      
      await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
    } catch (minioError) {
      await logAudit('ERROR', `Avatar upload failed - MinIO bucket error: ${minioError}`, 'API:Candidates:Avatar:Upload', actingUserId, { candidateId });
      return NextResponse.json({ message: 'Storage service unavailable' }, { status: 503 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const objectName = `avatars/${candidateId}/${randomUUID()}.${ext}`;

    // Upload to MinIO
    await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
      'Content-Type': file.type,
    });

    // Use the MinIO API port for public access, not the console port
    const publicUrl = `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}`;

    // Update candidate's avatarUrl in the database
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const updateQuery = 'UPDATE "Candidate" SET "avatarUrl" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING id, "avatarUrl";';
      const result = await client.query(updateQuery, [publicUrl, candidateId]);
      await client.query('COMMIT');
      if (result.rows.length === 0) {
        return NextResponse.json({ message: 'Candidate not found' }, { status: 404 });
      }
      await logAudit('AUDIT', `Avatar uploaded for candidate ${candidateId} by ${actingUserName}.`, 'API:Candidates:Avatar:Upload', actingUserId, { candidateId, avatarUrl: publicUrl });
      return NextResponse.json({ message: 'Avatar uploaded successfully', avatarUrl: publicUrl }, { status: 200 });
    } catch (dbError) {
      await client.query('ROLLBACK');
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      await logAudit('ERROR', `Failed to update candidate avatar. Error: ${errorMessage}`, 'API:Candidates:Avatar:Upload', actingUserId, { candidateId });
      return NextResponse.json({ message: 'Failed to update candidate avatar', error: errorMessage }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
          const uploadErrorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      await logAudit('ERROR', `Avatar upload failed. Error: ${uploadErrorMessage}`, 'API:Candidates:Avatar:Upload', actingUserId, { candidateId });
      return NextResponse.json({ message: 'Avatar upload failed', error: uploadErrorMessage }, { status: 500 });
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
    return NextResponse.json({ message: 'Database error', error: String(error) }, { status: 500 });
  } finally {
    client.release();
  }
}
