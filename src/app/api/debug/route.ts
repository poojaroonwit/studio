import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    console.log('[DEBUG] Testing database connection and session...');
    
    // Test basic database connection
    const pool = getPool();
    const client = await pool.connect();
    
    // Test simple query
    const simpleResult = await client.query('SELECT NOW() as current_time');
    console.log('[DEBUG] Simple query result:', simpleResult.rows[0]);
    
    // Test candidates table
    let candidatesResult;
    try {
      candidatesResult = await client.query('SELECT COUNT(*) as count FROM "Candidate"');
      console.log('[DEBUG] Candidates count:', candidatesResult.rows[0].count);
    } catch (error) {
      console.error('[DEBUG] Candidates query error:', error);
      candidatesResult = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    // Test positions table
    let positionsResult;
    try {
      positionsResult = await client.query('SELECT COUNT(*) as count FROM "Position"');
      console.log('[DEBUG] Positions count:', positionsResult.rows[0].count);
    } catch (error) {
      console.error('[DEBUG] Positions query error:', error);
      positionsResult = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    // Test session
    let session;
    try {
      session = await getServerSession(authOptions);
      console.log('[DEBUG] Session:', session ? 'exists' : 'null');
      if (session) {
        console.log('[DEBUG] Session user ID:', session.user?.id);
        console.log('[DEBUG] Session user role:', session.user?.role);
        console.log('[DEBUG] Session user permissions:', session.user?.modulePermissions);
      }
    } catch (error) {
      console.error('[DEBUG] Session error:', error);
      session = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    // Test the exact query from candidates endpoint
    let candidatesComplexQuery;
    try {
      const candidatesComplexQuery = `
        SELECT c.*, p.id as "positionId", p.title as "positionTitle", p.department as "positionDepartment", p.positionLevel as "positionLevel",
               r.id as "recruiterId", r.name as "recruiterName"
        FROM "Candidate" c
        LEFT JOIN "Position" p ON c."positionId" = p.id
        LEFT JOIN "User" r ON c."recruiterId" = r.id
        ORDER BY c."applicationDate" DESC
        LIMIT 20 OFFSET 0;
      `;
      const complexResult = await client.query(candidatesComplexQuery);
      console.log('[DEBUG] Complex candidates query result count:', complexResult.rows.length);
    } catch (error) {
      console.error('[DEBUG] Complex candidates query error:', error);
      candidatesComplexQuery = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
    
    client.release();
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      database: {
        connection: 'success',
        currentTime: simpleResult.rows[0].current_time,
        candidates: candidatesResult,
        positions: positionsResult,
        complexCandidatesQuery: candidatesComplexQuery
      },
      session: session
    });
    
  } catch (error) {
    console.error('[DEBUG] General error:', error);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 