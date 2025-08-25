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
import { WarningService } from '@/lib/warningService';
import type { CandidateFilterValues } from '@/components/candidates/CandidateFilters';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Performance optimization constants
const MAX_PAGE_SIZE = 1000; // Reasonable limit for efficiency
const DEFAULT_PAGE_SIZE = 50; // Reduced from 100 for faster initial loads
const CACHE_DURATION = 30; // seconds
const QUERY_TIMEOUT = 25000; // 25 seconds


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
    
    // Check for warnings after candidate creation
    try {
      await WarningService.createOrUpdateWarnings('candidate', newCandidateId, actingUserId);
    } catch (warningError) {
      console.error('Failed to check warnings for new candidate:', warningError);
      // Don't fail the request if warning check fails
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
  const startTime = Date.now();
  
  try {
  
    const { session, error } = await requireSessionAndPermission('CANDIDATES_VIEW', request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const isForCounts = searchParams.get('forCounts') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(MAX_PAGE_SIZE, parseInt(searchParams.get('limit') || DEFAULT_PAGE_SIZE.toString(), 10)));
    const offset = (page - 1) * limit;

    // Performance optimization: Set query timeout
    const client = await getPool().connect();
    await client.query(`SET statement_timeout = ${QUERY_TIMEOUT}`);

    // Sorting
    const allowedSortColumns = {
      name: 'c.name',
      email: 'c.email',
      fitScore: 'c."fitScore"',
      applicationDate: 'c."applicationDate"',
      status: 'c.status',
      lastUpdate: 'c."updatedAt"',
      source: 'cs.name',
    };
    const sortColumnParam = searchParams.get('sortColumn') || 'lastUpdate';
    const sortDirectionParam = searchParams.get('sortDirection');
    
    // Handle 3-state toggle: null/empty = unsorted (no sorting), 'asc' = ascending, 'desc' = descending
    let sortColumn = allowedSortColumns[sortColumnParam as keyof typeof allowedSortColumns] || 'c."updatedAt"';
    let sortDirection = 'DESC'; // default
    
    if (sortDirectionParam && sortDirectionParam.toLowerCase() === 'asc') {
      sortDirection = 'ASC';
    } else if (sortDirectionParam && sortDirectionParam.toLowerCase() === 'desc') {
      sortDirection = 'DESC';
    } else {
      // sortDirectionParam is null, empty, or invalid - treat as unsorted
      // For unsorted state, we'll use the default sort (lastUpdate desc)
      sortColumn = 'c."updatedAt"';
      sortDirection = 'DESC';
    }
    
    console.log('🔍 API SORT DEBUG: Final sortColumn:', sortColumn, 'sortDirection:', sortDirection);
    

    
    // Handle NULL values in sorting - for fitScore, put NULL values last
    let sortClause = `${sortColumn} ${sortDirection}`;
    if (sortColumnParam === 'fitScore') {
      sortClause = `c."fitScore" ${sortDirection} NULLS LAST`;
    }
    


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
      includeNoScoreInApplied: searchParams.get('includeNoScoreInApplied') === 'true',
      includeNoScoreInMatching: searchParams.get('includeNoScoreInMatching') === 'true',
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

    // Build WHERE clauses and parameters
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Handle name filter
    if (filters.name) {
      let operator = 'ILIKE';
      let value = filters.name;
      
      switch (filters.nameOperator) {
        case 'is':
          operator = '=';
          break;
        case 'startsWith':
          operator = 'ILIKE';
          value = `${filters.name}%`;
          break;
        case 'endsWith':
          operator = 'ILIKE';
          value = `%${filters.name}`;
          break;
        case 'contains':
        default:
          operator = 'ILIKE';
          value = `%${filters.name}%`;
          break;
      }
      
      whereClauses.push(`c.name ${operator} $${paramIndex++}`);
      queryParams.push(value);
    }

    // Handle email filter
    if (filters.email) {
      let operator = 'ILIKE';
      let value = filters.email;
      
      switch (filters.emailOperator) {
        case 'is':
          operator = '=';
          break;
        case 'startsWith':
          operator = 'ILIKE';
          value = `${filters.email}%`;
          break;
        case 'endsWith':
          operator = 'ILIKE';
          value = `%${filters.email}`;
          break;
        case 'contains':
        default:
          operator = 'ILIKE';
          value = `%${filters.email}%`;
          break;
      }
      
      whereClauses.push(`c.email ${operator} $${paramIndex++}`);
      queryParams.push(value);
    }

    // Handle phone filter
    if (filters.phone) {
      let operator = 'ILIKE';
      let value = filters.phone;
      
      switch (filters.phoneOperator) {
        case 'is':
          operator = '=';
          break;
        case 'startsWith':
          operator = 'ILIKE';
          value = `${filters.phone}%`;
          break;
        case 'endsWith':
          operator = 'ILIKE';
          value = `%${filters.phone}`;
          break;
        case 'contains':
        default:
          operator = 'ILIKE';
          value = `%${filters.phone}%`;
          break;
      }
      
      whereClauses.push(`c.phone ${operator} $${paramIndex++}`);
      queryParams.push(value);
    }

    // Handle location filter
    if (filters.location) {
      let operator = 'ILIKE';
      let value = filters.location;
      
      switch (filters.locationOperator) {
        case 'is':
          operator = '=';
          break;
        case 'startsWith':
          operator = 'ILIKE';
          value = `${filters.location}%`;
          break;
        case 'endsWith':
          operator = 'ILIKE';
          value = `%${filters.location}`;
          break;
        case 'contains':
        default:
          operator = 'ILIKE';
          value = `%${filters.location}%`;
          break;
      }
      
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
      
      // Check if "select-all" is selected - if so, don't filter by source (show all)
      if (sourceIds.includes('select-all')) {
        // Don't add any source filter - show all sources
      } else {
        // Check if "unassigned" is one of the selected sources
        const hasUnassigned = sourceIds.includes('unassigned');
        const regularSources = sourceIds.filter(id => id !== 'unassigned');
        
        if (hasUnassigned && regularSources.length === 0) {
          // Only "unassigned" selected - filter for candidates with no source
          whereClauses.push(`c."sourceId" IS NULL`);
        } else if (hasUnassigned && regularSources.length > 0) {
          // Mixed selection - include both "unassigned" and regular sources
          if (regularSources.length === 1) {
            whereClauses.push(`(c."sourceId" = $${paramIndex++} OR c."sourceId" IS NULL)`);
            queryParams.push(regularSources[0]);
          } else {
            whereClauses.push(`(c."sourceId" = ANY($${paramIndex++}) OR c."sourceId" IS NULL)`);
            queryParams.push(regularSources);
          }
        } else {
          // Only regular sources selected
          if (regularSources.length === 1) {
            whereClauses.push(`c."sourceId" = $${paramIndex++}`);
            queryParams.push(regularSources[0]);
          } else if (regularSources.length > 1) {
            whereClauses.push(`c."sourceId" = ANY($${paramIndex++})`);
            queryParams.push(regularSources);
          }
        }
      }
    }

    // Debug logging for fit score filters
    const hasFitScoreFilters = filters.minAppliedJobFitScore !== undefined || 
                              filters.maxAppliedJobFitScore !== undefined ||
                              filters.minMatchingJobFitScore !== undefined || 
                              filters.maxMatchingJobFitScore !== undefined;
    
    if (hasFitScoreFilters) {
      console.log('API DEBUG: Fit score filters received:', {
        appliedJob: {
          min: filters.minAppliedJobFitScore,
          max: filters.maxAppliedJobFitScore
        },
        matchingJobs: {
          min: filters.minMatchingJobFitScore,
          max: filters.maxMatchingJobFitScore
        }
      });
      
      // Debug: Show what scores exist in the database
      console.log('API DEBUG: Checking database for fit scores...');
      const scoreCheckQuery = `
        SELECT "fitScore", COUNT(*) as count 
        FROM "Candidate" 
        WHERE "fitScore" IS NOT NULL 
        GROUP BY "fitScore" 
        ORDER BY "fitScore"
      `;
      try {
        const scoreCheckResult = await client.query(scoreCheckQuery);
        console.log('API DEBUG: Available fit scores in database:', scoreCheckResult.rows);
        
        // Also check for scores in the C range (0.41 to 0.60)
        const cRangeQuery = `
          SELECT "fitScore", COUNT(*) as count 
          FROM "Candidate" 
          WHERE "fitScore" >= 0.41 AND "fitScore" <= 0.60
          GROUP BY "fitScore" 
          ORDER BY "fitScore"
        `;
        const cRangeResult = await client.query(cRangeQuery);
        console.log('API DEBUG: Scores in C range (0.41-0.60):', cRangeResult.rows);
        
        // Check total count in C range
        const cRangeCountQuery = `
          SELECT COUNT(*) as total 
          FROM "Candidate" 
          WHERE "fitScore" >= 0.41 AND "fitScore" <= 0.60
        `;
        const cRangeCountResult = await client.query(cRangeCountQuery);
        console.log('API DEBUG: Total candidates in C range:', cRangeCountResult.rows[0].total);
      } catch (error) {
        console.log('API DEBUG: Error checking fit scores:', error);
      }
    }

    // Handle fit score filters - simple approach
    if (filters.minAppliedJobFitScore !== undefined || filters.maxAppliedJobFitScore !== undefined) {
      console.log('API DEBUG: Processing applied job fit score filters');
      
      // Check if this is the "no-score" case (both min and max are -1)
      if (filters.minAppliedJobFitScore === -1 && filters.maxAppliedJobFitScore === -1) {
        // Special case: filter for candidates with no fit score
        whereClauses.push(`(c."fitScore" IS NULL OR c."fitScore" = 0)`);
        console.log('API DEBUG: Added no-score filter for applied job fit score');
      } else if (filters.includeNoScoreInApplied) {
        // Both regular grades and no-score selected - create OR condition
        const regularScoreConditions: string[] = [];
        
        if (filters.minAppliedJobFitScore !== undefined && filters.minAppliedJobFitScore !== -1) {
          // Convert percentage to decimal for database comparison
          const minScoreDecimal = filters.minAppliedJobFitScore / 100;
          regularScoreConditions.push(`c."fitScore" >= $${paramIndex++}`);
          queryParams.push(minScoreDecimal);
        }
        
        if (filters.maxAppliedJobFitScore !== undefined && filters.maxAppliedJobFitScore !== -1) {
          // Convert percentage to decimal for database comparison
          const maxScoreDecimal = filters.maxAppliedJobFitScore / 100;
          regularScoreConditions.push(`c."fitScore" <= $${paramIndex++}`);
          queryParams.push(maxScoreDecimal);
        }
        
        // Create OR condition: (regular score conditions) OR (no-score condition)
        const noScoreCondition = `(c."fitScore" IS NULL OR c."fitScore" = 0)`;
        
        if (regularScoreConditions.length > 0) {
          whereClauses.push(`((${regularScoreConditions.join(' AND ')}) OR ${noScoreCondition})`);
          console.log('API DEBUG: Added OR condition for applied regular grades + no-score');
        } else {
          whereClauses.push(`(${noScoreCondition})`);
          console.log('API DEBUG: Added applied no-score condition only');
        }
      } else {
        // Handle regular score range filtering
        if (filters.minAppliedJobFitScore !== undefined && filters.minAppliedJobFitScore !== -1) {
          // Convert percentage to decimal for database comparison
          const minScoreDecimal = filters.minAppliedJobFitScore / 100;
          whereClauses.push(`c."fitScore" >= $${paramIndex++}`);
          queryParams.push(minScoreDecimal);
          console.log('API DEBUG: Added min applied job fit score filter:', filters.minAppliedJobFitScore, 'as decimal:', minScoreDecimal);
        }
        if (filters.maxAppliedJobFitScore !== undefined && filters.maxAppliedJobFitScore !== -1) {
          // Convert percentage to decimal for database comparison
          const maxScoreDecimal = filters.maxAppliedJobFitScore / 100;
          whereClauses.push(`c."fitScore" <= $${paramIndex++}`);
          queryParams.push(maxScoreDecimal);
          console.log('API DEBUG: Added max applied job fit score filter:', filters.maxAppliedJobFitScore, 'as decimal:', maxScoreDecimal);
        }
        
        // Debug: Show the final WHERE clause for fit score filtering
        console.log('API DEBUG: Final fit score WHERE clause:', whereClauses.slice(-2).join(' AND '));
        console.log('API DEBUG: Fit score query parameters:', queryParams.slice(-2));
      }
    }

    // Handle matching job fit score filters - simple approach
    if (filters.minMatchingJobFitScore !== undefined || filters.maxMatchingJobFitScore !== undefined) {
      console.log('API DEBUG: Processing matching job fit score filters');
      
      // Check if this is the "no-score" case (both min and max are -1)
      if (filters.minMatchingJobFitScore === -1 && filters.maxMatchingJobFitScore === -1) {
        // No matching fit score filter - candidates with no job matches
        whereClauses.push(`(
          (c."parsedData"->>'job_matches' IS NULL OR c."parsedData"->>'job_matches' = '[]' OR c."parsedData"->>'job_matches' = '')
          AND NOT EXISTS (SELECT 1 FROM "JobMatch" jm WHERE jm."candidateId" = c.id)
        )`);

      } else if (filters.includeNoScoreInMatching) {
        // Both regular grades and no-score selected - create OR condition
        const regularScoreConditions: string[] = [];
        
        if (filters.minMatchingJobFitScore !== undefined && filters.minMatchingJobFitScore !== -1) {
          // Convert percentage to decimal for database comparison
          const minScoreDecimal = filters.minMatchingJobFitScore / 100;
          regularScoreConditions.push(`(
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(c."parsedData"->'job_matches') AS job_match
              WHERE CAST(job_match->>'fitScore' AS DECIMAL) >= $${paramIndex}
            )
            OR EXISTS (
              SELECT 1 FROM "JobMatch" jm 
              WHERE jm."candidateId" = c.id AND jm."fitScore" >= $${paramIndex + 1}
            )
          )`);
          queryParams.push(minScoreDecimal, minScoreDecimal);
          paramIndex += 2;
        }
        
        if (filters.maxMatchingJobFitScore !== undefined && filters.maxMatchingJobFitScore !== -1) {
          // Convert percentage to decimal for database comparison
          const maxScoreDecimal = filters.maxMatchingJobFitScore / 100;
          regularScoreConditions.push(`(
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(c."parsedData"->'job_matches') AS job_match
              WHERE CAST(job_match->>'fitScore' AS DECIMAL) <= $${paramIndex}
            )
            OR EXISTS (
              SELECT 1 FROM "JobMatch" jm 
              WHERE jm."candidateId" = c.id AND jm."fitScore" <= $${paramIndex + 1}
            )
          )`);
          queryParams.push(maxScoreDecimal, maxScoreDecimal);
          paramIndex += 2;
        }
        
        // Create OR condition: (regular score conditions) OR (no-score condition)
        const noScoreCondition = `(
          (c."parsedData"->>'job_matches' IS NULL OR c."parsedData"->>'job_matches' = '[]' OR c."parsedData"->>'job_matches' = '')
          AND NOT EXISTS (SELECT 1 FROM "JobMatch" jm WHERE jm."candidateId" = c.id)
        )`;
        
        if (regularScoreConditions.length > 0) {
          whereClauses.push(`((${regularScoreConditions.join(' AND ')}) OR ${noScoreCondition})`);

        } else {
          whereClauses.push(`(${noScoreCondition})`);

        }
      } else {
        // Handle regular score range filtering for matching jobs
        const conditions: string[] = [];
        
        if (filters.minMatchingJobFitScore !== undefined && filters.minMatchingJobFitScore !== -1) {
          // Convert percentage to decimal for database comparison
          const minScoreDecimal = filters.minMatchingJobFitScore / 100;
          conditions.push(`(
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(c."parsedData"->'job_matches') AS job_match
              WHERE CAST(job_match->>'fitScore' AS DECIMAL) >= $${paramIndex}
            )
            OR EXISTS (
              SELECT 1 FROM "JobMatch" jm 
              WHERE jm."candidateId" = c.id AND jm."fitScore" >= $${paramIndex + 1}
            )
          )`);
          queryParams.push(minScoreDecimal, minScoreDecimal);
          paramIndex += 2;

        }
        
        if (filters.maxMatchingJobFitScore !== undefined && filters.maxMatchingJobFitScore !== -1) {
          // Convert percentage to decimal for database comparison
          const maxScoreDecimal = filters.maxMatchingJobFitScore / 100;
          conditions.push(`(
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(c."parsedData"->'job_matches') AS job_match
              WHERE CAST(job_match->>'fitScore' AS DECIMAL) <= $${paramIndex}
            )
            OR EXISTS (
              SELECT 1 FROM "JobMatch" jm 
              WHERE jm."candidateId" = c.id AND jm."fitScore" <= $${paramIndex + 1}
            )
          )`);
          queryParams.push(maxScoreDecimal, maxScoreDecimal);
          paramIndex += 2;

        }
        
        // Combine conditions with AND if both exist
        if (conditions.length > 0) {
          whereClauses.push(`(${conditions.join(' AND ')})`);

        }
      }
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
    
    // Debug: Show the complete WHERE clause and parameters for fit score filters
    if (hasFitScoreFilters) {
      console.log('API DEBUG: Complete WHERE clause:', whereClause);
      console.log('API DEBUG: All query parameters:', queryParams);
    }


    // Optimized query with better indexing and reduced complexity
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "Candidate" c
      ${whereClause}
    `;

    // Optimized data query with selective column fetching and better joins
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
      ORDER BY ${sortClause}
      ${isForCounts ? '' : `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`}
    `;

    // Execute queries in parallel for better performance
    const [countResult, dataResult] = await Promise.all([
      client.query(countQuery, queryParams),
      client.query(dataQuery, isForCounts ? queryParams : [...queryParams, limit, offset])
    ]);

    const total = parseInt(countResult.rows[0].total);
    
    // Optimize data transformation
    const candidates = dataResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      fitScore: normalizeFitScore(row.fitScore),
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

    const responseTime = Date.now() - startTime;
    
    // Add performance headers
    const headers = {
      'Cache-Control': `public, max-age=${CACHE_DURATION}, stale-while-revalidate=${CACHE_DURATION * 2}`,
      'ETag': `"${Buffer.from(JSON.stringify({ filters, page, limit, total, responseTime })).toString('base64').slice(0, 8)}"`,
      'X-Response-Time': `${responseTime}ms`,
      'X-Total-Count': total.toString(),
      'X-Page-Size': limit.toString(),
    };

    // Log performance metrics for monitoring
    if (responseTime > 2000) {
      console.warn(`[PERF] Slow candidates query: ${responseTime}ms for ${candidates.length} candidates`);
    }

    if (isForCounts) {
      return NextResponse.json({
        data: candidates,
        total: total
      }, { headers });
    }

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
    }, { headers });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.error(`[ERROR] Candidates API error after ${responseTime}ms:`, error);
    
    return NextResponse.json({ 
      message: 'Error fetching candidates', 
      error: error.message,
      responseTime: `${responseTime}ms`
    }, { status: 500 });
  }
}