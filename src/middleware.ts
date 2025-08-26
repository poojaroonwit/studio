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

    // Check for authentication token in cookies
    const token = req.cookies.get('next-auth.session-token')?.value || 
                  req.cookies.get('__Secure-next-auth.session-token')?.value;

    // If no token and trying to access protected routes, redirect to sign in
    if (!token && !pathname.startsWith('/auth/signin')) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      console.log('[MIDDLEWARE] Redirecting to signin:', signInUrl.toString());
      return NextResponse.redirect(signInUrl);
    }

    if (protectedRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  } catch (error) {

    // On error, allow the request to continue to prevent blocking the application
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - api-docs (API documentation routes)
     * - api/upload-queue/process (processor API route)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes - let them handle their own auth)
     */
    '/((?!api/auth|api-docs|api/upload-queue/process|_next/static|_next/image|favicon.ico|api/).*)',
    "/api/protected/:path*",
  ],
};
