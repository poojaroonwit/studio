import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view positions
    if (!hasPermission(session.user, 'POSITIONS_VIEW')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to view positions' }, { status: 403 });
    }

    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ 
        message: "Database configuration error", 
        error: "DATABASE_URL environment variable is not set" 
      }, { status: 500 });
    }

    const pool = getPool();
    
    // Simple query to test database connection
    const result = await pool.query('SELECT COUNT(*) as count FROM "Position"');
    
    return NextResponse.json({ 
      message: "Simple positions API working",
      positionCount: result.rows[0].count,
      databaseUrl: process.env.DATABASE_URL ? "Set" : "Not set"
    });
    
  } catch (error) {
    console.error('Simple positions API error:', error);
    return NextResponse.json({ 
      message: "Simple positions API error", 
      error: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
} 
