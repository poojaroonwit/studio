import { NextResponse, type NextRequest } from 'next/server';
import { minioClient } from '@/lib/minio';
import { MINIO_BUCKET, MINIO_PUBLIC_BASE_URL } from '@/lib/minio-constants';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';
import { logAudit } from '@/lib/auditLog';
import { generateUniqueFilename, sanitizeFilename } from '@/lib/fileUtils';
import { hasAnyPermission, canUploadResumes } from '@/lib/permissions';

import { auth } from '@/auth';
import { validateFileUpload } from '@/lib/security';
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
  const session = await auth();
  const actingUserId = session?.user?.id;
  const actingUserName = (session?.user?.name || session?.user?.email || actingUserId || 'System') as string;

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Initial permission check - we'll do detailed ownership check after retrieving Applicant data
  const hasGlobalResumePermission = hasAnyPermission(session.user, ['USERS_MANAGE', 'Applicants_RESUMES_UPLOAD']);
  const hasOwnResumePermission = hasAnyPermission(session.user, ['Applicants_RESUMES_UPLOAD_OWN']);

  if (!hasGlobalResumePermission && !hasOwnResumePermission) {
    await logAudit('WARN', `Forbidden attempt to upload resume by ${actingUserName}`, 'API:Resumes:Upload', actingUserId);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to manage Applicant resumes' }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const targetApplicantId = url.searchParams.get('applicantId');
    if (!targetApplicantId) {
      await logAudit('WARN', `Resume upload attempted without applicantId by ${actingUserName}`, 'API:Resumes:Upload', actingUserId);
      return NextResponse.json({ message: 'Missing applicantId' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('resume');
    const positionId = formData.get('position_id') as string | null;
    const sourceIdRaw = formData.get('source_id') as string | null;

    // Handle sourceId properly - convert string "null" to actual null
    const sourceId = sourceIdRaw && sourceIdRaw !== 'null' ? sourceIdRaw : null;
    if (!file || typeof file === 'string') {
      await logAudit('WARN', `Resume upload attempted without file by ${actingUserName} for Applicant ${targetApplicantId}`, 'API:Resumes:Upload', actingUserId, { applicantId: targetApplicantId });
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }
    if (!positionId) {
      await logAudit('ERROR', `Resume upload failed - missing position_id by ${actingUserName}`, 'API:Resumes:Upload', actingUserId, { applicantId: targetApplicantId, fileName: file.name });
      return NextResponse.json({ message: 'position_id is required.' }, { status: 400 });
    }

    // SECURITY: Validate file upload (size, mimetype, extension)
    const validation = await validateFileUpload(file.name, file.type, file.size);
    if (!validation.valid) {
      await logAudit('WARN', `Resume upload rejected: ${validation.errors.join(', ')} by ${actingUserName}`, 'API:Resumes:Upload', actingUserId, { applicantId: targetApplicantId, fileName: file.name });
      return NextResponse.json({ message: 'Invalid file', errors: validation.errors }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name;

    // Generate filename that preserves the original name
    const jobId = randomUUID();
    const fileName = generateUniqueFilename(originalName);
    const objectName = `resumes/${targetApplicantId}/${fileName}`;

    // Upload to MinIO
    await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
      'Content-Type': file.type,
      'x-amz-meta-originalname': sanitizeFilename(originalName),
    });

    // Update Applicant in DB
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get applicant data for ownership check
      const applicantQuery = `SELECT "recruiterId" FROM "applicant" WHERE id = $1`;
      const applicantResult = await client.query(applicantQuery, [targetApplicantId]);
      if (applicantResult.rows.length === 0) {
        await client.query('ROLLBACK');
        await logAudit('ERROR', `Resume upload failed - applicant not found by ${actingUserName}`, 'API:Resumes:Upload', actingUserId, { applicantId: targetApplicantId, fileName: originalName });
        return NextResponse.json({ message: 'Applicant not found' }, { status: 404 });
      }

      const applicant = applicantResult.rows[0];

      // Check ownership-based permissions for resume upload
      if (!hasGlobalResumePermission) {
        const resumePermission = canUploadResumes(session.user, applicant.recruiterId, actingUserId);
        if (!resumePermission.canUpload) {
          await client.query('ROLLBACK');
          await logAudit('WARN', `Forbidden attempt to upload resume by ${actingUserName}: ${resumePermission.reason}`, 'API:Resumes:Upload', actingUserId);
          return NextResponse.json({ message: `Forbidden: ${resumePermission.reason}` }, { status: 403 });
        }
      }

      // Update Applicant's resume path
      const updateQuery = `UPDATE "applicant" SET "resumePath" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *;`;
      const result = await client.query(updateQuery, [objectName, targetApplicantId]);
      const updatedApplicant = result.rows[0];

      // Create attachment entry for resume history
      const historyQuery = `
        INSERT INTO "Attachment" (id, "applicantId", "uploadedById", "filePath", "fileName", label, "isPrimary", "uploadedAt", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, 'Resume', true, NOW(), NOW(), NOW());
      `;
      await client.query(historyQuery, [randomUUID(), targetApplicantId, actingUserId, objectName, originalName]);

      // Build webhook payload in requested format
      const webhookPayload = {
        inputs: {
          cv_url: await (await import('@/lib/fileUrls')).buildServerFileUrl(objectName, { strategy: 'stream' }),
          Applicant_id: targetApplicantId,
          jobId: updatedApplicant.positionid || updatedApplicant.positionId || null, // support both casings
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

      await logAudit('AUDIT', `Resume '${originalName}' uploaded for applicant '${applicant.name}' by ${actingUserName}`, 'API:Resumes:Upload', actingUserId, {
        applicantId: targetApplicantId,
        applicantName: applicant.name,
        fileName: originalName,
        fileSize: buffer.length,
        filePath: objectName
      });

      return NextResponse.json({ message: 'Resume uploaded', applicant, file_path: objectName, url: await (await import('@/lib/fileUrls')).buildServerFileUrl(objectName, { strategy: 'stream' }) });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Resume upload error:', error);
    await logAudit('ERROR', `Resume upload failed by ${actingUserName}. Error: ${(error as Error).message}`, 'API:Resumes:Upload', actingUserId, {
      applicantId: new URL(request.url).searchParams.get('applicantId'), // Query param still 'applicantId' for backward compatibility
      error: (error as Error).message
    });
    return NextResponse.json({ message: (error as Error).message || 'Internal server error' }, { status: 500 });
  }
}
