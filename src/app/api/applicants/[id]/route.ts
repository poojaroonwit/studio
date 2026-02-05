import { auth } from '@/auth';
// src/app/api/applicants/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { v4 as uuidv4 } from 'uuid';
import { broadcastApplicantUpdate, broadcastApplicantDeleted, broadcastApplicantStatusChanged } from '@/lib/simple-broadcaster';
import { normalizeFitScore } from '@/lib/scoreUtils';
import { syncRecruiterForApplicant } from '@/lib/recruiterSync';
import { NotificationService } from '@/lib/notificationService';
import { validateApplicantHiringStatus, assignApplicantToHeadcount } from '@/lib/headcountUtils';

import { getSystemSetting } from '@/lib/systemSettings';
import { hasAnyPermission, canEditApplicant, canUpdateApplicantPipelineStage } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/applicants/{id}:
 *   head:
 *     summary: Check if a Applicant exists
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Applicant exists
 *       404:
 *         description: Applicant not found
 *   get:
 *     summary: Get a Applicant by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Applicant details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Applicant'
 *       404:
 *         description: Applicant not found
 *   put:
 *     summary: Update a Applicant by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Applicant'
 *     responses:
 *       200:
 *         description: Applicant updated
 *   delete:
 *     summary: Delete a Applicant by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Applicant deleted
 *       404:
 *         description: Applicant not found
 */

// Define Zod schemas for validation...
const updateApplicantSchema = z.object({
  name: z.string().optional().nullable(),
  expectedSalary: z.number().optional().nullable(),
  email: z.union([z.string().email(), z.literal(''), z.literal(null)]).optional(),
  phone: z.string().optional().nullable(),
  positionId: z.string().uuid().nullable().optional(),
  recruiterId: z.string().uuid().nullable().optional(),
  fitScore: z.number().min(0).max(1).nullable().optional(),
  status: z.string().optional().nullable(),
  assignmentJustification: z.array(z.string()).optional(),
  parsedData: z.record(z.any()).optional().nullable(),
  custom_attributes: z.record(z.any()).optional().nullable(),
  resumePath: z.string().optional().nullable(),
  transitionNotes: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  sourceId: z.string().uuid().nullable().optional(),
  subSource: z.string().optional().nullable(),
  isBlacklisted: z.boolean().optional(),
});

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/applicants\/([^/]+)/);
  return match ? match[1] : null;
}

export async function HEAD(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 });
  }

  const { id } = await params;
  // Validate UUID
  const uuidSchema = z.string().uuid();
  if (!uuidSchema.safeParse(id).success) {
    console.error('Invalid Applicant ID format:', id);
    return new NextResponse(null, { status: 400 });
  }

  const client = await getPool().connect();
  try {
    // Set a shorter timeout for validation requests
    await client.query('SET statement_timeout = 5000'); // 5 seconds for validation (reduced from 10s)

    // Ultra-fast existence check query - only check if ID exists
    const validationQuery = `SELECT 1 FROM "Candidate" WHERE id = $1::uuid LIMIT 1`;

    const startTime = Date.now();
    const result = await client.query(validationQuery, [id]);
    const queryTime = Date.now() - startTime;

    if (queryTime > 2000) {
      console.warn(`[PERF] Slow validation query: ${queryTime}ms for ID: ${id}`);
    }

    if (result.rows.length === 0) {
      return new NextResponse(null, { status: 404 });
    }

    // Return success with minimal headers
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Error validating Applicant', id, error);

    // Handle timeout errors specifically
    if (error.code === '57014' || error.message?.includes('timeout')) {
      return new NextResponse(null, { status: 408 }); // 408 Request Timeout
    }

    return new NextResponse(null, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  // Validate UUID
  const uuidSchema = z.string().uuid();
  if (!uuidSchema.safeParse(id).success) {
    console.error('Invalid Applicant ID format:', id);
    return NextResponse.json({ message: 'Invalid Applicant ID format' }, { status: 400 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  let isAuthorized = false;

  if (session?.user?.id) {
    isAuthorized = true;
  } else if (token) {
    // Validate token
    let authClient;
    try {
      authClient = await getPool().connect();
      const res = await authClient.query(
        'SELECT id FROM "CandidateEvaluationLink" WHERE token = $1 AND "candidateId" = $2::uuid AND "expiresAt" > NOW() AND "revokedAt" IS NULL',
        [token, id]
      );
      if (res.rows.length > 0) isAuthorized = true;
    } catch (e) {
      console.error('Token validation failed', e);
    } finally {
      if (authClient) authClient.release();
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const userId = session?.user?.id || 'public-token';
  const startTime = Date.now();
  const lite = url.searchParams.get('lite') === '1' || url.searchParams.get('lite') === 'true';
  // console.log(`[API] GET /api/applicants/${id} started for user ${userId}`);

  let client;
  try {
    client = await getPool().connect();
  } catch (connectionError: any) {
    console.error(`[Applicants API] Failed to connect to database:`, connectionError);
    return NextResponse.json({
      message: 'Database connection error',
      error: connectionError.message
    }, { status: 500 });
  }

  try {
    // Set query timeout to prevent hanging queries - increased to match pool configuration
    await client.query('SET statement_timeout = 25000'); // 25 seconds timeout to match pool config

    // Check cache first (implement Redis or in-memory cache in production)
    const cacheKey = `Applicant:${id}:${userId}:lite:${lite ? '1' : '0'}`;

    // Optimized query with selective data fetching and better performance
    const applicantQuery = `
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c."statusId",
        rs.name as "status",
        c."positionId",
        c."recruiterId",
        c."sourceId",
        c."fitScore",
        c."avatarUrl",
        c."resumePath",
        c."assignmentJustification",
        c."parsedData",
        c."customAttributes",
        c.expected_salary as "expectedSalary",
        c."createdAt",
        c."updatedAt",
        c."applicationDate",
        c."updatedAt",
        c."applicationDate",
        c."isPinned",
        c."pinnedAt",
        c."isBlacklisted",
        p.title as "positionTitle", 
        p.department as "positionDepartment",
        r.name as "recruiterName", 
        r."avatarUrl" as "recruiterAvatarUrl",
        cs.name as "sourceName", 
        cs.description as "sourceDescription", 
        cs.logo as "sourceLogo"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      LEFT JOIN "ApplicantSource" cs ON c."sourceId" = cs.id
              LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
      WHERE c.id = $1::uuid
    `;

    const applicantStartTime = Date.now();
    // console.log(`[API] Executing Applicant query for ID: ${id}`);
    const applicantResult = await client.query(applicantQuery, [id]);
    const applicantQueryTime = Date.now() - applicantStartTime;
    // console.log(`[API] Applicant query completed in ${applicantQueryTime}ms for ID: ${id}`);

    if (applicantQueryTime > 5000) {
      console.warn(`[PERF] Slow Applicant query: ${applicantQueryTime}ms for ID: ${id}`);
    }

    if (applicantResult.rows.length === 0) {
      // console.log(`[API] Applicant not found for ID: ${id}`);
      return NextResponse.json({ message: 'Applicant not found' }, { status: 404 });
    }

    const Applicant = applicantResult.rows[0];
    // console.log(`[API] Applicant found for ID: ${id}, name: ${applicant.name}`);

    // Check if job match feature is enabled (skip if lite)
    const jobMatchFeatureEnabled = lite ? 'false' : await getSystemSetting('jobMatchFeatureEnabled');
    const isJobMatchEnabled = !lite && jobMatchFeatureEnabled !== 'false';

    // Fetch job matches separately with pagination (reduced limit for performance)
    let jobMatches: any[] = [];
    if (isJobMatchEnabled) {
      const jobMatchesQuery = `
        SELECT 
          jm.id,
          jm."candidateId",
          jm."jobId",
          jm."fitScore",
          jm."createdAt",
          jm."updatedAt",
          p.title as "positionTitle",
          p.department as "positionDepartment",
          p.description as "positionDescription"
        FROM "JobMatch" jm
        LEFT JOIN "Position" p ON jm."jobId" = p.id
        WHERE jm."candidateId" = $1::uuid
        ORDER BY jm."fitScore" DESC
        LIMIT 3
      `;

      const jobMatchesStartTime = Date.now();
      const jobMatchesResult = await client.query(jobMatchesQuery, [id]);
      const jobMatchesQueryTime = Date.now() - jobMatchesStartTime;

      if (jobMatchesQueryTime > 3000) {
        console.warn(`[PERF] Slow job matches query: ${jobMatchesQueryTime}ms for ID: ${id}`);
      }

      jobMatches = jobMatchesResult.rows || [];
    }

    // Fetch recent attachments only (reduced limit for performance) – skip if lite
    const attachmentsQuery = `
      SELECT 
        a.id,
        a."candidateId",
        a."uploadedById",
        a."filePath",
        a."fileName",
        a.label,
        a."isPrimary",
        a."uploadedAt",
        a."updatedAt",
        a."headcountId",
        u.name as "uploadedByUserName"
      FROM "Attachment" a
      LEFT JOIN "User" u ON a."uploadedById" = u.id
      WHERE a."candidateId" = $1::uuid
      ORDER BY a."uploadedAt" DESC
      LIMIT 2
    `;
    let attachments: any[] = [];
    if (!lite) {
      const attachmentsStartTime = Date.now();
      const attachmentsResult = await client.query(attachmentsQuery, [id]);
      const attachmentsQueryTime = Date.now() - attachmentsStartTime;
      if (attachmentsQueryTime > 3000) {
        console.warn(`[PERF] Slow attachments query: ${attachmentsQueryTime}ms for ID: ${id}`);
      }
      attachments = attachmentsResult.rows || [];
    }

    const totalTime = Date.now() - startTime;

    // Fetch current user's read status (per-user)
    let userReadStatus: boolean | null = null;
    if (session?.user?.id) {
      const readStatusResult = await client.query(
        `SELECT "is_read" FROM "applicant_read_status" WHERE "applicant_id" = $1::uuid AND "user_id" = $2::uuid`,
        [id, session.user.id]
      );
      userReadStatus = readStatusResult.rows[0]?.is_read ?? null;
    }

    const responseData = {
      ...Applicant,
      fitScore: normalizeFitScore(Applicant.fitScore),
      isRead: userReadStatus, // Per-user read status
      position: Applicant.positionId ? {
        title: Applicant.positionTitle || null,
        department: Applicant.positionDepartment || null
      } : null,
      recruiter: Applicant.recruiterId ? {
        name: Applicant.recruiterName || null,
        avatarUrl: Applicant.recruiterAvatarUrl || null
      } : null,
      source: Applicant.sourceId ? {
        id: Applicant.sourceId,
        name: Applicant.sourceName,
        description: Applicant.sourceDescription,
        logo: Applicant.sourceLogo
      } : null,
      jobMatches: (jobMatches || []).map((match: any) => ({
        ...match,
        fitScore: normalizeFitScore(match.fitScore),
        jobTitle: match.jobTitle || match.positionTitle || null,
        positionTitle: match.positionTitle || match.jobTitle || null,
      })),
      expectedSalary: Applicant.expectedSalary,
      attachmentHistory: attachments,
      custom_attributes: Applicant.customAttributes || {},
      customFields: Applicant.customAttributes || {}, // Also provide as customFields for frontend compatibility
      // Add metadata for pagination
      _metadata: {
        totalJobMatches: (jobMatches || []).length,
        totalAttachments: attachments.length,
        hasMoreJobMatches: !lite && (jobMatches || []).length === 3,
        hasMoreAttachments: !lite && attachments.length === 2
      }
    };

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `"${Buffer.from(JSON.stringify(responseData)).toString('base64').slice(0, 8)}"`
      }
    });
  } catch (error: any) {
    console.error('Error fetching Applicant', id, error);

    // Handle connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('Database connection error for Applicant:', id, error);
      return NextResponse.json({
        message: 'Database connection error. Please try again in a moment.',
        error: 'Database connection failed',
        candidateId: id
      }, { status: 503 }); // 503 Service Unavailable
    }

    // Handle timeout errors
    if (error.code === '57014' || error.message?.includes('timeout')) {
      console.error('Database timeout error for Applicant:', id, error);
      return NextResponse.json({
        message: 'Request timed out. The server may be experiencing high load. Please try again in a moment.',
        error: 'Database timeout',
        candidateId: id
      }, { status: 408 }); // 408 Request Timeout
    }

    return NextResponse.json({
      message: 'Error fetching Applicant',
      error: error?.message || String(error),
      candidateId: id
    }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const actingUserId = session?.user?.id;
  const actingUserName = (session?.user?.name || session?.user?.email || actingUserId || 'System') as string;

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Initial permission check - we'll do detailed ownership check after retrieving Applicant data
  const hasBasicEditPermission = hasAnyPermission(session.user, ['APPLICANTS_EDIT_BASIC', 'APPLICANTS_EDIT_BASIC_OWN']);
  const hasSensitiveEditPermission = hasAnyPermission(session.user, ['APPLICANTS_EDIT_SENSITIVE', 'APPLICANTS_EDIT_SENSITIVE_OWN']);
  const hasPipelineUpdatePermission = hasAnyPermission(session.user, ['APPLICANTS_PIPELINE_STAGE_UPDATE', 'APPLICANTS_PIPELINE_STAGE_UPDATE_OWN']);

  // Check if user has any required permission
  if (!hasBasicEditPermission && !hasSensitiveEditPermission && !hasPipelineUpdatePermission) {
    await logAudit('WARN', `Forbidden attempt to update Applicant by ${actingUserName}.`, 'API:Applicants:Update', actingUserId);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to update applicants' }, { status: 403 });
  }

  const { id } = await params;

  // UUID validation removed

  let body;
  try {
    body = await request.json();

  } catch (error) {
    console.error('Failed to parse request body:', error);
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }



  // Skip validation and use body directly
  const { name, email, phone, expectedSalary, positionId, recruiterId, fitScore, status, assignmentJustification, parsedData, custom_attributes, customFields, resumePath, transitionNotes, avatarUrl, sourceId, subSource, isPinned, isBlacklisted, isRead } = body;

  // Log source assignment specifically for debugging
  if (sourceId !== undefined) {

  }

  // Validation removed - proceed with data as-is

  let client;
  try {
    client = await getPool().connect();
    if (!client) {
      throw new Error('Failed to get database connection from pool');
    }
    // console.log('Database connection acquired successfully');
    // Test database connection
    try {
      await client.query('SELECT 1');
      // console.log('Database connection test passed');
    } catch (testError: any) {
      throw new Error(`Database connection test failed: ${testError.message}`);
    }
    try {
      await client.query('BEGIN');
      // console.log('Database transaction started successfully');
    } catch (beginError: any) {
      throw new Error(`Failed to begin database transaction: ${beginError.message}`);
    }

    // Check if job match feature is enabled
    let jobMatchFeatureEnabled;
    let isJobMatchEnabled;
    try {
      jobMatchFeatureEnabled = await getSystemSetting('jobMatchFeatureEnabled');
      isJobMatchEnabled = jobMatchFeatureEnabled !== 'false';
      // console.log(`Job match feature enabled: ${isJobMatchEnabled}`);
    } catch (settingError) {
      console.error('Failed to get job match feature setting:', settingError);
      // Default to enabled if setting retrieval fails
      isJobMatchEnabled = true;
    }

    // Check if Applicant exists first
    const existingResult = await client.query('SELECT * FROM "Candidate" WHERE id = $1::uuid', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.error('Applicant not found:', id);
      return NextResponse.json({ message: 'Applicant not found' }, { status: 404 });
    }

    const existingApplicant = existingResult.rows[0];
    const pinChangeRequested = typeof isPinned === 'boolean' && isPinned !== existingApplicant.isPinned;
    // console.log(`Applicant found - name: ${existingApplicant.name}, current statusId: ${existingApplicant.statusId}`);
    const oldStatus = existingApplicant.statusId;
    const oldRecruiterId = existingApplicant.recruiterId;
    const oldPositionId = existingApplicant.positionId;

    // Detailed ownership-based permission check
    const editPermission = canEditApplicant(session.user, existingApplicant.recruiterId, actingUserId);
    if (!editPermission.canEdit) {
      await client.query('ROLLBACK');
      await logAudit('WARN', `Forbidden attempt to edit Applicant by ${actingUserName}: ${editPermission.reason}`, 'API:Applicants:Update', actingUserId);
      return NextResponse.json({ message: `Forbidden: ${editPermission.reason}` }, { status: 403 });
    }

    // Check pipeline stage update permission if status is being changed
    if (status !== undefined && status !== oldStatus) {
      const pipelinePermission = canUpdateApplicantPipelineStage(session.user, existingApplicant.recruiterId, actingUserId);
      if (!pipelinePermission.canUpdate) {
        await client.query('ROLLBACK');
        await logAudit('WARN', `Forbidden attempt to update Applicant pipeline stage by ${actingUserName}: ${pipelinePermission.reason}`, 'API:Applicants:Update', actingUserId);
        return NextResponse.json({ message: `Forbidden: ${pipelinePermission.reason}` }, { status: 403 });
      }
    }



    // Existence checks for foreign keys
    if (positionId) {
      const posCheck = await client.query('SELECT id FROM "Position" WHERE id = $1::uuid', [positionId]);
      if (posCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        console.error('Position not found:', positionId);
        return NextResponse.json({ message: 'Position not found.' }, { status: 400 });
      }
      // console.log(`Position validation passed - positionId: ${positionId}`);
    }
    if (recruiterId) {
      const recCheck = await client.query('SELECT id FROM "User" WHERE id = $1::uuid AND role = $2', [recruiterId, 'Recruiter']);
      if (recCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        console.error('Recruiter not found or user is not a recruiter:', recruiterId);
        return NextResponse.json({ message: 'Recruiter not found or user is not a recruiter.' }, { status: 400 });
      }
      // console.log(`Recruiter validation passed - recruiterId: ${recruiterId}`);
    }
    if (sourceId) {
      const sourceCheck = await client.query('SELECT id FROM "ApplicantSource" WHERE id = $1::uuid', [sourceId]);
      if (sourceCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        console.error('Applicant source not found:', sourceId);
        return NextResponse.json({ message: 'Applicant source not found.' }, { status: 400 });
      }
      // console.log(`Source validation passed - sourceId: ${sourceId}`);
    }

    // Validate status is a valid UUID that references a RecruitmentStage
    if (status !== undefined) {
      try {
        const statusCheck = await client.query('SELECT id FROM "RecruitmentStage" WHERE id = $1::uuid', [status]);
        if (statusCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ message: 'Invalid status: Status must reference a valid recruitment stage' }, { status: 400 });
        }
        // console.log(`Status validation passed - status: ${status}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error validating status:', error);
        return NextResponse.json({ message: 'Error validating status' }, { status: 500 });
      }
    }

    // Validate headcount availability if changing status to "Hired"
    if (status !== undefined && status !== oldStatus && existingApplicant.positionId) {
      // Get the stage name for comparison
      try {
        const stageResult = await client.query('SELECT name FROM "RecruitmentStage" WHERE id = $1::uuid', [status]);
        if (stageResult.rows.length > 0) {
          const stageName = stageResult.rows[0].name;
          if (stageName === 'Hired') {
            try {
              const validation = await validateApplicantHiringStatus(id, existingApplicant.positionId);
              if (!validation.canHire) {
                await client.query('ROLLBACK');
                return NextResponse.json({
                  message: validation.message,
                  reason: validation.reason,
                  headcountStatus: validation.headcountStatus
                }, { status: 400 });
              }
              // console.log('Headcount validation passed');
            } catch (error) {
              await client.query('ROLLBACK');
              console.error('Error validating headcount for hiring:', error);
              return NextResponse.json({
                message: error instanceof Error ? error.message : 'Error validating headcount availability',
                reason: 'VALIDATION_ERROR',
                headcountStatus: null
              }, { status: 500 });
            }
          }
        }
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error getting stage name for headcount validation:', error);
        return NextResponse.json({ message: 'Error validating status for headcount assignment' }, { status: 500 });
      }
    }

    // Build dynamic update query based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }
    if (email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      updateValues.push(email);
      paramIndex++;
    }
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      updateValues.push(phone);
      paramIndex++;
    }
    if (expectedSalary !== undefined) {
      updateFields.push(`expected_salary = $${paramIndex}`);
      updateValues.push(expectedSalary);
      paramIndex++;
    }
    if (positionId !== undefined) {
      updateFields.push(`"positionId" = $${paramIndex}`);
      updateValues.push(positionId);
      paramIndex++;
    }
    if (recruiterId !== undefined) {
      updateFields.push(`"recruiterId" = $${paramIndex}`);
      updateValues.push(recruiterId);
      paramIndex++;
    }
    if (fitScore !== undefined) {
      updateFields.push(`"fitScore" = $${paramIndex}`);
      updateValues.push(fitScore);
      paramIndex++;
    }
    if (status !== undefined) {
      updateFields.push(`"statusId" = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }
    if (assignmentJustification !== undefined) {
      updateFields.push(`"assignmentJustification" = $${paramIndex}`);
      // Convert array to string if it's an array, otherwise use as is
      const assignmentJustificationStr = Array.isArray(assignmentJustification)
        ? assignmentJustification.join('\n')
        : assignmentJustification;
      updateValues.push(assignmentJustificationStr);
      paramIndex++;
    }
    if (parsedData !== undefined) {
      updateFields.push(`"parsedData" = $${paramIndex}`);
      updateValues.push(parsedData);
      paramIndex++;
    }
    // Handle custom fields - use customFields if provided, otherwise use custom_attributes
    const customAttributesToSave = customFields !== undefined ? customFields : custom_attributes;
    if (customAttributesToSave !== undefined) {
      updateFields.push(`"customAttributes" = $${paramIndex}`);
      updateValues.push(customAttributesToSave);
      paramIndex++;
    }
    if (resumePath !== undefined) {
      updateFields.push(`"resumePath" = $${paramIndex}`);
      updateValues.push(resumePath);
      paramIndex++;
    }
    if (avatarUrl !== undefined) {
      updateFields.push(`"avatarUrl" = $${paramIndex}`);
      updateValues.push(avatarUrl);
      paramIndex++;
    }
    if (sourceId !== undefined) {
      updateFields.push(`"sourceId" = $${paramIndex}`);
      updateValues.push(sourceId);
      paramIndex++;
    }
    if (subSource !== undefined) {
      updateFields.push(`"subSource" = $${paramIndex}`);
      updateValues.push(subSource);
      paramIndex++;
    }

    // Handle pin/unpin and timestamp
    if (typeof isPinned === 'boolean') {
      updateFields.push(`"isPinned" = $${paramIndex}`);
      updateValues.push(isPinned);
      paramIndex++;
      if (isPinned) {
        updateFields.push(`"pinnedAt" = NOW()`);
      } else {
        updateFields.push(`"pinnedAt" = NULL`);
      }
    }

    // Handle blacklist status
    if (typeof isBlacklisted === 'boolean') {
      updateFields.push(`"isBlacklisted" = $${paramIndex}`);
      updateValues.push(isBlacklisted);
      paramIndex++;
    }

    // Always update the updatedAt timestamp
    updateFields.push(`"updatedAt" = NOW()`);

    // Handle per-user read status - this is stored in a separate table
    let readStatusChanged = false;
    let newReadStatus: boolean | undefined = undefined;
    if (typeof isRead === 'boolean') {
      // Upsert to ApplicantReadStatus table for this user
      const upsertReadStatusQuery = `
        INSERT INTO "applicant_read_status" ("id", "applicant_id", "user_id", "is_read", "read_at", "created_at", "updated_at")
        VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, ${isRead ? 'NOW()' : 'NULL'}, NOW(), NOW())
        ON CONFLICT ("applicant_id", "user_id")
        DO UPDATE SET "is_read" = $3, "read_at" = ${isRead ? 'NOW()' : 'NULL'}, "updated_at" = NOW()
        RETURNING "is_read";
      `;
      const prevReadStatusResult = await client.query(
        `SELECT "is_read" FROM "applicant_read_status" WHERE "applicant_id" = $1::uuid AND "user_id" = $2::uuid`,
        [id, actingUserId]
      );
      const prevReadStatus = prevReadStatusResult.rows[0]?.is_read;
      
      await client.query(upsertReadStatusQuery, [id, actingUserId, isRead]);
      newReadStatus = isRead;
      
      // Check if read status actually changed
      if (prevReadStatus !== isRead) {
        readStatusChanged = true;
        
        // Log read status change as activity in TransitionRecord
        const activityNotes = isRead ? 'Marked as read' : 'Marked as unread';
        await client.query(`
          INSERT INTO "TransitionRecord" ("id", "candidateId", "date", "stage", "notes", "actingUserId", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1::uuid, NOW(), $2, $3, $4::uuid, NOW(), NOW())
        `, [id, isRead ? 'READ_STATUS_CHANGED' : 'READ_STATUS_CHANGED', activityNotes, actingUserId]);
      }
    }

    const updateQuery = `
      UPDATE "Candidate" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}::uuid
      RETURNING *;
    `;
    updateValues.push(id);

    // console.log(`Executing update query: ${updateQuery}`);
    // console.log(`Update values:`, updateValues);

    // console.log('About to execute update query with values:', updateValues);
    const updateResult = await client.query(updateQuery, updateValues);
    // console.log('Update query executed successfully, rows affected:', updateResult.rows.length);

    if (updateResult.rows.length === 0) {
      throw new Error('Failed to update Applicant - no rows returned');
    }

    // Fetch updated Applicant with source information
    const updatedApplicantWithSource = await client.query(`
      SELECT c.*, cs.name as "sourceName", cs.description as "sourceDescription", cs.logo as "sourceLogo"
      FROM "Candidate" c
      LEFT JOIN "ApplicantSource" cs ON c."sourceId" = cs.id
      WHERE c.id = $1
    `, [id]);

    const applicantWithSource = updatedApplicantWithSource.rows[0];

    // --- Recruiter change detection ---
    let recruiterChanged = false;
    let oldRecruiterName = null;
    let newRecruiterName = null;
    if (recruiterId !== undefined && recruiterId !== oldRecruiterId) {
      recruiterChanged = true;
      // Fetch old recruiter name (if any)
      if (oldRecruiterId) {
        const oldRecRes = await client.query('SELECT name FROM "User" WHERE id = $1', [oldRecruiterId]);
        oldRecruiterName = oldRecRes.rows[0]?.name || null;
      }
      // Fetch new recruiter name (if any)
      if (recruiterId) {
        const newRecRes = await client.query('SELECT name FROM "User" WHERE id = $1', [recruiterId]);
        newRecruiterName = newRecRes.rows[0]?.name || null;
      }
    }

    // Handle headcount assignment if status changed to "Hired"
    let headcountAssignmentResult = null;
    if (status !== undefined && status !== oldStatus && existingApplicant.positionId) {
      // Get the stage name for comparison
      try {
        const stageResult = await client.query('SELECT name FROM "RecruitmentStage" WHERE id = $1::uuid', [status]);
        if (stageResult.rows.length > 0) {
          const stageName = stageResult.rows[0].name;
          if (stageName === 'Hired') {
            try {
              const validation = await validateApplicantHiringStatus(id, existingApplicant.positionId);
              if (validation.canHire && validation.reason === 'VACANT_HEADCOUNT_AVAILABLE') {
                // Double-check headcount availability right before assignment to prevent race conditions
                const revalidation = await validateApplicantHiringStatus(id, existingApplicant.positionId);

                if (!revalidation.canHire) {
                  // Headcount became unavailable between validation and assignment
                  console.warn(`Race condition detected: Headcount became unavailable for Applicant ${id} during assignment. Cannot proceed with status update.`, {
                    candidateId: id,
                    positionId: existingApplicant.positionId,
                    originalValidation: validation,
                    revalidation,
                    timestamp: new Date().toISOString()
                  });
                  await client.query('ROLLBACK');
                  return NextResponse.json({
                    message: `Headcount became unavailable: ${revalidation.message}`,
                    reason: revalidation.reason,
                    headcountStatus: revalidation.headcountStatus
                  }, { status: 400 });
                }

                headcountAssignmentResult = await assignApplicantToHeadcount(
                  id,
                  existingApplicant.positionId,
                  actingUserId,
                  actingUserName
                );
                // console.log('Headcount assigned successfully');
              }
            } catch (headcountError) {
              console.error('Error assigning headcount:', headcountError);
              // Don't fail the status update if headcount assignment fails
            }
          }
        }
      } catch (error) {
        console.error('Error getting stage name for headcount assignment:', error);
        // Don't fail the status update if stage name lookup fails
      }
    }

    // Broadcast real-time updates for headcount changes if status changed to/from "Hired"
    if (status !== undefined && oldStatus !== status) {
      try {
        const { getRecruitmentStageByName } = await import('@/lib/recruitmentStageUtils');
        const hiredStageId = await getRecruitmentStageByName('Hired');

        if ((hiredStageId && status === hiredStageId) || (hiredStageId && oldStatus === hiredStageId)) {
          const { broadcastPositionListUpdated, broadcastPositionStatisticsUpdated } = await import('@/lib/simple-broadcaster');

          // Broadcast position list update (includes headcount changes)
          broadcastPositionListUpdated();

          // Broadcast updated statistics
          const statsQuery = `
            SELECT 
              COUNT(*) as total,
              COUNT(CASE WHEN "isOpen" = TRUE THEN 1 END) as open,
              COUNT(CASE WHEN "isOpen" = FALSE THEN 1 END) as closed
            FROM "Position"
          `;
          const statsResult = await client.query(statsQuery);
          const stats = statsResult.rows[0];
          const statistics = {
            total: parseInt(stats.total, 10),
            open: parseInt(stats.open, 10),
            closed: parseInt(stats.closed, 10)
          };
          broadcastPositionStatisticsUpdated(statistics);
        }
      } catch (broadcastError) {
        console.error('Failed to broadcast real-time updates for headcount changes:', broadcastError);
        // Don't fail the request if broadcasting fails
      }
    }

    // Create transition record if status changed
    if (status !== undefined && oldStatus !== status) {
      let safePositionId = positionId ?? existingApplicant.positionId ?? null; // Use existing position if not provided
      // Only store custom transition notes, not the redundant status change message
      const transitionMessage = transitionNotes || null;
      const newTransitionId = uuidv4();

      // Validate positionId before creating transition record
      if (safePositionId) {
        const positionCheck = await client.query('SELECT id FROM "Position" WHERE id = $1::uuid', [safePositionId]);
        if (positionCheck.rows.length === 0) {
          console.warn(`Position ${safePositionId} not found, setting positionId to null for transition record`);
          safePositionId = null;
        }
      }

      const insertTransitionQuery = `
        INSERT INTO "TransitionRecord" (id, "candidateId", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW());
      `;
      try {
        // console.log('Creating transition record:', {
        //   transitionId: newTransitionId,
        //   candidateId: id,
        //   positionId: safePositionId,
        //   stage: status,
        //   notes: transitionMessage,
        //   actingUserId
        // });

        await client.query(insertTransitionQuery, [
          newTransitionId, id, safePositionId, status, transitionMessage, actingUserId
        ]);

        // Get the created transition record to broadcast
        const getTransitionQuery = 'SELECT * FROM "TransitionRecord" WHERE id = $1';
        const transitionResult = await client.query(getTransitionQuery, [newTransitionId]);
        if (transitionResult.rows.length > 0) {
          const newTransition = transitionResult.rows[0];
          // Broadcast the new transition
          try {
            broadcastApplicantUpdate({ id, transition: newTransition }, actingUserId);
            // console.log('Transition record broadcasted successfully');
          } catch (broadcastError) {
            console.error('Failed to broadcast transition record:', broadcastError);
            // Don't fail the entire operation if broadcasting fails
          }
        }

        // Send notification to recruiter about status change
        const applicantWithRecruiterQuery = `
          SELECT c.*, p.title as "positionTitle", u.id as "recruiterId", u.name as "recruiterName"
          FROM "Candidate" c
          LEFT JOIN "Position" p ON c."positionId" = p.id
          LEFT JOIN "User" u ON c."recruiterId" = u.id
          WHERE c.id = $1
        `;
        const applicantWithRecruiterResult = await client.query(applicantWithRecruiterQuery, [id]);
        const applicantWithRecruiter = applicantWithRecruiterResult.rows[0];

        if (applicantWithRecruiter.recruiterId && status !== null) {
          try {
            await NotificationService.notifyApplicantStatusChange(
              id,
              applicantWithRecruiter.name,
              oldStatus,
              status,
              applicantWithRecruiter.positionId,
              applicantWithRecruiter.positionTitle || 'Unknown Position',
              applicantWithRecruiter.recruiterId,
              actingUserId
            );
            // console.log('Applicant status change notification sent successfully');
          } catch (notificationError) {
            console.error('Failed to send Applicant status change notification:', notificationError);
            // Don't fail the entire operation if notification fails
          }
        }
      } catch (transitionError) {
        console.error('Error creating transition record:', transitionError);
        throw transitionError;
      }
    } else if (recruiterChanged) {
      // Create transition record for recruiter change
      let safePositionId = positionId ?? existingApplicant.positionId ?? null;

      // Validate positionId before creating transition record
      if (safePositionId) {
        const positionCheck = await client.query('SELECT id FROM "Position" WHERE id = $1::uuid', [safePositionId]);
        if (positionCheck.rows.length === 0) {
          console.warn(`Position ${safePositionId} not found, setting positionId to null for transition record`);
          safePositionId = null;
        }
      }

      let transitionMessage = '';
      if (oldRecruiterId && recruiterId) {
        transitionMessage = `Recruiter changed from ${oldRecruiterName || oldRecruiterId} to ${newRecruiterName || recruiterId}`;
      } else if (!oldRecruiterId && recruiterId) {
        transitionMessage = `Recruiter assigned: ${newRecruiterName || recruiterId}`;
      } else if (oldRecruiterId && !recruiterId) {
        transitionMessage = `Recruiter unassigned (was ${oldRecruiterName || oldRecruiterId})`;
      } else {
        transitionMessage = `Recruiter assignment changed.`;
      }
      const newTransitionId = uuidv4();
      const insertTransitionQuery = `
        INSERT INTO "TransitionRecord" (id, "candidateId", "positionId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW());
      `;
      try {
        await client.query(insertTransitionQuery, [
          newTransitionId, id, safePositionId, 'Applied', transitionMessage, actingUserId
        ]);
        // Broadcast the new transition
        const getTransitionQuery = 'SELECT * FROM "TransitionRecord" WHERE id = $1';
        const transitionResult = await client.query(getTransitionQuery, [newTransitionId]);
        if (transitionResult.rows.length > 0) {
          const newTransition = transitionResult.rows[0];
          try {
            broadcastApplicantUpdate({ id, transition: newTransition }, actingUserId);
            // console.log('Recruiter change transition record broadcasted successfully');
          } catch (broadcastError) {
            console.error('Failed to broadcast recruiter change transition record:', broadcastError);
            // Don't fail the entire operation if broadcasting fails
          }
        }
      } catch (transitionError) {
        console.error('Error creating recruiter change transition record:', transitionError);
        throw transitionError;
      }
    }

    // Auto-assign recruiter if position changed and Applicant has no recruiter
    let syncResult = null;
    if (positionId !== undefined && positionId !== oldPositionId && recruiterId === undefined) {
      try {
        const syncSuccess = await syncRecruiterForApplicant(
          id,
          positionId,
          actingUserId,
          actingUserName
        );
        if (syncSuccess) {
          syncResult = { synced: true, message: 'Recruiter auto-assigned from position' };
          // console.log('Recruiter auto-assigned successfully');
        }
      } catch (syncError) {
        console.error('Failed to assign recruiter after position assignment:', syncError);
        // Don't fail the Applicant update if sync fails
      }
    }

    // Initialize headcountAssignmentResult if not already set
    if (typeof headcountAssignmentResult === 'undefined') {
      headcountAssignmentResult = null;
    }

    // console.log('About to commit transaction...');
    await client.query('COMMIT');
    // console.log('Database transaction committed successfully');
    try {
      await logAudit('AUDIT', `Applicant '${existingApplicant.name}' updated by ${actingUserName}.`, 'API:Applicants:Update', actingUserId, { candidateId: id, oldStatus, newStatus: status ?? 'Applied' });
    } catch (auditError) {
      console.error('Failed to log audit entry:', auditError);
      // Don't fail the request if audit logging fails
    }
    // Log pin/unpin action explicitly
    if (pinChangeRequested) {
      try {
        await logAudit('AUDIT', `Applicant '${existingApplicant.name}' ${isPinned ? 'pinned' : 'unpinned'} by ${actingUserName}.`, 'API:Applicants:PinToggle', actingUserId, { candidateId: id, isPinned });
      } catch (auditError) {
        // ignore log error
      }
    }

    // After update, re-fetch the Applicant using the same logic as GET to ensure response structure is identical
    const applicantResult = await client.query(`
       SELECT c.*, c."isBlacklisted", p.title as "positionTitle", p.department as "positionDepartment", r.name as "recruiterName",
              cs.name as "sourceName", cs.description as "sourceDescription", cs.logo as "sourceLogo"
       FROM "Candidate" c
       LEFT JOIN "Position" p ON c."positionId" = p.id
       LEFT JOIN "User" r ON c."recruiterId" = r.id
       LEFT JOIN "ApplicantSource" cs ON c."sourceId" = cs.id
       WHERE c.id = $1::uuid;
     `, [id]);

    if (applicantResult.rows.length === 0) {
      throw new Error('Applicant not found after update');
    }

    const Applicant = applicantResult.rows[0];

    // Get job matches for this Applicant (only if feature is enabled)
    let jobMatchesResult = { rows: [] };
    if (isJobMatchEnabled) {
      jobMatchesResult = await client.query(`
        SELECT jm.*, p.title as "positionTitle"
        FROM "JobMatch" jm
        LEFT JOIN "Position" p ON jm."jobId" = p.id
        WHERE jm."candidateId" = $1::uuid
        ORDER BY jm."fitScore" DESC;
      `, [id]);
    }

    // Get attachment history for this Applicant
    const attachmentsResult = await client.query(`
      SELECT 
        a.id,
        a."candidateId",
        a."uploadedById",
        a."filePath",
        a."fileName",
        a.label,
        a."isPrimary",
        a."uploadedAt",
        a."updatedAt",
        a."headcountId",
        u.name as "uploadedByUserName"
      FROM "Attachment" a
      LEFT JOIN "User" u ON a."uploadedById" = u.id
      WHERE a."candidateId" = $1::uuid
      ORDER BY a."uploadedAt" DESC;
    `, [id]);

    // Defensive: always provide customAttributes as an object
    let customAttributes = {};
    try {
      customAttributes = applicant.customAttributes || {};
      if (typeof customAttributes === 'string') {
        try {
          customAttributes = JSON.parse(customAttributes);
        } catch (parseErr) {
          customAttributes = {};
        }
      }
    } catch (e) {
      customAttributes = {};
    }

    // Fetch current user's read status (if not just updated)
    let userReadStatus: boolean | null = null;
    if (newReadStatus !== undefined) {
      userReadStatus = newReadStatus;
    } else {
      const readStatusResult = await client.query(
        `SELECT "is_read" FROM "applicant_read_status" WHERE "applicant_id" = $1::uuid AND "user_id" = $2::uuid`,
        [id, actingUserId]
      );
      userReadStatus = readStatusResult.rows[0]?.is_read ?? null;
    }



    // Broadcast update with safe Applicant data
    try {
      broadcastApplicantUpdate({ ...Applicant, customAttributes }, actingUserId);
      // console.log('Applicant update broadcasted successfully');

      // Also broadcast status change if status was updated
      if (status !== undefined && oldStatus !== status) {
        broadcastApplicantStatusChanged({ ...Applicant, customAttributes }, oldStatus, status, actingUserId);
        // console.log('Applicant status change broadcasted successfully');
      }
    } catch (broadcastError) {
      console.error('Failed to broadcast Applicant update:', broadcastError);
      // Don't fail the request if broadcasting fails
    }

    return NextResponse.json({
      ...Applicant,
      assignmentJustification: Applicant.assignmentJustification || null,
      customAttributes,
      customFields: customAttributes, // Also provide as customFields for frontend compatibility
      isRead: userReadStatus, // Per-user read status
      position: Applicant.positionId ? {
        title: Applicant.positionTitle || null,
        department: Applicant.positionDepartment || null
      } : null,
      recruiter: Applicant.recruiterId ? { name: Applicant.recruiterName || null } : null,
      source: Applicant.sourceId ? {
        id: Applicant.sourceId,
        name: Applicant.sourceName,
        description: Applicant.sourceDescription,
        logo: Applicant.sourceLogo
      } : null,
      jobMatches: jobMatchesResult.rows || [],
      attachmentHistory: attachmentsResult.rows || [],
      recruiterSync: syncResult,
      headcountAssignment: headcountAssignmentResult
    });
  } catch (error: any) {
    if (client) {
      try {
        await client.query('ROLLBACK');
        // console.log('Database transaction rolled back successfully');
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }
    }
    console.error('Error updating Applicant:', id, error);
    console.error('Error details:', {
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      hint: error.hint,
      where: error.where,
      message: error.message,
      stack: error.stack
    });
    console.error('Request body that caused the error:', JSON.stringify(body, null, 2));
    try {
      await logAudit('ERROR', `Failed to update Applicant. Error: ${error.message}`, 'API:Applicants:Update', actingUserId, { candidateId: id, input: body });
    } catch (auditError) {
      console.error('Failed to log audit entry:', auditError);
    }
    // Note: Currently no unique constraint on email exists in database schema
    // if (error.code === '23505' && error.constraint === 'Applicant_email_key') {
    //   return NextResponse.json({ message: `A Applicant with the email "${email}" already exists.` }, { status: 409 });
    // }
    if (error.code === '23503') {
      // Foreign key constraint violation
      if (error.constraint === 'TransitionRecord_positionId_fkey') {
        return NextResponse.json({ message: 'Invalid position reference in transition record' }, { status: 400 });
      }
      if (error.constraint === 'TransitionRecord_candidateId_fkey') {
        return NextResponse.json({ message: 'Invalid Applicant reference in transition record' }, { status: 400 });
      }
      return NextResponse.json({ message: 'Foreign key constraint violation', error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error updating Applicant', error: error.message }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const actingUserId = session?.user?.id;
  const actingUserName = (session?.user?.name || session?.user?.email || actingUserId || 'System') as string;

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // Get Applicant name for audit log
    const result = await client.query('DELETE FROM "Candidate" WHERE id = $1::uuid RETURNING name', [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Applicant not found' }, { status: 404 });
    }

    const applicantName = result.rows[0].name;
    await client.query('COMMIT');
    await logAudit('AUDIT', `Applicant '${applicantName}' deleted by ${actingUserName}.`, 'API:Applicants:Delete', actingUserId, { candidateId: id });
    broadcastApplicantDeleted(id, actingUserId);
    return NextResponse.json({ message: 'Applicant deleted successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Failed to delete Applicant. Error: ${error.message}`, 'API:Applicants:Delete', actingUserId, { candidateId: id });
    return NextResponse.json({ message: 'Error deleting Applicant', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}