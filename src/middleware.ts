import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, authRateLimiter, apiRateLimiter, uploadRateLimiter, searchRateLimiter } from '@/lib/rateLimiter';

const protectedRoutes = [
  "/api/protected", // Add your protected endpoints here
];

export async function middleware(req: NextRequest) {
  try {
    // Fast dev: completely bypass middleware in development to speed up local loads
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next();
    }

    const { pathname } = req.nextUrl;

    // Security headers for all responses
    const response = NextResponse.next();
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

    // Skip middleware for static files and API routes that don't need session validation
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/public') ||
      pathname.startsWith('/api-docs') ||
      pathname.startsWith('/favicon.ico') ||
      pathname.includes('.')
    ) {
      return response;
    }

    // Apply rate limiting based on endpoint type
    if (pathname.startsWith('/api/')) {
      let rateLimitResult;
      
      if (pathname.includes('/auth/') || pathname.includes('/signin')) {
        rateLimitResult = applyRateLimit(req, authRateLimiter);
      } else if (pathname.includes('/upload') || pathname.includes('/file')) {
        rateLimitResult = applyRateLimit(req, uploadRateLimiter);
      } else if (pathname.includes('/search') || pathname.includes('/candidates')) {
        rateLimitResult = applyRateLimit(req, searchRateLimiter);
      } else {
        rateLimitResult = applyRateLimit(req, apiRateLimiter);
      }
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', '100');
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
      
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { 
            error: 'Too many requests', 
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          }, 
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            }
          }
        );
      }
      
      return response;
    }

    // Detect NextAuth session token (handle split cookies in production)
    const allCookies = req.cookies.getAll();
    const hasSessionToken = allCookies.some(c => {
      const n = c.name;
      return n === 'next-auth.session-token' ||
             n.startsWith('next-auth.session-token.') ||
             n === '__Secure-next-auth.session-token' ||
             n.startsWith('__Secure-next-auth.session-token.');
    });

    // If no token and trying to access protected routes, redirect to sign in
    if (!hasSessionToken && !pathname.startsWith('/auth/signin')) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Let page components handle permission checks
    return response;
  } catch (error) {
    console.error('[MIDDLEWARE] Error:', error);
    // On error, allow the request to continue to prevent blocking the application
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!api/auth|api/public|api-docs|api/upload-queue/process|_next/static|_next/image|favicon.ico|api/).*)',
    "/api/protected/:path*",
  ],
};
