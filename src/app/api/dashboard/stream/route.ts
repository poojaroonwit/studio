export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server';

// This endpoint is now deprecated - redirect to unified SSE
export async function GET(req: NextRequest) {
  console.log('[DASHBOARD STREAM] This endpoint is deprecated. Redirecting to unified SSE.');
  
  // Return a response indicating the endpoint is deprecated
  return new Response(JSON.stringify({
    error: 'Endpoint deprecated',
    message: 'Dashboard stream endpoint has been deprecated. Use the unified SSE endpoint at /api/sse instead.',
    redirect: '/api/sse'
  }), {
    status: 410, // Gone
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
} 
