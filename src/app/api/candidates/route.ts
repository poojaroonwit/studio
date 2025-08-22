// src/app/api/candidates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';
import { broadcastCandidateUpdate } from '@/lib/candidateSse';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createDateInTimezone } from '@/lib/dateUtils';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';
import { normalizeFitScore } from '@/lib/scoreUtils';
import { syncRecruiterForCandidate } from '@/lib/recruiterSync';
import { NotificationService } from '@/lib/notificationService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';


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
  applicationDate: z.string().optional(), // Add applicationDate to the schema
  // You can add more fields if needed
});

// Helper for session and permission checks
async function requireSessionAndPermission(requiredPermission: string, request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }
  if (
    session.user.role !== 'Admin' &&
    !session.user.modulePermissions?.includes(requiredPermission)
  ) {
    await logAudit(
      'WARN',
      `Forbidden attempt to access candidates by ${session.user.name || session.user.email}.`,
      `API:Candidates:${requiredPermission}`,
      session.user.id
    );
    return { error: NextResponse.json({ message: `Forbidden: Insufficient permissions to ${requiredPermission.toLowerCase().replace('_', ' ')}` }, { status: 403 }) };
  }
  return { session };
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireSessionAndPermission('CANDIDATES_MANAGE', request);
  if (error) return error;
  const actingUserId = session.user.id;
  const actingUserName = session.user.name || session.user.email || 'System';

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

  const { candidate_info, job_matches, job_applied, applicationDate } = validationResult.data;
  const name = candidate_info.personal_info && candidate_info.personal_info.firstname && candidate_info.personal_info.lastname
    ? `${candidate_info.personal_info.firstname} ${candidate_info.personal_info.lastname}`
    : undefined;
  const email = candidate_info.contact_info && candidate_info.contact_info.email ? candidate_info.contact_info.email : undefined;
  const phone = candidate_info.contact_info && candidate_info.contact_info.phone ? candidate_info.contact_info.phone : undefined;
  if (!name || !email) {
    return NextResponse.json({ message: 'Missing name or email in candidate_info' }, { status: 400 });
  }
  
  // Extract fit score from job_applied if available, otherwise default to 0
  const fitScore = job_applied?.fitScore || 0;
  
  // Robustly determine positionId
  let positionId = job_applied?.jobId || null;
  if (!positionId && Array.isArray(job_matches) && job_matches.length > 0) {
    const matchWithJobId = job_matches.find((m: any) => m && m.jobId);
    if (matchWithJobId) {
      positionId = matchWithJobId.jobId;
    }
  }

  // Always filter job_matches to valid objects with jobId
  let safeJobMatches = Array.isArray(job_matches)
    ? job_matches.filter((m: any) => m && typeof m === 'object' && m.jobId)
    : [];

  // Build parsedData robustly
  const parsedData: any = {};
  if (candidate_info) parsedData.candidate_info = candidate_info;
  if (safeJobMatches.length > 0) parsedData.job_matches = safeJobMatches;
  if (job_applied) parsedData.job_applied = job_applied;
  
  const status = candidate_info.status || 'new';
  const newCandidateId = uuidv4();

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const insertCandidateQuery = `
      INSERT INTO "Candidate" (id, name, email, phone, "positionId", "fitScore", status, "parsedData", "applicationDate", "sourceId", "subSource", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *;
    `;
    const candidateResult = await client.query(insertCandidateQuery, [
      newCandidateId, name, email, phone, positionId, fitScore, status, parsedData, applicationDate ? new Date(applicationDate) : createDateInTimezone(),
      body.sourceId || null, body.subSource || null
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
    broadcastCandidateUpdate(newCandidate, actingUserId); // Broadcast to SSE clients
    
    // Auto-assign recruiter if candidate has a position and no recruiter
    if (positionId && !newCandidate.recruiterId) {
      try {
        const syncSuccess = await syncRecruiterForCandidate(
          newCandidateId,
          positionId,
          actingUserId,
          actingUserName
        );
        if (syncSuccess) {
          console.log(`Recruiter auto-assigned to candidate ${newCandidateId} from position ${positionId}`);
          
          // Get the updated candidate with recruiter information
          const updatedCandidateQuery = `
            SELECT c.*, p.title as "positionTitle", u.id as "recruiterId", u.name as "recruiterName"
            FROM "Candidate" c
            LEFT JOIN "Position" p ON c."positionId" = p.id
            LEFT JOIN "User" u ON c."recruiterId" = u.id
            WHERE c.id = $1
          `;
          const updatedCandidateResult = await client.query(updatedCandidateQuery, [newCandidateId]);
          const updatedCandidate = updatedCandidateResult.rows[0];
          
          // Send notification to the assigned recruiter
          if (updatedCandidate.recruiterId) {
            try {
              await NotificationService.notifyCandidateAdded(
                newCandidateId,
                name,
                positionId,
                updatedCandidate.positionTitle || 'Unknown Position',
                updatedCandidate.recruiterId,
                actingUserId
              );
            } catch (notificationError) {
              console.error('Failed to send candidate added notification:', notificationError);
              // Don't fail the entire operation if notification fails
            }
          }
        }
      } catch (syncError) {
        console.error('Failed to auto-assign recruiter after candidate creation:', syncError);
        // Don't fail the candidate creation if sync fails
      }
    }
    
    // Dispatch webhook for candidate creation
    try {
      await dispatchWebhooks.candidateCreated(newCandidate);
    } catch (webhookError) {
      console.error('Failed to dispatch candidate creation webhook:', webhookError);
      // Don't fail the request if webhook fails
    }
    
    return NextResponse.json({ message: 'Candidate created successfully', candidate: newCandidate }, { status: 201 });
  } catch (error: any) {
    await logAudit('ERROR', `Failed to create candidate. Error: ${error.message}`, 'API:Candidates:Create', actingUserId, { input: body });
    return NextResponse.json({ message: 'Error creating candidate', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireSessionAndPermission('CANDIDATES_VIEW', request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Sorting
    const allowedSortColumns = {
      name: 'c.name',
      email: 'c.email',
      fitScore: 'c."fitScore"',
      applicationDate: 'c."applicationDate"',
      status: 'c.status',
      lastUpdate: 'c."updatedAt"',
    };
    const sortColumnParam = searchParams.get('sortColumn') || 'lastUpdate';
    const sortDirectionParam = (searchParams.get('sortDirection') || 'desc').toLowerCase();
    const sortColumn = allowedSortColumns[sortColumnParam as keyof typeof allowedSortColumns] || 'c."updatedAt"';
    const sortDirection = sortDirectionParam === 'asc' ? 'ASC' : 'DESC';

    // Parse advanced query parameter if present
    const advancedQuery = searchParams.get('query');
    let advancedFilters: { [key: string]: string | undefined } = {};
    
    if (advancedQuery) {
      const parts = advancedQuery.split(' ').filter(part => part.includes(':'));
      
      parts.forEach(part => {
        const colonIndex = part.indexOf(':');
        if (colonIndex === -1) return;
        
        const key = part.substring(0, colonIndex);
        const value = part.substring(colonIndex + 1);
        if (!key || !value) return;
        
        switch (key.toLowerCase()) {
          case 'name':
            advancedFilters.searchTerm = value;
            break;
          case 'email':
            advancedFilters.email = value;
            break;
          case 'phone':
            advancedFilters.phone = value;
            break;
          case 'skills':
            advancedFilters.skills = value;
            break;
          case 'location':
            advancedFilters.location = value;
            break;
          case 'status':
            advancedFilters.status = value;
            break;
          case 'position':
            advancedFilters.position = value;
            break;
          case 'recruiter':
            advancedFilters.recruiter = value;
            break;
        }
      });
    }

    // Build filters object
    const filters = {
      name: searchParams.get('name') || advancedFilters.searchTerm,
      nameOperator: searchParams.get('nameOperator') || 'contains',
      email: searchParams.get('email') || advancedFilters.email,
      emailOperator: searchParams.get('emailOperator') || 'contains',
      phone: searchParams.get('phone') || advancedFilters.phone,
      phoneOperator: searchParams.get('phoneOperator') || 'contains',
      positionId: searchParams.get('positionId'),
      status: searchParams.get('status') || advancedFilters.status,
      education: searchParams.get('education'),
      minAppliedJobFitScore: searchParams.get('minAppliedJobFitScore') ? parseFloat(searchParams.get('minAppliedJobFitScore')!) : undefined,
      maxAppliedJobFitScore: searchParams.get('maxAppliedJobFitScore') ? parseFloat(searchParams.get('maxAppliedJobFitScore')!) : undefined,
      minMatchingJobFitScore: searchParams.get('minMatchingJobFitScore') ? parseFloat(searchParams.get('minMatchingJobFitScore')!) : undefined,
      maxMatchingJobFitScore: searchParams.get('maxMatchingJobFitScore') ? parseFloat(searchParams.get('maxMatchingJobFitScore')!) : undefined,
      minExperienceYears: searchParams.get('minExperienceYears') ? parseInt(searchParams.get('minExperienceYears')!, 10) : undefined,
      maxExperienceYears: searchParams.get('maxExperienceYears') ? parseInt(searchParams.get('maxExperienceYears')!, 10) : undefined,
      applicationDateStart: searchParams.get('applicationDateStart') ? new Date(searchParams.get('applicationDateStart')!) : undefined,
      applicationDateEnd: searchParams.get('applicationDateEnd') ? new Date(searchParams.get('applicationDateEnd')!) : undefined,
      recruiterId: searchParams.get('recruiterId'),
      sourceId: searchParams.get('sourceId'),
      location: searchParams.get('location') || advancedFilters.location,
      locationOperator: searchParams.get('locationOperator') || 'contains',
      skills: searchParams.get('skills') || advancedFilters.skills,
    };

    const client = await getPool().connect();

    try {
      // Build WHERE clauses and parameters
      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Handle name filter
      if (filters.name) {
        const operator = filters.nameOperator === 'exact' ? '=' : 'ILIKE';
        const value = filters.nameOperator === 'exact' ? filters.name : `%${filters.name}%`;
        whereClauses.push(`c.name ${operator} $${paramIndex++}`);
        queryParams.push(value);
      }

      // Handle email filter
      if (filters.email) {
        const operator = filters.emailOperator === 'exact' ? '=' : 'ILIKE';
        const value = filters.emailOperator === 'exact' ? filters.email : `%${filters.email}%`;
        whereClauses.push(`c.email ${operator} $${paramIndex++}`);
        queryParams.push(value);
      }

      // Handle phone filter
      if (filters.phone) {
        const operator = filters.phoneOperator === 'exact' ? '=' : 'ILIKE';
        const value = filters.phoneOperator === 'exact' ? filters.phone : `%${filters.phone}%`;
        whereClauses.push(`c.phone ${operator} $${paramIndex++}`);
        queryParams.push(value);
      }

      // Handle location filter
      if (filters.location) {
        const operator = filters.locationOperator === 'exact' ? '=' : 'ILIKE';
        const value = filters.locationOperator === 'exact' ? filters.location : `%${filters.location}%`;
        whereClauses.push(`c.location ${operator} $${paramIndex++}`);
        queryParams.push(value);
      }

      // Handle status filter
      if (filters.status) {
        const statuses = filters.status.split(',').map(s => s.trim()).filter(s => s !== '');
        const nullStatuses = statuses.filter(s => s === 'null' || s === '');
        const regularStatuses = statuses.filter(s => s !== 'null' && s !== '');
        
        if (nullStatuses.length > 0 && regularStatuses.length > 0) {
          // Mixed null and regular statuses
          whereClauses.push(`(c.status = ANY($${paramIndex++}) OR c.status = '' OR c.status = 'null')`);
          queryParams.push(regularStatuses);
        } else if (nullStatuses.length > 0) {
          // Only null statuses
          whereClauses.push(`(c.status = '' OR c.status = 'null' OR c.status IS NULL)`);
        } else {
          // Only regular statuses selected
          if (regularStatuses.length === 1) {
            whereClauses.push(`c.status = $${paramIndex++}`);
            queryParams.push(regularStatuses[0]);
          } else {
            whereClauses.push(`c.status = ANY($${paramIndex++})`);
            queryParams.push(regularStatuses);
          }
        }
      }

      // Handle position filter (supports multiple positions and 'not-applied')
      if (filters.positionId) {
        const positionIds = filters.positionId.split(',').map(id => id.trim()).filter(id => id !== '');
        
        // Check if "not-applied" is one of the selected positions
        const hasNotApplied = positionIds.includes('not-applied');
        const regularPositions = positionIds.filter(id => id !== 'not-applied');
        
        if (hasNotApplied && regularPositions.length === 0) {
          // Only "not-applied" selected - filter for candidates with no position
          whereClauses.push(`c."positionId" IS NULL`);
        } else if (hasNotApplied && regularPositions.length > 0) {
          // Mixed selection - include both "not-applied" and regular positions
          if (regularPositions.length === 1) {
            whereClauses.push(`(c."positionId" = $${paramIndex++} OR c."positionId" IS NULL)`);
            queryParams.push(regularPositions[0]);
          } else {
            whereClauses.push(`(c."positionId" = ANY($${paramIndex++}) OR c."positionId" IS NULL)`);
            queryParams.push(regularPositions);
          }
        } else {
          // Only regular positions selected
          if (regularPositions.length === 1) {
            whereClauses.push(`c."positionId" = $${paramIndex++}`);
            queryParams.push(regularPositions[0]);
          } else if (regularPositions.length > 1) {
            whereClauses.push(`c."positionId" = ANY($${paramIndex++})`);
            queryParams.push(regularPositions);
          }
        }
      }

      // Handle recruiter filter (supports multiple recruiters, 'unassigned', and 'select-all')
      if (filters.recruiterId) {
        const recruiterIds = filters.recruiterId.split(',').map(id => id.trim());
        
        // Check if "select-all" is selected - if so, don't filter by recruiter (show all)
        if (recruiterIds.includes('select-all')) {
          // Don't add any recruiter filter - show all recruiters
        } else {
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
      }

      // Recruiter auto-filter: If user is a Recruiter, only show their assigned candidates unless recruiterId is explicitly set
      const isRecruiter = session.user.role === 'Recruiter';
      const recruiterIdFromFilter = filters.recruiterId;
      if (isRecruiter && !recruiterIdFromFilter) {
        whereClauses.push(`c."recruiterId" = $${paramIndex++}`);
        queryParams.push(session.user.id);
      }

      // Handle source filter
      if (filters.sourceId) {
        const sourceIds = filters.sourceId.split(',').map(id => id.trim()).filter(id => id !== '');
        if (sourceIds.length === 1) {
          whereClauses.push(`c."sourceId" = $${paramIndex++}`);
          queryParams.push(sourceIds[0]);
        } else if (sourceIds.length > 1) {
          whereClauses.push(`c."sourceId" = ANY($${paramIndex++})`);
          queryParams.push(sourceIds);
        }
      }

      // Handle fit score filters
      if (filters.minAppliedJobFitScore !== undefined) {
        whereClauses.push(`c."fitScore" >= $${paramIndex++}`);
        queryParams.push(filters.minAppliedJobFitScore);
      }
      if (filters.maxAppliedJobFitScore !== undefined) {
        whereClauses.push(`c."fitScore" <= $${paramIndex++}`);
        queryParams.push(filters.maxAppliedJobFitScore);
      }

      // Handle experience filters
      if (filters.minExperienceYears !== undefined) {
        if (filters.minExperienceYears === -1) {
          // No experience filter
          whereClauses.push(`(c."parsedData"->>'experience' IS NULL OR c."parsedData"->>'experience' = '[]' OR c."parsedData"->>'experience' = '')`);
        } else {
          whereClauses.push(`CAST(c."parsedData"->>'totalExperienceYears' AS DECIMAL) >= $${paramIndex++}`);
          queryParams.push(filters.minExperienceYears);
        }
      }
      if (filters.maxExperienceYears !== undefined) {
        whereClauses.push(`CAST(c."parsedData"->>'totalExperienceYears' AS DECIMAL) <= $${paramIndex++}`);
        queryParams.push(filters.maxExperienceYears);
      }

      // Handle application date filters
      if (filters.applicationDateStart) {
        whereClauses.push(`c."applicationDate" >= $${paramIndex++}`);
        queryParams.push(filters.applicationDateStart.toISOString());
      }
      if (filters.applicationDateEnd) {
        whereClauses.push(`c."applicationDate" <= $${paramIndex++}`);
        queryParams.push(filters.applicationDateEnd.toISOString());
      }

      // Handle skills filter
      if (filters.skills) {
        const skills = filters.skills.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== '');
        if (skills.length > 0) {
          const skillsConditions = skills.map((_, index) => 
            `LOWER(c."parsedData"->>'skills') LIKE $${paramIndex + index}`
          ).join(' AND ');
          whereClauses.push(`(${skillsConditions})`);
          queryParams.push(...skills.map(skill => `%${skill}%`));
          paramIndex += skills.length;
        }
      }

      // Build the WHERE clause
      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Optimized query with reduced joins and selective data fetching
      const countQuery = `
        SELECT COUNT(*) as total
        FROM "Candidate" c
        ${whereClause}
      `;

      const dataQuery = `
        SELECT 
          c.id,
          c.name,
          c.email,
          c.phone,
          c."fitScore",
          c.status,
          c."applicationDate",
          c."updatedAt",
          c."positionId",
          c."recruiterId",
          c."sourceId",
          c."parsedData",
          p.title as "positionTitle",
          u.name as "recruiterName",
          cs.name as "sourceName"
        FROM "Candidate" c
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" u ON c."recruiterId" = u.id
        LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
        ${whereClause}
        ORDER BY ${sortColumn} ${sortDirection}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      // Execute queries in parallel for better performance
      const [countResult, dataResult] = await Promise.all([
        client.query(countQuery, queryParams),
        client.query(dataQuery, [...queryParams, limit, offset])
      ]);

      const total = parseInt(countResult.rows[0].total);
      const candidates = dataResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        fitScore: row.fitScore,
        status: row.status,
        applicationDate: row.applicationDate,
        updatedAt: row.updatedAt,
        positionId: row.positionId,
        recruiterId: row.recruiterId,
        sourceId: row.sourceId,
        parsedData: row.parsedData,
        position: row.positionTitle ? { title: row.positionTitle } : null,
        recruiter: row.recruiterName ? { name: row.recruiterName } : null,
        source: row.sourceName ? { name: row.sourceName } : null,
      }));

      return NextResponse.json({
        data: candidates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }, {
        headers: {
          'Cache-Control': 'public, max-age=10, stale-while-revalidate=30',
          'ETag': `"${Buffer.from(JSON.stringify({ filters, page, limit, total })).toString('base64').slice(0, 8)}"`
        }
      });

    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json({ 
      message: 'Error fetching candidates', 
      error: error.message 
    }, { status: 500 });
  }
}