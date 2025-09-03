import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Simple helper for session and permission checks
async function requireSessionAndPermission(requiredPermission: string, request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }
  if (!hasPermission(session.user, requiredPermission)) {
    return { error: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}

// Simple score grade calculation
function getScoreGrade(score: number | null): string {
  if (!score || score === 0) return 'no-score';
  if (score >= 0.81) return 'A';
  if (score >= 0.61) return 'B';
  if (score >= 0.41) return 'C';
  if (score >= 0.21) return 'D';
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
    appendInClause('c."statusId"', searchParams.get('status'), 'text');
    
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

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Simple query to get all candidates with scores
    const query = `
      SELECT 
        c."fitScore" as applied_score,
        COALESCE(c."fitScore", 0) as best_match_score
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

      // Convert to expected format
      const applied = Object.entries(appliedCounts).map(([letter, count]) => ({ letter, count }));
      const matching = Object.entries(matchingCounts).map(([letter, count]) => ({ letter, count }));

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
