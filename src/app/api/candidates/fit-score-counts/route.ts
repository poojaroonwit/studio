import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
      `Forbidden attempt to access candidate fit score counts by ${session.user.name || session.user.email}.`,
      `API:Candidates:${requiredPermission}`,
      session.user.id
    );
    return { error: NextResponse.json({ message: `Forbidden: Insufficient permissions to ${requiredPermission.toLowerCase().replace('_', ' ')}` }, { status: 403 }) };
  }
  return { session };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { session, error } = await requireSessionAndPermission('CANDIDATES_VIEW', request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    
    // Build filters object (same as main candidates endpoint)
    const filters = {
      name: searchParams.get('name'),
      nameOperator: searchParams.get('nameOperator') || 'contains',
      email: searchParams.get('email'),
      emailOperator: searchParams.get('emailOperator') || 'contains',
      phone: searchParams.get('phone'),
      phoneOperator: searchParams.get('phoneOperator') || 'contains',
      positionId: searchParams.get('positionId'),
      status: searchParams.get('status'),
      education: searchParams.get('education'),
      minExperienceYears: searchParams.get('minExperienceYears') ? parseInt(searchParams.get('minExperienceYears')!, 10) : undefined,
      maxExperienceYears: searchParams.get('maxExperienceYears') ? parseInt(searchParams.get('maxExperienceYears')!, 10) : undefined,
      applicationDateStart: searchParams.get('applicationDateStart') ? new Date(searchParams.get('applicationDateStart')!) : undefined,
      applicationDateEnd: searchParams.get('applicationDateEnd') ? new Date(searchParams.get('applicationDateEnd')!) : undefined,
      recruiterId: searchParams.get('recruiterId'),
      sourceId: searchParams.get('sourceId'),
      location: searchParams.get('location'),
      locationOperator: searchParams.get('locationOperator') || 'contains',
      skills: searchParams.get('skills'),
      // Fit score filters
      minAppliedJobFitScore: searchParams.get('minAppliedJobFitScore') ? parseFloat(searchParams.get('minAppliedJobFitScore')!) : undefined,
      maxAppliedJobFitScore: searchParams.get('maxAppliedJobFitScore') ? parseFloat(searchParams.get('maxAppliedJobFitScore')!) : undefined,
      minMatchingJobFitScore: searchParams.get('minMatchingJobFitScore') ? parseFloat(searchParams.get('minMatchingJobFitScore')!) : undefined,
      maxMatchingJobFitScore: searchParams.get('maxMatchingJobFitScore') ? parseFloat(searchParams.get('maxMatchingJobFitScore')!) : undefined,
      includeNoScoreInApplied: searchParams.get('includeNoScoreInApplied') === 'true',
      includeNoScoreInMatching: searchParams.get('includeNoScoreInMatching') === 'true',
    };

    // Build WHERE clauses and parameters (same logic as main endpoint)
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
        whereClauses.push(`(c.status = ANY($${paramIndex++}) OR c.status = '' OR c.status = 'null')`);
        queryParams.push(regularStatuses);
      } else if (nullStatuses.length > 0) {
        whereClauses.push(`(c.status = '' OR c.status = 'null' OR c.status IS NULL)`);
      } else {
        if (regularStatuses.length === 1) {
          whereClauses.push(`c.status = $${paramIndex++}`);
          queryParams.push(regularStatuses[0]);
        } else {
          whereClauses.push(`c.status = ANY($${paramIndex++})`);
          queryParams.push(regularStatuses);
        }
      }
    }

    // Handle position filter
    if (filters.positionId) {
      const positionIds = filters.positionId.split(',').map(id => id.trim()).filter(id => id !== '');
      const hasNotApplied = positionIds.includes('not-applied');
      const regularPositions = positionIds.filter(id => id !== 'not-applied');
      
      if (hasNotApplied && regularPositions.length === 0) {
        whereClauses.push(`c."positionId" IS NULL`);
      } else if (hasNotApplied && regularPositions.length > 0) {
        if (regularPositions.length === 1) {
          whereClauses.push(`(c."positionId" = $${paramIndex++} OR c."positionId" IS NULL)`);
          queryParams.push(regularPositions[0]);
        } else {
          whereClauses.push(`(c."positionId" = ANY($${paramIndex++}) OR c."positionId" IS NULL)`);
          queryParams.push(regularPositions);
        }
      } else {
        if (regularPositions.length === 1) {
          whereClauses.push(`c."positionId" = $${paramIndex++}`);
          queryParams.push(regularPositions[0]);
        } else if (regularPositions.length > 1) {
          whereClauses.push(`c."positionId" = ANY($${paramIndex++})`);
          queryParams.push(regularPositions);
        }
      }
    }

    // Handle recruiter filter
    if (filters.recruiterId) {
      const recruiterIds = filters.recruiterId.split(',').map(id => id.trim());
      
      if (recruiterIds.includes('select-all')) {
        // Don't add any recruiter filter - show all recruiters
      } else {
        if (recruiterIds.length === 1 && recruiterIds[0] === 'unassigned') {
          whereClauses.push(`c."recruiterId" IS NULL`);
        } else if (recruiterIds.length === 1) {
          whereClauses.push(`c."recruiterId" = $${paramIndex++}`);
          queryParams.push(recruiterIds[0]);
        } else {
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

    // Auto-filter: If user can't view all candidates, only show their assigned candidates unless recruiterId is explicitly set
    const canViewAllCandidates = session.user.role === 'Admin' || 
                                 session.user.modulePermissions?.includes('USERS_MANAGE') || 
                                 session.user.modulePermissions?.includes('CANDIDATES_VIEW');
    const recruiterIdFromFilter = filters.recruiterId;
    if (!canViewAllCandidates && !recruiterIdFromFilter) {
      whereClauses.push(`c."recruiterId" = $${paramIndex++}`);
      queryParams.push(session.user.id);
    }

    // Handle source filter
    if (filters.sourceId) {
      const sourceIds = filters.sourceId.split(',').map(id => id.trim()).filter(id => id !== '');
      
      if (sourceIds.includes('select-all')) {
        // Don't add any source filter - show all sources
      } else {
        const hasUnassigned = sourceIds.includes('unassigned');
        const regularSources = sourceIds.filter(id => id !== 'unassigned');
        
        if (hasUnassigned && regularSources.length === 0) {
          whereClauses.push(`c."sourceId" IS NULL`);
        } else if (hasUnassigned && regularSources.length > 0) {
          if (regularSources.length === 1) {
            whereClauses.push(`(c."sourceId" = $${paramIndex++} OR c."sourceId" IS NULL)`);
            queryParams.push(regularSources[0]);
          } else {
            whereClauses.push(`(c."sourceId" = ANY($${paramIndex++}) OR c."sourceId" IS NULL)`);
            queryParams.push(regularSources);
          }
        } else {
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

    // Handle experience filters
    if (filters.minExperienceYears !== undefined) {
      if (filters.minExperienceYears === -1) {
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

    // Note: We do NOT include fit score filters in the WHERE clause to prevent circular dependency
    // The fit score counts API should return counts for ALL candidates based on other filters only
    // The client-side logic will handle filtering the counts based on the current fit score filter state

    // Build the WHERE clause
    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const client = await getPool().connect();
    try {
      // Efficient fit score count queries
      const appliedFitScoreCountsQuery = `
        SELECT 
          CASE 
            WHEN c."fitScore" IS NULL OR c."fitScore" = 0 THEN 'no-score'
            WHEN c."fitScore" >= 0.9 THEN 'A'
            WHEN c."fitScore" >= 0.8 THEN 'B'
            WHEN c."fitScore" >= 0.7 THEN 'C'
            WHEN c."fitScore" >= 0.6 THEN 'D'
            ELSE 'E'
          END as grade,
          COUNT(*) as count
        FROM "Candidate" c
        ${whereClause}
        GROUP BY 
          CASE 
            WHEN c."fitScore" IS NULL OR c."fitScore" = 0 THEN 'no-score'
            WHEN c."fitScore" >= 0.9 THEN 'A'
            WHEN c."fitScore" >= 0.8 THEN 'B'
            WHEN c."fitScore" >= 0.7 THEN 'C'
            WHEN c."fitScore" >= 0.6 THEN 'D'
            ELSE 'E'
          END
        ORDER BY grade
      `;

      const matchingFitScoreCountsQuery = `
        SELECT 
          CASE 
            WHEN best_match_score IS NULL OR best_match_score = 0 THEN 'no-score'
            WHEN best_match_score >= 0.9 THEN 'A'
            WHEN best_match_score >= 0.8 THEN 'B'
            WHEN best_match_score >= 0.7 THEN 'C'
            WHEN best_match_score >= 0.6 THEN 'D'
            ELSE 'E'
          END as grade,
          COUNT(*) as count
        FROM (
          SELECT 
            c.id,
            GREATEST(
              COALESCE(c."fitScore", 0),
              COALESCE((
                SELECT MAX(CAST(job_match->>'fitScore' AS DECIMAL))
                FROM jsonb_array_elements(c."parsedData"->'job_matches') AS job_match
                WHERE job_match->>'fitScore' IS NOT NULL
              ), 0),
              COALESCE((
                SELECT MAX(jm."fitScore")
                FROM "JobMatch" jm
                WHERE jm."candidateId" = c.id
              ), 0)
            ) as best_match_score
          FROM "Candidate" c
          ${whereClause}
        ) as candidate_scores
        GROUP BY 
          CASE 
            WHEN best_match_score IS NULL OR best_match_score = 0 THEN 'no-score'
            WHEN best_match_score >= 0.9 THEN 'A'
            WHEN best_match_score >= 0.8 THEN 'B'
            WHEN best_match_score >= 0.7 THEN 'C'
            WHEN best_match_score >= 0.6 THEN 'D'
            ELSE 'E'
          END
        ORDER BY grade
      `;

      // Execute both queries in parallel
      const [appliedResult, matchingResult] = await Promise.all([
        client.query(appliedFitScoreCountsQuery, queryParams),
        client.query(matchingFitScoreCountsQuery, queryParams)
      ]);

      // Transform results to expected format
      const appliedCounts = appliedResult.rows.map(row => ({
        letter: row.grade,
        count: parseInt(row.count)
      }));

      const matchingCounts = matchingResult.rows.map(row => ({
        letter: row.grade,
        count: parseInt(row.count)
      }));

      const responseTime = Date.now() - startTime;

      return NextResponse.json({
        applied: appliedCounts,
        matching: matchingCounts,
        responseTime: `${responseTime}ms`
      }, {
        headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
          'X-Response-Time': `${responseTime}ms`
        }
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({ 
      message: 'Error fetching fit score counts', 
      error: error.message,
      responseTime: `${responseTime}ms`
    }, { status: 500 });
  }
}
