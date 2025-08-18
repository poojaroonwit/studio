import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { normalizeFitScore } from '@/lib/scoreUtils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const positionId = params.id;
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
      fitScore: '"fitScore"',
      applicationDate: '"applicationDate"',
      status: 'status',
      lastUpdate: '"updatedAt"',
    };
    const sortColumnParam = searchParams.get('sortColumn') || 'applicationDate';
    const sortDirectionParam = (searchParams.get('sortDirection') || 'desc').toLowerCase();
    const sortColumn = allowedSortColumns[sortColumnParam as keyof typeof allowedSortColumns] || '"applicationDate"';
    const sortDirection = sortDirectionParam === 'asc' ? 'ASC' : 'DESC';

    // Search term
    const searchTerm = searchParams.get('searchTerm') || '';
    
    // Filter by type (applied, matched, or all)
    const type = searchParams.get('type') || 'all';

    const client = await getPool().connect();
    try {
      // First, verify the position exists
      const positionCheck = await client.query('SELECT id, title FROM "Position" WHERE id = $1', [positionId]);
      if (positionCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Position not found' }, { status: 404 });
      }

             // Build the query with proper ORDER BY clause
       const baseQuery = `
          WITH applied_candidates AS (
            -- Candidates who applied to this position
            SELECT 
              c.*, 
              p.id as "positionId", 
              p.title as "positionTitle", 
              p.department as "positionDepartment", 
              p."positionLevel" as "positionLevel",
              r.id as "recruiterId", 
              r.name as "recruiterName",
              'applied' as association_type,
              COALESCE(th_data.history, '[]'::json) as "transitionHistory",
              COALESCE(jm_data.jobMatches, '[]'::json) as "jobMatches"
            FROM "Candidate" c
            LEFT JOIN "Position" p ON c."positionId" = p.id
            LEFT JOIN "User" r ON c."recruiterId" = r.id
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
            WHERE c."positionId" = $1
            AND ($6 = 'all' OR $6 = 'applied')
          ),
          matched_candidates AS (
            -- Candidates who have job matches for this position but didn't apply
            SELECT 
              c.*, 
              p.id as "positionId", 
              p.title as "positionTitle", 
              p.department as "positionDepartment", 
              p."positionLevel" as "positionLevel",
              r.id as "recruiterId", 
              r.name as "recruiterName",
              'matched' as association_type,
              COALESCE(th_data.history, '[]'::json) as "transitionHistory",
              COALESCE(jm_data.jobMatches, '[]'::json) as "jobMatches"
            FROM "Candidate" c
            LEFT JOIN "Position" p ON c."positionId" = p.id
            LEFT JOIN "User" r ON c."recruiterId" = r.id
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
            WHERE (c."positionId" IS NULL OR c."positionId" != $1)
              AND EXISTS (
                SELECT 1 FROM "JobMatch" jm 
                WHERE jm."candidateId" = c.id AND jm."jobId" = $1
              )
          ),
          all_candidates AS (
            -- First get all applied candidates
            SELECT *, 1 as sort_order, association_type FROM applied_candidates
            UNION ALL
            -- Then append matched candidates (excluding those who already applied)
            SELECT mc.*, 2 as sort_order, mc.association_type
            FROM matched_candidates mc
            WHERE mc.id NOT IN (SELECT id FROM applied_candidates)
          )
          SELECT *
          FROM all_candidates
          WHERE ($2 = '' OR name ILIKE $3 OR email ILIKE $3)
          AND (
            $6 = 'all' OR
            ($6 = 'applied' AND association_type = 'applied') OR
            ($6 = 'matched' AND association_type = 'matched')
          )
          ORDER BY sort_order, SORT_COLUMN_PLACEHOLDER SORT_DIRECTION_PLACEHOLDER
          LIMIT $4 OFFSET $5;
        `;

       const candidatesQuery = baseQuery
         .replace('SORT_COLUMN_PLACEHOLDER', sortColumn)
         .replace('SORT_DIRECTION_PLACEHOLDER', sortDirection);

      // Count query for total
      const countQuery = `
         WITH applied_candidates AS (
           -- Candidates who applied to this position
           SELECT c.id, 'applied' as association_type
           FROM "Candidate" c
           WHERE c."positionId" = $1
           AND ($4 = 'all' OR $4 = 'applied')
         ),
         matched_candidates AS (
           -- Candidates who have job matches for this position but didn't apply
           SELECT c.id, 'matched' as association_type
           FROM "Candidate" c
           WHERE (c."positionId" IS NULL OR c."positionId" != $1)
             AND EXISTS (
               SELECT 1 FROM "JobMatch" jm 
               WHERE jm."candidateId" = c.id AND jm."jobId" = $1
             )
         ),
         all_candidates AS (
           -- First get all applied candidates
           SELECT id, association_type FROM applied_candidates
           UNION ALL
           -- Then append matched candidates (excluding those who already applied)
           SELECT mc.id, mc.association_type
           FROM matched_candidates mc
           WHERE mc.id NOT IN (SELECT id FROM applied_candidates)
         )
         SELECT COUNT(*) as total
         FROM all_candidates ac
         JOIN "Candidate" c ON c.id = ac.id
         WHERE ($2 = '' OR c.name ILIKE $3 OR c.email ILIKE $3)
         AND (
           $4 = 'all' OR
           ($4 = 'applied' AND ac.association_type = 'applied') OR
           ($4 = 'matched' AND ac.association_type = 'matched')
         );
       `;

      const searchPattern = `%${searchTerm}%`;
      const queryParams = [positionId, searchTerm, searchPattern, limit, offset, type];
      const countParams = [positionId, searchTerm, searchPattern, type];

      const [candidatesResult, countResult] = await Promise.all([
        client.query(candidatesQuery, queryParams),
        client.query(countQuery, countParams)
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
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
          associationType: associationType,
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
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error fetching position candidates:', error);
    
    // Log additional details for debugging
    console.error('Position ID:', params.id);
    console.error('Search params:', Object.fromEntries(new URL(request.url).searchParams));
    console.error('Error stack:', error.stack);
    
    return NextResponse.json({ 
      message: 'Error fetching position candidates', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      positionId: params.id,
      searchParams: Object.fromEntries(new URL(request.url).searchParams)
    }, { status: 500 });
  }
} 