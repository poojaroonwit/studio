import { auth } from '@/auth';
// src/app/api/applicants/[id]/avatar/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { minioClient, ensureBucketExists, MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';
import { hasPermission, canEditApplicant } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helper to extract applicantId from the URL
function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.url.match(/\/applicants\/([\w-]+)\/avatar/);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const actingUserId = session?.user?.id;
  const actingUserName = (session?.user?.name || session?.user?.email || actingUserId || 'System') as string;

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Initial permission check - we'll do detailed ownership check after retrieving Applicant data
  const hasGlobalEditPermission = hasPermission(session.user, 'APPLICANTS_EDIT_BASIC');
  const hasOwnEditPermission = hasPermission(session.user, 'APPLICANTS_EDIT_BASIC_OWN');
  
  if (!hasGlobalEditPermission && !hasOwnEditPermission) {
    await logAudit('WARN', `Forbidden attempt to upload avatar by ${actingUserName}.`, 'API:Applicants:Upload', actingUserId);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to upload avatars' }, { status: 403 });
  }

  const applicantId = extractIdFromUrl(request);
  if (!applicantId) {
    return NextResponse.json({ message: 'Missing applicantId' }, { status: 400 });
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

    // Check file size (limit to 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json({ message: 'File too large. Maximum size is 500MB.' }, { status: 400 });
    }

    // Ensure MinIO bucket exists; avoid public-read in production
    try {
      await ensureBucketExists();
      if (process.env.ALLOW_PUBLIC_FILES === 'true') {
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
        } as const;
        await minioClient.setBucketPolicy(MINIO_BUCKET, JSON.stringify(policy));
      }
    } catch (minioError) {
      await logAudit('ERROR', `Avatar upload failed - MinIO bucket error: ${minioError}`, 'API:Applicants:Avatar:Upload', actingUserId, { applicantId });
      return NextResponse.json({ message: 'Storage service unavailable' }, { status: 503 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const objectName = `avatars/${applicantId}/${randomUUID()}.${ext}`;

    // Upload to MinIO
    await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
      'Content-Type': file.type,
      // Add CORS headers for COEP compliance
      'Cross-Origin-Resource-Policy': 'cross-origin'
      // Note: CORS headers are set in HTTP response, not MinIO metadata
    });

    // 🔒 SECURITY: Return web application URL instead of direct MinIO URL
    // Use preview endpoint for images displayed in img tags
    const webAppUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:8021'}/api/secure-file/preview?filePath=${encodeURIComponent(objectName)}`;

    // Update Applicant's avatarUrl in the database
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      
      // Get Applicant data for ownership check
      const applicantQuery = 'SELECT "recruiterId" FROM "Applicant" WHERE id = $1';
      const applicantResult = await client.query(applicantQuery, [applicantId]);
      if (applicantResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ message: 'Applicant not found' }, { status: 404 });
      }
      
      const applicant = applicantResult.rows[0];
      
      // Check ownership-based permissions for avatar upload
      if (!hasGlobalEditPermission) {
        const editPermission = canEditApplicant(session.user, applicant.recruiterId, actingUserId);
        if (!editPermission.canEdit) {
          await client.query('ROLLBACK');
          await logAudit('WARN', `Forbidden attempt to upload avatar by ${actingUserName}: ${editPermission.reason}`, 'API:Applicants:Avatar:Upload', actingUserId);
          return NextResponse.json({ message: `Forbidden: ${editPermission.reason}` }, { status: 403 });
        }
      }
      
      const updateQuery = 'UPDATE "Applicant" SET "avatarUrl" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING id, "avatarUrl";';
      const result = await client.query(updateQuery, [webAppUrl, applicantId]);
      await client.query('COMMIT');
      await logAudit('AUDIT', `Avatar uploaded for Applicant ${applicantId} by ${actingUserName}.`, 'API:Applicants:Avatar:Upload', actingUserId, { applicantId, avatarUrl: webAppUrl });
      return NextResponse.json({ message: 'Avatar uploaded successfully', avatarUrl: webAppUrl }, { status: 200 });
    } catch (dbError) {
      await client.query('ROLLBACK');
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      await logAudit('ERROR', `Failed to update Applicant avatar. Error: ${errorMessage}`, 'API:Applicants:Avatar:Upload', actingUserId, { applicantId });
      return NextResponse.json({ message: 'Failed to update Applicant avatar', error: errorMessage }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
          const uploadErrorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      await logAudit('ERROR', `Avatar upload failed. Error: ${uploadErrorMessage}`, 'API:Applicants:Avatar:Upload', actingUserId, { applicantId });
      return NextResponse.json({ message: 'Avatar upload failed', error: uploadErrorMessage }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const applicantId = extractIdFromUrl(request);
  if (!applicantId) {
    return NextResponse.json({ message: 'Missing applicantId' }, { status: 400 });
  }
  
  // SECURITY: Validate UUID format to prevent injection attacks
  const { validateUuid } = await import('@/lib/security');
  if (!validateUuid(applicantId)) {
    console.error('[SECURITY] Invalid UUID format in applicants avatar GET request:', applicantId);
    return NextResponse.json({ message: 'Invalid Applicant ID format' }, { status: 400 });
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT "avatarUrl" FROM "Applicant" WHERE id = $1', [applicantId]);
    if (result.rows.length === 0) {
      return NextResponse.json({ message: 'Applicant not found' }, { status: 404 });
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
