import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const client = await getPool().connect();
    
    // Test basic database connection
    const result = await client.query('SELECT COUNT(*) as user_count FROM "User"');
    const userCount = result.rows[0].user_count;
    
    // Test if we can query a specific user
    const testUser = await client.query('SELECT id, email, name, role FROM "User" LIMIT 1');
    
    client.release();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      userCount,
      sampleUser: testUser.rows[0] || null
    });
  } catch (error) {
    console.error('[TEST AUTH] Database error:', error);
    return NextResponse.json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
