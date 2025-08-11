import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// Force dynamic rendering to prevent static generation timeout
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = getPool();
    
    const result = await pool.query('SELECT id, title, department FROM "Position" LIMIT 5');
    
    const positions = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      department: row.department
    }));
    
    return NextResponse.json({ 
      data: positions,
      count: positions.length,
      message: 'Simple positions query successful'
    }, { status: 200 });
    
  } catch (error) {
    
    return NextResponse.json({ 
      message: 'Simple positions query failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 