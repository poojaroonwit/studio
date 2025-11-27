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
    // Call the NextAuth handler
    const response = await handler(req, { params: {} } as any);
    
    // Check if response indicates an error or unauthorized access
    if (response && response.status >= 400) {
      const url = new URL(req.url);
      const pathname = url.pathname;
      
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
        return NextResponse.redirect(signInUrl);
      }
    }
    
    return response;
  } catch (error) {
    console.error('[NEXTAUTH HANDLER] Error:', error);
    // On error, check if this is a signin/signout route and redirect
    const url = new URL(req.url);
    const pathname = url.pathname;
    
    if (pathname.includes('/signin') || pathname.includes('/signout') || pathname.includes('/callback')) {
      const signInUrl = new URL('/auth/signin', req.url);
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