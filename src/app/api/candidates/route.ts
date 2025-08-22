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
        case 'minfitscore':
        case 'minappliedjobfitscore':
          advancedFilters.minAppliedJobFitScore = value;
          break;
        case 'maxfitscore':
        case 'maxappliedjobfitscore':
          advancedFilters.maxAppliedJobFitScore = value;
          break;
        case 'matchingfitscoremin':
        case 'minmatchingjobfitscore':
          advancedFilters.minMatchingJobFitScore = value;
          break;
        case 'matchingfitscoremax':
        case 'maxmatchingjobfitscore':
          advancedFilters.maxMatchingJobFitScore = value;
          break;
        case 'applicationdatestart':
          advancedFilters.applicationDateStart = value;
          break;
        case 'applicationdateend':
          advancedFilters.applicationDateEnd = value;
          break;
        case 'positionid':
          advancedFilters.positionId = value;
          break;
        case 'status':
          advancedFilters.status = value;
          break;
        case 'recruiterid':
          advancedFilters.recruiterId = value;
          break;
      }
    });
  }

  // Filters - merge with advanced query filters, giving priority to individual parameters
  const filters: { [key: string]: string | undefined } = {
    status: searchParams.get('status') || advancedFilters.status || undefined,
    positionId: searchParams.get('positionId') || advancedFilters.positionId || undefined,
    recruiterId: searchParams.get('recruiterId') || searchParams.get('assignedRecruiterId') || advancedFilters.recruiterId || undefined,
    searchTerm: searchParams.get('searchTerm') || searchParams.get('name') || advancedFilters.searchTerm || undefined,
    email: searchParams.get('email') || advancedFilters.email || undefined,
    phone: searchParams.get('phone') || advancedFilters.phone || undefined,
    education: searchParams.get('education') || undefined,
    skills: searchParams.get('skills') || advancedFilters.skills || undefined,
    location: searchParams.get('location') || advancedFilters.location || undefined,
    cvLanguage: searchParams.get('cvLanguage') || undefined,
    jobSuitableCareer: searchParams.get('jobSuitableCareer') || undefined,
    jobSuitableLevel: searchParams.get('jobSuitableLevel') || undefined,
    jobSuitablePosition: searchParams.get('jobSuitablePosition') || undefined,
    minExperienceYears: searchParams.get('minExperienceYears') || undefined,
    maxExperienceYears: searchParams.get('maxExperienceYears') || undefined,
    applicationDateStart: searchParams.get('applicationDateStart') || advancedFilters.applicationDateStart || undefined,
    applicationDateEnd: searchParams.get('applicationDateEnd') || advancedFilters.applicationDateEnd || undefined,
    minAppliedJobFitScore: searchParams.get('minAppliedJobFitScore') || advancedFilters.minAppliedJobFitScore || undefined,
    maxAppliedJobFitScore: searchParams.get('maxAppliedJobFitScore') || advancedFilters.maxAppliedJobFitScore || undefined,
    minMatchingJobFitScore: searchParams.get('minMatchingJobFitScore') || advancedFilters.minMatchingJobFitScore || undefined,
    maxMatchingJobFitScore: searchParams.get('maxMatchingJobFitScore') || advancedFilters.maxMatchingJobFitScore || undefined,
    sourceId: searchParams.get('sourceId') || undefined,
    subSource: searchParams.get('subSource') || undefined,
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

  // Handle status filter (supports multiple statuses and 'select-all')
  if (filters.status) {
    const statuses = filters.status.split(',').map(s => s.trim());
    
    // Check if "select-all" is selected - if so, don't filter by status (show all)
    if (statuses.includes('select-all')) {
      // Don't add any status filter - show all stages
    } else {
      // Check if "no-status" or "Off" is one of the selected statuses (supporting both for backwards compatibility)
      const hasNoStatus = statuses.includes('no-status') || statuses.includes('Off');
      const regularStatuses = statuses.filter(s => s !== 'no-status' && s !== 'Off');
      
      if (hasNoStatus && regularStatuses.length === 0) {
        // Only "no-status" selected - filter for candidates with no status
        whereClauses.push(`(c.status = '' OR c.status = 'null')`);
      } else if (hasNoStatus && regularStatuses.length > 0) {
        // Mixed selection - include both "no-status" and regular statuses
        if (regularStatuses.length === 1) {
          whereClauses.push(`(c.status = $${paramIndex++} OR c.status = '' OR c.status = 'null')`);
          queryParams.push(regularStatuses[0]);
        } else {
          whereClauses.push(`(c.status = ANY($${paramIndex++}) OR c.status = '' OR c.status = 'null')`);
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
    const skillsArray = filters.skills.split(',').map(s => s.trim());
    const skillsConditions = skillsArray.map(() => `c."parsedData"::text ILIKE $${paramIndex++}`);
    skillsArray.forEach(skill => queryParams.push(`%${skill}%`));
    whereClauses.push(`(${skillsConditions.join(' OR ')})`);
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
  if (filters.minExperienceYears !== undefined || filters.maxExperienceYears !== undefined) {
    const minExp = parseInt(filters.minExperienceYears || '0');
    const maxExp = parseInt(filters.maxExperienceYears || '50');
    
    // Check for special "no experience" case (minExperienceYears = -1)
    if (minExp === -1) {
      // Filter for candidates with no experience data or empty experience data
      whereClauses.push(`(c."experienceData" IS NULL OR c."experienceData" = '[]'::jsonb OR jsonb_array_length(c."experienceData") = 0)`);
    } else {
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
      
      if (filters.minExperienceYears !== undefined && filters.maxExperienceYears !== undefined) {
        whereClauses.push(`${experienceCalculation} >= $${paramIndex} AND ${experienceCalculation} <= $${paramIndex + 1}`);
        if (!isNaN(minExp) && !isNaN(maxExp)) {
          queryParams.push(minExp, maxExp);
        } else {
          console.error('Skipping invalid experience years parameters');
        }
        paramIndex += 2;
      } else if (filters.minExperienceYears !== undefined) {
        whereClauses.push(`${experienceCalculation} >= $${paramIndex}`);
        if (!isNaN(minExp)) {
          queryParams.push(minExp);
        } else {
          console.error('Skipping invalid min experience years parameter');
        }
        paramIndex++;
      } else if (filters.maxExperienceYears !== undefined) {
        whereClauses.push(`${experienceCalculation} <= $${paramIndex}`);
        if (!isNaN(maxExp)) {
          queryParams.push(maxExp);
        } else {
          console.error('Skipping invalid max experience years parameter');
        }
        paramIndex++;
      }
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
  if (filters.minAppliedJobFitScore || filters.maxAppliedJobFitScore) {
    const minFit = parseInt(filters.minAppliedJobFitScore || '0');
    const maxFit = parseInt(filters.maxAppliedJobFitScore || '100');
    
    // Check for special "no fit score" case (minAppliedJobFitScore = -1)
    if (minFit === -1) {
      // Filter for candidates with no fit score (NULL, 0, or missing from parsedData)
      whereClauses.push(`(
        c."fitScore" IS NULL OR 
        c."fitScore" = 0 OR 
        (c."parsedData"->'job_applied'->>'fitScore') IS NULL OR 
        (c."parsedData"->'job_applied'->>'fitScore')::float = 0 OR 
        (c."parsedData"->'job_applied'->>'fitScore')::float IS NULL
      )`);
    } else {
      // Simplified fit score range filtering - normalize all scores to 0-100 range
      const fitScoreCondition = `COALESCE(
        CASE 
          WHEN c."fitScore" IS NOT NULL AND c."fitScore" <= 1 THEN c."fitScore" * 100
          ELSE c."fitScore"
        END,
        CASE 
          WHEN (c."parsedData"->'job_applied'->>'fitScore') IS NOT NULL 
          AND (c."parsedData"->'job_applied'->>'fitScore')::float <= 1 
          THEN (c."parsedData"->'job_applied'->>'fitScore')::float * 100
          ELSE (c."parsedData"->'job_applied'->>'fitScore')::float
        END,
        0
      )`;
      
      if (filters.minAppliedJobFitScore && filters.maxAppliedJobFitScore) {
        whereClauses.push(`${fitScoreCondition} >= $${paramIndex} AND ${fitScoreCondition} <= $${paramIndex + 1}`);
        if (!isNaN(minFit) && !isNaN(maxFit)) {
          queryParams.push(minFit, maxFit);
          paramIndex += 2;
        }
      } else if (filters.minAppliedJobFitScore) {
        whereClauses.push(`${fitScoreCondition} >= $${paramIndex}`);
        if (!isNaN(minFit)) {
          queryParams.push(minFit);
          paramIndex++;
        }
      } else if (filters.maxAppliedJobFitScore) {
        whereClauses.push(`${fitScoreCondition} <= $${paramIndex}`);
        if (!isNaN(maxFit)) {
          queryParams.push(maxFit);
          paramIndex++;
        }
      }
    }
  }

  // Handle matching fit score range filter (best job match)
  if (filters.minMatchingJobFitScore || filters.maxMatchingJobFitScore) {
    const minMatchingFit = parseInt(filters.minMatchingJobFitScore || '0');
    const maxMatchingFit = parseInt(filters.maxMatchingJobFitScore || '100');
    
    // Check for special "no matching fit score" case (minMatchingJobFitScore = -1)
    if (minMatchingFit === -1) {
      // Filter for candidates with no matching fit score (NULL or 0)
      whereClauses.push(`(jm_max.max_fit_score IS NULL OR jm_max.max_fit_score = 0)`);
    } else {
      // Simplified matching fit score range filtering
      const matchingFitScoreCondition = `COALESCE(jm_max.max_fit_score, 0)`;
      
      if (filters.minMatchingJobFitScore && filters.maxMatchingJobFitScore) {
        whereClauses.push(`${matchingFitScoreCondition} >= $${paramIndex} AND ${matchingFitScoreCondition} <= $${paramIndex + 1}`);
        if (!isNaN(minMatchingFit) && !isNaN(maxMatchingFit)) {
          queryParams.push(minMatchingFit, maxMatchingFit);
          paramIndex += 2;
        }
      } else if (filters.minMatchingJobFitScore) {
        whereClauses.push(`${matchingFitScoreCondition} >= $${paramIndex}`);
        if (!isNaN(minMatchingFit)) {
          queryParams.push(minMatchingFit);
          paramIndex++;
        }
      } else if (filters.maxMatchingJobFitScore) {
        whereClauses.push(`${matchingFitScoreCondition} <= $${paramIndex}`);
        if (!isNaN(maxMatchingFit)) {
          queryParams.push(maxMatchingFit);
          paramIndex++;
        }
      }
    }
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  




  const client = await getPool().connect();
  try {
    const candidatesQuery = `
      SELECT c.*, p.id as "positionId", p.title as "positionTitle", p.department as "positionDepartment", p."positionLevel" as "positionLevel",
             r.id as "recruiterId", r.name as "recruiterName", r."avatarUrl" as "recruiterAvatarUrl",
             cs.id as "sourceId", cs.name as "sourceName", cs.description as "sourceDescription",
             COALESCE(th_data.history, '[]'::json) as "transitionHistory",
             COALESCE(jm_data.jobMatches, '[]'::json) as "jobMatches"
      FROM "Candidate" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" r ON c."recruiterId" = r.id
      LEFT JOIN "CandidateSource" cs ON c."sourceId" = cs.id
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
    

    // Use query parameters directly without validation that might cause issues
    const finalQueryParams = [...queryParams, limit, offset];
    
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
        recruiterId: row.recruiterId || null,
        recruiter: row.recruiterId ? {
          id: row.recruiterId,
          name: row.recruiterName,
          avatarUrl: row.recruiterAvatarUrl || null,
          email: null
        } : null,
        sourceId: row.sourceId || null,
        source: row.sourceId ? {
          id: row.sourceId,
          name: row.sourceName,
          description: row.sourceDescription
        } : null,
        subSource: row.subSource || null,
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
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      where: error.where
    });
    return NextResponse.json({ 
      message: 'Error fetching candidates', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  } finally {
    client.release();
  }
  } catch (outerError: any) {
    console.error('Candidates API: Outer error:', outerError);
    return NextResponse.json({ 
      message: 'Error in candidates API', 
      error: outerError.message
    }, { status: 500 });
  }
}