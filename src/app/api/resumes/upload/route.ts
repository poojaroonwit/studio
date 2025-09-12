import { NextResponse, type NextRequest } from 'next/server';
import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateUniqueFilename, sanitizeFilename } from '@/lib/fileUtils';
import { hasAnyPermission, canUploadResumes } from '@/lib/permissions';

export const dynamic = 'force-dynamic';


/**
 * @openapi
 * /api/resumes/upload:
 *   post:
 *     summary: Upload a resume
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Resume uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Initial permission check - we'll do detailed ownership check after retrieving candidate data
  const hasGlobalResumePermission = hasAnyPermission(session.user, ['USERS_MANAGE', 'CANDIDATES_RESUMES_UPLOAD']);
  const hasOwnResumePermission = hasAnyPermission(session.user, ['CANDIDATES_RESUMES_UPLOAD_OWN']);
  
  if (!hasGlobalResumePermission && !hasOwnResumePermission) {
    await logAudit('WARN', `Forbidden attempt to upload resume by ${actingUserName}`, 'API:Resumes:Upload', actingUserId);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to manage candidate resumes' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const candidateId = url.searchParams.get('candidateId');
    if (!candidateId) {
      await logAudit('WARN', `Resume upload attempted without candidateId by ${actingUserName}`, 'API:Resumes:Upload', actingUserId);
      return NextResponse.json({ message: 'Missing candidateId' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('resume');
    const positionId = formData.get('position_id') as string | null;
    const sourceId = formData.get('source_id') as string | null;
    if (!file || typeof file === 'string') {
      await logAudit('WARN', `Resume upload attempted without file by ${actingUserName} for candidate ${candidateId}`, 'API:Resumes:Upload', actingUserId, { candidateId });
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }
    if (!positionId) {
      await logAudit('ERROR', `Resume upload failed - missing position_id by ${actingUserName}`, 'API:Resumes:Upload', actingUserId, { candidateId, fileName: file.name });
      return NextResponse.json({ message: 'position_id is required.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name;
    
    // Generate filename that preserves the original name
    const jobId = randomUUID();
    const fileName = generateUniqueFilename(originalName);
    const objectName = `resumes/${candidateId}/${fileName}`;

    // Upload to MinIO
    await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
      'Content-Type': file.type,
      'x-amz-meta-originalname': sanitizeFilename(originalName),
    });

    // Update candidate in DB
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get candidate data for ownership check
      const candidateQuery = `SELECT "recruiterId" FROM "Candidate" WHERE id = $1`;
      const candidateResult = await client.query(candidateQuery, [candidateId]);
      if (candidateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        await logAudit('ERROR', `Resume upload failed - candidate not found by ${actingUserName}`, 'API:Resumes:Upload', actingUserId, { candidateId, fileName: originalName });
        return NextResponse.json({ message: 'Candidate not found' }, { status: 404 });
      }
      
      const candidate = candidateResult.rows[0];
      
      // Check ownership-based permissions for resume upload
      if (!hasGlobalResumePermission) {
        const resumePermission = canUploadResumes(session.user, candidate.recruiterId, actingUserId);
        if (!resumePermission.canUpload) {
          await client.query('ROLLBACK');
          await logAudit('WARN', `Forbidden attempt to upload resume by ${actingUserName}: ${resumePermission.reason}`, 'API:Resumes:Upload', actingUserId);
          return NextResponse.json({ message: `Forbidden: ${resumePermission.reason}` }, { status: 403 });
        }
      }

      // Update candidate's resume path
      const updateQuery = `UPDATE "Candidate" SET "resumePath" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *;`;
      const result = await client.query(updateQuery, [objectName, candidateId]);
      const updatedCandidate = result.rows[0];

      // Create attachment entry for resume history
      const historyQuery = `
        INSERT INTO "Attachment" (id, "candidateId", "uploadedById", "filePath", "fileName", label, "isPrimary", "uploadedAt", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, 'Resume', true, NOW(), NOW(), NOW());
      `;
      await client.query(historyQuery, [randomUUID(), candidateId, actingUserId, objectName, originalName]);

      // Build webhook payload in requested format
      const webhookPayload = {
        inputs: {
          cv_url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}`,
          candidate_id: candidateId,
          jobId: updatedCandidate.positionid || updatedCandidate.positionId || null, // support both casings
          filename: originalName,
          mimetype: file.type
        },
        response_mode: 'blocking',
        user: actingUserId,
        request_type: "create", // Indicate this is a create request for CV processing
        sourceId: sourceId // Include sourceId in webhook payload (at root level like bulk upload)
      };

      // Add to upload queue for webhook processing
      const queueId = randomUUID();
      await client.query(
        `INSERT INTO upload_queue (id, file_name, file_size, status, source, upload_id, created_by, file_path, webhook_payload, position_id, source_id, sub_source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          queueId,
          originalName,
          buffer.length,
          'queued',
          'single',
          null,
          actingUserId,
          objectName,
          JSON.stringify(webhookPayload),
          positionId,
          sourceId,
          null
        ]
      );

      await client.query('COMMIT');

      await logAudit('AUDIT', `Resume '${originalName}' uploaded for candidate '${candidate.name}' by ${actingUserName}`, 'API:Resumes:Upload', actingUserId, { 
        candidateId, 
        candidateName: candidate.name,
        fileName: originalName,
        fileSize: buffer.length,
        filePath: objectName 
      });

      return NextResponse.json({ message: 'Resume uploaded', candidate, file_path: objectName, url: `${MINIO_PUBLIC_BASE_URL}/${MINIO_BUCKET}/${objectName}` });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Resume upload error:', error);
    await logAudit('ERROR', `Resume upload failed by ${actingUserName}. Error: ${(error as Error).message}`, 'API:Resumes:Upload', actingUserId, { 
      candidateId: new URL(request.url).searchParams.get('candidateId'),
      error: (error as Error).message 
    });
    return NextResponse.json({ message: (error as Error).message || 'Internal server error' }, { status: 500 });
  }
}
