export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function GET() {

  
  try {
    return NextResponse.json({ 
      message: 'Test endpoint working',
      timestamp: new Date().toISOString(),
      data: []
    }, { status: 200 });
  } catch (error) {
    console.error('[POSITIONS/TEST] Error:', error);
    return NextResponse.json({ 
      message: 'Test endpoint error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
