import { NextRequest, NextResponse } from 'next/server';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Simple helper for session and permission checks
async function requireSessionAndPermission(requiredPermission: string, request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }
  if (!hasPermission(session.user, requiredPermission)) {
    return { error: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}

// Simple score grade calculation - using 0-100 scale to match client-side
function getScoreGrade(score: number | null): string {
  if (score === null || score === undefined) return 'no-score';

  // Normalize score to 0-100 range
  let normalizedScore = score;
  if (score >= 0 && score <= 1) {
    normalizedScore = Math.round(score * 100);
  } else {
    normalizedScore = Math.round(score);
  }

  // Check if score is within valid range
  if (normalizedScore < 0 || normalizedScore > 100) {
    return 'no-score';
  }

  if (normalizedScore >= 81) return 'A';
  if (normalizedScore >= 61) return 'B';
  if (normalizedScore >= 41) return 'C';
  if (normalizedScore >= 21) return 'D';
  return 'E';
}

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireSessionAndPermission('CANDIDATES_VIEW', request);
    if (error) return error;

    const { searchParams } = new URL(request.url);

    // Simple filter building (supporting comma-separated multi-select values)
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    const appendInClause = (column: string, raw: string | null, cast: 'int' | 'text' = 'text') => {
      if (!raw) return;
      const values = raw.split(',').map(v => v.trim()).filter(v => v.length > 0);
      if (values.length === 0) return;
      const placeholders: string[] = [];
      for (const v of values) {
        placeholders.push(`$${paramIndex++}`);
        // Treat UUIDs and text values as strings; only cast to number when explicitly needed
        queryParams.push(cast === 'int' ? Number(v) : v);
      }
      whereClauses.push(`${column} IN (${placeholders.join(', ')})`);
    };

    // All these IDs are UUIDs in the schema; pass as text parameters
    appendInClause('c."positionId"', searchParams.get('positionId'), 'text');

    // Handle status filter - support both status names and status IDs
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const statuses = statusParam.split(',').map(s => s.trim()).filter(s => s !== '');

      if (statuses.length > 0) {
        // Check if these look like UUIDs or status names
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        const uuidStatuses = statuses.filter(s => isUUID(s));
        const nameStatuses = statuses.filter(s => !isUUID(s));

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

    // Handle recruiter filter (supports multiple recruiters, 'unassigned', and 'select-all')
    const recruiterIdParam = searchParams.get('recruiterId');
    if (recruiterIdParam) {
      const recruiterIds = recruiterIdParam.split(',').map(id => id.trim());

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

    // Handle source filter (supports multiple sources, 'unassigned', and 'select-all')
    const sourceIdParam = searchParams.get('sourceId');
    if (sourceIdParam) {
      const sourceIds = sourceIdParam.split(',').map(id => id.trim()).filter(id => id !== '');

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

    // Handle fit score filters - same logic as main candidates API
    const minAppliedJobFitScore = searchParams.get('minAppliedJobFitScore');
    const maxAppliedJobFitScore = searchParams.get('maxAppliedJobFitScore');
    const includeNoScoreInApplied = searchParams.get('includeNoScoreInApplied') === 'true';

    if (minAppliedJobFitScore !== null || maxAppliedJobFitScore !== null) {
      const minScore = minAppliedJobFitScore ? parseFloat(minAppliedJobFitScore) : undefined;
      const maxScore = maxAppliedJobFitScore ? parseFloat(maxAppliedJobFitScore) : undefined;

      // Check if this is the "no-score" case (both min and max are -1)
      if (minScore === -1 && maxScore === -1) {
        // Special case: filter for candidates with no fit score
        whereClauses.push(`(c."fitScore" IS NULL OR c."fitScore" = 0)`);
      } else if (includeNoScoreInApplied) {
        // Both regular grades and no-score selected - create OR condition
        const regularScoreConditions: string[] = [];

        if (minScore !== undefined && minScore !== -1) {
          // Database stores scores in decimal format (0-1), so convert percentage values to decimal
          // If filter value is > 1, assume it's percentage (0-100) and convert to decimal (0-1)
          // If filter value is <= 1, assume it's already decimal and use as-is
          const filterValue = minScore > 1 ? minScore / 100 : minScore;
          regularScoreConditions.push(`c."fitScore" >= $${paramIndex++}`);
          queryParams.push(filterValue);
        }

        if (maxScore !== undefined && maxScore !== -1) {
          // Database stores scores in decimal format (0-1), so convert percentage values to decimal
          const filterValue = maxScore > 1 ? maxScore / 100 : maxScore;
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
        if (minScore !== undefined && minScore !== -1) {
          // Database stores scores in decimal format (0-1), so convert percentage values to decimal
          // If filter value is > 1, assume it's percentage (0-100) and convert to decimal (0-1)
          // If filter value is <= 1, assume it's already decimal and use as-is
          const filterValue = minScore > 1 ? minScore / 100 : minScore;
          whereClauses.push(`c."fitScore" >= $${paramIndex++}`);
          queryParams.push(filterValue);
        }
        if (maxScore !== undefined && maxScore !== -1) {
          // Database stores scores in decimal format (0-1), so convert percentage values to decimal
          const filterValue = maxScore > 1 ? maxScore / 100 : maxScore;
          whereClauses.push(`c."fitScore" <= $${paramIndex++}`);
          queryParams.push(filterValue);
        }
      }
    }

    // Handle application date filters
    const applicationDateStart = searchParams.get('applicationDateStart');
    const applicationDateEnd = searchParams.get('applicationDateEnd');

    if (applicationDateStart) {
      whereClauses.push(`c."applicationDate" >= $${paramIndex++}`);
      queryParams.push(new Date(applicationDateStart));
    }

    if (applicationDateEnd) {
      whereClauses.push(`c."applicationDate" <= $${paramIndex++}`);
      queryParams.push(new Date(applicationDateEnd));
    }

    // Handle experience years filters
    const minExperienceYears = searchParams.get('minExperienceYears');
    const maxExperienceYears = searchParams.get('maxExperienceYears');

    if (minExperienceYears !== null) {
      const minExp = parseInt(minExperienceYears, 10);
      if (minExp === -1) {
        // No experience filter
        whereClauses.push(`(c."parsedData"->>'experience' IS NULL OR c."parsedData"->>'experience' = '[]' OR c."parsedData"->>'experience' = '')`);
      } else {
        // Include candidates with no experience data OR candidates with experience >= minExp
        whereClauses.push(`(c."parsedData"->>'totalExperienceYears' IS NULL OR CAST(c."parsedData"->>'totalExperienceYears' AS DECIMAL) >= $${paramIndex++})`);
        queryParams.push(minExp);
      }
    }

    if (maxExperienceYears !== null) {
      const maxExp = parseInt(maxExperienceYears, 10);
      // Include candidates with no experience data OR candidates with experience <= maxExp
      whereClauses.push(`(c."parsedData"->>'totalExperienceYears' IS NULL OR CAST(c."parsedData"->>'totalExperienceYears' AS DECIMAL) <= $${paramIndex++})`);
      queryParams.push(maxExp);
    }

    // Handle skills filter
    const skills = searchParams.get('skills');
    if (skills) {
      const skillsList = skills.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== '');
      if (skillsList.length > 0) {
        const skillsConditions = skillsList.map((_, index) =>
          `LOWER(c."parsedData"->>'skills') LIKE $${paramIndex + index}`
        ).join(' AND ');
        whereClauses.push(`(${skillsConditions})`);
        queryParams.push(...skillsList.map(skill => `%${skill}%`));
        paramIndex += skillsList.length;
      }
    }

    // Handle location filter
    const location = searchParams.get('location');
    const locationOperator = searchParams.get('locationOperator') || 'contains';

    if (location) {
      let value = location;

      switch (locationOperator) {
        case 'is':
          whereClauses.push(`c.location = $${paramIndex++}`);
          value = location;
          break;
        case 'startsWith':
          whereClauses.push(`c.location ILIKE $${paramIndex++}`);
          value = `${location}%`;
          break;
        case 'endsWith':
          whereClauses.push(`c.location ILIKE $${paramIndex++}`);
          value = `%${location}`;
          break;
        case 'contains':
        default:
          whereClauses.push(`c.location ILIKE $${paramIndex++}`);
          value = `%${location}%`;
          break;
      }
      queryParams.push(value);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Query to get all candidates with both applied and matching scores
    const query = `
      SELECT 
        c."fitScore" as applied_score,
        COALESCE(
          (SELECT MAX(jm."fitScore") 
           FROM "JobMatch" jm 
           WHERE jm."candidateId" = c.id), 
          COALESCE(
            (SELECT MAX((match->>'fitScore')::numeric) 
             FROM jsonb_array_elements(c."parsedData"->'job_matches') as match
             WHERE (match->>'fitScore') IS NOT NULL), 
            0
          )
        ) as best_match_score
      FROM "Candidate" c
      ${whereClause}
    `;

    const client = await getPool().connect();

    try {
      const result = await client.query(query, queryParams);

      // Simple counting logic
      const appliedCounts: { [key: string]: number } = {};
      const matchingCounts: { [key: string]: number } = {};

      result.rows.forEach((row: any) => {
        const appliedGrade = getScoreGrade(row.applied_score);
        const matchingGrade = getScoreGrade(row.best_match_score);

        appliedCounts[appliedGrade] = (appliedCounts[appliedGrade] || 0) + 1;
        matchingCounts[matchingGrade] = (matchingCounts[matchingGrade] || 0) + 1;
      });

      // Convert to expected format - ensure all grades are included
      const allGrades = ['A', 'B', 'C', 'D', 'E', 'no-score'];

      const applied = allGrades.map(letter => ({
        letter,
        count: appliedCounts[letter] || 0
      }));

      const matching = allGrades.map(letter => ({
        letter,
        count: matchingCounts[letter] || 0
      }));

      return NextResponse.json({ applied, matching });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Fit score counts API error:', error);
    return NextResponse.json({
      message: 'Error fetching fit score counts',
      error: error.message
    }, { status: 500 });
  }
}
