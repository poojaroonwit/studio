import { NextRequest } from 'next/server';
import { handleUnifiedSSEConnection } from '@/lib/unified-connection-manager';

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
    
    // Return proper error response for 502 scenarios
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(JSON.stringify({
        error: 'Connection timeout',
        message: 'SSE connection timed out after 5 minutes',
        timestamp: new Date().toISOString()
      }), {
        status: 408, // Request Timeout
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'SSE connection failed',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
