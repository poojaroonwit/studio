import { NextRequest } from 'next/server';
import { handleUnifiedSSEConnection } from '@/lib/unified-connection-manager';
import { checkSSEDatabaseHealth } from '@/lib/sse-db-wrapper';

// Force dynamic rendering and disable static optimization
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    // Pre-flight database health check to prevent 502 errors
    const dbHealth = await checkSSEDatabaseHealth();
    if (!dbHealth.healthy) {
      console.error('[SSE] Database health check failed:', dbHealth.error);
      return new Response(JSON.stringify({
        error: 'Service temporarily unavailable',
        message: 'Database connection issue - please try again in a moment',
        details: dbHealth.error,
        timestamp: new Date().toISOString(),
        retryAfter: 30
      }), {
        status: 503, // Service Unavailable
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': '30',
          'X-Error-Type': 'database-unavailable'
        }
      });
    }

    // Add timeout handling for the SSE connection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 300000); // 5 minutes timeout

    // Handle request abort
    request.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });

    const response = await handleUnifiedSSEConnection(request);
    
    // Clear timeout on successful response
    clearTimeout(timeoutId);
    
    return response;
  } catch (error) {
    console.error('[SSE] Route handler error:', error);
    
    // Enhanced error handling for different error types
    if (error instanceof Error) {
      // Database connection errors
      if (error.message.includes('timeout') || 
          error.message.includes('connection') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ENOTFOUND')) {
        return new Response(JSON.stringify({
          error: 'Service temporarily unavailable',
          message: 'Database connection issue - please try again in a moment',
          details: error.message,
          timestamp: new Date().toISOString(),
          retryAfter: 30
        }), {
          status: 503, // Service Unavailable
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Retry-After': '30',
            'X-Error-Type': 'database-connection'
          }
        });
      }
      
      // Authentication errors
      if (error.message.includes('authentication') || 
          error.message.includes('session') ||
          error.message.includes('unauthorized')) {
        return new Response(JSON.stringify({
          error: 'Authentication failed',
          message: 'Please sign in again',
          details: error.message,
          timestamp: new Date().toISOString()
        }), {
          status: 401, // Unauthorized
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Error-Type': 'authentication'
          }
        });
      }
      
      // Timeout errors
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        return new Response(JSON.stringify({
          error: 'Connection timeout',
          message: 'SSE connection timed out after 5 minutes',
          details: error.message,
          timestamp: new Date().toISOString()
        }), {
          status: 408, // Request Timeout
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Error-Type': 'timeout'
          }
        });
      }
    }
    
    // Generic server error
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'SSE connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Error-Type': 'internal-error'
      }
    });
  }
}
