// src/app/api/candidates/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '@/lib/db';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { unifiedBroadcaster } from '@/lib/unified-realtime-broadcaster';
import { normalizeFitScore } from '@/lib/scoreUtils';
import { syncRecruiterForCandidate } from '@/lib/recruiterSync';
import { NotificationService } from '@/lib/notificationService';
import { validateCandidateHiringStatus, assignCandidateToHeadcount } from '@/lib/headcountUtils';
import { WarningService } from '@/lib/warningService';

export const dynamic = 'force-dynamic';

/**
 * @openapi
 * /api/candidates/{id}:
 *   head:
 *     summary: Check if a candidate exists
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Candidate exists
 *       404:
 *         description: Candidate not found
 *   get:
 *     summary: Get a candidate by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Candidate details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Candidate'
 *       404:
 *         description: Candidate not found
 *   put:
 *     summary: Update a candidate by ID
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
 *             $ref: '#/components/schemas/Candidate'
 *     responses:
 *       200:
 *         description: Candidate updated
 *   delete:
 *     summary: Delete a candidate by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Candidate deleted
 *       404:
 *         description: Candidate not found
 */

// Define Zod schemas for validation...
const updateCandidateSchema = z.object({
  name: z.string().optional().nullable(),
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
});

function extractIdFromUrl(request: NextRequest): string | null {
  const match = request.nextUrl.pathname.match(/\/candidates\/([^/]+)/);
  return match ? match[1] : null;
}

export async function HEAD(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 });
  }

  const { id } = await params;
  // Validate UUID
  const uuidSchema = z.string().uuid();
  if (!uuidSchema.safeParse(id).success) {
    console.error('Invalid candidate ID format:', id);
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
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        'ETag': `"${Buffer.from(id).toString('base64').slice(0, 8)}"`,
      }
    });
  } catch (error: any) {
    console.error('Error validating candidate', id, error);
    
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  // Validate UUID
  const uuidSchema = z.string().uuid();
  if (!uuidSchema.safeParse(id).success) {
    console.error('Invalid candidate ID format:', id);
    return NextResponse.json({ message: 'Invalid candidate ID format' }, { status: 400 });
  }

  const startTime = Date.now();
  const client = await getPool().connect();
  try {
    // Set query timeout to prevent hanging queries - increased to match pool configuration
    await client.query('SET statement_timeout = 25000'); // 25 seconds timeout to match pool config
    
    // Check cache first (implement Redis or in-memory cache in production)
    const cacheKey = `candidate:${id}:${session.user.id}`;
    
    console.log(`[PERF] Starting candidate fetch for ID: ${id}`);
  
    // Optimized query with selective data fetching and better performance
    const candidateQuery = `
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.status,
        c."positionId",
        c."recruiterId",
        c."sourceId",
        c."fitScore",
        c."avatarUrl",
        c."resumePath",
        c."assignmentJustification",
        c."parsedData",
        c."customAttributes",
        c."createdAt",
        c."updatedAt",
        c."applicationDate",
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
      LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
      WHERE c.id = $1::uuid
    `;
    
    const candidateStartTime = Date.now();
    const candidateResult = await client.query(candidateQuery, [id]);
    const candidateQueryTime = Date.now() - candidateStartTime;
    
    if (candidateQueryTime > 5000) {
      console.warn(`[PERF] Slow candidate query: ${candidateQueryTime}ms for ID: ${id}`);
    }
 
    if (candidateResult.rows.length === 0) {
      return NextResponse.json({ message: 'Candidate not found' }, { status: 404 });
    }

    const candidate = candidateResult.rows[0];

    // Fetch job matches separately with pagination (reduced limit for performance)
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
    
    const jobMatches = jobMatchesResult.rows || [];

    // Fetch recent attachments only (reduced limit for performance)
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
    
    const attachmentsStartTime = Date.now();
    const attachmentsResult = await client.query(attachmentsQuery, [id]);
    const attachmentsQueryTime = Date.now() - attachmentsStartTime;
    
    if (attachmentsQueryTime > 3000) {
      console.warn(`[PERF] Slow attachments query: ${attachmentsQueryTime}ms for ID: ${id}`);
    }
    
    const attachments = attachmentsResult.rows || [];

    const totalTime = Date.now() - startTime;
    
    if (totalTime > 10000) {
      console.warn(`[PERF] Total candidate fetch took ${totalTime}ms for ID: ${id}`);
    } else {
      console.log(`[PERF] Total candidate fetch completed in ${totalTime}ms for ID: ${id}`);
    }
  
    const responseData = {
      ...candidate,
      fitScore: normalizeFitScore(candidate.fitScore),
      position: candidate.positionId ? {
        title: candidate.positionTitle || null,
        department: candidate.positionDepartment || null
      } : null,
      recruiter: candidate.recruiterId ? { 
        name: candidate.recruiterName || null,
        avatarUrl: candidate.recruiterAvatarUrl || null
      } : null,
      source: candidate.sourceId ? {
        id: candidate.sourceId,
        name: candidate.sourceName,
        description: candidate.sourceDescription,
        logo: candidate.sourceLogo
      } : null,
      jobMatches: jobMatches.map((match: any) => ({
        ...match,
        fitScore: normalizeFitScore(match.fitScore),
        jobTitle: match.jobTitle || match.positionTitle || null,
        positionTitle: match.positionTitle || match.jobTitle || null,
      })),
      attachmentHistory: attachments,
      custom_attributes: candidate.customAttributes || {},
      // Add metadata for pagination
      _metadata: {
        totalJobMatches: jobMatches.length,
        totalAttachments: attachments.length,
        hasMoreJobMatches: jobMatches.length === 3,
        hasMoreAttachments: attachments.length === 2
      }
    };

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        'ETag': `"${Buffer.from(JSON.stringify(responseData)).toString('base64').slice(0, 8)}"`,
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Error fetching candidate', id, error);
    
    // Handle connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('Database connection error for candidate:', id, error);
      return NextResponse.json({ 
        message: 'Database connection error. Please try again in a moment.',
        error: 'Database connection failed',
        candidateId: id
      }, { status: 503 }); // 503 Service Unavailable
    }
    
    // Handle timeout errors
    if (error.code === '57014' || error.message?.includes('timeout')) {
      console.error('Database timeout error for candidate:', id, error);
      return NextResponse.json({ 
        message: 'Request timed out. The server may be experiencing high load. Please try again in a moment.',
        error: 'Database timeout',
        candidateId: id
      }, { status: 408 }); // 408 Request Timeout
    }
    
    return NextResponse.json({ 
      message: 'Error fetching candidate', 
      error: error?.message || String(error),
      candidateId: id
    }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to manage candidates
  const hasBasicEditPermission = session.user.role === 'Admin' || session.user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC');
  const hasSensitiveEditPermission = session.user.role === 'Admin' || session.user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE');
  const hasPipelineUpdatePermission = session.user.role === 'Admin' || session.user.modulePermissions?.includes('CANDIDATES_PIPELINE_STAGE_UPDATE');
  
  // Check if user has any required permission
  if (!hasBasicEditPermission && !hasSensitiveEditPermission && !hasPipelineUpdatePermission) {
    await logAudit('WARN', `Forbidden attempt to update candidate by ${actingUserName}.`, 'API:Candidates:Update', actingUserId);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to update candidates' }, { status: 403 });
  }

  const { id } = await params;
  
  // UUID validation removed
  
  let body;
  try {
    body = await request.json();
    console.log('Candidate update request body:', JSON.stringify(body, null, 2));
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }



  // Skip validation and use body directly
  const { name, email, phone, positionId, recruiterId, fitScore, status, assignmentJustification, parsedData, custom_attributes, resumePath, transitionNotes, avatarUrl, sourceId, subSource } = body;

  // Validation removed - proceed with data as-is

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // Check if candidate exists first
    const existingResult = await client.query('SELECT * FROM "Candidate" WHERE id = $1::uuid', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.error('Candidate not found:', id);
      return NextResponse.json({ message: 'Candidate not found' }, { status: 404 });
    }

    const existingCandidate = existingResult.rows[0];
    const oldStatus = existingCandidate.status;
    const oldRecruiterId = existingCandidate.recruiterId;
    const oldPositionId = existingCandidate.positionId;



    // Existence checks for foreign keys
    if (positionId) {
      const posCheck = await client.query('SELECT id FROM "Position" WHERE id = $1::uuid', [positionId]);
      if (posCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        console.error('Position not found:', positionId);
        return NextResponse.json({ message: 'Position not found.' }, { status: 400 });
      }
    }
    if (recruiterId) {
      const recCheck = await client.query('SELECT id FROM "User" WHERE id = $1::uuid AND role = $2', [recruiterId, 'Recruiter']);
      if (recCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        console.error('Recruiter not found or user is not a recruiter:', recruiterId);
        return NextResponse.json({ message: 'Recruiter not found or user is not a recruiter.' }, { status: 400 });
      }
    }
    if (sourceId) {
      const sourceCheck = await client.query('SELECT id FROM "CandidateSource" WHERE id = $1::uuid', [sourceId]);
      if (sourceCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        console.error('Candidate source not found:', sourceId);
        return NextResponse.json({ message: 'Candidate source not found.' }, { status: 400 });
      }
    }

    // Validate headcount availability if changing status to "Hired"
    if (status === 'Hired' && status !== oldStatus && existingCandidate.positionId) {
      try {
        const validation = await validateCandidateHiringStatus(id, existingCandidate.positionId);
        if (!validation.canHire) {
          await client.query('ROLLBACK');
          return NextResponse.json({ 
            message: validation.message,
            reason: validation.reason,
            headcountStatus: validation.headcountStatus
          }, { status: 400 });
        }
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error validating headcount for hiring:', error);
        return NextResponse.json({ message: 'Error validating headcount availability' }, { status: 500 });
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
      updateFields.push(`status = $${paramIndex}`);
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
    if (custom_attributes !== undefined) {
      updateFields.push(`"customAttributes" = $${paramIndex}`);
      updateValues.push(custom_attributes);
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

    // Always update the updatedAt timestamp
    updateFields.push(`"updatedAt" = NOW()`);

    const updateQuery = `
      UPDATE "Candidate" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}::uuid
      RETURNING *;
    `;
    updateValues.push(id);

  
    const updateResult = await client.query(updateQuery, updateValues);
    
    // Fetch updated candidate with source information
    const updatedCandidateWithSource = await client.query(`
      SELECT c.*, cs.name as "sourceName", cs.description as "sourceDescription", cs.logo as "sourceLogo"
      FROM "Candidate" c
      LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
      WHERE c.id = $1
    `, [id]);
    
    const candidateWithSource = updatedCandidateWithSource.rows[0];

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
    if (status === 'Hired' && status !== oldStatus && existingCandidate.positionId) {
      try {
        const validation = await validateCandidateHiringStatus(id, existingCandidate.positionId);
        if (validation.canHire && validation.reason === 'VACANT_HEADCOUNT_AVAILABLE') {
          headcountAssignmentResult = await assignCandidateToHeadcount(
            id,
            existingCandidate.positionId,
            actingUserId,
            actingUserName
          );
        }
      } catch (headcountError) {
        console.error('Error assigning headcount:', headcountError);
        // Don't fail the status update if headcount assignment fails
      }
    }

    // Create transition record if status changed
    if (status !== undefined && oldStatus !== status) {
      let safePositionId = positionId ?? existingCandidate.positionId ?? null; // Use existing position if not provided
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
          await unifiedBroadcaster.broadcastCandidateTransitionUpdated({
            candidateId: id,
            transition: newTransition,
            action: 'add'
          }, actingUserId);
        }

        // Send notification to recruiter about status change
        const candidateWithRecruiterQuery = `
          SELECT c.*, p.title as "positionTitle", u.id as "recruiterId", u.name as "recruiterName"
          FROM "Candidate" c
          LEFT JOIN "Position" p ON c."positionId" = p.id
          LEFT JOIN "User" u ON c."recruiterId" = u.id
          WHERE c.id = $1
        `;
        const candidateWithRecruiterResult = await client.query(candidateWithRecruiterQuery, [id]);
        const candidateWithRecruiter = candidateWithRecruiterResult.rows[0];
        
        if (candidateWithRecruiter.recruiterId && status !== null) {
          try {
            await NotificationService.notifyCandidateStatusChange(
              id,
              candidateWithRecruiter.name,
              oldStatus,
              status,
              candidateWithRecruiter.positionId,
              candidateWithRecruiter.positionTitle || 'Unknown Position',
              candidateWithRecruiter.recruiterId,
              actingUserId
            );
          } catch (notificationError) {
            console.error('Failed to send candidate status change notification:', notificationError);
            // Don't fail the entire operation if notification fails
          }
        }
      } catch (transitionError) {
        console.error('Error creating transition record:', transitionError);
        throw transitionError;
      }
    } else if (recruiterChanged) {
      // Create transition record for recruiter change
      let safePositionId = positionId ?? existingCandidate.positionId ?? null;
      
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
          newTransitionId, id, safePositionId, status ?? existingCandidate.status, transitionMessage, actingUserId
        ]);
        // Broadcast the new transition
        const getTransitionQuery = 'SELECT * FROM "TransitionRecord" WHERE id = $1';
        const transitionResult = await client.query(getTransitionQuery, [newTransitionId]);
        if (transitionResult.rows.length > 0) {
          const newTransition = transitionResult.rows[0];
          await unifiedBroadcaster.broadcastCandidateTransitionUpdated({
            candidateId: id,
            transition: newTransition,
            action: 'add'
          }, actingUserId);
        }
      } catch (transitionError) {
        console.error('Error creating recruiter change transition record:', transitionError);
        throw transitionError;
      }
    }

    // Auto-assign recruiter if position changed and candidate has no recruiter
    let syncResult = null;
    if (positionId !== undefined && positionId !== oldPositionId && recruiterId === undefined) {
      try {
        const syncSuccess = await syncRecruiterForCandidate(
          id, 
          positionId, 
          actingUserId, 
          actingUserName
        );
        if (syncSuccess) {
          syncResult = { synced: true, message: 'Recruiter auto-assigned from position' };
        }
      } catch (syncError) {
        console.error('Failed to assign recruiter after position assignment:', syncError);
        // Don't fail the candidate update if sync fails
      }
    }

    // Initialize headcountAssignmentResult if not already set
    if (typeof headcountAssignmentResult === 'undefined') {
      headcountAssignmentResult = null;
    }

    await client.query('COMMIT');
    await logAudit('AUDIT', `Candidate '${existingCandidate.name}' updated by ${actingUserName}.`, 'API:Candidates:Update', actingUserId, { candidateId: id, oldStatus, newStatus: status ?? existingCandidate.status });
    
         // After update, re-fetch the candidate using the same logic as GET to ensure response structure is identical
     const candidateResult = await client.query(`
       SELECT c.*, p.title as "positionTitle", p.department as "positionDepartment", r.name as "recruiterName",
              cs.name as "sourceName", cs.description as "sourceDescription", cs.logo as "sourceLogo"
       FROM "Candidate" c
       LEFT JOIN "Position" p ON c."positionId" = p.id
       LEFT JOIN "User" r ON c."recruiterId" = r.id
       LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
       WHERE c.id = $1::uuid;
     `, [id]);
    
    if (candidateResult.rows.length === 0) {
      throw new Error('Candidate not found after update');
    }
    
    const candidate = candidateResult.rows[0];
    
    // Get job matches for this candidate
    const jobMatchesResult = await client.query(`
      SELECT jm.*, p.title as "positionTitle"
      FROM "JobMatch" jm
      LEFT JOIN "Position" p ON jm."jobId" = p.id
      WHERE jm."candidateId" = $1::uuid
      ORDER BY jm."fitScore" DESC;
    `, [id]);
    
    // Get attachment history for this candidate
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
      customAttributes = candidate.customAttributes || {};
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
    
    // Check for warnings after candidate update using automation system
    try {
      const { WarningAutomation } = await import('@/lib/warningAutomation');
      WarningAutomation.triggerEntityCheckWithRetry('candidate', id, actingUserId);
    } catch (warningError) {
      console.error('Failed to trigger warning check for updated candidate:', warningError);
      // Don't fail the request if warning check fails
    }
    
    // Broadcast update with safe candidate data
    await unifiedBroadcaster.broadcastCandidateUpdated({ ...candidate, customAttributes }, actingUserId, {
      priority: 'high',
      retryOnFailure: true,
      maxRetries: 3
    });
  
    return NextResponse.json({
      ...candidate,
      assignmentJustification: candidate.assignmentJustification || null,
      customAttributes,
      position: candidate.positionId ? {
        title: candidate.positionTitle || null,
        department: candidate.positionDepartment || null
      } : null,
      recruiter: candidate.recruiterId ? { name: candidate.recruiterName || null } : null,
      source: candidate.sourceId ? {
        id: candidate.sourceId,
        name: candidate.sourceName,
        description: candidate.sourceDescription,
        logo: candidate.sourceLogo
      } : null,
      jobMatches: jobMatchesResult.rows || [],
      attachmentHistory: attachmentsResult.rows || [],
      recruiterSync: syncResult,
      headcountAssignment: headcountAssignmentResult
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating candidate:', id, error);
    console.error('Error details:', {
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      hint: error.hint,
      where: error.where
    });
    await logAudit('ERROR', `Failed to update candidate. Error: ${error.message}`, 'API:Candidates:Update', actingUserId, { candidateId: id, input: body });
    // Note: Currently no unique constraint on email exists in database schema
    // if (error.code === '23505' && error.constraint === 'Candidate_email_key') {
    //   return NextResponse.json({ message: `A candidate with the email "${email}" already exists.` }, { status: 409 });
    // }
    if (error.code === '23503') {
      // Foreign key constraint violation
      if (error.constraint === 'TransitionRecord_positionId_fkey') {
        return NextResponse.json({ message: 'Invalid position reference in transition record' }, { status: 400 });
      }
      if (error.constraint === 'TransitionRecord_candidateId_fkey') {
        return NextResponse.json({ message: 'Invalid candidate reference in transition record' }, { status: 400 });
      }
      return NextResponse.json({ message: 'Foreign key constraint violation', error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error updating candidate', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    
    // Get candidate name for audit log
    const result = await client.query('DELETE FROM "Candidate" WHERE id = $1::uuid RETURNING name', [id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ message: 'Candidate not found' }, { status: 404 });
    }

    const candidateName = result.rows[0].name;
    await client.query('COMMIT');
    await logAudit('AUDIT', `Candidate '${candidateName}' deleted by ${actingUserName}.`, 'API:Candidates:Delete', actingUserId, { candidateId: id });
    await unifiedBroadcaster.broadcastCandidateDeleted(id, actingUserId, {
      priority: 'high',
      retryOnFailure: true,
      maxRetries: 3
    });
    return NextResponse.json({ message: 'Candidate deleted successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Failed to delete candidate. Error: ${error.message}`, 'API:Candidates:Delete', actingUserId, { candidateId: id });
    return NextResponse.json({ message: 'Error deleting candidate', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}