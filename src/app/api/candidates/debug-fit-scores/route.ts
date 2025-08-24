import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const client = await getPool().connect();
    
    try {
      // Check all fit scores in the database
      const allScoresQuery = `
        SELECT "fitScore", COUNT(*) as count 
        FROM "Candidate" 
        WHERE "fitScore" IS NOT NULL 
        GROUP BY "fitScore" 
        ORDER BY "fitScore"
      `;
      const allScoresResult = await client.query(allScoresQuery);
      
      // Check scores in C range (0.41 to 0.60)
      const cRangeQuery = `
        SELECT "fitScore", COUNT(*) as count 
        FROM "Candidate" 
        WHERE "fitScore" >= 0.41 AND "fitScore" <= 0.60
        GROUP BY "fitScore" 
        ORDER BY "fitScore"
      `;
      const cRangeResult = await client.query(cRangeQuery);
      
      // Check total count in C range
      const cRangeCountQuery = `
        SELECT COUNT(*) as total 
        FROM "Candidate" 
        WHERE "fitScore" >= 0.41 AND "fitScore" <= 0.60
      `;
      const cRangeCountResult = await client.query(cRangeCountQuery);
      
      // Check total candidates
      const totalQuery = `SELECT COUNT(*) as total FROM "Candidate"`;
      const totalResult = await client.query(totalQuery);
      
      return NextResponse.json({
        allScores: allScoresResult.rows,
        cRangeScores: cRangeResult.rows,
        cRangeCount: parseInt(cRangeCountResult.rows[0].total),
        totalCandidates: parseInt(totalResult.rows[0].total)
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json({ error: 'Failed to fetch debug data' }, { status: 500 });
  }
}
