/**
 * NextAuth v5 Migration - Compatibility Layer
 * 
 * This file provides backward compatibility for code that still uses
 * the old NextAuth v4 patterns. It re-exports from the new auth.ts
 * and provides helper functions.
 */

import { auth } from '@/auth';
import { getPool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/auditLog';
import jwt from 'jsonwebtoken';

// Cache for user validation to reduce database calls
const userValidationCache = new Map<string, { exists: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check if Azure AD is configured
export const isAzureADConfigured = () => {
  const hasClientId = process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_ID !== 'your_azure_ad_application_client_id';
  const hasClientSecret = process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_CLIENT_SECRET !== 'your_azure_ad_client_secret_value';
  const hasTenantId = process.env.AZURE_AD_TENANT_ID && process.env.AZURE_AD_TENANT_ID !== 'your_azure_ad_directory_tenant_id';
  
  return hasClientId && hasClientSecret && hasTenantId;
};

/**
 * Validates that a user exists in the database with caching
 * @param userId - The user ID to validate
 * @returns Promise<boolean> - True if user exists, false otherwise
 */
export async function validateUserExists(userId: string): Promise<boolean> {
  if (!userId) {
    return false;
  }
  
  // Check cache first
  const cached = userValidationCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.exists;
  }
  
  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT id FROM "User" WHERE id = $1 AND "is_active" = true', [userId]);
    const exists = result.rows.length > 0;
    
    // Update cache
    userValidationCache.set(userId, { exists, timestamp: Date.now() });
    
    return exists;
  } catch (error) {
    return false;
  } finally {
    client.release();
  }
}

/**
 * Clears the user validation cache (useful when users are updated/deleted)
 * @param userId - Optional specific user ID to clear, or undefined to clear all
 */
export function clearUserValidationCache(userId?: string) {
  if (userId) {
    userValidationCache.delete(userId);
  } else {
    userValidationCache.clear();
  }
}

/**
 * Validates user session and returns user info if valid
 * @param session - The session object from auth()
 * @returns Promise<{isValid: boolean, userId?: string, userName?: string, error?: string}>
 */
export async function validateUserSession(session: any): Promise<{
  isValid: boolean;
  userId?: string;
  userName?: string;
  error?: string;
}> {
  if (!session?.user?.id) {
    return { isValid: false, error: 'No user session found' };
  }

  const userId = session.user.id;
  const userName = session.user.name || session.user.email || 'System';
  
  const userExists = await validateUserExists(userId);
  if (!userExists) {
    // Check if user exists but is disabled
    const client = await getPool().connect();
    try {
      const result = await client.query('SELECT "is_active" FROM "User" WHERE id = $1', [userId]);
      if (result.rows.length > 0 && !result.rows[0].is_active) {
        return { 
          isValid: false, 
          error: 'Your account has been disabled. Please contact your administrator.',
          userId,
          userName
        };
      }
    } catch (error) {
      console.error('[VALIDATE USER SESSION] Error checking user status:', error);
    } finally {
      client.release();
    }
    
    return { 
      isValid: false, 
      error: 'Invalid user session. Please sign in again.',
      userId,
      userName
    };
  }

  return { isValid: true, userId, userName };
}

/**
 * @deprecated Use auth() from '@/auth' instead
 * This is kept for backward compatibility during migration
 */
export const authOptions = null as any; // Deprecated - use auth() from '@/auth'

/**
 * Get server session - NextAuth v5 compatibility
 * Replaces auth() with auth()
 * This function maintains backward compatibility with existing code
 */
export async function getServerSession(...args: any[]) {
  // In NextAuth v5, we just call auth() directly
  // The old authOptions parameter is ignored
  return await auth();
}

/**
 * Helper for session and permission checks
 * @param requiredPermission - The permission required to access the resource
 * @param request - The NextRequest object
 * @returns Promise<{session?: any, error?: NextResponse}>
 */
export async function requireSessionAndPermission(requiredPermission: string, request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }
  
  // Check if user is active
  const userExists = await validateUserExists(session.user.id);
  if (!userExists) {
    // Check if user exists but is disabled
    const client = await getPool().connect();
    try {
      const result = await client.query('SELECT "is_active" FROM "User" WHERE id = $1', [session.user.id]);
      if (result.rows.length > 0 && !result.rows[0].is_active) {
        await logAudit(
          'WARN',
          `Disabled user attempted to access resource: ${session.user.name || session.user.email}.`,
          `API:${requiredPermission}`,
          session.user.id
        );
        return { error: NextResponse.json({ message: 'Your account has been disabled. Please contact your administrator.' }, { status: 403 }) };
      }
    } catch (error) {
      console.error('[REQUIRE SESSION] Error checking user status:', error);
    } finally {
      client.release();
    }
    
    return { error: NextResponse.json({ message: 'Invalid user session. Please sign in again.' }, { status: 401 }) };
  }
  
  // Admin role has access to everything
  if (session.user.role === 'Admin') {
    return { session };
  }
  
  // Check specific permissions from user groups
  if (!session.user.modulePermissions?.includes(requiredPermission)) {
    await logAudit(
      'WARN',
      `Forbidden attempt to access resource by ${session.user.name || session.user.email}.`,
      `API:${requiredPermission}`,
      session.user.id
    );
    return { error: NextResponse.json({ message: `Forbidden: Insufficient permissions to ${requiredPermission.toLowerCase().replace('_', ' ')}` }, { status: 403 }) };
  }
  return { session };
}

/**
 * Verifies a JWT bearer token for external API authentication.
 * @param token - The JWT token string
 * @returns The decoded user payload if valid, or null if invalid
 */
import { decode } from 'next-auth/jwt';

/**
 * Verifies a JWT bearer token for external API authentication.
 * Handles NextAuth's JWE (Encrypted JWT) format using 'decode'.
 * @param token - The JWT token string (from Bearer header)
 * @returns The decoded user payload if valid, or null if invalid
 */
export async function verifyApiToken(token: string): Promise<any | null> {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
    
    // Use NextAuth's decode function to handle JWE decryption
    // Try v5 default salt first
    const isSecure = process.env.NODE_ENV === 'production';
    let salt = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    
    try {
      const decoded = await decode({ token, secret, salt });
      if (decoded) return decoded;
    } catch (e) {
      // Ignore first attempt error
    }
    
    // Fallback to legacy v4 salt
    salt = isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
    const decoded = await decode({ token, secret, salt });
    return decoded;
  } catch (err) {
    console.error('[AUTH] Token verification failed:', err);
    return null;
  }
}
