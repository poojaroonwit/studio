/**
 * @openapi
 * /api/positions:
 *   get:
 *     summary: Get all positions
 *     description: Returns a list of all positions.
 *     responses:
 *       200:
 *         description: List of positions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Position'
 *   post:
 *     summary: Create a new position
 *     description: Creates a new position.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Position'
 *     responses:
 *       201:
 *         description: Position created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Position'
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { hasPermission } from '@/lib/permissions';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '@/lib/db';
import { handleCors } from '@/lib/cors';
import { dispatchWebhooks } from '@/lib/webhookDispatcher';
import { getDefaultMatchCriteria } from '@/lib/systemSettings';
import { SimpleWarningService } from '@/lib/warnings';
import { broadcastPositionCreated } from '@/lib/simple-broadcaster';
import { getSystemSetting } from '@/lib/systemSettings';
import { logAudit } from '@/lib/auditLog';
import { sanitizeHtml, sanitizeRichHtml } from '@/lib/security';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission to view positions
  if (!hasPermission(session.user, 'POSITIONS_VIEW')) {
    return NextResponse.json({ message: "Forbidden: Insufficient permissions to view positions" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const titleFilter = searchParams.get('title');
    const departmentFilter = searchParams.get('department'); // Expects comma-separated strings
    const isOpenFilter = searchParams.get('isOpen');
    const positionLevelFilter = searchParams.get('positionLevel');
    const recruiterIdFilter = searchParams.get('recruiterId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeCandidateStats = searchParams.get('includeCandidateStats') === 'true';
    const includeHeadcount = searchParams.get('includeHeadcount') === 'true';

    // Parse custom field filters
    const customFieldFilters: { [key: string]: any } = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith('customField_')) {
        const fieldCode = key.replace('customField_', '');
        customFieldFilters[fieldCode] = value;
      }
    }

    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {

      return NextResponse.json({
        message: "Database configuration error",
        error: "DATABASE_URL environment variable is not set"
      }, { status: 500, headers: handleCors(request) });
    }

    // Build database query with proper filtering
    try {
      // Build WHERE conditions and parameters
      const conditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (titleFilter) {
        conditions.push(`p.title ILIKE $${paramIndex++}`);
        queryParams.push(`%${titleFilter}%`);
      }

      if (departmentFilter) {
        conditions.push(`p.department = ANY($${paramIndex++}::text[])`);
        queryParams.push(departmentFilter.split(',').map(d => d.trim()));
      }

      if (isOpenFilter === 'true') {
        conditions.push(`p."isOpen" = TRUE`);
      } else if (isOpenFilter === 'false') {
        conditions.push(`p."isOpen" = FALSE`);
      }

      if (positionLevelFilter) {
        conditions.push(`p."positionLevel" ILIKE $${paramIndex++}`);
        queryParams.push(`%${positionLevelFilter}%`);
      }

      if (recruiterIdFilter) {
        if (recruiterIdFilter === 'null' || recruiterIdFilter === 'unassigned') {
          conditions.push(`p."recruiterId" IS NULL`);
        } else {
          conditions.push(`p."recruiterId" = $${paramIndex++}`);
          queryParams.push(recruiterIdFilter);
        }
      }

      // Handle custom field filters
      if (Object.keys(customFieldFilters).length > 0) {
        // First, get the custom field definitions to understand field types
        const customFieldDefsQuery = `
          SELECT field_code, field_type, options
          FROM "CustomFieldDefinition"
          WHERE model_name = 'Position' AND show_in_filter = true
        `;
        const customFieldDefsResult = await getPool().query(customFieldDefsQuery);
        const customFieldDefs = customFieldDefsResult.rows.reduce((acc: any, row: any) => {
          acc[row.field_code] = row;
          return acc;
        }, {} as any);

        // Process each custom field filter
        for (const [fieldCode, filterValue] of Object.entries(customFieldFilters)) {
          if (!filterValue || filterValue === '' || filterValue === 'null') continue;

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
              // SECURITY: Use parameterized query for fieldCode
              conditions.push(`p."customAttributes"->>$${paramIndex++} ILIKE $${paramIndex++}`);
              queryParams.push(fieldCode);
              queryParams.push(`%${filterValue}%`);
              break;

            case 'number':
              const numValue = parseFloat(filterValue as string);
              if (!isNaN(numValue)) {
                conditions.push(`CAST(p."customAttributes"->>$${paramIndex++} AS DECIMAL) = $${paramIndex++}`);
                queryParams.push(fieldCode);
                queryParams.push(numValue);
              }
              break;

            case 'boolean':
              const boolValue = filterValue === 'true' || filterValue === true;
              conditions.push(`CAST(p."customAttributes"->>$${paramIndex++} AS BOOLEAN) = $${paramIndex++}`);
              queryParams.push(fieldCode);
              queryParams.push(boolValue);
              break;

            case 'date':
              try {
                const dateValue = new Date(filterValue as string);
                conditions.push(`CAST(p."customAttributes"->>$${paramIndex++} AS DATE) = $${paramIndex++}`);
                queryParams.push(fieldCode);
                queryParams.push(dateValue.toISOString().split('T')[0]);
              } catch (e) {
                // Invalid date, skip this filter
              }
              break;

            case 'select_single':
              conditions.push(`p."customAttributes"->>$${paramIndex++} = $${paramIndex++}`);
              queryParams.push(fieldCode);
              queryParams.push(filterValue);
              break;

            case 'select_multiple':
              // For multiple select, check if any of the selected values are in the array
              if (Array.isArray(filterValue)) {
                // SECURITY: Use parameterized query - fieldCode is $paramIndex, values start at paramIndex+1
                const fieldCodeParamIndex = paramIndex++;
                const multiConditions = filterValue.map((_val, index) =>
                  `p."customAttributes"->$${fieldCodeParamIndex} ? $${paramIndex + index}`
                );
                conditions.push(`(${multiConditions.join(' OR ')})`);
                queryParams.push(fieldCode);
                queryParams.push(...filterValue);
                paramIndex += filterValue.length;
              } else {
                conditions.push(`p."customAttributes"->>$${paramIndex++} = $${paramIndex++}`);
                queryParams.push(fieldCode);
                queryParams.push(filterValue);
              }
              break;
          }
        }
      }

      // Filter for hiring managers: only show positions where they are assigned as interviewers
      const isHiringManager = session.user.role === 'Hiring Manager';
      let interviewerJoinClause = '';
      if (isHiringManager) {
        // Check if user has permission to view all positions (overrides system setting)
        const hasViewAllPermission = hasPermission(session.user, 'POSITIONS_VIEW_ALL');

        if (!hasViewAllPermission) {
          // Check system setting to see if restriction is enabled
          const restrictSetting = await getSystemSetting('hiringManagerRestrictToAssignedPositions');
          const shouldRestrict = restrictSetting !== 'false'; // Default to true (restrict) if not set

          if (shouldRestrict) {
            conditions.push(`pi."userId" = $${paramIndex++}`);
            queryParams.push(session.user.id);
            interviewerJoinClause = `INNER JOIN "PositionInterviewer" pi ON p.id = pi."positionId"`;
          }
        }
        // If hasViewAllPermission is true, no restriction is applied
      }

      // SECURITY: whereClause is built exclusively from parameterized conditions
      // All user inputs are passed through queryParams, not interpolated into SQL
      const whereClause: string = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

      // SECURITY: Define static SQL fragments as constants to prevent injection
      // These are NOT derived from user input - they are hardcoded query parts
      const BASE_SELECT = `
        SELECT 
          p.id, 
          p.title, 
          p.department, 
          p.description, 
          p."matchCriteria", 
          p."isOpen", 
          p."positionLevel", 
          p."gradeId", 
          p."recruiterId", 
          p."customAttributes", 
          p."createdAt", 
          p."updatedAt",
          u.name as "recruiterName",
          g.name as "gradeName",
          g."sla_days" as "gradeSlaDays",
          g.color as "gradeColor",
          json_build_object(
            'id', p."gradeId",
            'name', g.name,
            'label', g.label,
            'slaDays', g."sla_days",
            'color', g.color
          ) as grade` as const;

      const HEADCOUNT_SELECT = `,
          COALESCE(hc_stats.total_headcount, 0) as "totalHeadcount",
          COALESCE(hc_stats.vacant_headcount, 0) as "vacantHeadcount",
          COALESCE(hc_stats.filled_headcount, 0) as "filledHeadcount"` as const;

      const BASE_FROM = `
        FROM "Position" p 
        LEFT JOIN "User" u ON p."recruiterId" = u.id
        LEFT JOIN "Grade" g ON p."gradeId" = g.id` as const;

      const INTERVIEWER_JOIN = `INNER JOIN "PositionInterviewer" pi ON p.id = pi."positionId"` as const;

      const HEADCOUNT_JOIN = `
        LEFT JOIN (
          SELECT 
            h."positionId",
            COUNT(*) as total_headcount,
            COUNT(CASE WHEN h.status = 'vacant' OR h."candidateId" IS NULL THEN 1 END) as vacant_headcount,
            COUNT(CASE WHEN h.status = 'filled' AND h."candidateId" IS NOT NULL THEN 1 END) as filled_headcount
          FROM "Headcount" h
          GROUP BY h."positionId"
        ) hc_stats ON p.id = hc_stats."positionId"` as const;

      // SECURITY: countQuery must mirror the structure of mainQuery (joins/filters) for accurate results
      let countQuery = `SELECT COUNT(*) as count FROM "Position" p ${interviewerJoinClause ? INTERVIEWER_JOIN : ''}`;
      if (conditions.length > 0) {
        countQuery += ` WHERE ${conditions.join(' AND ')}`;
      }

      // Add limit and offset to params for the main query
      queryParams.push(limit, offset);

      const pool = getPool();

      // SECURITY: All dynamic components are whitelisted/parameterized
      // Structural components (BASE_SELECT, BASE_FROM, join clauses) are static strings.
      // Filter conditions are built into the 'conditions' array and joined with ' AND '.
      // All user-provided values are strictly passed via queryParams.
      const dataQuery = `
        ${BASE_SELECT}
        ${includeHeadcount ? HEADCOUNT_SELECT : ''}
        ${BASE_FROM}
        ${interviewerJoinClause ? interviewerJoinClause : ''}
        ${includeHeadcount ? HEADCOUNT_JOIN : ''}
        ${whereClause}
        ORDER BY p."createdAt" DESC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      const result = await pool.query(dataQuery, queryParams);
      const countResult = await pool.query(countQuery, queryParams.length >= 2 ? queryParams.slice(0, -2) : []); // Remove limit and offset for count
      const total = parseInt(countResult.rows[0].count, 10);

      let positions = result.rows.map((row: any) => {
        const position = {
          ...row,
          custom_attributes: row.customAttributes || {},
        };

        // Add headcount data if included
        if (includeHeadcount) {
          position.headcountData = {
            total: parseInt(row.totalHeadcount || '0', 10),
            vacant: parseInt(row.vacantHeadcount || '0', 10),
            filled: parseInt(row.filledHeadcount || '0', 10)
          };
        }

        return position;
      });

      // Include candidate statistics for each position if requested
      if (includeCandidateStats && positions.length > 0) {
        // Check if job match feature is enabled
        const jobMatchFeatureEnabled = await getSystemSetting('jobMatchFeatureEnabled');
        const isJobMatchEnabled = jobMatchFeatureEnabled !== 'false';

        const positionIds = positions.map((p: any) => p.id);

        // Get candidate statistics for all positions
        const candidateStatsQuery = `
          WITH position_applied AS (
            SELECT 
              p.id as position_id,
              COUNT(c.id) as total_applied,
              COUNT(c.id) as applied_status_count
            FROM "Position" p
            LEFT JOIN "Candidate" c ON p.id = c."positionId"
            WHERE p.id = ANY($1::uuid[])
            GROUP BY p.id
          )
          ${isJobMatchEnabled ? `
          ,position_matching AS (
            SELECT 
              p.id as position_id,
              COUNT(DISTINCT jm."candidateId") as total_matching
            FROM "Position" p
            LEFT JOIN "JobMatch" jm ON p.id = jm."jobId"
            WHERE p.id = ANY($1::uuid[])
            GROUP BY p.id
          )
          ` : ''}
          SELECT 
            pa.position_id,
            COALESCE(pa.total_applied, 0) as total_applied,
            COALESCE(pa.applied_status_count, 0) as applied_status_count
            ${isJobMatchEnabled ? ',COALESCE(pm.total_matching, 0) as total_matching' : ',0 as total_matching'}
          FROM position_applied pa
          ${isJobMatchEnabled ? 'LEFT JOIN position_matching pm ON pa.position_id = pm.position_id' : ''}
        `;

        let statsResult;
        try {
          statsResult = await getPool().query(candidateStatsQuery, [positionIds]);
        } catch (statsError) {
          // Continue without statistics rather than failing the entire request
          statsResult = { rows: [] };
        }

        const statsMap = new Map();
        statsResult.rows.forEach((row: any) => {
          statsMap.set(row.position_id, {
            totalApplied: parseInt(row.total_applied, 10),
            appliedStatusCount: parseInt(row.applied_status_count, 10),
            totalMatching: isJobMatchEnabled ? parseInt(row.total_matching, 10) : 0
          });
        });

        // Add candidate statistics to each position
        positions = positions.map((position: any) => ({
          ...position,
          candidateStats: statsMap.get(position.id) || {
            totalApplied: 0,
            appliedStatusCount: 0,
            totalMatching: 0
          }
        }));
      }

      // Include statistics if requested
      let statistics = null;
      if (includeStats) {
        // Statistics query with same filtering as main query
        const statsQuery = `
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN p."isOpen" = TRUE THEN 1 END) as open,
            COUNT(CASE WHEN p."isOpen" = FALSE THEN 1 END) as closed
          FROM "Position" p
          ${interviewerJoinClause}
          ${whereClause}
        `;

        let statsResult;
        try {
          // Use the same filter parameters but exclude limit and offset
          const statsParams = queryParams.length >= 2 ? queryParams.slice(0, -2) : [];
          statsResult = await getPool().query(statsQuery, statsParams);
          const stats = statsResult.rows[0];

          statistics = {
            total: parseInt(stats.total, 10),
            open: parseInt(stats.open, 10),
            closed: parseInt(stats.closed, 10)
          };
        } catch (statsError) {
          // Continue without statistics rather than failing the entire request
          statistics = { total: 0, open: 0, closed: 0 };
        }
      }

      const response: { data: any[]; total: number; statistics?: any } = { data: positions, total };
      if (statistics) {
        response.statistics = statistics;
      }

      const headers = {
        ...handleCors(request),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      return NextResponse.json(response, { status: 200, headers });
    } catch (dbError) {
      console.error('Database error in positions API:', dbError);
      return NextResponse.json({
        message: "Internal Server Error",
        error: "An unexpected error occurred while fetching positions"
      }, { status: 500, headers: handleCors(request) });
    }
  } catch (error) {
    console.error('Error fetching positions:', error);
    await logAudit('ERROR', `Failed to fetch positions. Error: ${(error as Error).message}`, 'API:Positions:GetAll', session?.user?.id);
    return NextResponse.json({ message: "Internal Server Error", error: "An unexpected error occurred" }, { status: 500, headers: handleCors(request) });
  }
}

const createPositionSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  department: z.string().min(1, { message: "Department is required" }),
  description: z.string().optional().nullable(),
  matchCriteria: z.string().optional().nullable(),
  isOpen: z.boolean({ required_error: "isOpen status is required" }),
  positionLevel: z.string().optional().nullable(),
  recruiterId: z.string().uuid().optional().nullable(),
  custom_attributes: z.record(z.any()).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  const actingUserId = session?.user?.id || null;
  const actingUserName = (session?.user?.name || session?.user?.email || actingUserId || 'System (API Create)') as string;

  if (!session?.user || !hasPermission(session.user as any, 'POSITIONS_CREATE')) {
    await logAudit('WARN', `Forbidden attempt to create position by ${actingUserName}.`, 'API:Positions:Create', actingUserId);
    return NextResponse.json({ message: "Forbidden: Insufficient permissions" }, { status: 403, headers: handleCors(request) });
  }

  // Get default match criteria from system settings
  const defaultMatchCriteria = await getDefaultMatchCriteria();

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: "Error parsing request body", error: (error as Error).message }, { status: 400, headers: handleCors(request) });
  }

  const validationResult = createPositionSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { message: "Invalid input", errors: validationResult.error.flatten().fieldErrors },
      { status: 400, headers: handleCors(request) }
    );
  }

  const validatedData = validationResult.data;

  try {
    const newPositionId = uuidv4();
    const insertQuery = `
      INSERT INTO "Position" (id, title, department, description, "matchCriteria", "isOpen", "positionLevel", "recruiterId", "customAttributes", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *;
    `;
    const values = [
      newPositionId,
      sanitizeHtml(validatedData.title || ''),
      validatedData.department,
      validatedData.description ? sanitizeRichHtml(validatedData.description) : null,
      (validatedData.matchCriteria && validatedData.matchCriteria.trim() !== '') ? sanitizeRichHtml(validatedData.matchCriteria) : defaultMatchCriteria,
      validatedData.isOpen,
      validatedData.positionLevel || null,
      validatedData.recruiterId || null,
      validatedData.custom_attributes || {},
    ];
    const result = await getPool().query(insertQuery, values);
    const newPosition = {
      ...result.rows[0],
      custom_attributes: result.rows[0].customAttributes || {},
    };

    // Invalidate cache
    // Remove all dynamic imports and usages of getRedisClient, CACHE_KEY_POSITIONS, and redisClient. Use SSE or direct DB queries only.

    await logAudit('AUDIT', `Position '${newPosition.title}' (ID: ${newPosition.id}) created by ${actingUserName}.`, 'API:Positions:Create', actingUserId, { targetPositionId: newPosition.id, title: newPosition.title, department: newPosition.department, positionLevel: newPosition.positionLevel });

    // Dispatch webhook for position creation
    try {
      await dispatchWebhooks.positionCreated(newPosition);
    } catch (webhookError) {
      // Failed to dispatch position creation webhook
    }

    // Check for warnings after position creation
    try {
      await SimpleWarningService.createOrUpdateWarnings('position', newPosition.id, actingUserId || undefined);
    } catch (warningError) {
      // Failed to check warnings for new position
    }

    // Broadcast to SSE clients
    broadcastPositionCreated(newPosition, actingUserId || undefined);

    return NextResponse.json(newPosition, { status: 201, headers: handleCors(request) });
  } catch (error) {
    await logAudit('ERROR', `Failed to create position '${validatedData.title}' by ${actingUserName}. Error: ${(error as Error).message}`, 'API:Positions:Create', actingUserId, { title: validatedData.title });
    return NextResponse.json({ message: "Error creating position", error: (error as Error).message }, { status: 500, headers: handleCors(request) });
  }
}

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request);
  return new NextResponse(null, { status: 200, headers });
}
