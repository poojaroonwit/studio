import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
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