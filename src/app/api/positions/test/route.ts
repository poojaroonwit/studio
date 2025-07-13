import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[POSITIONS/TEST] Test endpoint called');
  
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