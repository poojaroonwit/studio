import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test basic SSE endpoint accessibility
    const testResponse = {
      status: 'success',
      message: 'SSE test connection successful',
      user: {
        id: session.user.id,
        email: session.user.email
      },
      timestamp: new Date().toISOString(),
      sseEndpoint: '/api/sse',
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      },
      recommendations: [
        'If you see this message, authentication and basic API access are working',
        'The actual SSE connection should be established at /api/sse',
        'Check browser console for any EventSource connection errors',
        'Verify network tab shows successful connection to /api/sse'
      ]
    };

    return NextResponse.json(testResponse);

  } catch (error) {
    console.error('[SSE Test Connection] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
