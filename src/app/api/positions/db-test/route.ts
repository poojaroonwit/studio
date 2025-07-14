import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  console.log('[POSITIONS/DB-TEST] Database test endpoint called');
  
  try {
    console.log('[POSITIONS/DB-TEST] Getting database pool...');
    const pool = getPool();
    console.log('[POSITIONS/DB-TEST] Database pool obtained');
    
    const result = await pool.query('SELECT COUNT(*) as count FROM "Position"');
    
    const count = result.rows[0]?.count || 0;
    console.log(`[POSITIONS/DB-TEST] Position count: ${count}`);
    
    return NextResponse.json({ 
      message: 'Database test successful',
      positionCount: parseInt(count),
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error) {
    console.error('[POSITIONS/DB-TEST] Database error:', error);
    return NextResponse.json({ 
      message: 'Database test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 