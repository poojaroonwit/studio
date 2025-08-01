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
    const sortColumnParam = searchParams.get('sortColumn') || 'applicationDate';
    const sortDirectionParam = (searchParams.get('sortDirection') || 'desc').toLowerCase();
    const sortColumn = allowedSortColumns[sortColumnParam as keyof typeof allowedSortColumns] || 'c."applicationDate"';
    const sortDirection = sortDirectionParam === 'asc' ? 'ASC' : 'DESC';

    // Search term
    const searchTerm = searchParams.get('searchTerm') || '';

    const client = await getPool().connect();
    try {
      // Query to get all candidates related to this position (applied OR matched)
      const candidatesQuery = `
        WITH position_candidates AS (
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
          
          UNION
          
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
          WHERE c."positionId" != $1 
            AND EXISTS (
              SELECT 1 FROM "JobMatch" jm 
              WHERE jm."candidateId" = c.id AND jm."jobId" = $1
            )
        )
        SELECT DISTINCT ON (id) *
        FROM position_candidates
        WHERE ($2 = '' OR name ILIKE $3 OR email ILIKE $3)
        ORDER BY id, 
          CASE 
            WHEN association_type = 'applied' THEN 1 
            WHEN association_type = 'matched' THEN 2 
            ELSE 3 
          END
        LIMIT $4 OFFSET $5;
      `;

      // Count query for total
      const countQuery = `
        WITH position_candidates AS (
          -- Candidates who applied to this position
          SELECT c.id
          FROM "Candidate" c
          WHERE c."positionId" = $1
          
          UNION
          
          -- Candidates who have job matches for this position but didn't apply
          SELECT c.id
          FROM "Candidate" c
          WHERE c."positionId" != $1 
            AND EXISTS (
              SELECT 1 FROM "JobMatch" jm 
              WHERE jm."candidateId" = c.id AND jm."jobId" = $1
            )
        )
        SELECT COUNT(DISTINCT id) as total
        FROM position_candidates
        WHERE ($2 = '' OR EXISTS (
          SELECT 1 FROM "Candidate" c2 
          WHERE c2.id = position_candidates.id 
            AND (c2.name ILIKE $3 OR c2.email ILIKE $3)
        ));
      `;

      const searchPattern = `%${searchTerm}%`;
      const queryParams = [positionId, searchTerm, searchPattern, limit, offset];
      const countParams = [positionId, searchTerm, searchPattern];

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
    return NextResponse.json({ 
      message: 'Error fetching position candidates', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 