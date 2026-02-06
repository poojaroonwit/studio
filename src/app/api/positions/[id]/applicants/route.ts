import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { normalizeFitScore } from '@/lib/scoreUtils';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: positionId } = await params;
    if (!positionId) {
      return NextResponse.json({ error: 'Position ID is required' }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(positionId)) {
      return NextResponse.json({ error: 'Invalid position ID format' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Sorting
    const allowedSortColumns = {
      name: 'name',
      email: 'email',
      fitScore: 'COALESCE(("parsedData"->\'job_applied\'->>\'fitScore\')::numeric, "fitScore")',
      applicationDate: '"applicationDate"',
      status: 'status',
      lastUpdate: '"updatedAt"',
    };
    const sortColumnParam = searchParams.get('sortColumn') || 'fitScore';
    const sortDirectionParam = (searchParams.get('sortDirection') || 'desc').toLowerCase();
    const sortColumn = allowedSortColumns[sortColumnParam as keyof typeof allowedSortColumns] || 'COALESCE(("parsedData"->\'job_applied\'->>\'fitScore\')::numeric, "fitScore")';
    const sortDirection = sortDirectionParam === 'asc' ? 'ASC' : 'DESC';

    // Handle NULL values in sorting - for fitScore, put NULL values first when ascending, last when descending
    let sortClause = `${sortColumn} ${sortDirection}`;

    // Handle fitScore sorting specifically to include NULL handling
    if (sortColumnParam === 'fitScore') {
      if (sortDirection === 'ASC') {
        sortClause = `COALESCE(("parsedData"->'job_applied'->>'fitScore')::numeric, "fitScore") ${sortDirection} NULLS FIRST`;
      } else {
        sortClause = `COALESCE(("parsedData"->'job_applied'->>'fitScore')::numeric, "fitScore") ${sortDirection} NULLS LAST`;
      }
    }

    // Only prioritize pinned applicants if showPinSection is enabled
    // This must come AFTER the fitScore handling to ensure pinned applicants are always on top
    const showPinSection = searchParams.get('showPinSection');
    if (showPinSection === 'true') {
      // Use a placeholder for the table alias which will be replaced based on the type of query
      sortClause = `__TABLE_ALIAS__."isPinned" DESC, __TABLE_ALIAS__."pinnedAt" DESC NULLS LAST, ${sortClause}`;
    }

    // Search term
    const searchTerm = searchParams.get('searchTerm') || '';

    // Filter by type (applied, matched, or all)
    const type = searchParams.get('type') || 'applied';

    let client;
    try {
      client = await getPool().connect();
    } catch (connectionError: any) {
      console.error(`[Position Applicants API] Failed to connect to database:`, connectionError);
      return NextResponse.json({
        message: 'Database connection error',
        error: connectionError.message
      }, { status: 500 });
    }

    try {
      // First, verify the position exists
      const positionCheck = await client.query('SELECT id, title FROM "Position" WHERE id = $1', [positionId]);
      if (positionCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Position not found' }, { status: 404 });
      }

      // For hiring managers, verify they are assigned as an interviewer for this position
      const isHiringManager = session.user.role === 'Hiring Manager';
      if (isHiringManager) {
        // Check if user has permission to view all applicants (overrides system setting)
        const { hasPermission } = await import('@/lib/permissions');
        const hasViewAllPermission = hasPermission(session.user, 'APPLICANTS_VIEW_ALL');

        if (!hasViewAllPermission) {
          // Check system setting to see if restriction is enabled
          const { getSystemSetting } = await import('@/lib/systemSettings');
          const restrictSetting = await getSystemSetting('hiringManagerRestrictToAssignedPositions');
          const shouldRestrict = restrictSetting !== 'false'; // Default to true (restrict) if not set

          if (shouldRestrict) {
            const interviewerCheck = await client.query(
              'SELECT id FROM "PositionInterviewer" WHERE "positionId" = $1 AND "userId" = $2',
              [positionId, session.user.id]
            );
            if (interviewerCheck.rows.length === 0) {
              return NextResponse.json({ error: 'Forbidden: You are not assigned as an interviewer for this position' }, { status: 403 });
            }
          }
        }
        // If hasViewAllPermission is true, no restriction is applied
      }



      // Build the query with proper ORDER BY clause
      let baseQuery = '';

      if (type === 'applied') {
        // Only applicants who applied to this position
        baseQuery = `
            SELECT 
              c.*, 
              rs.name as "status",
              p.id as "positionId", 
              p.title as "positionTitle", 
              p.department as "positionDepartment", 
              p."positionLevel" as "positionLevel",
              r.id as "recruiterId", 
              r.name as "recruiterName", r."avatarUrl" as "recruiterAvatarUrl",
              'applied' as association_type,
              COALESCE(th_data.history, '[]'::json) as "transitionHistory",
              COALESCE(jm_data.jobMatches, '[]'::json) as "jobMatches"
            FROM "applicant" c
            LEFT JOIN "Position" p ON c."positionId" = p.id
            LEFT JOIN "User" r ON c."recruiterId" = r.id
            LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
            LEFT JOIN LATERAL (
              SELECT json_agg(
                json_build_object(
                  'id', th.id, 'date', th.date, 'stage', th.stage, 'notes', th.notes
                ) ORDER BY th.date DESC
              ) AS history
              FROM "TransitionRecord" th
              WHERE th."applicantId" = c.id
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
              WHERE jm."applicantId" = c.id
            ) AS jm_data ON true
            WHERE c."positionId" = $1
            AND ($2 = '' OR c.name ILIKE $3 OR c.email ILIKE $3)
            ORDER BY SORT_COLUMN_PLACEHOLDER SORT_DIRECTION_PLACEHOLDER
            LIMIT $4 OFFSET $5;
          `;
      } else if (type === 'matched') {
        // Only applicants who have job matches but didn't apply
        baseQuery = `
            SELECT 
              c.*, 
              rs.name as "status",
              p.id as "positionId", 
              p.title as "positionTitle", 
              p.department as "positionDepartment", 
              p."positionLevel" as "positionLevel",
              r.id as "recruiterId", 
              r.name as "recruiterName", r."avatarUrl" as "recruiterAvatarUrl",
              'matched' as association_type,
              COALESCE(th_data.history, '[]'::json) as "transitionHistory",
              COALESCE(jm_data.jobMatches, '[]'::json) as "jobMatches"
            FROM "applicant" c
            LEFT JOIN "Position" p ON c."positionId" = p.id
            LEFT JOIN "User" r ON c."recruiterId" = r.id
            LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
            LEFT JOIN LATERAL (
              SELECT json_agg(
                json_build_object(
                  'id', th.id, 'date', th.date, 'stage', th.stage, 'notes', th.notes
                ) ORDER BY th.date DESC
              ) AS history
              FROM "TransitionRecord" th
              WHERE th."applicantId" = c.id
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
              WHERE jm."applicantId" = c.id
            ) AS jm_data ON true
            WHERE (c."positionId" IS NULL OR c."positionId" != $1)
            AND EXISTS (
              SELECT 1 FROM "JobMatch" jm 
              WHERE jm."applicantId" = c.id AND jm."jobId" = $1
            )
            AND ($2 = '' OR c.name ILIKE $3 OR c.email ILIKE $3)
            ORDER BY SORT_COLUMN_PLACEHOLDER SORT_DIRECTION_PLACEHOLDER
            LIMIT $4 OFFSET $5;
          `;
      } else {
        // All applicants (applied + matched)
        baseQuery = `
            WITH applied_applicants AS (
              SELECT 
                c.*, 
                rs.name as "status",
                p.id as "positionId", 
                p.title as "positionTitle", 
                p.department as "positionDepartment", 
                p."positionLevel" as "positionLevel",
                r.id as "recruiterId", 
                r.name as "recruiterName", r."avatarUrl" as "recruiterAvatarUrl",
                'applied' as association_type,
                COALESCE(th_data.history, '[]'::json) as "transitionHistory",
                COALESCE(jm_data.jobMatches, '[]'::json) as "jobMatches"
              FROM "applicant" c
              LEFT JOIN "Position" p ON c."positionId" = p.id
              LEFT JOIN "User" r ON c."recruiterId" = r.id
              LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
              LEFT JOIN LATERAL (
                SELECT json_agg(
                  json_build_object(
                    'id', th.id, 'date', th.date, 'stage', th.stage, 'notes', th.notes
                  ) ORDER BY th.date DESC
                ) AS history
                FROM "TransitionRecord" th
                WHERE th."applicantId" = c.id
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
                WHERE jm."applicantId" = c.id
              ) AS jm_data ON true
              WHERE c."positionId" = $1
              AND ($2 = '' OR c.name ILIKE $3 OR c.email ILIKE $3)
            ),
            matched_applicants AS (
              SELECT 
                c.*, 
                rs.name as "status",
                p.id as "positionId", 
                p.title as "positionTitle", 
                p.department as "positionDepartment", 
                p."positionLevel" as "positionLevel",
                r.id as "recruiterId", 
                r.name as "recruiterName", r."avatarUrl" as "recruiterAvatarUrl",
                'matched' as association_type,
                COALESCE(th_data.history, '[]'::json) as "transitionHistory",
                COALESCE(jm_data.jobMatches, '[]'::json) as "jobMatches"
              FROM "applicant" c
              LEFT JOIN "Position" p ON c."positionId" = p.id
              LEFT JOIN "User" r ON c."recruiterId" = r.id
              LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
              LEFT JOIN LATERAL (
                SELECT json_agg(
                  json_build_object(
                    'id', th.id, 'date', th.date, 'stage', th.stage, 'notes', th.notes
                  ) ORDER BY th.date DESC
                ) AS history
                FROM "TransitionRecord" th
                WHERE th."applicantId" = c.id
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
                WHERE jm."applicantId" = c.id
              ) AS jm_data ON true
              WHERE (c."positionId" IS NULL OR c."positionId" != $1)
              AND EXISTS (
                SELECT 1 FROM "JobMatch" jm 
                WHERE jm."applicantId" = c.id AND jm."jobId" = $1
              )
              AND ($2 = '' OR c.name ILIKE $3 OR c.email ILIKE $3)
            )
            SELECT * FROM (
              SELECT *, 1 as sort_order FROM applied_applicants
              UNION ALL
              SELECT *, 2 as sort_order FROM matched_applicants
            ) combined_results
            ORDER BY sort_order, SORT_COLUMN_PLACEHOLDER SORT_DIRECTION_PLACEHOLDER
            LIMIT $4 OFFSET $5;
          `;
      }

      const applicantsQuery = baseQuery
        .replace('SORT_COLUMN_PLACEHOLDER SORT_DIRECTION_PLACEHOLDER', sortClause)
        .replace(/__TABLE_ALIAS__\./g, type === 'all' ? 'combined_results.' : 'c.');

      // Count query for total
      let countQuery = '';

      if (type === 'applied') {
        countQuery = `
           SELECT COUNT(*) as total
           FROM "applicant" c
           WHERE c."positionId" = $1
           AND ($2 = '' OR c.name ILIKE $3 OR c.email ILIKE $3);
         `;
      } else if (type === 'matched') {
        countQuery = `
           SELECT COUNT(*) as total
           FROM "applicant" c
           WHERE (c."positionId" IS NULL OR c."positionId" != $1)
           AND EXISTS (
             SELECT 1 FROM "JobMatch" jm 
             WHERE jm."applicantId" = c.id AND jm."jobId" = $1
           )
           AND ($2 = '' OR c.name ILIKE $3 OR c.email ILIKE $3);
         `;
      } else {
        countQuery = `
           WITH applied_applicants AS (
             SELECT c.id
             FROM "applicant" c
             WHERE c."positionId" = $1
             AND ($2 = '' OR c.name ILIKE $3 OR c.email ILIKE $3)
           ),
           matched_applicants AS (
             SELECT c.id
             FROM "applicant" c
             WHERE (c."positionId" IS NULL OR c."positionId" != $1)
             AND EXISTS (
               SELECT 1 FROM "JobMatch" jm 
               WHERE jm."applicantId" = c.id AND jm."jobId" = $1
             )
             AND ($2 = '' OR c.name ILIKE $3 OR c.email ILIKE $3)
           )
           SELECT (SELECT COUNT(*) FROM applied_applicants) + (SELECT COUNT(*) FROM matched_applicants) as total;
         `;
      }

      const searchPattern = `%${searchTerm}%`;
      const queryParams = [positionId, searchTerm, searchPattern, limit, offset];
      const countParams = [positionId, searchTerm, searchPattern];

      const [applicantsResult, countResult] = await Promise.all([
        client.query(applicantsQuery, queryParams),
        client.query(countQuery, countParams)
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const applicants = applicantsResult.rows.map((row: any) => {
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
        if (row.parsedData && typeof row.parsedData === 'object' && 'job_applied' in row.parsedData) {
          const jobApplied = (row.parsedData as any).job_applied;
          if (jobApplied && typeof jobApplied === 'object' && 'fitScore' in jobApplied) {
            fitScore = jobApplied.fitScore || fitScore;
          }
        }

        // Determine association type
        let associationType = row.association_type;
        if (associationType === 'applied') {
          // Check if they also have job matches
          const hasJobMatch = row.jobMatches && row.jobMatches.some((match: any) => match.jobId === positionId);
          if (hasJobMatch) {
            associationType = 'applied_and_matched';
          }
        } else if (associationType === 'matched') {
          // Double-check that they don't actually have this position as their applied position
          if (row.positionId === positionId) {
            associationType = 'applied_and_matched';
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
          fitScore: normalizeFitScore(fitScore),
          statusId: row.statusId,
          status: row.status,
          applicationDate: row.applicationDate ? row.applicationDate.toISOString() : new Date().toISOString(),
          recruiter: row.recruiterId ? {
            id: row.recruiterId,
            name: row.recruiterName,
            avatarUrl: row.recruiterAvatarUrl || null,
            email: null
          } : null,
          expectedSalary: row.expectedSalary,
          createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
          transitionHistory: row.transitionHistory || [],
          jobMatches: row.jobMatches || [],
          associationType: associationType,
          isPinned: row.isPinned || false,
          pinnedAt: row.pinnedAt ? row.pinnedAt.toISOString() : null,
        };
      });

      return NextResponse.json({
        data: applicants,
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
    } finally {
      if (client) {
        client.release();
      }
    }
  } catch (error: any) {
    console.error('Error fetching position applicants:', error);

    // Log additional details for debugging
    const { id: positionId } = await params;
    console.error('Position ID:', positionId);
    console.error('Search params:', Object.fromEntries(new URL(request.url).searchParams));
    console.error('Error stack:', error.stack);

    return NextResponse.json({
      message: 'Error fetching position applicants',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      positionId: positionId,
      searchParams: Object.fromEntries(new URL(request.url).searchParams)
    }, { status: 500 });
  }
}
