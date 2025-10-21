import { NextRequest } from 'next/server';
import { minioClient, ensureBucketExists, MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';
import { verifyApiToken } from '@/lib/auth';
import { handleCors } from '@/lib/cors';
import { 
  createSuccessResponse, 
  handleApiError, 
  createUnauthorizedError, 
  createForbiddenError, 
  createValidationError, 
  createNotFoundError, 
  createInternalServerError 
} from '@/lib/apiErrorHandler';
import { sanitizeFilename } from '@/lib/fileUtils';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = await params;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  // Initial permission check - we'll do detailed ownership check after retrieving candidate data
  const hasGlobalEditPermission = user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC');
  const hasOwnEditPermission = user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC_OWN');
  
  if (user.role !== 'Admin' && !hasGlobalEditPermission && !hasOwnEditPermission) {
    return handleApiError(req, createForbiddenError('Insufficient permissions to upload avatars'));
  }

  try {
    const formData = await req.formData();
    const file = formData.get('avatar');
    
    if (!file || typeof file === 'string') {
      return handleApiError(req, createValidationError('No file uploaded'));
    }

    if (!file.type.startsWith('image/')) {
      return handleApiError(req, createValidationError('Invalid file type. Only image files are allowed.'));
    }

    // Check file size (limit to 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return handleApiError(req, createValidationError('File too large. Maximum size is 500MB.'));
    }

    // Ensure MinIO bucket exists
    try {
      await ensureBucketExists();
    } catch (minioError) {
      return handleApiError(req, createInternalServerError('Storage service unavailable', { 
        originalError: String(minioError) 
      }));
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const objectName = `avatars/${candidateId}/${randomUUID()}.${ext}`;

    // Upload to MinIO with error handling
    try {
      await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
        'Content-Type': file.type,
        'x-amz-meta-originalname': sanitizeFilename(file.name),
        'x-amz-meta-uploaded-by': user.id,
        'x-amz-meta-upload-date': new Date().toISOString(),
      });
    } catch (minioError) {
      return handleApiError(req, createInternalServerError('Failed to upload file to storage', { 
        originalError: String(minioError) 
      }));
    }

    // 🔒 SECURITY: Return web application URL instead of direct MinIO URL
    const avatarUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:8021'}/api/secure-file/stream?filePath=${encodeURIComponent(objectName)}`;

    // Update candidate in DB
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      
      // Check if candidate exists first and get recruiter info for ownership check
      const candidateCheck = await client.query('SELECT id, name, "recruiterId" FROM "Candidate" WHERE id = $1', [candidateId]);
      if (candidateCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return handleApiError(req, createNotFoundError('Candidate not found'));
      }
      
      const candidate = candidateCheck.rows[0];
      
      // Check ownership-based permissions for avatar upload
      if (user.role !== 'Admin' && !hasGlobalEditPermission) {
        const isOwnCandidate = candidate.recruiterId === user.id;
        if (!isOwnCandidate || !hasOwnEditPermission) {
          await client.query('ROLLBACK');
          return handleApiError(req, createForbiddenError('You can only upload avatars for candidates assigned to you'));
        }
      }

      // Update with correct field name (avatarUrl in Prisma schema)
      const updateQuery = `UPDATE "Candidate" SET "avatarUrl" = $1 WHERE id = $2 RETURNING *;`;
      const result = await client.query(updateQuery, [avatarUrl, candidateId]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return handleApiError(req, createInternalServerError('Failed to update candidate'));
      }

      await client.query('COMMIT');
      
      return createSuccessResponse(req, { 
        message: 'Avatar uploaded successfully', 
        avatar_url: avatarUrl,
        candidate: {
          id: candidateId,
          name: candidateCheck.rows[0].name,
          avatarUrl: avatarUrl
        }
      }, 200);

    } catch (dbError) {
      await client.query('ROLLBACK');
      return handleApiError(req, createInternalServerError('Database error', { 
        originalError: String(dbError) 
      }));
    } finally {
      client.release();
    }

  } catch (error) {
    return handleApiError(req, createInternalServerError('Internal server error', { 
      originalError: String(error) 
    }));
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = await params;
  
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const user = token ? await verifyApiToken(token) : null;
  
  if (!user) {
    return handleApiError(req, createUnauthorizedError('Authentication required'));
  }

  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT "avatarUrl" FROM "Candidate" WHERE id = $1', [candidateId]);
    if (result.rows.length === 0) {
      return handleApiError(req, createNotFoundError('Candidate not found'));
    }
    
    return createSuccessResponse(req, { 
      avatar_url: result.rows[0].avatarUrl || null 
    }, 200);
  } catch (error) {
    return handleApiError(req, createInternalServerError('Database error', { 
      originalError: String(error) 
    }));
  } finally {
    client.release();
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new Response(null, { status: 200, headers });
} 