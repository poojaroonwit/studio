import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { normalizeFitScore } from '@/lib/scoreUtils';
import { getSystemSetting } from '@/lib/systemSettings';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check if job match feature is enabled
    const jobMatchFeatureEnabled = await getSystemSetting('jobMatchFeatureEnabled');
    if (jobMatchFeatureEnabled === 'false') {
      return NextResponse.json({ 
        data: [], 
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
        message: 'Job match feature is disabled' 
      }, { status: 200 });
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

    // Filter parameters
    const hasJobMatch = searchParams.get('hasJobMatch') === 'true';
    const notApplied = searchParams.get('notApplied') === 'true';

    // Sorting
    const allowedSortColumns = {
      name: 'c.name',
      email: 'c.email',
      matchScore: 'jm."fitScore"',
      applicationDate: 'c."applicationDate"',
      status: 'c."statusId"',
      lastUpdate: 'c."updatedAt"',
    };
    const sortColumnParam = searchParams.get('sortColumn') || 'matchScore';
    const sortDirectionParam = (searchParams.get('sortDirection') || 'desc').toLowerCase();
    const sortColumn = allowedSortColumns[sortColumnParam as keyof typeof allowedSortColumns] || 'jm."fitScore"';
    const sortDirection = sortDirectionParam === 'asc' ? 'ASC' : 'DESC';

    // Search term
    const searchTerm = searchParams.get('searchTerm') || '';

    const client = await getPool().connect();
    try {
             // First, verify the position exists
       const positionCheck = await client.query('SELECT id, title FROM "Position" WHERE id = $1', [positionId]);
       if (positionCheck.rows.length === 0) {
         return NextResponse.json({ error: 'Position not found' }, { status: 404 });
       }
       
       // Check if there are any job matches for this position
       const jobMatchesCheck = await client.query('SELECT COUNT(*) as total FROM "JobMatch" WHERE "jobId" = $1', [positionId]);
   

             // Build WHERE conditions dynamically to avoid parameter binding issues
       const whereConditions = ['jm."jobId" = $1'];
       const params = [positionId];
       let paramIndex = 2;

       // Only show candidates who haven't applied to this position
       if (notApplied) {
         whereConditions.push('(c."positionId" IS NULL OR c."positionId" != $1)');
       }

       if (hasJobMatch) {
         whereConditions.push('jm."fitScore" > 0');
       }

      if (searchTerm) {
        whereConditions.push(`(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`);
        params.push(`%${searchTerm}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Query to get candidates who have job matches for this position but haven't applied
      const candidatesQuery = `
        SELECT 
          c.*, 
          rs.name as "statusName",
          p.id as "positionId", 
          p.title as "positionTitle", 
          p.department as "positionDepartment", 
          p."positionLevel" as "positionLevel",
          r.id as "recruiterId", 
          r.name as "recruiterName", r."avatarUrl" as "recruiterAvatarUrl",
          jm."fitScore" as "matchScore",
          jm."matchReasons" as "matchReasons",
          jm.id as "jobMatchId",
          COALESCE(th_data.history, '[]'::json) as "transitionHistory",
          COALESCE(jm_data.jobMatches, '[]'::json) as "jobMatches"
        FROM "Candidate" c
        INNER JOIN "JobMatch" jm ON c.id = jm."candidateId"
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
          WHERE th."candidateId" = c.id
        ) AS th_data ON true
        LEFT JOIN LATERAL (
          SELECT json_agg(
            json_build_object(
              'id', jm2.id, 'jobId', jm2."jobId", 'jobTitle', jm2."jobTitle", 'fitScore', jm2."fitScore", 
              'matchReasons', jm2."matchReasons", 'jobDescriptionSummary', jm2."job_description_summary",
              'createdAt', jm2."createdAt", 'updatedAt', jm2."updatedAt"
            ) ORDER BY jm2."fitScore" DESC
          ) AS jobMatches
          FROM "JobMatch" jm2
          WHERE jm2."candidateId" = c.id
        ) AS jm_data ON true
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${sortDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
      `;

      // Count query for total
      const countQuery = `
        SELECT COUNT(DISTINCT c.id) as total
        FROM "Candidate" c
        INNER JOIN "JobMatch" jm ON c.id = jm."candidateId"
        WHERE ${whereClause};
      `;

      // Add limit and offset to params for the main query
      const queryParams = [...params, limit, offset];

             const [candidatesResult, countResult] = await Promise.all([
         client.query(candidatesQuery, queryParams),
         client.query(countQuery, params)
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
          fitScore: normalizeFitScore(row.fitScore || 0),
          matchScore: normalizeFitScore(row.matchScore || 0),
          matchReasons: row.matchReasons || [],
          jobMatchId: row.jobMatchId,
          status: row.status,
          applicationDate: row.applicationDate ? row.applicationDate.toISOString() : new Date().toISOString(),
          recruiter: row.recruiterId ? {
            id: row.recruiterId,
            name: row.recruiterName,
            avatarUrl: row.recruiterAvatarUrl || null,
            email: null
          } : null,
          createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
          transitionHistory: row.transitionHistory || [],
          jobMatches: row.jobMatches || [],
          associationType: 'matched',
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
    console.error('Error fetching position job matches:', error);
    
    // Log additional details for debugging
    console.error('Position ID:', id);
    console.error('Search params:', Object.fromEntries(new URL(request.url).searchParams));
    console.error('Error stack:', error.stack);
    
    return NextResponse.json({ 
      message: 'Error fetching position job matches', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      positionId: id,
      searchParams: Object.fromEntries(new URL(request.url).searchParams)
    }, { status: 500 });
  }
}
