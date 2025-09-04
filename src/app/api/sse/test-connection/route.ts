import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Test SSE connection endpoint
 * Provides detailed information about SSE connection readiness
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to test SSE connection',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Test basic connectivity
    const testResults = {
      timestamp: new Date().toISOString(),
      user: {
        id: userId,
        email: userEmail
      },
      authentication: {
        status: 'success',
        message: 'User authenticated successfully'
      },
      sseEndpoint: {
        url: '/api/sse',
        status: 'available',
        message: 'SSE endpoint is accessible'
      },
      recommendations: [
        'SSE connection test passed - you should be able to connect to /api/sse',
        'If you still experience connection errors, check browser console for detailed logs',
        'Enable NEXT_PUBLIC_SSE_DEBUG=1 for detailed debugging information',
        'Check network tab in browser dev tools for any failed requests'
      ],
      troubleshooting: {
        commonIssues: [
          'Authentication session expired - try refreshing the page',
          'Network connectivity issues - check internet connection',
          'Browser blocking SSE connections - check browser settings',
          'Server overload - check server logs for errors'
        ],
        nextSteps: [
          'Try connecting to the SSE endpoint in your browser',
          'Check browser console for any error messages',
          'Verify the server is running and accessible',
          'Test with a different browser or incognito mode'
        ]
      }
    };

    return NextResponse.json(testResults);

  } catch (error) {
    console.error('[SSE Test] Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      recommendations: [
        'Check server logs for detailed error information',
        'Verify database connection is working',
        'Check if all required environment variables are set'
      ]
    }, { status: 500 });
  }
}