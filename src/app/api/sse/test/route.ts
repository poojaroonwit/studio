import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { checkSSEDatabaseHealth } from '@/lib/sse-db-wrapper';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({
        error: 'Authentication required',
        message: 'No valid user session found',
        timestamp: new Date().toISOString()
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;
    
    // Test database connection
    const dbHealth = await checkSSEDatabaseHealth();
    
    // Test SSE endpoint accessibility
    const testData = {
      status: 'success',
      timestamp: new Date().toISOString(),
      userId,
      database: {
        healthy: dbHealth.healthy,
        error: dbHealth.error,
        connectionTime: dbHealth.connectionTime
      },
      sse: {
        endpoint: '/api/sse',
        accessible: true,
        ready: dbHealth.healthy
      },
      recommendations: []
    };

    // Add recommendations
    if (!dbHealth.healthy) {
      testData.recommendations.push('Database connection issues detected - check database server');
      testData.recommendations.push('SSE endpoint may return 502/503 errors until database is fixed');
    } else {
      testData.recommendations.push('Database is healthy - SSE endpoint should work normally');
      testData.recommendations.push('Try connecting to /api/sse endpoint');
    }

    return new Response(JSON.stringify(testData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('[SSE Test] Error:', error);
    
    return new Response(JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendations: [
        'Check server logs for detailed error information',
        'Verify database connection is working',
        'Ensure authentication is properly configured'
      ]
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
