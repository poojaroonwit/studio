// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

const handler = NextAuth(authOptions);

/**
 * @openapi
 * /api/auth/[...nextauth]:
 *   get:
 *     summary: Get current session (NextAuth)
 *     description: Returns the current authenticated session if available. Used to check if a user is logged in.
 *     responses:
 *       200:
 *         description: Session data or null if not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *   post:
 *     summary: User login or signout (NextAuth)
 *     description: Login (with credentials or OAuth) or signout (with provider-specific body). The request body depends on the provider and action.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Login or signout successful
 *       401:
 *         description: Invalid credentials or not authenticated
 */

// Wrap handlers to redirect to sign-in on errors instead of showing error messages
async function handleRequest(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pathname = url.pathname;
    
    // Validate critical environment variables before processing
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('[NEXTAUTH HANDLER] NEXTAUTH_SECRET is not set');
      console.error('[NEXTAUTH HANDLER] Request path:', pathname);
      if (pathname.includes('/signin') || pathname.includes('/signout') || pathname.includes('/callback')) {
        const signInUrl = new URL('/auth/signin', req.url);
        signInUrl.searchParams.set('error', 'Configuration');
        signInUrl.searchParams.set('errorDescription', 'NEXTAUTH_SECRET environment variable is not set. Please check server configuration.');
        return NextResponse.redirect(signInUrl);
      }
      return NextResponse.json(
        { 
          error: 'Configuration',
          message: 'NEXTAUTH_SECRET environment variable is not set. Please check server configuration.' 
        },
        { status: 500 }
      );
    }
    
    // In production, validate NEXTAUTH_URL
    if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL) {
      console.error('[NEXTAUTH HANDLER] NEXTAUTH_URL is not set in production');
      console.error('[NEXTAUTH HANDLER] Request path:', pathname);
      if (pathname.includes('/signin') || pathname.includes('/signout') || pathname.includes('/callback')) {
        const signInUrl = new URL('/auth/signin', req.url);
        signInUrl.searchParams.set('error', 'Configuration');
        signInUrl.searchParams.set('errorDescription', 'NEXTAUTH_URL environment variable is not set. Please check server configuration.');
        return NextResponse.redirect(signInUrl);
      }
      return NextResponse.json(
        { 
          error: 'Configuration',
          message: 'NEXTAUTH_URL environment variable is not set. Please check server configuration.' 
        },
        { status: 500 }
      );
    }
    
    // Log request for debugging (only for auth-related paths)
    if (pathname.includes('/signin') || pathname.includes('/signout') || pathname.includes('/callback') || pathname.includes('/session')) {
      console.log('[NEXTAUTH HANDLER] Processing request:', {
        path: pathname,
        method: req.method,
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        hasUrl: !!process.env.NEXTAUTH_URL,
        nodeEnv: process.env.NODE_ENV
      });
    }
    
    // Call the NextAuth handler
    let response;
    try {
      response = await handler(req, { params: {} } as any);
    } catch (error) {
      // Handle errors from NextAuth handler
      const url = new URL(req.url);
      const pathname = url.pathname;
      
      // For session endpoint, return null session instead of error
      if (pathname.includes('/session')) {
        return NextResponse.json({ user: null }, { status: 200 });
      }
      
      // Handle NextAuth internal endpoints that should never fail
      // CSRF endpoint - return valid response to prevent auth flow from breaking
      if (pathname.includes('/csrf')) {
        return NextResponse.json({ csrfToken: '' }, { status: 200 });
      }
      
      // Signout endpoint - allow signout to proceed even on error
      if (pathname.includes('/signout')) {
        return NextResponse.json({ url: '/auth/signin' }, { status: 200 });
      }
      
      // _log endpoint - always return success (it's just for logging)
      if (pathname.includes('/_log')) {
        return NextResponse.json({ success: true }, { status: 200 });
      }
      
      // For callback routes, only catch configuration errors
      // Let NextAuth handle normal callback flow errors
      if (pathname.includes('/callback')) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isConfigError = errorMessage.includes('NEXTAUTH_SECRET') || 
                             errorMessage.includes('NEXTAUTH_URL') || 
                             (errorMessage.includes('secret') && (errorMessage.includes('not set') || errorMessage.includes('missing'))) ||
                             errorMessage.includes('server configuration');
        
        if (isConfigError) {
          // Only redirect for actual configuration errors
          const signInUrl = new URL('/auth/signin', req.url);
          signInUrl.searchParams.set('error', 'Configuration');
          signInUrl.searchParams.set('errorDescription', encodeURIComponent(
            `Server configuration error: ${errorMessage}. Please ensure NEXTAUTH_SECRET and NEXTAUTH_URL are properly set.`
          ));
          return NextResponse.redirect(signInUrl);
        }
        // For non-config callback errors, let NextAuth handle it
        // Re-throw to let NextAuth process the error naturally
      }
      
      // For other endpoints, re-throw or handle appropriately
      throw error;
    }
    
    // Check if response indicates an error or unauthorized access
    if (response && response.status >= 400) {
      const url = new URL(req.url);
      const pathname = url.pathname;
      
      // For session endpoint with errors, return null session instead of error
      // This prevents 500 errors during logout
      if (pathname.includes('/session')) {
        // If it's a 500 error, return null session (user is logged out)
        if (response.status === 500) {
          return NextResponse.json({ user: null }, { status: 200 });
        }
        // For other errors (401, 403), also return null session
        if (response.status === 401 || response.status === 403) {
          return NextResponse.json({ user: null }, { status: 200 });
        }
      }
      
      // Handle NextAuth internal endpoints that should never fail
      // CSRF endpoint - return valid response to prevent auth flow from breaking
      if (pathname.includes('/csrf')) {
        return NextResponse.json({ csrfToken: '' }, { status: 200 });
      }
      
      // Signout endpoint - allow signout to proceed even on error
      if (pathname.includes('/signout')) {
        return NextResponse.json({ url: '/auth/signin' }, { status: 200 });
      }
      
      // _log endpoint - always return success (it's just for logging)
      if (pathname.includes('/_log')) {
        return NextResponse.json({ success: true }, { status: 200 });
      }
      
      // Try to extract error message from response
      let errorMessage = 'There was an error during authentication.';
      try {
        const responseText = await response.clone().text();
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.error || errorData.message) {
              errorMessage = errorData.error || errorData.message;
            }
          } catch {
            // If not JSON, check if it contains the server configuration error
            if (responseText.includes('server configuration')) {
              errorMessage = 'Server configuration error. Please ensure NEXTAUTH_SECRET and NEXTAUTH_URL are properly set.';
            }
          }
        }
      } catch {
        // Ignore errors when trying to read response
      }
      
      // Only redirect for actual configuration errors
      // Don't redirect for database errors, network errors, or other non-config issues
      const isConfigError = errorMessage.includes('NEXTAUTH_SECRET') && (errorMessage.includes('not set') || errorMessage.includes('missing') || errorMessage.includes('undefined')) ||
                           errorMessage.includes('NEXTAUTH_URL') && (errorMessage.includes('not set') || errorMessage.includes('missing') || errorMessage.includes('undefined')) ||
                           (errorMessage.includes('server configuration') && (errorMessage.includes('NEXTAUTH') || errorMessage.includes('secret')));
      
      // For signin/signout routes, only redirect on actual config errors
      // For callback routes, be very careful - only redirect on config errors, let NextAuth handle others
      const shouldRedirect = 
        (pathname.includes('/signin') || pathname.includes('/signout')) && isConfigError;
      
      if (shouldRedirect) {
        const signInUrl = new URL('/auth/signin', req.url);
        // Preserve callbackUrl if present
        const callbackUrl = url.searchParams.get('callbackUrl');
        if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
          signInUrl.searchParams.set('callbackUrl', callbackUrl);
        }
        // Only set Configuration error for actual configuration issues
        signInUrl.searchParams.set('error', 'Configuration');
        signInUrl.searchParams.set('errorDescription', encodeURIComponent(errorMessage));
        return NextResponse.redirect(signInUrl);
      }
      
      // For callback routes with non-config errors, let NextAuth handle it
      // Don't intercept - return the original response so NextAuth can process it
      // This allows normal authentication flow to continue even if there are transient errors
    }
    
    return response;
  } catch (error) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    
    // Handle NextAuth internal endpoints that should never fail
    // CSRF endpoint - return valid response to prevent auth flow from breaking
    if (pathname.includes('/csrf')) {
      return NextResponse.json({ csrfToken: '' }, { status: 200 });
    }
    
    // Signout endpoint - allow signout to proceed even on error
    if (pathname.includes('/signout')) {
      return NextResponse.json({ url: '/auth/signin' }, { status: 200 });
    }
    
    // _log endpoint - always return success (it's just for logging)
    if (pathname.includes('/_log')) {
      return NextResponse.json({ success: true }, { status: 200 });
    }
    
    // Enhanced error logging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[NEXTAUTH HANDLER] Error occurred:', {
      path: pathname,
      method: req.method,
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });
    
    // Check if it's a configuration error (be very specific - only actual config issues)
    const isConfigError = (errorMessage.includes('NEXTAUTH_SECRET') && (errorMessage.includes('not set') || errorMessage.includes('missing') || errorMessage.includes('undefined'))) ||
                         (errorMessage.includes('NEXTAUTH_URL') && (errorMessage.includes('not set') || errorMessage.includes('missing') || errorMessage.includes('undefined'))) ||
                         (errorMessage.includes('server configuration') && (errorMessage.includes('NEXTAUTH') || errorMessage.includes('secret')));
    
    // Only redirect for actual configuration errors
    // Don't redirect for database errors, network errors, JWT errors, or other runtime errors
    if (pathname.includes('/signin') || pathname.includes('/signout')) {
      if (isConfigError) {
        const signInUrl = new URL('/auth/signin', req.url);
        signInUrl.searchParams.set('error', 'Configuration');
        const detailedError = `Server configuration error: ${errorMessage}. Please ensure NEXTAUTH_SECRET and NEXTAUTH_URL are properly set in your environment variables. Check server logs for more details.`;
        signInUrl.searchParams.set('errorDescription', encodeURIComponent(detailedError));
        return NextResponse.redirect(signInUrl);
      }
      // For non-config errors on signin/signout, let NextAuth handle it
      // Don't redirect - let the error propagate naturally
    }
    
    // For callback routes, only redirect if it's a configuration error
    // Otherwise, let NextAuth handle the callback flow - don't interfere
    if (pathname.includes('/callback')) {
      if (isConfigError) {
        const signInUrl = new URL('/auth/signin', req.url);
        signInUrl.searchParams.set('error', 'Configuration');
        const detailedError = `Server configuration error: ${errorMessage}. Please ensure NEXTAUTH_SECRET and NEXTAUTH_URL are properly set in your environment variables. Check server logs for more details.`;
        signInUrl.searchParams.set('errorDescription', encodeURIComponent(detailedError));
        return NextResponse.redirect(signInUrl);
      }
      // For non-config callback errors, let NextAuth handle it
      // Don't redirect - these might be normal OAuth flow errors or transient issues
      // Re-throw to let NextAuth process the error naturally
    }
    
    // For other routes, re-throw to let NextAuth handle it
    throw error;
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}