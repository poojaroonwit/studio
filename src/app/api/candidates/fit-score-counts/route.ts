import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Simple helper for session and permission checks
async function requireSessionAndPermission(requiredPermission: string, request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }
  if (
    session.user.role !== 'Admin' &&
    !session.user.modulePermissions?.includes(requiredPermission)
  ) {
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
    
    // Simple filter building
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Basic filters only
    if (searchParams.get('positionId')) {
      whereClauses.push(`c."positionId" = $${paramIndex++}`);
      queryParams.push(searchParams.get('positionId'));
    }
    
    if (searchParams.get('status')) {
      whereClauses.push(`c.status = $${paramIndex++}`);
      queryParams.push(searchParams.get('status'));
    }
    
    if (searchParams.get('recruiterId')) {
      whereClauses.push(`c."recruiterId" = $${paramIndex++}`);
      queryParams.push(searchParams.get('recruiterId'));
    }
    
    if (searchParams.get('sourceId')) {
      whereClauses.push(`c."sourceId" = $${paramIndex++}`);
      queryParams.push(searchParams.get('sourceId'));
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
