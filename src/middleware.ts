import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = [
  "/api/protected", // Add your protected endpoints here
];

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;

    // Skip middleware for static files and API routes that don't need session validation
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api-docs') ||
      pathname.startsWith('/favicon.ico') ||
      pathname.includes('.')
    ) {
      return NextResponse.next();
    }

    // Skip middleware for API routes that handle their own authentication
    if (pathname.startsWith('/api/')) {
      return NextResponse.next();
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
    return NextResponse.next();
  } catch (error) {
    console.error('[MIDDLEWARE] Error:', error);
    // On error, allow the request to continue to prevent blocking the application
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!api/auth|api-docs|api/upload-queue/process|_next/static|_next/image|favicon.ico|api/).*)',
    "/api/protected/:path*",
  ],
};
