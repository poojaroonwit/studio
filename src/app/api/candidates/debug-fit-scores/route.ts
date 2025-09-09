import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.user, 'CANDIDATES_VIEW')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const client = await getPool().connect();
    
    try {
      // Check total candidates
      const totalCandidatesQuery = 'SELECT COUNT(*) as total FROM "Candidate"';
      const totalResult = await client.query(totalCandidatesQuery);
      const totalCandidates = totalResult.rows[0].total;
      
      // Check candidates with fit scores
      const fitScoreQuery = 'SELECT COUNT(*) as total FROM "Candidate" WHERE "fitScore" IS NOT NULL AND "fitScore" > 0';
      const fitScoreResult = await client.query(fitScoreQuery);
      const candidatesWithFitScores = fitScoreResult.rows[0].total;
      
      // Get sample candidates with fit scores
      const sampleQuery = 'SELECT id, name, "fitScore" FROM "Candidate" WHERE "fitScore" IS NOT NULL AND "fitScore" > 0 LIMIT 5';
      const sampleResult = await client.query(sampleQuery);
      
      // Check JobMatch table
      const jobMatchQuery = 'SELECT COUNT(*) as total FROM "JobMatch" WHERE "fitScore" IS NOT NULL AND "fitScore" > 0';
      const jobMatchResult = await client.query(jobMatchQuery);
      const jobMatchesWithFitScores = jobMatchResult.rows[0].total;
      
      // Get sample job matches
      const sampleJobMatchQuery = 'SELECT "candidateId", "fitScore" FROM "JobMatch" WHERE "fitScore" IS NOT NULL AND "fitScore" > 0 LIMIT 5';
      const sampleJobMatchResult = await client.query(sampleJobMatchQuery);
      
      return NextResponse.json({
        totalCandidates,
        candidatesWithFitScores,
        sampleCandidates: sampleResult.rows,
        jobMatchesWithFitScores,
        sampleJobMatches: sampleJobMatchResult.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error: any) {
    console.error('Debug fit scores API error:', error);
    return NextResponse.json({ 
      message: 'Error fetching debug data', 
      error: error.message
    }, { status: 500 });
  }
}