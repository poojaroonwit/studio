import { NextRequest } from 'next/server';
import { getUploadQueueDataForUser, broadcastToUser } from '@/lib/unified-connection-manager';
import { getServerSession } from 'next-auth/next';
import { authOptions, validateUserSession } from '@/lib/auth';

export const dynamic = "force-dynamic";

async function sendUploadQueueUpdate(controller: ReadableStreamDefaultController<any>, queryParams?: { fileName?: string, status?: string, dateStart?: string, dateEnd?: string, positionId?: string, limit?: number, offset?: number }) {
  const encoder = new TextEncoder();
  try {
    // Get user ID from the controller context (we'll need to modify this approach)
    // For now, we'll use a different approach - this endpoint will be deprecated
    // in favor of the unified SSE system
    
    // Send a message indicating this endpoint is deprecated
    const deprecationMessage = JSON.stringify({
      type: 'deprecated',
      message: 'Upload queue SSE endpoint deprecated. Use unified SSE endpoint instead.',
      timestamp: new Date().toISOString()
    });
    
    controller.enqueue(encoder.encode(`data: ${deprecationMessage}\n\n`));
    
    // Close the connection after sending deprecation message
    controller.close();
    
  } catch (error) {
    console.error('[UPLOAD QUEUE SSE] Error sending update:', error);
    try {
      controller.close();
    } catch (closeError) {
      console.error('[UPLOAD QUEUE SSE] Error closing controller:', closeError);
    }
  }
}

// This route is now deprecated - redirect to unified SSE
export async function GET(request: NextRequest) {
  console.log('[UPLOAD QUEUE SSE] This endpoint is deprecated. Redirecting to unified SSE.');
  
  // Return a response indicating the endpoint is deprecated
  return new Response(JSON.stringify({
    error: 'Endpoint deprecated',
    message: 'Upload queue SSE endpoint has been deprecated. Use the unified SSE endpoint at /api/sse instead.',
    redirect: '/api/sse'
  }), {
    status: 410, // Gone
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
} 