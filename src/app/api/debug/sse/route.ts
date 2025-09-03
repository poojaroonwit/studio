import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import enhancedSSEManager from '@/lib/enhanced-sse-manager';
import { getUnifiedConnectionStats } from '@/lib/unified-connection-manager';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get SSE debug information
    const sseDebugInfo = enhancedSSEManager.getDetailedDebugInfo();
    const unifiedStats = getUnifiedConnectionStats();

    // Check if SSE debug mode is enabled
    const isDebugMode = process.env.NEXT_PUBLIC_SSE_DEBUG === '1';

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      user: {
        id: session.user.id,
        email: session.user.email
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_SSE_DEBUG: isDebugMode,
        APP_PORT: process.env.APP_PORT
      },
      enhancedSSE: sseDebugInfo,
      unifiedSSE: unifiedStats,
      recommendations: [
        ...sseDebugInfo.recommendations,
        isDebugMode ? 'SSE debug mode is enabled - check browser console for detailed logs' : 'Set NEXT_PUBLIC_SSE_DEBUG=1 to enable detailed SSE logging',
        'Check server logs for any authentication or connection errors',
        'Verify the /api/sse endpoint is accessible and responding correctly'
      ]
    });

  } catch (error) {
    console.error('[SSE Debug] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
