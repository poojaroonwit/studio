export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { handleCors } from '@/lib/cors';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const headers = handleCors(req);
  
  try {
    console.log('[Test DB] Testing database connection...');
    
    // Test basic connection
    const connectionTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('[Test DB] Connection test result:', connectionTest);
    
    // Test if Candidate table exists and is accessible
    const candidateCount = await prisma.candidate.count();
    console.log('[Test DB] Candidate table accessible, count:', candidateCount);
    
    // Test if LogEntry table exists and is accessible
    try {
      const logEntryCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "LogEntry"`;
      console.log('[Test DB] LogEntry table accessible, count:', logEntryCount);
    } catch (logError) {
      console.error('[Test DB] LogEntry table error:', logError);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Database connection test successful',
        connectionTest,
        candidateCount,
        timestamp: new Date().toISOString()
      }
    }, { headers });
    
  } catch (error) {
    console.error('[Test DB] Database test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500, headers });
  }
}
