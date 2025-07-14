import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

console.log('[POSITIONS/SIMPLE] Simple positions module loaded');

export async function GET() {
  console.log('[POSITIONS/SIMPLE] ===== SIMPLE POSITIONS ENDPOINT CALLED =====');
  
  try {
    console.log('[POSITIONS/SIMPLE] Getting database pool...');
    const pool = getPool();
    console.log('[POSITIONS/SIMPLE] Database pool obtained');
    
    const result = await pool.query('SELECT id, title, department FROM "Position" LIMIT 5');
    
    const positions = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      department: row.department
    }));
    
    console.log('[POSITIONS/SIMPLE] Returning response');
    return NextResponse.json({ 
      data: positions,
      count: positions.length,
      message: 'Simple positions query successful'
    }, { status: 200 });
    
  } catch (error) {
    console.error('[POSITIONS/SIMPLE] Error:', error);
    console.error('[POSITIONS/SIMPLE] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : 'No stack',
      name: error instanceof Error ? error.name : 'Unknown'
    });
    
    return NextResponse.json({ 
      message: 'Simple positions query failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 