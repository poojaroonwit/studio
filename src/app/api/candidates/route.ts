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
import { normalizeFitScore } from '@/lib/scoreUtils';

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
      INSERT INTO "Candidate" (id, name, email, phone, "positionId", "fitScore", status, "parsedData", "applicationDate", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *;
    `;
    const candidateResult = await client.query(insertCandidateQuery, [
      newCandidateId, name, email, phone, positionId, fitScore, status, parsedData, applicationDate ? new Date(applicationDate) : new Date()
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
    await logAudit('ERROR', `Failed to create candidate. Error: ${error.message}`, 'API:Candidates:Create', actingUserId, { input: body });
    return NextResponse.json({ message: 'Error creating candidate', error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
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

  // Filters
  const filters: { [key: string]: string | undefined } = {
    status: searchParams.get('status') || undefined,
    positionId: searchParams.get('positionId') || undefined,
    recruiterId: searchParams.get('recruiterId') || searchParams.get('assignedRecruiterId') || undefined,
    searchTerm: searchParams.get('searchTerm') || searchParams.get('name') || undefined,
    email: searchParams.get('email') || undefined,
    phone: searchParams.get('phone') || undefined,
    education: searchParams.get('education') || undefined,
    skills: searchParams.get('skills') || undefined,
    location: searchParams.get('location') || undefined,
    cvLanguage: searchParams.get('cvLanguage') || undefined,
    jobSuitableCareer: searchParams.get('jobSuitableCareer') || undefined,
    jobSuitableLevel: searchParams.get('jobSuitableLevel') || undefined,
    jobSuitablePosition: searchParams.get('jobSuitablePosition') || undefined,
    minExperienceYears: searchParams.get('minExperienceYears') || undefined,
    maxExperienceYears: searchParams.get('maxExperienceYears') || undefined,
    applicationDateStart: searchParams.get('applicationDateStart') || undefined,
    applicationDateEnd: searchParams.get('applicationDateEnd') || undefined,
    minFitScore: searchParams.get('minFitScore') || undefined,
    maxFitScore: searchParams.get('maxFitScore') || undefined,
    matchingMinFitScore: searchParams.get('matchingMinFitScore') || undefined,
    matchingMaxFitScore: searchParams.get('matchingMaxFitScore') || undefined,
  };



  // Filter out undefined values to prevent PostgreSQL errors
  Object.keys(filters).forEach(key => {
    if (filters[key] === undefined || filters[key] === '') {
      delete filters[key];
    }
  });
  


  let whereClauses: string[] = [];
  let queryParams: any[] = [];
  let paramIndex = 1;

  // Handle status filter (supports multiple statuses)
  if (filters.status) {
    const statuses = filters.status.split(',').map(s => s.trim());
    
    // Check if "Off" is one of the selected statuses
    const hasOffStatus = statuses.includes('Off');
    const regularStatuses = statuses.filter(s => s !== 'Off');
    
    if (hasOffStatus && regularStatuses.length === 0) {
      // Only "Off" status selected - filter for candidates with no status
      whereClauses.push(`(c.status IS NULL OR c.status = '' OR c.status = 'null')`);
    } else if (hasOffStatus && regularStatuses.length > 0) {
      // Mixed selection - include both "Off" and regular statuses
      if (regularStatuses.length === 1) {
        whereClauses.push(`(c.status = $${paramIndex++} OR c.status IS NULL OR c.status = '' OR c.status = 'null')`);
        queryParams.push(regularStatuses[0]);
      } else {
        whereClauses.push(`(c.status = ANY($${paramIndex++}) OR c.status IS NULL OR c.status = '' OR c.status = 'null')`);
        queryParams.push(regularStatuses);
      }
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

  // Recruiter auto-filter: If user is a Recruiter, only show their assigned candidates unless recruiterId is explicitly set
  const isRecruiter = session.user.role === 'Recruiter';
  const recruiterIdFromFilter = filters.recruiterId;
  if (isRecruiter && !recruiterIdFromFilter) {
    whereClauses.push(`c."recruiterId" = $${paramIndex++}`);
    queryParams.push(session.user.id);
  }

  // Handle text search (name)
  if (filters.searchTerm) {
    whereClauses.push(`(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`);
    queryParams.push(`%${filters.searchTerm}%`);
    paramIndex++;
  }

  // Handle name filter with operator
  const name = searchParams.get('name');
  const nameOperator = searchParams.get('nameOperator') || 'contains';
  if (name) {
    if (nameOperator === 'is') {
      whereClauses.push(`c.name = $${paramIndex++}`);
      queryParams.push(name);
    } else if (nameOperator === 'startsWith') {
      whereClauses.push(`c.name ILIKE $${paramIndex++}`);
      queryParams.push(`${name}%`);
    } else if (nameOperator === 'endsWith') {
      whereClauses.push(`c.name ILIKE $${paramIndex++}`);
      queryParams.push(`%${name}`);
    } else if (nameOperator === 'contains' || !nameOperator) {
      whereClauses.push(`c.name ILIKE $${paramIndex++}`);
      queryParams.push(`%${name}%`);
    }
    // If 'other', skip filtering by name
  }

  // Handle email filter with operator
  const email = searchParams.get('email');
  const emailOperator = searchParams.get('emailOperator') || 'contains';
  if (email) {
    if (emailOperator === 'is') {
      whereClauses.push(`c.email = $${paramIndex++}`);
      queryParams.push(email);
    } else if (emailOperator === 'startsWith') {
      whereClauses.push(`c.email ILIKE $${paramIndex++}`);
      queryParams.push(`${email}%`);
    } else if (emailOperator === 'endsWith') {
      whereClauses.push(`c.email ILIKE $${paramIndex++}`);
      queryParams.push(`%${email}`);
    } else if (emailOperator === 'contains' || !emailOperator) {
      whereClauses.push(`c.email ILIKE $${paramIndex++}`);
      queryParams.push(`%${email}%`);
    }
    // If 'other', skip filtering by email
  }

  // Handle phone filter with operator
  const phone = searchParams.get('phone');
  const phoneOperator = searchParams.get('phoneOperator') || 'contains';
  if (phone) {
    if (phoneOperator === 'is') {
      whereClauses.push(`c.phone = $${paramIndex++}`);
      queryParams.push(phone);
    } else if (phoneOperator === 'startsWith') {
      whereClauses.push(`c.phone ILIKE $${paramIndex++}`);
      queryParams.push(`${phone}%`);
    } else if (phoneOperator === 'endsWith') {
      whereClauses.push(`c.phone ILIKE $${paramIndex++}`);
      queryParams.push(`%${phone}`);
    } else if (phoneOperator === 'contains' || !phoneOperator) {
      whereClauses.push(`c.phone ILIKE $${paramIndex++}`);
      queryParams.push(`%${phone}%`);
    }
    // If 'other', skip filtering by phone
  }

  // Handle location filter with operator
  const location = searchParams.get('location');
  const locationOperator = searchParams.get('locationOperator') || 'contains';
  if (location) {
    if (locationOperator === 'is') {
      whereClauses.push(`c."parsedData"::text ILIKE $${paramIndex++}`);
      queryParams.push(`%\"location\":\"${location}\"%`);
    } else if (locationOperator === 'startsWith') {
      whereClauses.push(`c."parsedData"::text ILIKE $${paramIndex++}`);
      queryParams.push(`%\"location\":\"${location}%`);
    } else if (locationOperator === 'endsWith') {
      whereClauses.push(`c."parsedData"::text ILIKE $${paramIndex++}`);
      queryParams.push(`${location}\"%`);
    } else if (locationOperator === 'contains' || !locationOperator) {
      whereClauses.push(`c."parsedData"::text ILIKE $${paramIndex++}`);
      queryParams.push(`%${location}%`);
    }
    // If 'other', skip filtering by location
  }

  // Handle education filter (search in parsed data)
  if (filters.education) {
    whereClauses.push(`c."parsedData"::text ILIKE $${paramIndex++}`);
    queryParams.push(`%${filters.education}%`);
  }

  // Handle skills filter (search in parsed data)
  if (filters.skills) {
    whereClauses.push(`c."parsedData"::text ILIKE $${paramIndex++}`);
    queryParams.push(`%${filters.skills}%`);
  }

  // Handle CV language filter (search in parsed data)
  if (filters.cvLanguage) {
    whereClauses.push(`c."parsedData"::text ILIKE $${paramIndex++}`);
    queryParams.push(`%${filters.cvLanguage}%`);
  }

  // Handle job suitable career filter (search in parsed data)
  if (filters.jobSuitableCareer) {
    whereClauses.push(`c."parsedData"::text ILIKE $${paramIndex++}`);
    queryParams.push(`%${filters.jobSuitableCareer}%`);
  }

  // Handle job suitable level filter (search in parsed data)
  if (filters.jobSuitableLevel) {
    whereClauses.push(`c."parsedData"::text ILIKE $${paramIndex++}`);
    queryParams.push(`%${filters.jobSuitableLevel}%`);
  }

  // Handle job suitable position filter (search in parsed data)
  if (filters.jobSuitablePosition) {
    whereClauses.push(`c."parsedData"::text ILIKE $${paramIndex++}`);
    queryParams.push(`%${filters.jobSuitablePosition}%`);
  }

  // Handle experience years filter (calculate from experienceData)
  if (filters.minExperienceYears || filters.maxExperienceYears) {
    
    // Calculate total experience years from experienceData array
    const experienceCalculation = `
      COALESCE(
        (
          SELECT SUM(
            CASE 
              WHEN exp->>'startYear' IS NOT NULL AND exp->>'startMonth' IS NOT NULL THEN
                CASE 
                  WHEN (exp->>'isCurrent')::boolean = true OR exp->>'endYear' IS NULL OR exp->>'endMonth' IS NULL THEN
                    EXTRACT(YEAR FROM AGE(CURRENT_DATE, 
                      MAKE_DATE((exp->>'startYear')::int, (exp->>'startMonth')::int, 1)
                    ))
                  ELSE
                    EXTRACT(YEAR FROM AGE(
                      MAKE_DATE((exp->>'endYear')::int, (exp->>'endMonth')::int, 1),
                      MAKE_DATE((exp->>'startYear')::int, (exp->>'startMonth')::int, 1)
                    ))
                END
              ELSE 0
            END
          )::float
          FROM jsonb_array_elements(COALESCE(c."experienceData", '[]'::jsonb)) AS exp
        ), 0
      )
    `;
    
    if (filters.minExperienceYears && filters.maxExperienceYears) {
      whereClauses.push(`${experienceCalculation} >= $${paramIndex} AND ${experienceCalculation} <= $${paramIndex + 1}`);
      const minExperienceYears = parseInt(filters.minExperienceYears);
      const maxExperienceYears = parseInt(filters.maxExperienceYears);
      if (isNaN(minExperienceYears) || isNaN(maxExperienceYears)) {
        console.error('Invalid experience years values:', { minExperienceYears: filters.minExperienceYears, maxExperienceYears: filters.maxExperienceYears });
      }
      if (!isNaN(minExperienceYears) && !isNaN(maxExperienceYears)) {
        queryParams.push(minExperienceYears, maxExperienceYears);
      } else {
        console.error('Skipping invalid experience years parameters');
      }
      paramIndex += 2;
    } else if (filters.minExperienceYears) {
      whereClauses.push(`${experienceCalculation} >= $${paramIndex}`);
      const minExperienceYears = parseInt(filters.minExperienceYears);
      if (isNaN(minExperienceYears)) {
        console.error('Invalid min experience years value:', filters.minExperienceYears);
      }
      if (!isNaN(minExperienceYears)) {
        queryParams.push(minExperienceYears);
      } else {
        console.error('Skipping invalid min experience years parameter');
      }
      paramIndex++;
    } else if (filters.maxExperienceYears) {
      whereClauses.push(`${experienceCalculation} <= $${paramIndex}`);
      const maxExperienceYears = parseInt(filters.maxExperienceYears);
      if (isNaN(maxExperienceYears)) {
        console.error('Invalid max experience years value:', filters.maxExperienceYears);
      }
      if (!isNaN(maxExperienceYears)) {
        queryParams.push(maxExperienceYears);
      } else {
        console.error('Skipping invalid max experience years parameter');
      }
      paramIndex++;
    }
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
      // Accept fitScore as either 0-1 or 0-100, and also check job_applied.fitScore if present
      whereClauses.push(`((c."fitScore" >= $${paramIndex} OR c."fitScore" >= $${paramIndex}/100 OR (c."parsedData"->'job_applied'->>'fitScore')::float >= $${paramIndex} OR (c."parsedData"->'job_applied'->>'fitScore')::float >= $${paramIndex}/100) AND c."fitScore" <= $${paramIndex + 1})`);
      const minFitScore = parseInt(filters.minFitScore);
      const maxFitScore = parseInt(filters.maxFitScore);
      if (isNaN(minFitScore) || isNaN(maxFitScore)) {
        console.error('Invalid fit score values:', { minFitScore: filters.minFitScore, maxFitScore: filters.maxFitScore });
      }
      if (!isNaN(minFitScore) && !isNaN(maxFitScore)) {
        queryParams.push(minFitScore, maxFitScore);
      } else {
        console.error('Skipping invalid fit score parameters');
      }
      paramIndex += 2;
    } else if (filters.minFitScore) {
      whereClauses.push(`(c."fitScore" >= $${paramIndex} OR c."fitScore" >= $${paramIndex}/100 OR (c."parsedData"->'job_applied'->>'fitScore')::float >= $${paramIndex} OR (c."parsedData"->'job_applied'->>'fitScore')::float >= $${paramIndex}/100)`);
      const minFitScore = parseInt(filters.minFitScore);
      if (isNaN(minFitScore)) {
        console.error('Invalid min fit score value:', filters.minFitScore);
      }
      if (!isNaN(minFitScore)) {
        queryParams.push(minFitScore);
      } else {
        console.error('Skipping invalid min fit score parameter');
      }
      paramIndex++;
    } else if (filters.maxFitScore) {
      whereClauses.push(`c."fitScore" <= $${paramIndex}`);
      const maxFitScore = parseInt(filters.maxFitScore);
      if (isNaN(maxFitScore)) {
        console.error('Invalid max fit score value:', filters.maxFitScore);
      }
      if (!isNaN(maxFitScore)) {
        queryParams.push(maxFitScore);
      } else {
        console.error('Skipping invalid max fit score parameter');
      }
      paramIndex++;
    }
  }

  // Handle matching fit score range filter (best job match)
  if (filters.matchingMinFitScore || filters.matchingMaxFitScore) {
    
    // Add a lateral join to get the max fitScore from JobMatch for each candidate
    // We'll add the filter to the WHERE clause using the alias jm_max
    if (filters.matchingMinFitScore && filters.matchingMaxFitScore) {
      whereClauses.push(`COALESCE(jm_max.max_fit_score, 0) >= $${paramIndex} AND COALESCE(jm_max.max_fit_score, 0) <= $${paramIndex + 1}`);
      const matchingMinFitScore = parseInt(filters.matchingMinFitScore);
      const matchingMaxFitScore = parseInt(filters.matchingMaxFitScore);
      if (isNaN(matchingMinFitScore) || isNaN(matchingMaxFitScore)) {
        console.error('Invalid matching fit score values:', { matchingMinFitScore: filters.matchingMinFitScore, matchingMaxFitScore: filters.matchingMaxFitScore });
      }
      if (!isNaN(matchingMinFitScore) && !isNaN(matchingMaxFitScore)) {
        queryParams.push(matchingMinFitScore, matchingMaxFitScore);
      } else {
        console.error('Skipping invalid matching fit score parameters');
      }
      paramIndex += 2;
    } else if (filters.matchingMinFitScore) {
      whereClauses.push(`COALESCE(jm_max.max_fit_score, 0) >= $${paramIndex}`);
      const matchingMinFitScore = parseInt(filters.matchingMinFitScore);
      if (isNaN(matchingMinFitScore)) {
        console.error('Invalid matching min fit score value:', filters.matchingMinFitScore);
      }
      if (!isNaN(matchingMinFitScore)) {
        queryParams.push(matchingMinFitScore);
      } else {
        console.error('Skipping invalid matching min fit score parameter');
      }
      paramIndex++;
    } else if (filters.matchingMaxFitScore) {
      whereClauses.push(`COALESCE(jm_max.max_fit_score, 0) <= $${paramIndex}`);
      const matchingMaxFitScore = parseInt(filters.matchingMaxFitScore);
      if (isNaN(matchingMaxFitScore)) {
        console.error('Invalid matching max fit score value:', filters.matchingMaxFitScore);
      }
      if (!isNaN(matchingMaxFitScore)) {
        queryParams.push(matchingMaxFitScore);
      } else {
        console.error('Skipping invalid matching max fit score parameter');
      }
      paramIndex++;
    }
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';



  const client = await getPool().connect();
  try {
    const candidatesQuery = `
      SELECT c.*, p.id as "positionId", p.title as "positionTitle", p.department as "positionDepartment", p."positionLevel" as "positionLevel",
             r.id as "recruiterId", r.name as "recruiterName",
             COALESCE(th_data.history, '[]'::json) as "transitionHistory",
             COALESCE(jm_data.jobMatches, '[]'::json) as "jobMatches"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      LEFT JOIN LATERAL (
        SELECT MAX(jm."fitScore") as max_fit_score FROM "JobMatch" jm WHERE jm."candidateId" = c.id
      ) AS jm_max ON true
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', th.id, 'date', th.date, 'stage', th.stage, 'notes', th.notes
          ) ORDER BY th.date DESC
        ) AS history
        FROM "TransitionRecord" th
        WHERE th."candidateId" = c.id
      ) AS th_data ON true
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', jm.id, 'jobId', jm."jobId", 'jobTitle', jm."jobTitle", 'fitScore', jm."fitScore", 
            'matchReasons', jm."matchReasons", 'jobDescriptionSummary', jm."job_description_summary",
            'createdAt', jm."createdAt", 'updatedAt', jm."updatedAt"
          ) ORDER BY jm."fitScore" DESC
        ) AS jobMatches
        FROM "JobMatch" jm
        WHERE jm."candidateId" = c.id
      ) AS jm_data ON true
      ${whereString}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;
    

    // Validate that all query parameters are valid (not undefined, null, NaN, empty arrays, or empty strings)
    const finalQueryParams = [...queryParams, limit, offset].map((param, index) => {
      if (param === undefined || param === null || (typeof param === 'number' && isNaN(param)) || (Array.isArray(param) && param.length === 0) || (typeof param === 'string' && param === '')) {
        return 0; // Default fallback
      }
      return param;
    });
    const candidatesResult = await client.query(candidatesQuery, finalQueryParams);
    const totalQuery = `
      SELECT COUNT(*) 
      FROM "Candidate" c
      LEFT JOIN LATERAL (
        SELECT MAX(jm."fitScore") as max_fit_score FROM "JobMatch" jm WHERE jm."candidateId" = c.id
      ) AS jm_max ON true
      ${whereString};
    `;
    const totalResult = await client.query(totalQuery, finalQueryParams.slice(0, -2)); // Remove limit and offset for count query
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
      
      // Extract fit score from job_applied if available, otherwise use the database fitScore
      let fitScore = row.fitScore || 0;
      // Always use the top-level fitScore column for filtering and returning
      if (row.parsedData && typeof row.parsedData === 'object' && 'job_applied' in row.parsedData) {
        const jobApplied = (row.parsedData as any).job_applied;
        if (jobApplied && typeof jobApplied === 'object' && 'fitScore' in jobApplied) {
          fitScore = jobApplied.fitScore || fitScore;
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
          positionLevel: row.positionLevel
        } : null,
        fitScore: normalizeFitScore(fitScore), // Use the normalized fit score
        status: row.status,
        applicationDate: row.applicationDate ? row.applicationDate.toISOString() : new Date().toISOString(),
        recruiter: row.recruiterId ? {
          id: row.recruiterId,
          name: row.recruiterName,
          email: null
        } : null,
        createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
        transitionHistory: row.transitionHistory || [],
        jobMatches: row.jobMatches || [],
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
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json({ 
      message: 'Error fetching candidates', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    client.release();
  }
}