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
    const response = await handler(req, { params: {} } as any);
    
    // Check if response indicates an error or unauthorized access
    if (response && response.status >= 400) {
      const url = new URL(req.url);
      const pathname = url.pathname;
      
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
      
      // For signin/signout/callback routes with errors, redirect to sign-in page
      // Don't redirect for session/csrf/providers endpoints as they should return JSON
      const shouldRedirect = 
        pathname.includes('/signin') || 
        pathname.includes('/signout') ||
        (pathname.includes('/callback') && response.status === 401);
      
      if (shouldRedirect) {
        const signInUrl = new URL('/auth/signin', req.url);
        // Preserve callbackUrl if present
        const callbackUrl = url.searchParams.get('callbackUrl');
        if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
          signInUrl.searchParams.set('callbackUrl', callbackUrl);
        }
        // Add error information if it's a configuration error
        if (errorMessage.includes('configuration') || errorMessage.includes('NEXTAUTH')) {
          signInUrl.searchParams.set('error', 'Configuration');
          signInUrl.searchParams.set('errorDescription', encodeURIComponent(errorMessage));
        }
        return NextResponse.redirect(signInUrl);
      }
    }
    
    return response;
  } catch (error) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    
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
    
    // Check if it's a configuration error
    const isConfigError = errorMessage.includes('NEXTAUTH') || 
                         errorMessage.includes('secret') || 
                         errorMessage.includes('configuration') ||
                         errorMessage.includes('server configuration') ||
                         errorMessage.includes('JWT') ||
                         errorMessage.includes('token');
    
    // On error, check if this is a signin/signout/callback route and redirect
    if (pathname.includes('/signin') || pathname.includes('/signout') || pathname.includes('/callback')) {
      const signInUrl = new URL('/auth/signin', req.url);
      if (isConfigError) {
        signInUrl.searchParams.set('error', 'Configuration');
        const detailedError = `Server configuration error: ${errorMessage}. Please ensure NEXTAUTH_SECRET and NEXTAUTH_URL are properly set in your environment variables. Check server logs for more details.`;
        signInUrl.searchParams.set('errorDescription', encodeURIComponent(detailedError));
      } else {
        // For non-config errors, still redirect but with a generic message
        signInUrl.searchParams.set('error', 'Configuration');
        signInUrl.searchParams.set('errorDescription', encodeURIComponent(
          'An error occurred during authentication. Please check server logs for more information.'
        ));
      }
      return NextResponse.redirect(signInUrl);
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