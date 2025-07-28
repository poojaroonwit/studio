import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';

export async function GET() {

  
  try {
    const pool = getPool();
    
    const result = await pool.query('SELECT COUNT(*) as count FROM "Position"');
    
    const count = result.rows[0]?.count || 0;

    
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