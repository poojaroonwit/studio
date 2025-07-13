import { NextResponse } from 'next/server';

console.log('[DEBUG] Debug module loaded');

export async function GET() {
  console.log('[DEBUG] ===== DEBUG ENDPOINT CALLED =====');
  
  try {
    console.log('[DEBUG] Basic functionality test');
    
    // Test basic operations
    const testData = {
      message: 'Debug endpoint working',
      timestamp: new Date().toISOString(),
      test: 'success'
    };
    
    console.log('[DEBUG] Returning response');
    return NextResponse.json(testData, { status: 200 });
    
  } catch (error) {
    console.error('[DEBUG] Error in debug endpoint:', error);
    return NextResponse.json({ 
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 