import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Performance monitoring and circuit breaker
const CACHE_DURATION = 300; // 5 minutes cache (increased from 60s)
const STALE_WHILE_REVALIDATE = 600; // 10 minutes stale-while-revalidate
const QUERY_TIMEOUT = 30000; // 30 seconds timeout
const MAX_RETRIES = 2;

// Circuit breaker for API protection
let consecutiveFailures = 0;
let lastFailureTime = 0;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_TIME = 60000; // 1 minute

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

// Circuit breaker check
function isCircuitBreakerOpen(): boolean {
  const now = Date.now();
  if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    if (now - lastFailureTime < CIRCUIT_BREAKER_RESET_TIME) {
      return true; // Circuit is open
    } else {
      // Reset circuit breaker after timeout
      consecutiveFailures = 0;
      lastFailureTime = 0;
    }
  }
  return false;
}

// Optimized query builder with parameterized queries
function buildOptimizedQueries(whereClause: string, queryParams: any[]) {
  // Create a CTE (Common Table Expression) for better performance
  const baseQuery = `
    WITH filtered_candidates AS (
      SELECT 
        c.id,
        c."fitScore",
        c."parsedData",
        COALESCE(c."fitScore", 0) as applied_score,
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
    )
  `;

  const appliedFitScoreCountsQuery = `
    ${baseQuery}
    SELECT 
      CASE 
        WHEN applied_score IS NULL OR applied_score = 0 THEN 'no-score'
        WHEN applied_score >= 0.81 THEN 'A'
        WHEN applied_score >= 0.61 THEN 'B'
        WHEN applied_score >= 0.41 THEN 'C'
        WHEN applied_score >= 0.21 THEN 'D'
        ELSE 'E'
      END as grade,
      COUNT(*) as count
    FROM filtered_candidates
    GROUP BY 
      CASE 
        WHEN applied_score IS NULL OR applied_score = 0 THEN 'no-score'
        WHEN applied_score >= 0.81 THEN 'A'
        WHEN applied_score >= 0.61 THEN 'B'
        WHEN applied_score >= 0.41 THEN 'C'
        WHEN applied_score >= 0.21 THEN 'D'
        ELSE 'E'
      END
    ORDER BY grade
  `;

  const matchingFitScoreCountsQuery = `
    ${baseQuery}
    SELECT 
      CASE 
        WHEN best_match_score IS NULL OR best_match_score = 0 THEN 'no-score'
        WHEN best_match_score >= 0.81 THEN 'A'
        WHEN best_match_score >= 0.61 THEN 'B'
        WHEN best_match_score >= 0.41 THEN 'C'
        WHEN best_match_score >= 0.21 THEN 'D'
        ELSE 'E'
      END as grade,
      COUNT(*) as count
    FROM filtered_candidates
    GROUP BY 
      CASE 
        WHEN best_match_score IS NULL OR best_match_score = 0 THEN 'no-score'
        WHEN best_match_score >= 0.81 THEN 'A'
        WHEN best_match_score >= 0.61 THEN 'B'
        WHEN best_match_score >= 0.41 THEN 'C'
        WHEN best_match_score >= 0.21 THEN 'D'
        ELSE 'E'
      END
    ORDER BY grade
  `;

  return { appliedFitScoreCountsQuery, matchingFitScoreCountsQuery };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Circuit breaker check
  if (isCircuitBreakerOpen()) {
    return NextResponse.json({ 
      message: 'Service temporarily unavailable due to high load',
      retryAfter: Math.ceil((CIRCUIT_BREAKER_RESET_TIME - (Date.now() - lastFailureTime)) / 1000)
    }, { 
      status: 503,
      headers: {
        'Retry-After': Math.ceil((CIRCUIT_BREAKER_RESET_TIME - (Date.now() - lastFailureTime)) / 1000).toString()
      }
    });
  }
  
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
      // Fit score filters - convert from percentage to decimal
      minAppliedJobFitScore: searchParams.get('minAppliedJobFitScore') ? parseFloat(searchParams.get('minAppliedJobFitScore')!) / 100 : undefined,
      maxAppliedJobFitScore: searchParams.get('maxAppliedJobFitScore') ? parseFloat(searchParams.get('maxAppliedJobFitScore')!) / 100 : undefined,
      minMatchingJobFitScore: searchParams.get('minMatchingJobFitScore') ? parseFloat(searchParams.get('minMatchingJobFitScore')!) / 100 : undefined,
      maxMatchingJobFitScore: searchParams.get('maxMatchingJobFitScore') ? parseFloat(searchParams.get('maxMatchingJobFitScore')!) / 100 : undefined,
      includeNoScoreInApplied: searchParams.get('includeNoScoreInApplied') === 'true',
      includeNoScoreInMatching: searchParams.get('includeNoScoreInMatching') === 'true',
    };

    // Build WHERE clauses and parameters (same logic as main endpoint)
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Handle name filter
    if (filters.name && filters.name.trim() !== '') {
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
    if (filters.email && filters.email.trim() !== '') {
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
    if (filters.phone && filters.phone.trim() !== '') {
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
    if (filters.location && filters.location.trim() !== '') {
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
      
      whereClauses.push(`c."parsedData"->>'location' ${operator} $${paramIndex++}`);
      queryParams.push(value);
    }

    // Handle status filter
    if (filters.status && filters.status.trim() !== '') {
      const statuses = filters.status.split(',').map(s => s.trim()).filter(s => s !== '');
      
      if (statuses.includes('select-all')) {
        // Don't add any status filter - show all statuses
      } else {
        if (statuses.length === 1) {
          whereClauses.push(`c.status = $${paramIndex++}`);
          queryParams.push(statuses[0]);
        } else {
          whereClauses.push(`c.status = ANY($${paramIndex++})`);
          queryParams.push(statuses);
        }
      }
    }

    // Handle position filter
    if (filters.positionId && filters.positionId.trim() !== '') {
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
    if (filters.recruiterId && filters.recruiterId.trim() !== '') {
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
    // For fit-score-counts API, we're more permissive to allow users to see counts for filtering purposes
    const canViewAllCandidates = session.user.role === 'Admin' || 
                                 session.user.modulePermissions?.includes('USERS_MANAGE') || 
                                 session.user.modulePermissions?.includes('CANDIDATES_VIEW');
    const recruiterIdFromFilter = filters.recruiterId;
    
    // Only apply auto-filter if user has no candidate-related permissions at all
    // This allows users with CANDIDATES_VIEW to see counts for filtering purposes
    if (!canViewAllCandidates && (!recruiterIdFromFilter || recruiterIdFromFilter.trim() === '')) {
      whereClauses.push(`c."recruiterId" = $${paramIndex++}`);
      queryParams.push(session.user.id);
    }

    // Handle source filter
    if (filters.sourceId && filters.sourceId.trim() !== '') {
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

    // Handle experience filters - make them more inclusive to avoid filtering out all candidates
    if (filters.minExperienceYears !== undefined && filters.minExperienceYears > 0) {
      if (filters.minExperienceYears === -1) {
        whereClauses.push(`(c."parsedData"->>'experience' IS NULL OR c."parsedData"->>'experience' = '[]' OR c."parsedData"->>'experience' = '')`);
      } else {
        whereClauses.push(`(c."parsedData"->>'totalExperienceYears' IS NOT NULL AND CAST(c."parsedData"->>'totalExperienceYears' AS DECIMAL) >= $${paramIndex++})`);
        queryParams.push(filters.minExperienceYears);
      }
    }
    if (filters.maxExperienceYears !== undefined && filters.maxExperienceYears < 50) {
      whereClauses.push(`(c."parsedData"->>'totalExperienceYears' IS NOT NULL AND CAST(c."parsedData"->>'totalExperienceYears' AS DECIMAL) <= $${paramIndex++})`);
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

    // Handle education filter
    if (filters.education && filters.education.trim() !== '') {
      whereClauses.push(`LOWER(c."parsedData"->>'education') LIKE $${paramIndex++}`);
      queryParams.push(`%${filters.education.toLowerCase()}%`);
    }

    // Handle skills filter
    if (filters.skills && filters.skills.trim() !== '') {
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

    // Build the final WHERE clause
    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get database connection with timeout
    const client = await getPool().connect();
    
    try {
      // Set query timeout (PostgreSQL expects milliseconds as a string)
      await client.query(`SET statement_timeout = '${QUERY_TIMEOUT}ms'`);
      
      // Build optimized queries
      const { appliedFitScoreCountsQuery, matchingFitScoreCountsQuery } = buildOptimizedQueries(whereClause, queryParams);

      // Execute both queries in parallel with retry logic
      let appliedResult: any, matchingResult: any;
      let retryCount = 0;
      
      while (retryCount <= MAX_RETRIES) {
        try {
          const queryStartTime = Date.now();
          
          [appliedResult, matchingResult] = await Promise.all([
            client.query(appliedFitScoreCountsQuery, queryParams),
            client.query(matchingFitScoreCountsQuery, queryParams)
          ]);

          const queryTime = Date.now() - queryStartTime;
          console.log(`⚡ Fit score count queries completed in ${queryTime}ms`);
          
          // Reset circuit breaker on success
          consecutiveFailures = 0;
          lastFailureTime = 0;
          break;
          
        } catch (error: any) {
          retryCount++;
          console.error(`❌ Database query error (attempt ${retryCount}):`, error);
          
          if (retryCount > MAX_RETRIES) {
            // Update circuit breaker
            consecutiveFailures++;
            lastFailureTime = Date.now();
            throw error;
          }
          
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      // Transform results to expected format
      const appliedCounts = appliedResult.rows.map((row: any) => ({
        letter: row.grade,
        count: Number(row.count) // Convert BigInt to Number
      }));

      const matchingCounts = matchingResult.rows.map((row: any) => ({
        letter: row.grade,
        count: Number(row.count) // Convert BigInt to Number
      }));

      const responseTime = Date.now() - startTime;

      // Generate cache key based on filters for better caching
      const cacheKey = Buffer.from(JSON.stringify({ filters, responseTime })).toString('base64').slice(0, 8);

      return NextResponse.json({
        applied: appliedCounts,
        matching: matchingCounts,
        responseTime: `${responseTime}ms`
      }, {
        headers: {
          'Cache-Control': `public, max-age=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
          'ETag': `"${cacheKey}"`,
          'X-Response-Time': `${responseTime}ms`,
          'X-Cache-Duration': `${CACHE_DURATION}s`,
          'X-Stale-While-Revalidate': `${STALE_WHILE_REVALIDATE}s`
        }
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Update circuit breaker on error
    consecutiveFailures++;
    lastFailureTime = Date.now();
    
    console.error('❌ Fit score counts API error:', error);
    
    return NextResponse.json({ 
      message: 'Error fetching fit score counts', 
      error: error.message,
      responseTime: `${responseTime}ms`
    }, { status: 500 });
  }
}
