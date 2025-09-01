import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Return basic connection info
    return new Response(JSON.stringify({
      status: 'success',
      message: 'SSE test endpoint working',
      userId,
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries())
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[SSE Test] Error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      message: 'SSE test endpoint error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
