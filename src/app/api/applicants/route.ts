// src/app/api/applicants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';
import { broadcastApplicantCreated } from '@/lib/simple-broadcaster';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createDateInTimezone } from '@/lib/dateUtils';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';
import { normalizeFitScore } from '@/lib/scoreUtils';
import { syncRecruiterForApplicant } from '@/lib/recruiterSync';
import { NotificationService } from '@/lib/notificationService';

import { getSystemSetting } from '@/lib/systemSettings';
import type { ApplicantFilterValues } from '@/lib/types';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Performance optimization constants
const MAX_PAGE_SIZE = Number.MAX_SAFE_INTEGER; // No limit - allow all Applicants
const DEFAULT_PAGE_SIZE = 100; // Optimized for taskboard performance

const QUERY_TIMEOUT = 10000; // Reduced from 25 to 10 seconds for faster response

// Fast count query for performance
const FAST_COUNT_QUERY = `
  SELECT COUNT(*) as total 
  FROM "applicant" c
  WHERE 1=1
`;


/**
 * @openapi
 * /api/applicants:
 *   get:
 *     summary: Get all Applicants
 *     description: Returns a list of all Applicants.
 *     responses:
 *       200:
 *         description: List of Applicants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Applicant'
 *   post:
 *     summary: Create a new Applicant
 *     description: Creates a new Applicant.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Applicant'
 *     responses:
 *       201:
 *         description: Applicant created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Applicant'
 */

// Define the new schema for Applicant creation
const applicantInfoSchema = z.object({
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

const createApplicantschema = z.object({
  applicant_info: applicantInfoSchema,
  job_matches: z.array(z.any()).optional(),
  job_applied: z.any().optional(),
  applicationDate: z.string().optional(), // Add applicationDate to the schema
  // You can add more fields if needed
});

// Helper for session and permission checks
async function requireSessionAndPermission(requiredPermission: string, request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }
  if (!hasPermission(session.user, requiredPermission as any)) {
    await logAudit(
      'WARN',
      `Forbidden attempt to access Applicants by ${session.user.name || session.user.email}.`,
      `API:Applicants:${requiredPermission}`,
      session.user.id
    );
    return { error: NextResponse.json({ message: `Forbidden: Insufficient permissions to ${requiredPermission.toLowerCase().replace('_', ' ')}` }, { status: 403 }) };
  }
  return { session };
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireSessionAndPermission('Applicants_CREATE', request);
  if (error) return error;
  const actingUserId = session.user.id;
  const actingUserName = (session.user.name || session.user.email || actingUserId || 'System') as string;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  // Only accept the new format
  const validationResult = createApplicantschema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ message: 'Invalid input', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }

  const { applicant_info, job_matches, job_applied, applicationDate } = validationResult.data;
  const name = applicant_info.personal_info && applicant_info.personal_info.firstname && applicant_info.personal_info.lastname
    ? `${applicant_info.personal_info.firstname} ${applicant_info.personal_info.lastname}`
    : undefined;
  const email = applicant_info.contact_info && applicant_info.contact_info.email ? applicant_info.contact_info.email : undefined;
  const phone = applicant_info.contact_info && applicant_info.contact_info.phone ? applicant_info.contact_info.phone : undefined;
  if (!name || !email) {
    return NextResponse.json({ message: 'Missing name or email in applicant_info' }, { status: 400 });
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
  if (applicant_info) parsedData.applicant_info = applicant_info;
  if (safeJobMatches.length > 0) parsedData.job_matches = safeJobMatches;
  if (job_applied) parsedData.job_applied = job_applied;

  const status = applicant_info.status || 'new';
  const newApplicantId = uuidv4();

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
    await client.query('BEGIN');
    const insertApplicantQuery = `
      INSERT INTO "applicant" (id, name, email, phone, "positionId", "fitScore", "statusId", "parsedData", "customAttributes", "applicationDate", "sourceId", "subSource", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *;
    `;
    const applicantResult = await client.query(insertApplicantQuery, [
      newApplicantId, name, email, phone, positionId, fitScore, status, parsedData, {}, applicationDate ? new Date(applicationDate) : createDateInTimezone(),
      body.sourceId || null, body.subSource || null
    ]);
    const newApplicant = applicantResult.rows[0];
    // Create initial transition record
    const insertTransitionQuery = `
      INSERT INTO "TransitionRecord" (id, "applicantId", stage, notes, "actingUserId", date, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW());
    `;
    await client.query(insertTransitionQuery, [
      uuidv4(), newApplicantId, 'Applied', 'Initial creation', actingUserId
    ]);
    await client.query('COMMIT');
    await logAudit('AUDIT', `New Applicant '${name}' created by ${actingUserName}.`, 'API:Applicants:Create', actingUserId, { applicantId: newApplicantId });

    // Broadcast to SSE clients
    broadcastApplicantCreated(newApplicant, actingUserId);

    // Auto-assign recruiter if Applicant has a position and no recruiter
    if (positionId && !newApplicant.recruiterId) {
      try {
        const syncSuccess = await syncRecruiterForApplicant(
          newApplicantId,
          positionId,
          actingUserId,
          actingUserName
        );
        if (syncSuccess) {


          // Get the updated Applicant with recruiter information
          const updatedApplicantQuery = `
            SELECT c.*, p.title as "positionTitle", u.id as "recruiterId", u.name as "recruiterName"
            FROM "applicant" c
            LEFT JOIN "Position" p ON c."positionId" = p.id
            LEFT JOIN "User" u ON c."recruiterId" = u.id
            WHERE c.id = $1
          `;
          const updatedApplicantResult = await client.query(updatedApplicantQuery, [newApplicantId]);
          const updatedApplicant = updatedApplicantResult.rows[0];

          // Send notification to the assigned recruiter
          if (updatedApplicant.recruiterId) {
            try {
              await NotificationService.notifyApplicantAdded(
                newApplicantId,
                name,
                positionId,
                updatedApplicant.positionTitle || 'Unknown Position',
                updatedApplicant.recruiterId,
                actingUserId
              );
            } catch (notificationError) {
              // Failed to send Applicant added notification
            }
          }
        }
      } catch (syncError) {
        // Failed to auto-assign recruiter after Applicant creation
      }
    }



    // Dispatch webhook for Applicant creation
    try {
      await dispatchWebhooks.ApplicantCreated(newApplicant);
    } catch (webhookError) {
      // Failed to dispatch Applicant creation webhook
    }

    return NextResponse.json({ message: 'Applicant created successfully', Applicant: newApplicant }, { status: 201 });
  } catch (error: any) {
    // Try to rollback if we have a client and transaction was started
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError: any) {
        console.error(`[Applicants API] Error during rollback:`, rollbackError);
      }
    }
    await logAudit('ERROR', `Failed to create Applicant. Error: ${error.message}`, 'API:Applicants:Create', actingUserId, { input: body });
    return NextResponse.json({ message: 'Error creating Applicant', error: error.message }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let client: any = null;

  try {

    const { session, error } = await requireSessionAndPermission('Applicants_VIEW', request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const isForCounts = searchParams.get('forCounts') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    // When fetching for counts, remove the limit to get all Applicants
    const limit = isForCounts ? Number.MAX_SAFE_INTEGER : Math.max(1, Math.min(MAX_PAGE_SIZE, parseInt(searchParams.get('limit') || DEFAULT_PAGE_SIZE.toString(), 10)));
    const offset = (page - 1) * limit;

    // Performance optimization: Set query timeout
    client = await getPool().connect();
    // Use longer timeout for count queries to handle large datasets
    const timeout = isForCounts ? QUERY_TIMEOUT * 2 : QUERY_TIMEOUT;
    // SECURITY: Use parameterized query for statement_timeout
    // UPDATE: PostgreSQL does not allow parameterization for SET commands. 
    // Since timeout is a number calculated from constants (QUERY_TIMEOUT), it is safe to interpolate.
    await client.query(`SET statement_timeout = ${timeout}`);

    // Sorting - SECURITY: strict lookup map to prevent SQL injection
    // This allows us to remove the Snyk ignore comment as we no longer concatenate strings dynamically
    const sortColumnParam = searchParams.get('sortColumn') || 'applicationDate';
    const sortDirectionParam = (searchParams.get('sortDirection') || 'DESC').toUpperCase();
    const dir = sortDirectionParam === 'ASC' ? 'ASC' : 'DESC';

    // Map of all allowed sort combinations
    const sortMap: Record<string, string> = {
      'name_ASC': 'c.name ASC',
      'name_DESC': 'c.name DESC',
      'email_ASC': 'c.email ASC',
      'email_DESC': 'c.email DESC',
      'fitScore_ASC': 'c."fitScore" ASC NULLS FIRST',
      'fitScore_DESC': 'c."fitScore" DESC NULLS LAST',
      'applicationDate_ASC': 'c."applicationDate" ASC',
      'applicationDate_DESC': 'c."applicationDate" DESC',
      'status_ASC': 'c."statusId" ASC',
      'status_DESC': 'c."statusId" DESC',
      'lastUpdate_ASC': 'c."updatedAt" ASC',
      'lastUpdate_DESC': 'c."updatedAt" DESC',
      'source_ASC': 'cs.name ASC',
      'source_DESC': 'cs.name DESC',
      'recruiter_ASC': 'u.name ASC',
      'recruiter_DESC': 'u.name DESC',
      'position_ASC': 'p.title ASC',
      'position_DESC': 'p.title DESC',
      'createdAt_ASC': 'c."createdAt" ASC',
      'createdAt_DESC': 'c."createdAt" DESC',
      'phone_ASC': 'c.phone ASC',
      'phone_DESC': 'c.phone DESC',
    };

    const sortKey = `${sortColumnParam}_${dir}`;
    let sortClause = sortMap[sortKey] || sortMap['applicationDate_DESC'];

    // Handle pinned-only filter
    const pinnedOnly = searchParams.get('pinnedOnly') === 'true';

    // Only prioritize pinned Applicants if showPinSection is enabled
    const showPinSection = searchParams.get('showPinSection');
    if (showPinSection === 'true') {
      // For pinned section, we still need to concatenate, but the suffix is now guaranteed safe from the map
      sortClause = `c."isPinned" DESC, c."pinnedAt" DESC NULLS LAST, ${sortClause}`;
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
          case 'positionid':
            advancedFilters.positionId = value;
            break;
          case 'recruiterid':
            advancedFilters.recruiterId = value;
            break;
          case 'applicationdatestart':
            advancedFilters.applicationDateStart = value;
            break;
          case 'applicationdateend':
            advancedFilters.applicationDateEnd = value;
            break;
          case 'minexperienceyears':
            advancedFilters.minExperienceYears = value;
            break;
          case 'maxexperienceyears':
            advancedFilters.maxExperienceYears = value;
            break;
          case 'minfitscore':
          case 'minappliedjobfitscore':
            advancedFilters.minAppliedJobFitScore = value;
            break;
          case 'maxfitscore':
          case 'maxappliedjobfitscore':
            advancedFilters.maxAppliedJobFitScore = value;
            break;
          case 'minmatchingjobfitscore':
            advancedFilters.minMatchingJobFitScore = value;
            break;
          case 'maxmatchingjobfitscore':
            advancedFilters.maxMatchingJobFitScore = value;
            break;
          case 'education':
            advancedFilters.education = value;
            break;
          case 'selectedsourceids':
            advancedFilters.selectedSourceIds = value;
            break;
          case 'locationoperator':
            advancedFilters.locationOperator = value;
            break;
        }
      });
    }

    // Parse custom field filters
    const customFieldFilters: { [key: string]: any } = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith('customField_')) {
        const fieldCode = key.replace('customField_', '');
        customFieldFilters[fieldCode] = value;
      }
    }

    // Build filters object
    const filters = {
      name: searchParams.get('name') || advancedFilters.searchTerm,
      nameOperator: searchParams.get('nameOperator') || 'contains',
      email: searchParams.get('email') || advancedFilters.email,
      emailOperator: searchParams.get('emailOperator') || 'contains',
      phone: searchParams.get('phone') || advancedFilters.phone,
      phoneOperator: searchParams.get('phoneOperator') || 'contains',
      positionId: searchParams.get('positionId') || advancedFilters.positionId,
      status: searchParams.get('status') || advancedFilters.status,
      education: searchParams.get('education'),
      minAppliedJobFitScore: searchParams.get('minAppliedJobFitScore') ? parseFloat(searchParams.get('minAppliedJobFitScore')!) : (advancedFilters.minAppliedJobFitScore ? parseFloat(advancedFilters.minAppliedJobFitScore) : undefined),
      maxAppliedJobFitScore: searchParams.get('maxAppliedJobFitScore') ? parseFloat(searchParams.get('maxAppliedJobFitScore')!) : (advancedFilters.maxAppliedJobFitScore ? parseFloat(advancedFilters.maxAppliedJobFitScore) : undefined),
      minMatchingJobFitScore: searchParams.get('minMatchingJobFitScore') ? parseFloat(searchParams.get('minMatchingJobFitScore')!) : (advancedFilters.minMatchingJobFitScore ? parseFloat(advancedFilters.minMatchingJobFitScore) : undefined),
      maxMatchingJobFitScore: searchParams.get('maxMatchingJobFitScore') ? parseFloat(searchParams.get('maxMatchingJobFitScore')!) : (advancedFilters.maxMatchingJobFitScore ? parseFloat(advancedFilters.maxMatchingJobFitScore) : undefined),
      includeNoScoreInApplied: advancedQuery && !searchParams.has('includeNoScoreInApplied') ? false : (searchParams.get('includeNoScoreInApplied') === 'true'),
      includeNoScoreInMatching: advancedQuery && !searchParams.has('includeNoScoreInMatching') ? false : (searchParams.get('includeNoScoreInMatching') === 'true'),
      minExperienceYears: searchParams.get('minExperienceYears') ? parseInt(searchParams.get('minExperienceYears')!, 10) : (advancedFilters.minExperienceYears ? parseInt(advancedFilters.minExperienceYears, 10) : undefined),
      maxExperienceYears: searchParams.get('maxExperienceYears') ? parseInt(searchParams.get('maxExperienceYears')!, 10) : (advancedFilters.maxExperienceYears ? parseInt(advancedFilters.maxExperienceYears, 10) : undefined),
      applicationDateStart: searchParams.get('applicationDateStart') ? new Date(searchParams.get('applicationDateStart')!) : (advancedFilters.applicationDateStart ? new Date(advancedFilters.applicationDateStart) : undefined),
      applicationDateEnd: searchParams.get('applicationDateEnd') ? new Date(searchParams.get('applicationDateEnd')!) : (advancedFilters.applicationDateEnd ? new Date(advancedFilters.applicationDateEnd) : undefined),
      recruiterId: searchParams.get('recruiterId') || advancedFilters.recruiterId,
      sourceId: searchParams.get('sourceId'),
      location: searchParams.get('location') || advancedFilters.location,
      locationOperator: searchParams.get('locationOperator') || 'contains',
      skills: searchParams.get('skills') || advancedFilters.skills,
      customFieldFilters,
    };

    // Build WHERE clauses and parameters
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Handle name filter
    if (filters.name) {
      const nameOperator = filters.nameOperator === 'is' ? '=' : 'ILIKE';
      let nameValue = filters.name;

      if (nameOperator === 'ILIKE') {
        if (filters.nameOperator === 'startsWith') nameValue = `${filters.name}%`;
        else if (filters.nameOperator === 'endsWith') nameValue = `%${filters.name}`;
        else nameValue = `%${filters.name}%`;
      }

      whereClauses.push(`c.name ${nameOperator} $${paramIndex++}`);
      queryParams.push(nameValue);
    }

    // Handle email filter
    if (filters.email) {
      const emailOperator = filters.emailOperator === 'is' ? '=' : 'ILIKE';
      let emailValue = filters.email;

      if (emailOperator === 'ILIKE') {
        if (filters.emailOperator === 'startsWith') emailValue = `${filters.email}%`;
        else if (filters.emailOperator === 'endsWith') emailValue = `%${filters.email}`;
        else emailValue = `%${filters.email}%`;
      }

      whereClauses.push(`c.email ${emailOperator} $${paramIndex++}`);
      queryParams.push(emailValue);
    }

    // Handle phone filter
    if (filters.phone) {
      const phoneOperator = filters.phoneOperator === 'is' ? '=' : 'ILIKE';
      let phoneValue = filters.phone;

      if (phoneOperator === 'ILIKE') {
        if (filters.phoneOperator === 'startsWith') phoneValue = `${filters.phone}%`;
        else if (filters.phoneOperator === 'endsWith') phoneValue = `%${filters.phone}`;
        else phoneValue = `%${filters.phone}%`;
      }

      whereClauses.push(`c.phone ${phoneOperator} $${paramIndex++}`);
      queryParams.push(phoneValue);
    }

    // Handle location filter
    if (filters.location) {
      const locationOperatorValue = filters.locationOperator === 'is' ? '=' : 'ILIKE';
      let locationValue = filters.location;

      if (locationOperatorValue === 'ILIKE') {
        if (filters.locationOperator === 'startsWith') locationValue = `${filters.location}%`;
        else if (filters.locationOperator === 'endsWith') locationValue = `%${filters.location}`;
        else locationValue = `%${filters.location}%`;
      }

      whereClauses.push(`c.location ${locationOperatorValue} $${paramIndex++}`);
      queryParams.push(locationValue);
    }

    // Handle status filter - support both status names and status IDs
    if (filters.status) {
      const statuses = filters.status.split(',').map(s => s.trim()).filter(s => s !== '');
      const nullStatuses = statuses.filter(s => s === 'null' || s === '');
      const regularStatuses = statuses.filter(s => s !== 'null' && s !== '');

      if (nullStatuses.length > 0 && regularStatuses.length > 0) {
        // Mixed null and regular statuses
        if (regularStatuses.length > 0) {
          // Check if these look like UUIDs or status names
          const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

          const uuidStatuses = regularStatuses.filter(s => isUUID(s));
          const nameStatuses = regularStatuses.filter(s => !isUUID(s));

          let allStatusIds: string[] = [];

          if (uuidStatuses.length > 0) {
            allStatusIds.push(...uuidStatuses);
          }

          if (nameStatuses.length > 0) {
            // Look up status IDs for the name statuses
            const client = await getPool().connect();
            try {
              const result = await client.query(
                'SELECT id FROM "RecruitmentStage" WHERE name = ANY($1::text[])',
                [nameStatuses]
              );
              allStatusIds.push(...result.rows.map((row: any) => row.id));
            } finally {
              client.release();
            }
          }

          if (allStatusIds.length > 0) {
            const statusConditions = allStatusIds.map((_, index) =>
              `c."statusId" = $${paramIndex + index}`
            ).join(' OR ');
            whereClauses.push(`(${statusConditions} OR c."statusId" IS NULL)`);
            queryParams.push(...allStatusIds);
            paramIndex += allStatusIds.length;
          } else {
            whereClauses.push(`c."statusId" IS NULL`);
          }
        } else {
          whereClauses.push(`c."statusId" IS NULL`);
        }
      } else if (nullStatuses.length > 0) {
        // Only null statuses
        whereClauses.push(`c."statusId" IS NULL`);
      } else {
        // Only regular statuses selected - check if they're UUIDs or names
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        const uuidStatuses = regularStatuses.filter(s => isUUID(s));
        const nameStatuses = regularStatuses.filter(s => !isUUID(s));

        if (uuidStatuses.length > 0 && nameStatuses.length > 0) {
          // Mixed UUIDs and names - need to look up names
          const client = await getPool().connect();
          try {
            // Look up status IDs for the name statuses
            const nameStatusIds = await client.query(
              'SELECT id FROM "RecruitmentStage" WHERE name = ANY($1::text[])',
              [nameStatuses]
            );

            const allStatusIds = [
              ...uuidStatuses,
              ...nameStatusIds.rows.map((row: any) => row.id)
            ];

            if (allStatusIds.length === 1) {
              whereClauses.push(`c."statusId" = $${paramIndex++}`);
              queryParams.push(allStatusIds[0]);
            } else {
              whereClauses.push(`c."statusId" = ANY($${paramIndex++}::uuid[])`);
              queryParams.push(allStatusIds);
            }
          } finally {
            client.release();
          }
        } else if (uuidStatuses.length > 0) {
          // Only UUIDs - use directly
          if (uuidStatuses.length === 1) {
            whereClauses.push(`c."statusId" = $${paramIndex++}`);
            queryParams.push(uuidStatuses[0]);
          } else {
            whereClauses.push(`c."statusId" = ANY($${paramIndex++}::uuid[])`);
            queryParams.push(uuidStatuses);
          }
        } else if (nameStatuses.length > 0) {
          // Only names - need to look up IDs
          const client = await getPool().connect();
          try {
            const result = await client.query(
              'SELECT id FROM "RecruitmentStage" WHERE name = ANY($1::text[])',
              [nameStatuses]
            );

            const statusIds = result.rows.map((row: any) => row.id);

            if (statusIds.length === 1) {
              whereClauses.push(`c."statusId" = $${paramIndex++}`);
              queryParams.push(statusIds[0]);
            } else if (statusIds.length > 1) {
              whereClauses.push(`c."statusId" = ANY($${paramIndex++}::uuid[])`);
              queryParams.push(statusIds);
            }
          } finally {
            client.release();
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
        // Only "not-applied" selected - filter for Applicants with no position
        whereClauses.push(`c."positionId" IS NULL`);
      } else if (hasNotApplied && regularPositions.length > 0) {
        // Mixed selection - include both "not-applied" and regular positions
        if (regularPositions.length === 1) {
          whereClauses.push(`(c."positionId" = $${paramIndex++} OR c."positionId" IS NULL)`);
          queryParams.push(regularPositions[0]);
        } else {
          whereClauses.push(`(c."positionId" = ANY($${paramIndex++}::uuid[]) OR c."positionId" IS NULL)`);
          queryParams.push(regularPositions);
        }
      } else {
        // Only regular positions selected
        if (regularPositions.length === 1) {
          whereClauses.push(`c."positionId" = $${paramIndex++}`);
          queryParams.push(regularPositions[0]);
        } else if (regularPositions.length > 1) {
          whereClauses.push(`c."positionId" = ANY($${paramIndex++}::uuid[])`);
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
            whereClauses.push(`(c."recruiterId" IS NULL OR c."recruiterId" = ANY($${paramIndex++}::uuid[]))`);
            queryParams.push(assignedIds);
          } else if (assignedIds.length > 0) {
            whereClauses.push(`c."recruiterId" = ANY($${paramIndex++}::uuid[])`);
            queryParams.push(assignedIds);
          } else if (hasUnassigned) {
            whereClauses.push(`c."recruiterId" IS NULL`);
          }
        }
      }
    }

    // Auto-filter: If user is a recruiter (not Admin and doesn't have Applicants_VIEW permission), 
    // only show their assigned Applicants unless explicit filters are set
    const isRecruiterViewRestricted = !hasPermission(session.user, 'Applicants_VIEW');
    const recruiterIdFromFilter = filters.recruiterId;
    const positionIdFromFilter = filters.positionId;

    // Apply recruiter filter if user is a recruiter AND there are no explicit filters
    // This allows position-based and recruiter-based filtering to work properly even for recruiters
    if (isRecruiterViewRestricted && !recruiterIdFromFilter && !positionIdFromFilter) {
      whereClauses.push(`c."recruiterId" = $${paramIndex++}`);
      queryParams.push(session.user.id);
    }

    // Filter for hiring managers: only show Applicants for positions where they are assigned as interviewers
    // This restriction is bypassed if the user has the Applicants_VIEW_ALL permission
    const isHiringManager = session.user.role === 'Hiring Manager';
    if (isHiringManager && !hasPermission(session.user, 'Applicants_VIEW_ALL')) {
      // Check system setting to see if restriction is enabled (defaults to true)
      const restrictSetting = await getSystemSetting('hiringManagerRestrictToAssignedPositions');
      const shouldRestrict = restrictSetting !== 'false';

      if (shouldRestrict) {
        whereClauses.push(`EXISTS (
          SELECT 1 FROM "PositionInterviewer" pi 
          WHERE pi."positionId" = c."positionId" 
          AND pi."userId" = $${paramIndex++}
        )`);
        queryParams.push(session.user.id);
      }
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
          // Only "unassigned" selected - filter for Applicants with no source
          whereClauses.push(`c."sourceId" IS NULL`);
        } else if (hasUnassigned && regularSources.length > 0) {
          // Mixed selection - include both "unassigned" and regular sources
          if (regularSources.length === 1) {
            whereClauses.push(`(c."sourceId" = $${paramIndex++} OR c."sourceId" IS NULL)`);
            queryParams.push(regularSources[0]);
          } else {
            whereClauses.push(`(c."sourceId" = ANY($${paramIndex++}::uuid[]) OR c."sourceId" IS NULL)`);
            queryParams.push(regularSources);
          }
        } else {
          // Only regular sources selected
          if (regularSources.length === 1) {
            whereClauses.push(`c."sourceId" = $${paramIndex++}`);
            queryParams.push(regularSources[0]);
          } else if (regularSources.length > 1) {
            whereClauses.push(`c."sourceId" = ANY($${paramIndex++}::uuid[])`);
            queryParams.push(regularSources);
          }
        }
      }
    }

    // Check if fit score filters are being used
    const hasFitScoreFilters = filters.minAppliedJobFitScore !== undefined ||
      filters.maxAppliedJobFitScore !== undefined ||
      filters.minMatchingJobFitScore !== undefined ||
      filters.maxMatchingJobFitScore !== undefined;

    // Handle fit score filters - enhanced approach to handle both percentage and decimal formats
    if (filters.minAppliedJobFitScore !== undefined || filters.maxAppliedJobFitScore !== undefined) {
      // Check if this is the "no-score" case (both min and max are -1)
      if (filters.minAppliedJobFitScore === -1 && filters.maxAppliedJobFitScore === -1) {
        // Special case: filter for Applicants with no fit score
        whereClauses.push(`(c."fitScore" IS NULL OR c."fitScore" = 0)`);
      } else if (filters.includeNoScoreInApplied) {
        // Both regular grades and no-score selected - create OR condition
        const regularScoreConditions: string[] = [];

        if (filters.minAppliedJobFitScore !== undefined && filters.minAppliedJobFitScore !== -1) {
          // Database stores scores in decimal format (0-1), so convert percentage values to decimal
          // If filter value is > 1, assume it's percentage (0-100) and convert to decimal (0-1)
          // If filter value is <= 1, assume it's already decimal and use as-is
          const filterValue = filters.minAppliedJobFitScore > 1 ? filters.minAppliedJobFitScore / 100 : filters.minAppliedJobFitScore;
          regularScoreConditions.push(`c."fitScore" >= $${paramIndex++}`);
          queryParams.push(filterValue);
        }

        if (filters.maxAppliedJobFitScore !== undefined && filters.maxAppliedJobFitScore !== -1) {
          // Database stores scores in decimal format (0-1), so convert percentage values to decimal
          const filterValue = filters.maxAppliedJobFitScore > 1 ? filters.maxAppliedJobFitScore / 100 : filters.maxAppliedJobFitScore;
          regularScoreConditions.push(`c."fitScore" <= $${paramIndex++}`);
          queryParams.push(filterValue);
        }

        // Create OR condition: (regular score conditions) OR (no-score condition)
        const noScoreCondition = `(c."fitScore" IS NULL OR c."fitScore" = 0)`;

        if (regularScoreConditions.length > 0) {
          whereClauses.push(`((${regularScoreConditions.join(' AND ')}) OR ${noScoreCondition})`);
        } else {
          whereClauses.push(`(${noScoreCondition})`);
        }
      } else {
        // Handle regular score range filtering
        if (filters.minAppliedJobFitScore !== undefined && filters.minAppliedJobFitScore !== -1) {
          // Database stores scores in decimal format (0-1), so convert percentage values to decimal
          // If filter value is > 1, assume it's percentage (0-100) and convert to decimal (0-1)
          // If filter value is <= 1, assume it's already decimal and use as-is
          const filterValue = filters.minAppliedJobFitScore > 1 ? filters.minAppliedJobFitScore / 100 : filters.minAppliedJobFitScore;
          whereClauses.push(`c."fitScore" >= $${paramIndex++}`);
          queryParams.push(filterValue);
        }
        if (filters.maxAppliedJobFitScore !== undefined && filters.maxAppliedJobFitScore !== -1) {
          // Database stores scores in decimal format (0-1), so convert percentage values to decimal
          const filterValue = filters.maxAppliedJobFitScore > 1 ? filters.maxAppliedJobFitScore / 100 : filters.maxAppliedJobFitScore;
          whereClauses.push(`c."fitScore" <= $${paramIndex++}`);
          queryParams.push(filterValue);
        }
      }
    }

    // Handle matching job fit score filters - simple approach
    if (filters.minMatchingJobFitScore !== undefined || filters.maxMatchingJobFitScore !== undefined) {

      // Check if this is the "no-score" case (both min and max are -1)
      if (filters.minMatchingJobFitScore === -1 && filters.maxMatchingJobFitScore === -1) {
        // No matching fit score filter - Applicants with no job matches
        whereClauses.push(`(
          (c."parsedData"->>'job_matches' IS NULL OR c."parsedData"->>'job_matches' = '[]' OR c."parsedData"->>'job_matches' = '')
          AND NOT EXISTS (SELECT 1 FROM "JobMatch" jm WHERE jm."applicantId" = c.id)
        )`);

      } else if (filters.includeNoScoreInMatching) {
        // Both regular grades and no-score selected - create OR condition
        const regularScoreConditions: string[] = [];

        if (filters.minMatchingJobFitScore !== undefined && filters.minMatchingJobFitScore !== -1) {
          // Database stores fit scores in 0-1 decimal range, convert percentage values to decimal
          const filterValue = filters.minMatchingJobFitScore > 1 ? filters.minMatchingJobFitScore / 100 : filters.minMatchingJobFitScore;
          regularScoreConditions.push(`(
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(c."parsedData"->'job_matches') AS job_match
              WHERE CAST(job_match->>'fitScore' AS DECIMAL) >= $${paramIndex}
            )
            OR EXISTS (
              SELECT 1 FROM "JobMatch" jm 
              WHERE jm."applicantId" = c.id AND jm."fitScore" >= $${paramIndex + 1}
            )
          )`);
          queryParams.push(filterValue, filterValue);
          paramIndex += 2;
        }

        if (filters.maxMatchingJobFitScore !== undefined && filters.maxMatchingJobFitScore !== -1) {
          // Database stores fit scores in 0-1 decimal range, convert percentage values to decimal
          const filterValue = filters.maxMatchingJobFitScore > 1 ? filters.maxMatchingJobFitScore / 100 : filters.maxMatchingJobFitScore;
          regularScoreConditions.push(`(
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(c."parsedData"->'job_matches') AS job_match
              WHERE CAST(job_match->>'fitScore' AS DECIMAL) <= $${paramIndex}
            )
            OR EXISTS (
              SELECT 1 FROM "JobMatch" jm 
              WHERE jm."applicantId" = c.id AND jm."fitScore" <= $${paramIndex + 1}
            )
          )`);
          queryParams.push(filterValue, filterValue);
          paramIndex += 2;
        }

        // Create OR condition: (regular score conditions) OR (no-score condition)
        const noScoreCondition = `(
          (c."parsedData"->>'job_matches' IS NULL OR c."parsedData"->>'job_matches' = '[]' OR c."parsedData"->>'job_matches' = '')
          AND NOT EXISTS (SELECT 1 FROM "JobMatch" jm WHERE jm."applicantId" = c.id)
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
          // Database stores fit scores in 0-1 decimal range, convert percentage values to decimal
          const filterValue = filters.minMatchingJobFitScore > 1 ? filters.minMatchingJobFitScore / 100 : filters.minMatchingJobFitScore;
          conditions.push(`(
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(c."parsedData"->'job_matches') AS job_match
              WHERE CAST(job_match->>'fitScore' AS DECIMAL) >= $${paramIndex}
            )
            OR EXISTS (
              SELECT 1 FROM "JobMatch" jm 
              WHERE jm."applicantId" = c.id AND jm."fitScore" >= $${paramIndex + 1}
            )
          )`);
          queryParams.push(filterValue, filterValue);
          paramIndex += 2;

        }

        if (filters.maxMatchingJobFitScore !== undefined && filters.maxMatchingJobFitScore !== -1) {
          // Database stores fit scores in 0-1 decimal range, convert percentage values to decimal
          const filterValue = filters.maxMatchingJobFitScore > 1 ? filters.maxMatchingJobFitScore / 100 : filters.maxMatchingJobFitScore;
          conditions.push(`(
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(c."parsedData"->'job_matches') AS job_match
              WHERE CAST(job_match->>'fitScore' AS DECIMAL) <= $${paramIndex}
            )
            OR EXISTS (
              SELECT 1 FROM "JobMatch" jm 
              WHERE jm."applicantId" = c.id AND jm."fitScore" <= $${paramIndex + 1}
            )
          )`);
          queryParams.push(filterValue, filterValue);
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

    // Handle custom field filters
    if (filters.customFieldFilters && Object.keys(filters.customFieldFilters).length > 0) {
      // First, get the custom field definitions to understand field types
      const customFieldDefsQuery = `
        SELECT field_code, field_type, options
        FROM "CustomFieldDefinition"
        WHERE model_name = 'Applicant' AND show_in_filter = true
      `;
      const customFieldDefsResult = await client.query(customFieldDefsQuery);
      const customFieldDefs = customFieldDefsResult.rows.reduce((acc: any, row: any) => {
        acc[row.field_code] = row;
        return acc;
      }, {} as any);

      // Process each custom field filter
      for (const [fieldCode, filterValue] of Object.entries(filters.customFieldFilters)) {
        if (filterValue === undefined || filterValue === null || filterValue === '' || filterValue === 'null') continue;

        // SECURITY: Validate fieldCode to prevent SQL injection
        // Only allow alphanumeric, underscore, and hyphen characters
        if (!/^[a-zA-Z0-9_-]+$/.test(fieldCode)) {
          console.warn(`[SECURITY] Invalid fieldCode format detected: ${fieldCode}`);
          continue;
        }

        const fieldDef = customFieldDefs[fieldCode];
        if (!fieldDef) continue;

        // SECURITY: fieldCode is validated above with regex and whitelist check
        // PostgreSQL JSONB operators don't support parameterized keys, but this is safe
        // because fieldCode is strictly validated: alphanumeric, underscore, hyphen only
        // and must exist in the customFieldDefs whitelist from the database

        // Build the custom field filter condition based on field type
        switch (fieldDef.field_type) {
          case 'text':
          case 'textarea':
            // SECURITY: Use parameterization for the key as well
            whereClauses.push(`c."customAttributes"->>$${paramIndex++} ILIKE $${paramIndex++}`);
            queryParams.push(fieldCode);
            queryParams.push(`%${filterValue}%`);
            break;

          case 'number':
            const numValue = parseFloat(filterValue as string);
            if (!isNaN(numValue)) {
              if (!isNaN(numValue)) {
                whereClauses.push(`CAST(c."customAttributes"->>$${paramIndex++} AS DECIMAL) = $${paramIndex++}`);
                queryParams.push(fieldCode);
                queryParams.push(numValue);
              }
            }
            break;

          case 'boolean':
            const boolValue = filterValue === 'true' || filterValue === true;
            whereClauses.push(`CAST(c."customAttributes"->>$${paramIndex++} AS BOOLEAN) = $${paramIndex++}`);
            queryParams.push(fieldCode);
            queryParams.push(boolValue);
            break;

          case 'date':
            try {
              const dateValue = new Date(filterValue as string);
              whereClauses.push(`CAST(c."customAttributes"->>$${paramIndex++} AS DATE) = $${paramIndex++}`);
              queryParams.push(fieldCode);
              queryParams.push(dateValue.toISOString().split('T')[0]);
            } catch (e) {
              // Invalid date, skip this filter
            }
            break;

          case 'select_single':
            whereClauses.push(`c."customAttributes"->>$${paramIndex++} = $${paramIndex++}`);
            queryParams.push(fieldCode);
            queryParams.push(filterValue);
            break;

          case 'select_multiple':
            // For multiple select, check if any of the selected values are in the array
            if (Array.isArray(filterValue)) {
              const conditions = filterValue.map((val, index) =>
                `c."customAttributes"->$${paramIndex} ? $${paramIndex + index + 1}`
              );
              // paramIndex is for the fieldCode. indices are relative to paramIndex+1
              // We need:
              // fieldCode param (shared? no, params must be unique or passed multiple times if positional)
              // Actually PG helper $1 reuse: yes we can reuse $N if we pass it once. But queryParams is array.
              // Simpler to just push fieldCode for each condition or push it once and refer to it.
              // But paramIndex++ expects sequential. 

              // Let's create a condition per value.
              // "customAttributes"->$P1 ? $P2 OR "customAttributes"->$P3 ? $P4 ... 
              // Better: "customAttributes"->$P1 ?| ARRAY[$P2, $P3...] (Postgres JSONB ?| operator checks if any exist)

              // Using ?| operator for "Any of these strings exist as top-level keys or array elements"
              // But 'select_multiple' usually means the value in DB is `["A", "B"]`.
              // And filterValue is `["A"]` (find Applicants who have "A").
              // If `filterValue` is `["A", "B"]` (find Applicants who have "A" OR "B")?
              // The logic implies OR.

              // Let's stick to the map logic but parameterize fieldCode.
              // We need to increment paramIndex.

              const currentFieldCodeParamIndex = paramIndex;
              paramIndex++; // Reserve for fieldCode
              queryParams.push(fieldCode);

              const valueConditions = filterValue.map((_, idx) =>
                `c."customAttributes"->$${currentFieldCodeParamIndex} ? $${paramIndex + idx}`
              );

              whereClauses.push(`(${valueConditions.join(' OR ')})`);
              queryParams.push(...filterValue);
              paramIndex += filterValue.length;
            } else {
              whereClauses.push(`c."customAttributes"->>$${paramIndex++} = $${paramIndex++}`);
              queryParams.push(fieldCode);
              queryParams.push(filterValue);
            }
            break;
        }
      }
    }

    // Handle pinned-only filter
    if (pinnedOnly) {
      whereClauses.push(`c."isPinned" = true`);
    }

    // Build the WHERE clause
    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';


    // Optimized query with better indexing and reduced complexity
    // SECURITY: whereClause is built from whitelisted fragments and parameterized values
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "applicant" c
      ${whereClause}
    `;

    // For count-only requests, only execute the count query
    if (isForCounts) {
      // Execute count query using parameterized values
      // deepcode ignore Sqli: Query parameters are strictly strictly validated and parameterized
      // deepcode ignore Sqli: Safe query
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      const responseTime = Date.now() - startTime;

      // Add performance headers
      const headers = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `"${Buffer.from(JSON.stringify({ filters, page, limit: 'count-only', total, responseTime })).toString('base64').slice(0, 8)}"`,
        'X-Response-Time': `${responseTime}ms`,
        'X-Total-Count': total.toString(),
        'X-Page-Size': 'count-only',
      };

      return NextResponse.json({
        total: total,
        data: [] // Empty data array for count-only requests
      }, { headers });
    }

    // For normal requests, execute both count and data queries
    // SECURITY: whereClause and sortClause are strictly whitelisted/validated
    const dataQuery = `
      SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c."fitScore",
        c."statusId",
        rs.name as "status",
        c."applicationDate",
        c."updatedAt",
        c."positionId",
        c."recruiterId",
        c."sourceId",
        c."parsedData",
        c."avatarUrl",
        c."isPinned",
        c."pinnedAt",
        p.title as "positionTitle",
        u.name as "recruiterName",
        cs.name as "sourceName",
        c."isBlacklisted"
      FROM "applicant" c
      LEFT JOIN "Position" p ON c."positionId" = p.id
      LEFT JOIN "User" u ON c."recruiterId" = u.id
      LEFT JOIN "ApplicantSource" cs ON c."sourceId" = cs.id
      LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
      ${whereClause}
      ORDER BY 
        ${sortClause}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;



    // Execute queries in parallel for better performance
    const [countResult, dataResult] = await Promise.all([
      // deepcode ignore Sqli: Safe query
      client.query(countQuery, queryParams),
      // deepcode ignore Sqli: Sort clause is from whitelist, where clause is parameterized
      client.query(dataQuery, [...queryParams, limit, offset])
    ]);

    const total = parseInt(countResult.rows[0].total);

    // Optimize data transformation
    const applicants = dataResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      fitScore: normalizeFitScore(row.fitScore),
      expectedSalary: row.expectedSalary,
      status: row.status,
      statusId: row.statusId,
      applicationDate: row.applicationDate,
      updatedAt: row.updatedAt,
      positionId: row.positionId,
      recruiterId: row.recruiterId,
      sourceId: row.sourceId,
      parsedData: row.parsedData,
      avatarUrl: row.avatarUrl,
      isPinned: row.isPinned,
      pinnedAt: row.pinnedAt,
      position: row.positionTitle ? { title: row.positionTitle } : null,
      recruiter: row.recruiterName ? { name: row.recruiterName } : null,
      source: row.sourceName ? { name: row.sourceName } : null,
      isBlacklisted: row.isBlacklisted,
    }));

    const responseTime = Date.now() - startTime;

    // Add performance headers
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': `"${Buffer.from(JSON.stringify({ filters, page, limit, total, responseTime })).toString('base64').slice(0, 8)}"`,
      'X-Response-Time': `${responseTime}ms`,
      'X-Total-Count': total.toString(),
      'X-Page-Size': limit.toString(),
    };

    return NextResponse.json({
      data: applicants,
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
    console.error('Error fetching Applicants:', error);

    return NextResponse.json({
      message: 'Internal Server Error',
      error: 'An unexpected error occurred while fetching Applicants',
      responseTime: `${responseTime}ms`
    }, { status: 500 });
  } finally {
    // ? CRITICAL FIX: Always release the database client
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing database client:', releaseError);
      }
    }
  }
}
