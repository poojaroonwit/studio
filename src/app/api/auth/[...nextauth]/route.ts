// src/app/api/auth/[...nextauth]/route.ts
/**
 * NextAuth v5 (Auth.js) Route Handler
 * 
 * This is the simplified route handler for NextAuth v5.
 * NextAuth v5 is designed for Next.js 15 App Router and doesn't have
 * the route detection issues that v4 had.
 */

import { handlers } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

// Wrap handlers with error logging for OAuth callback errors
async function handleRequest(
  handler: (req: NextRequest) => Promise<Response>,
  req: NextRequest
): Promise<Response> {
  try {
    const url = new URL(req.url);
    
    // Log all callback requests for debugging
    if (url.pathname.includes('/callback/')) {
      console.log('[NEXTAUTH HANDLER] OAuth callback request:', {
        pathname: url.pathname,
        searchParams: Object.fromEntries(url.searchParams.entries()),
        method: req.method,
        headers: {
          host: req.headers.get('host'),
          referer: req.headers.get('referer'),
          'user-agent': req.headers.get('user-agent'),
        }
      });
    }
    
    // Log OAuth callback errors from Azure AD if present in URL
    if (url.searchParams.has('error')) {
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');
      const errorUri = url.searchParams.get('error_uri');
      const state = url.searchParams.get('state');
      
      console.error('[NEXTAUTH HANDLER] Azure AD OAuth error detected in callback URL:', {
        error,
        errorDescription: errorDescription ? decodeURIComponent(errorDescription) : null,
        errorUri,
        state,
        fullUrl: url.toString(),
        pathname: url.pathname,
        allParams: Object.fromEntries(url.searchParams.entries())
      });
    }
    
    const response = await handler(req);
    
    // Check response for errors
    if (!response.ok) {
      const responseClone = response.clone();
      try {
        const responseText = await responseClone.text();
        console.error('[NEXTAUTH HANDLER] Non-OK response from handler:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText.substring(0, 1000), // Limit log size
          url: url.toString()
        });
      } catch (e) {
        console.error('[NEXTAUTH HANDLER] Failed to read error response body:', e);
      }
    }
    
    return response;
  } catch (error) {
    console.error('[NEXTAUTH HANDLER] Unhandled error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCause = error instanceof Error && 'cause' in error ? (error as any).cause : undefined;
    
    console.error('[NEXTAUTH HANDLER] Error details:', {
      message: errorMessage,
      stack: errorStack,
      cause: errorCause,
      url: req.url,
      method: req.method
    });
    
    // Try to extract OAuth error from the error message
    let oauthError = null;
    if (errorMessage.includes('OAuthCallbackError') || errorMessage.includes('OAuth Provider returned an error')) {
      oauthError = {
        type: 'OAuthCallbackError',
        message: 'Azure AD returned an error during authentication',
        suggestion: 'Check Azure AD App Registration redirect URI and client secret configuration'
      };
    }
    
    // Return a proper error response
    return NextResponse.json(
      { 
        error: 'OAuthCallbackError',
        message: 'An error occurred during authentication. Please try again.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        oauthError: process.env.NODE_ENV === 'development' ? oauthError : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(handlers.GET, req);
}

export async function POST(req: NextRequest) {
  return handleRequest(handlers.POST, req);
}
