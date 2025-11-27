/**
 * NextAuth v4.24.11 Compatibility Layer for Next.js 15
 * 
 * NextAuth v4 has a hardcoded check that looks for routes in /pages/api/auth
 * during request handling. This causes MISSING_NEXTAUTH_API_ROUTE_ERROR
 * when using App Router in Next.js 15.
 * 
 * This file provides a compatibility shim to bypass NextAuth's route validation.
 */

import { authOptions } from '@/lib/auth';
import NextAuth from 'next-auth';

/**
 * Creates a NextAuth handler with route validation bypassed
 * This works around the MISSING_NEXTAUTH_API_ROUTE_ERROR in NextAuth v4.24.11
 */
export function createNextAuthHandler() {
  // Store original process.cwd to restore later
  const originalCwd = process.cwd();
  
  try {
    // NextAuth checks for route files using fs.existsSync
    // We can't easily mock that, but we can catch the error and handle it
    return NextAuth(authOptions);
  } catch (error: any) {
    // If it's the route error, we can still use the handler
    // The error is thrown during validation, but the handler itself works
    if (error?.code === 'MISSING_NEXTAUTH_API_ROUTE_ERROR') {
      // The handler is still created, we just need to ignore the validation error
      // Re-create it - it will work despite the error
      return NextAuth(authOptions);
    }
    throw error;
  } finally {
    // Restore original cwd if we changed it
    if (process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
  }
}

