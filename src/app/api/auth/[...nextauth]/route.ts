// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

const handler = NextAuth(authOptions);

// Constants for endpoint paths
const ENDPOINTS = {
  SESSION: '/session',
  CSRF: '/csrf',
  SIGNOUT: '/signout',
  SIGNIN: '/signin',
  CALLBACK: '/callback',
  LOG: '/_log',
} as const;

// Constants for error messages
const ERROR_MESSAGES = {
  CONFIG_SECRET_MISSING: 'NEXTAUTH_SECRET environment variable is not set. Please check server configuration.',
  CONFIG_URL_MISSING: 'NEXTAUTH_URL environment variable is not set. Please check server configuration.',
  GENERIC_AUTH_ERROR: 'There was an error during authentication.',
  SERVER_CONFIG_ERROR: 'Server configuration error. Please ensure NEXTAUTH_SECRET and NEXTAUTH_URL are properly set.',
} as const;

// Helper type for endpoint detection
type EndpointType = keyof typeof ENDPOINTS;

/**
 * Checks if a pathname matches a specific endpoint
 */
function matchesEndpoint(pathname: string, endpoint: EndpointType): boolean {
  return pathname.includes(ENDPOINTS[endpoint]);
}

/**
 * Checks if an error is a configuration error
 */
function isConfigurationError(errorMessage: string): boolean {
  const configErrorPatterns = [
    // NEXTAUTH_SECRET errors
    errorMessage.includes('NEXTAUTH_SECRET') && (
      errorMessage.includes('not set') || 
      errorMessage.includes('missing') || 
      errorMessage.includes('undefined')
    ),
    // NEXTAUTH_URL errors
    errorMessage.includes('NEXTAUTH_URL') && (
      errorMessage.includes('not set') || 
      errorMessage.includes('missing') || 
      errorMessage.includes('undefined')
    ),
    // Generic server configuration errors
    errorMessage.includes('server configuration') && (
      errorMessage.includes('NEXTAUTH') || 
      errorMessage.includes('secret')
    ),
  ];
  
  return configErrorPatterns.some(pattern => pattern === true);
}

/**
 * Creates a sign-in URL with error parameters
 */
function createSignInUrlWithError(
  baseUrl: string,
  errorMessage: string,
  callbackUrl?: string | null
): URL {
  const signInUrl = new URL('/auth/signin', baseUrl);
  signInUrl.searchParams.set('error', 'Configuration');
  signInUrl.searchParams.set('errorDescription', encodeURIComponent(errorMessage));
  
  // SECURITY: Validate callback URL to prevent open redirect attacks
  if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
    signInUrl.searchParams.set('callbackUrl', callbackUrl);
  }
  
  return signInUrl;
}

/**
 * Validates critical environment variables
 */
function validateEnvironmentVariables(pathname: string): NextResponse | null {
  // Check NEXTAUTH_SECRET
  if (!process.env.NEXTAUTH_SECRET) {
    console.error('[NEXTAUTH HANDLER] NEXTAUTH_SECRET is not set', { path: pathname });
    
    if (matchesEndpoint(pathname, 'SIGNIN') || 
        matchesEndpoint(pathname, 'SIGNOUT') || 
        matchesEndpoint(pathname, 'CALLBACK')) {
      const signInUrl = createSignInUrlWithError(
        process.env.NEXTAUTH_URL || 'http://localhost:3000',
        ERROR_MESSAGES.CONFIG_SECRET_MISSING
      );
      return NextResponse.redirect(signInUrl);
    }
    
    return NextResponse.json(
      { error: 'Configuration', message: ERROR_MESSAGES.CONFIG_SECRET_MISSING },
      { status: 500 }
    );
  }
  
  // Check NEXTAUTH_URL in production
  if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL) {
    console.error('[NEXTAUTH HANDLER] NEXTAUTH_URL is not set in production', { path: pathname });
    
    if (matchesEndpoint(pathname, 'SIGNIN') || 
        matchesEndpoint(pathname, 'SIGNOUT') || 
        matchesEndpoint(pathname, 'CALLBACK')) {
      const signInUrl = createSignInUrlWithError(
        'http://localhost:3000', // Fallback for production
        ERROR_MESSAGES.CONFIG_URL_MISSING
      );
      return NextResponse.redirect(signInUrl);
    }
    
    return NextResponse.json(
      { error: 'Configuration', message: ERROR_MESSAGES.CONFIG_URL_MISSING },
      { status: 500 }
    );
  }
  
  return null;
}

/**
 * Handles NextAuth internal endpoints that should never fail
 */
function handleInternalEndpoints(pathname: string): NextResponse | null {
  if (matchesEndpoint(pathname, 'CSRF')) {
    return NextResponse.json({ csrfToken: '' }, { status: 200 });
  }
  
  if (matchesEndpoint(pathname, 'SIGNOUT')) {
    return NextResponse.json({ url: '/auth/signin' }, { status: 200 });
  }
  
  if (matchesEndpoint(pathname, 'LOG')) {
    return NextResponse.json({ success: true }, { status: 200 });
  }
  
  return null;
}

/**
 * Handles session endpoint errors gracefully
 */
function handleSessionEndpointError(error: unknown): NextResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Only propagate configuration errors
  if (isConfigurationError(errorMessage)) {
    throw error;
  }
  
  // For other errors, return null (NextAuth format for no session)
  // This triggers unauthenticated status and redirect to login
  return NextResponse.json(null, { status: 200 });
}

/**
 * Handles callback endpoint errors
 */
function handleCallbackEndpointError(
  error: unknown,
  baseUrl: string
): NextResponse | null {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (isConfigurationError(errorMessage)) {
    const signInUrl = createSignInUrlWithError(
      baseUrl,
      `Server configuration error: ${errorMessage}. Please ensure NEXTAUTH_SECRET and NEXTAUTH_URL are properly set.`
    );
    return NextResponse.redirect(signInUrl);
  }
  
  // For non-config errors, let NextAuth handle it
  return null;
}

/**
 * Extracts error message from response
 */
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const responseText = await response.clone().text();
    if (!responseText) {
      return ERROR_MESSAGES.GENERIC_AUTH_ERROR;
    }
    
    try {
      const errorData = JSON.parse(responseText);
      return errorData.error || errorData.message || ERROR_MESSAGES.GENERIC_AUTH_ERROR;
    } catch {
      // If not JSON, check for server configuration error
      if (responseText.includes('server configuration')) {
        return ERROR_MESSAGES.SERVER_CONFIG_ERROR;
      }
      return ERROR_MESSAGES.GENERIC_AUTH_ERROR;
    }
  } catch {
    return ERROR_MESSAGES.GENERIC_AUTH_ERROR;
  }
}

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

/**
 * Main request handler with best practices:
 * - Environment validation
 * - Error handling
 * - Security checks
 * - Proper logging
 */
async function handleRequest(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  try {
    // 1. Validate environment variables first
    const envValidationError = validateEnvironmentVariables(pathname);
    if (envValidationError) {
      return envValidationError;
    }
    
    // 2. Log request for debugging (only for auth-related paths in development)
    if (process.env.NODE_ENV === 'development' && 
        (matchesEndpoint(pathname, 'SIGNIN') || 
         matchesEndpoint(pathname, 'SIGNOUT') || 
         matchesEndpoint(pathname, 'CALLBACK') || 
         matchesEndpoint(pathname, 'SESSION'))) {
      console.log('[NEXTAUTH HANDLER] Processing request:', {
        path: pathname,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    }
    
    // 3. Call the NextAuth handler
    let response: Response;
    try {
      response = await handler(req, { params: {} } as any);
    } catch (error) {
      // Handle errors from NextAuth handler
      
      // Check for internal endpoints first
      const internalEndpointResponse = handleInternalEndpoints(pathname);
      if (internalEndpointResponse) {
        return internalEndpointResponse;
      }
      
      // Handle session endpoint errors
      if (matchesEndpoint(pathname, 'SESSION')) {
        return handleSessionEndpointError(error);
      }
      
      // Handle callback endpoint errors
      if (matchesEndpoint(pathname, 'CALLBACK')) {
        const callbackErrorResponse = handleCallbackEndpointError(error, req.url);
        if (callbackErrorResponse) {
          return callbackErrorResponse;
        }
        // For non-config errors, re-throw to let NextAuth handle it
      }
      
      // For other endpoints, re-throw to let NextAuth handle it
      throw error;
    }
    
    // 4. Check if response indicates an error
    if (response && response.status >= 400) {
      // Handle internal endpoints that should never fail
      const internalEndpointResponse = handleInternalEndpoints(pathname);
      if (internalEndpointResponse) {
        return internalEndpointResponse;
      }
      
      // Handle session endpoint errors
      if (matchesEndpoint(pathname, 'SESSION')) {
        // For 500 errors, return null to indicate no session (prevents server errors from breaking auth)
        if (response.status === 500) {
          return NextResponse.json(null, { status: 200 });
        }
        // For 401/403, let NextAuth's normal response through (it should return null)
        // These are normal "no session" responses
      }
      
      // Extract error message from response
      const errorMessage = await extractErrorMessage(response);
      
      // Only redirect for actual configuration errors
      if (isConfigurationError(errorMessage)) {
        const shouldRedirect = matchesEndpoint(pathname, 'SIGNIN') || matchesEndpoint(pathname, 'SIGNOUT');
        
        if (shouldRedirect) {
          const callbackUrl = url.searchParams.get('callbackUrl');
          const signInUrl = createSignInUrlWithError(req.url, errorMessage, callbackUrl);
          return NextResponse.redirect(signInUrl);
        }
      }
      
      // For non-config errors, return the original response
      // Let NextAuth handle it naturally
    }
    
    // 5. Return successful response
    return response;
  } catch (error) {
    // 6. Handle top-level errors
    
    // Check for internal endpoints first
    const internalEndpointResponse = handleInternalEndpoints(pathname);
    if (internalEndpointResponse) {
      return internalEndpointResponse;
    }
    
    // Enhanced error logging with structured data
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[NEXTAUTH HANDLER] Unhandled error:', {
      path: pathname,
      method: req.method,
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    });
    
    // Only redirect for actual configuration errors
    if (isConfigurationError(errorMessage)) {
      const shouldRedirect = matchesEndpoint(pathname, 'SIGNIN') || 
                            matchesEndpoint(pathname, 'SIGNOUT') ||
                            matchesEndpoint(pathname, 'CALLBACK');
      
      if (shouldRedirect) {
        const callbackUrl = url.searchParams.get('callbackUrl');
        const detailedError = `Server configuration error: ${errorMessage}. Please ensure NEXTAUTH_SECRET and NEXTAUTH_URL are properly set in your environment variables. Check server logs for more details.`;
        const signInUrl = createSignInUrlWithError(req.url, detailedError, callbackUrl);
        return NextResponse.redirect(signInUrl);
      }
    }
    
    // For non-config errors, re-throw to let NextAuth handle it
    throw error;
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}