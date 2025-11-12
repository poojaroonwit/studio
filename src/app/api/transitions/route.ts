import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get('candidateId');

  if (!candidateId) {
    return NextResponse.json({ error: 'Missing candidateId' }, { status: 400 });
  }

  try {
    const client = await getPool().connect();
    
    try {
      // Get transitions with stage names
      const transitionsQuery = `
        SELECT 
          t.id,
          t."candidateId",
          t.stage,
          t.notes,
          t.date,
          t."actingUserId",
          u.name as "actingUserName",
          t."createdAt"
        FROM "TransitionRecord" t
        LEFT JOIN "User" u ON t."actingUserId" = u.id
        WHERE t."candidateId" = $1
        ORDER BY t.date ASC, t."createdAt" ASC
      `;
      
      const result = await client.query(transitionsQuery, [candidateId]);
      
      // Transform the data to match the expected TransitionRecord format
      const transitions = result.rows.map((row: any) => ({
        id: row.id,
        candidateId: row.candidateId,
        date: row.date || row.createdAt,
        stage: row.stage, // Use the stage field directly
        notes: row.notes,
        actingUserId: row.actingUserId,
        actingUserName: row.actingUserName,
        createdAt: row.createdAt
      }));

      return NextResponse.json(transitions);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching transitions:', error);
    return NextResponse.json({ error: 'Failed to fetch transitions' }, { status: 500 });
  }
} 
