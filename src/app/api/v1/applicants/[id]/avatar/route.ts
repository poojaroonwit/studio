export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { minioClient, ensureBucketExists, MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { SimpleErrorHandler,
  createUnauthorizedError,
  createForbiddenError,
  createValidationError,
  createNotFoundError,
  createInternalServerError
} from '@/lib/errors';;
import { sanitizeFilename } from '@/lib/fileUtils';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const applicantId = resolvedParams.id;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  // Initial permission check - we'll do detailed ownership check after retrieving Applicant data
  const hasGlobalEditPermission = user.modulePermissions?.includes('APPLICANTS_EDIT_BASIC');
  const hasOwnEditPermission = user.modulePermissions?.includes('APPLICANTS_EDIT_BASIC_OWN');
  
  if (user.role !== 'Admin' && !hasGlobalEditPermission && !hasOwnEditPermission) {
    return SimpleErrorHandler.handleApiError(req, createForbiddenError('Insufficient permissions to upload avatars'));
  }

  try {
    const formData = await req.formData();
    const file = formData.get('avatar');
    
    if (!file || typeof file === 'string') {
      return SimpleErrorHandler.handleApiError(req, createValidationError('No file uploaded'));
    }

    if (!file.type.startsWith('image/')) {
      return SimpleErrorHandler.handleApiError(req, createValidationError('Invalid file type. Only image files are allowed.'));
    }

    // Check file size (limit to 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return SimpleErrorHandler.handleApiError(req, createValidationError('File too large. Maximum size is 500MB.'));
    }

    // Ensure MinIO bucket exists
    try {
      await ensureBucketExists();
    } catch (minioError) {
      const errorMessage = minioError instanceof Error ? minioError.message : String(minioError);
      return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Storage service unavailable: ${errorMessage}`));
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const objectName = `avatars/${applicantId}/${randomUUID()}.${ext}`;

    // Upload to MinIO with error handling
    try {
      await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
        'Content-Type': file.type,
        'x-amz-meta-originalname': sanitizeFilename(file.name),
        'x-amz-meta-uploaded-by': user.id,
        'x-amz-meta-upload-date': new Date().toISOString(),
      });
    } catch (minioError) {
      const errorMessage = minioError instanceof Error ? minioError.message : String(minioError);
      return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Failed to upload file to storage: ${errorMessage}`));
    }

    // 🔒 SECURITY: Return web application URL instead of direct MinIO URL
    // Use preview endpoint for images displayed in img tags
    const avatarUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:8021'}/api/secure-file/preview?filePath=${encodeURIComponent(objectName)}`;

    // Update Applicant in DB
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      
      // Check if Applicant exists first and get recruiter info for ownership check
      const applicantCheck = await client.query('SELECT id, name, "recruiterId" FROM "Applicant" WHERE id = $1', [applicantId]);
      if (applicantCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return SimpleErrorHandler.handleApiError(req, createNotFoundError('Applicant not found'));
      }
      
      const applicant = applicantCheck.rows[0];
      
      // Check ownership-based permissions for avatar upload
      if (user.role !== 'Admin' && !hasGlobalEditPermission) {
        const isOwnApplicant = applicant.recruiterId === user.id;
        if (!isOwnApplicant || !hasOwnEditPermission) {
          await client.query('ROLLBACK');
          return SimpleErrorHandler.handleApiError(req, createForbiddenError('You can only upload avatars for applicants assigned to you'));
        }
      }

      // Update with correct field name (avatarUrl in Prisma schema)
      const updateQuery = `UPDATE "Applicant" SET "avatarUrl" = $1 WHERE id = $2 RETURNING *;`;
      const result = await client.query(updateQuery, [avatarUrl, applicantId]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return SimpleErrorHandler.handleApiError(req, createInternalServerError('Failed to update Applicant'));
      }

      await client.query('COMMIT');
      
      return SimpleErrorHandler.createSuccessResponse(req, { 
        message: 'Avatar uploaded successfully', 
        avatar_url: avatarUrl,
        applicant: {
          id: applicantId,
          name: applicantCheck.rows[0].name,
          avatarUrl: avatarUrl
        }
      }, 200);

    } catch (dbError) {
      await client.query('ROLLBACK');
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Database error: ${errorMessage}`));
    } finally {
      client.release();
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Internal server error: ${errorMessage}`));
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams2 = await params;
  const applicantId = resolvedParams2.id;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return SimpleErrorHandler.handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT "avatarUrl" FROM "Applicant" WHERE id = $1', [applicantId]);
    if (result.rows.length === 0) {
      return SimpleErrorHandler.handleApiError(req, createNotFoundError('Applicant not found'));
    }
    
    return SimpleErrorHandler.createSuccessResponse(req, { 
      avatar_url: result.rows[0].avatarUrl || null 
    }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return SimpleErrorHandler.handleApiError(req, createInternalServerError(`Database error: ${errorMessage}`));
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 