// src/app/api/candidates/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getPool } from '../../../lib/db';
import { z } from 'zod';
import { logAudit } from '@/lib/auditLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { broadcastCandidateUpdate } from '@/lib/candidateSse';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';

/**
 * @openapi
 * /api/candidates:
 *   get:
 *     summary: Get all candidates
 *     description: Returns a list of all candidates.
 *     responses:
 *       200:
 *         description: List of candidates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Candidate'
 *   post:
 *     summary: Create a new candidate
 *     description: Creates a new candidate.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Candidate'
 *     responses:
 *       201:
 *         description: Candidate created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Candidate'
 */

// Define the new schema for candidate creation
const candidateInfoSchema = z.object({
  personal_info: z.object({
    title_honorific: z.string().optional().nullable(),
    firstname: z.string().min(1),
    lastname: z.string().min(1),
    nickname: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    introduction_aboutme: z.string().optional().nullable(),
    avatar_url: z.string().url().optional().nullable(),
  }),
  contact_info: z.object({
    email: z.string().email(),
    phone: z.string().optional().nullable(),
  }),
  education: z.array(z.any()).optional(),
  experience: z.array(z.any()).optional(),
  skills: z.array(z.any()).optional(),
  job_suitable: z.array(z.any()).optional(),
  cv_language: z.string().optional().nullable(),
  status: z.string().optional(),
});

const createCandidateSchema = z.object({
  candidate_info: candidateInfoSchema,
  job_matches: z.array(z.any()).optional(),
  job_applied: z.any().optional(),
  // You can add more fields if needed
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const actingUserId = session?.user?.id;
  const actingUserName = session?.user?.name || session?.user?.email || 'System';

  if (!actingUserId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to create candidates
  if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('CANDIDATES_MANAGE')) {
    await logAudit('WARN', `Forbidden attempt to create candidate by ${actingUserName}.`, 'API:Candidates:Create', actingUserId);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to create candidates' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  // Only accept the new format
  const validationResult = createCandidateSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }

  const { candidate_info, job_matches, job_applied } = validationResult.data;
  const name = candidate_info.personal_info && candidate_info.personal_info.firstname && candidate_info.personal_info.lastname
    ? `${candidate_info.personal_info.firstname} ${candidate_info.personal_info.lastname}`
    : undefined;
  const email = candidate_info.contact_info && candidate_info.contact_info.email ? candidate_info.contact_info.email : undefined;
  if (!name || !email) {
    return NextResponse.json({ message: 'Missing name or email in candidate_info' }, { status: 400 });
  }
  const status = candidate_info.status || 'new';
  const parsedData = { candidate_info, job_matches, job_applied };
  const newCandidateId = uuidv4();

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const insertCandidateQuery = `
      INSERT INTO "Candidate" (id, name, email, status, "parsedData", "applicationDate", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *;
    `;
    const candidateResult = await client.query(insertCandidateQuery, [
      newCandidateId, name, email, status, parsedData
    ]);
    const newCandidate = candidateResult.rows[0];
    // Create initial transition record
    const insertTransitionQuery = `
      INSERT INTO "TransitionRecord" (id, "candidateId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW());
    `;
    await client.query(insertTransitionQuery, [
      uuidv4(), newCandidateId, status, 'Initial creation', actingUserId
    ]);
    await client.query('COMMIT');
    await logAudit('AUDIT', `New candidate '${name}' created by ${actingUserName}.`, 'API:Candidates:Create', actingUserId, { candidateId: newCandidateId });
    broadcastCandidateUpdate(newCandidate); // Broadcast to SSE clients
    
    // Dispatch webhook for candidate creation
    try {
      await dispatchWebhooks.candidateCreated(newCandidate);
    } catch (webhookError) {
      console.error('Failed to dispatch candidate creation webhook:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    return NextResponse.json({ message: 'Candidate created successfully', candidate: newCandidate }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    await logAudit('ERROR', `Failed to create candidate. Error: ${error.message}`, 'API:Candidates:Create', actingUserId, { input: body });
    if (error.code === '23505' && error.constraint === 'Candidate_email_key') {
      return NextResponse.json({ message: `A candidate with the email "${email}" already exists.` }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error creating candidate', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has permission to view candidates
  if (session.user.role !== 'Admin' && !session.user.modulePermissions?.includes('CANDIDATES_VIEW')) {
    await logAudit('WARN', `Forbidden attempt to view candidates by ${session.user.name || session.user.email}.`, 'API:Candidates:Get', session.user.id);
    return NextResponse.json({ message: 'Forbidden: Insufficient permissions to view candidates' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  // Filters
  const filters: { [key: string]: string | undefined } = {
    status: searchParams.get('status') || undefined,
    positionId: searchParams.get('positionId') || undefined,
    recruiterId: searchParams.get('recruiterId') || searchParams.get('assignedRecruiterId') || undefined,
    searchTerm: searchParams.get('searchTerm') || searchParams.get('name') || undefined,
    email: searchParams.get('email') || undefined,
    phone: searchParams.get('phone') || undefined,
    education: searchParams.get('education') || undefined,
    applicationDateStart: searchParams.get('applicationDateStart') || undefined,
    applicationDateEnd: searchParams.get('applicationDateEnd') || undefined,
    minFitScore: searchParams.get('minFitScore') || undefined,
    maxFitScore: searchParams.get('maxFitScore') || undefined,
  };

  let whereClauses: string[] = [];
  let queryParams: any[] = [];
  let paramIndex = 1;

  // Handle status filter (supports multiple statuses)
  if (filters.status) {
    const statuses = filters.status.split(',').map(s => s.trim());
    if (statuses.length === 1) {
      whereClauses.push(`c.status = $${paramIndex++}`);
      queryParams.push(statuses[0]);
    } else {
      whereClauses.push(`c.status = ANY($${paramIndex++})`);
      queryParams.push(statuses);
    }
  }

  // Handle position filter (supports multiple positions)
  if (filters.positionId) {
    const positionIds = filters.positionId.split(',').map(id => id.trim());
    if (positionIds.length === 1) {
      whereClauses.push(`c."positionId" = $${paramIndex++}`);
      queryParams.push(positionIds[0]);
    } else {
      whereClauses.push(`c."positionId" = ANY($${paramIndex++})`);
      queryParams.push(positionIds);
    }
  }

  // Handle recruiter filter (supports multiple recruiters and 'unassigned')
  if (filters.recruiterId) {
    const recruiterIds = filters.recruiterId.split(',').map(id => id.trim());
    if (recruiterIds.length === 1 && recruiterIds[0] === 'unassigned') {
      whereClauses.push(`c."recruiterId" IS NULL`);
    } else if (recruiterIds.length === 1) {
      whereClauses.push(`c."recruiterId" = $${paramIndex++}`);
      queryParams.push(recruiterIds[0]);
    } else {
      // Handle mixed case: some unassigned, some assigned
      const assignedIds = recruiterIds.filter(id => id !== 'unassigned');
      const hasUnassigned = recruiterIds.includes('unassigned');
      
      if (assignedIds.length > 0 && hasUnassigned) {
        whereClauses.push(`(c."recruiterId" IS NULL OR c."recruiterId" = ANY($${paramIndex++}))`);
        queryParams.push(assignedIds);
      } else if (assignedIds.length > 0) {
        whereClauses.push(`c."recruiterId" = ANY($${paramIndex++})`);
        queryParams.push(assignedIds);
      } else if (hasUnassigned) {
        whereClauses.push(`c."recruiterId" IS NULL`);
      }
    }
  }

  // Handle text search (name)
  if (filters.searchTerm) {
    whereClauses.push(`(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`);
    queryParams.push(`%${filters.searchTerm}%`);
    paramIndex++;
  }

  // Handle email filter
  if (filters.email) {
    whereClauses.push(`c.email ILIKE $${paramIndex++}`);
    queryParams.push(`%${filters.email}%`);
  }

  // Handle phone filter
  if (filters.phone) {
    whereClauses.push(`c.phone ILIKE $${paramIndex++}`);
    queryParams.push(`%${filters.phone}%`);
  }

  // Handle education filter (search in parsed data)
  if (filters.education) {
    whereClauses.push(`c."parsedData"::text ILIKE $${paramIndex++}`);
    queryParams.push(`%${filters.education}%`);
  }

  // Handle date range filter
  if (filters.applicationDateStart || filters.applicationDateEnd) {
    if (filters.applicationDateStart && filters.applicationDateEnd) {
      whereClauses.push(`c."applicationDate" >= $${paramIndex++} AND c."applicationDate" <= $${paramIndex++}`);
      queryParams.push(filters.applicationDateStart, filters.applicationDateEnd);
    } else if (filters.applicationDateStart) {
      whereClauses.push(`c."applicationDate" >= $${paramIndex++}`);
      queryParams.push(filters.applicationDateStart);
    } else if (filters.applicationDateEnd) {
      whereClauses.push(`c."applicationDate" <= $${paramIndex++}`);
      queryParams.push(filters.applicationDateEnd);
    }
  }

  // Handle fit score range filter
  if (filters.minFitScore || filters.maxFitScore) {
    if (filters.minFitScore && filters.maxFitScore) {
      whereClauses.push(`c."fitScore" >= $${paramIndex++} AND c."fitScore" <= $${paramIndex++}`);
      queryParams.push(parseInt(filters.minFitScore), parseInt(filters.maxFitScore));
    } else if (filters.minFitScore) {
      whereClauses.push(`c."fitScore" >= $${paramIndex++}`);
      queryParams.push(parseInt(filters.minFitScore));
    } else if (filters.maxFitScore) {
      whereClauses.push(`c."fitScore" <= $${paramIndex++}`);
      queryParams.push(parseInt(filters.maxFitScore));
    }
  }

  // If user is a Recruiter, only show their assigned candidates
  if (session.user.role === 'Recruiter') {
    whereClauses.push(`c."recruiterId" = $${paramIndex++}`);
    queryParams.push(session.user.id);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const client = await getPool().connect();
  try {
    const candidatesQuery = `
      SELECT c.*, p.id as "positionId", p.title as "positionTitle", p.department as "positionDepartment", p.position_level as "positionLevel",
             r.id as "recruiterId", r.name as "recruiterName"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      ${whereString}
      ORDER BY c."applicationDate" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;
    const candidatesResult = await client.query(candidatesQuery, [...queryParams, limit, offset]);
    const totalQuery = `SELECT COUNT(*) FROM "Candidate" c ${whereString};`;
    const totalResult = await client.query(totalQuery, queryParams.slice(0, paramIndex - 1));
    const total = parseInt(totalResult.rows[0].count, 10);
    const candidates = candidatesResult.rows.map(row => {
      let customAttributes = row.customAttributes || {};
      if (typeof customAttributes === 'string') {
        try {
          customAttributes = JSON.parse(customAttributes);
        } catch {
          customAttributes = {};
        }
      }
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || null,
        avatarUrl: row.avatarUrl || null,
        dataAiHint: row.dataAiHint || null,
        resumePath: row.resumePath || null,
        parsedData: row.parsedData || { personal_info: {}, contact_info: {} },
        customAttributes,
        position: row.positionId ? {
          id: row.positionId,
          title: row.positionTitle,
          department: row.positionDepartment,
          position_level: row.positionLevel
        } : null,
        fitScore: row.fitScore || null,
        status: row.status,
        applicationDate: row.applicationDate,
        recruiter: row.recruiterId ? {
          id: row.recruiterId,
          name: row.recruiterName,
          email: null
        } : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        transitionHistory: row.transitionHistory || [],
      };
    });
    return NextResponse.json({
      data: candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error fetching candidates', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}