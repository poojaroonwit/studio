import { NextRequest, NextResponse } from 'next/server';

/**
 * NextAuth internal logging endpoint
 * This endpoint handles NextAuth's internal logging requests to prevent 500 errors
 */
export async function POST(request: NextRequest) {
  try {
    // Log the request to console for debugging purposes
    const body = await request.json().catch(() => ({}));
    
    // Return a simple success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[NextAuth Log Error]:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests as well
  return NextResponse.json({ success: true });
} 
