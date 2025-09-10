import { type NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getPool } from '@/lib/db';
import { authenticateUser, getUserSessionData, getUserPermissions } from '@/lib/authUtils';
import bcrypt from 'bcryptjs';
import { logAudit } from '@/lib/auditLog';
import type { UserProfile, PlatformModuleId } from '@/lib/types';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Cache for user validation to reduce database calls
const userValidationCache = new Map<string, { exists: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check if Azure AD is configured
const isAzureADConfigured = () => {
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
 * @param session - The session object from getServerSession
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

export const authOptions: NextAuthOptions = {
    providers: [
      // Only add Azure AD provider if properly configured
      ...(isAzureADConfigured() ? [
        AzureADProvider({
          clientId: process.env.AZURE_AD_CLIENT_ID!,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
          tenantId: process.env.AZURE_AD_TENANT_ID!,
        })
      ] : []),
      // Always include credentials provider for username/password authentication
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Please enter both email and password.");
          }
  
          const user = await authenticateUser(credentials.email, credentials.password);
          
          if (user) {
            return user;
          } else {
            try {
              await logAudit(
                'WARN',
                `Failed credential login attempt for ${credentials.email}.`,
                'Auth:SignIn',
                null,
                { email: credentials.email }
              );
            } catch (_) {
              // swallow logging errors
            }
            return null;
          }
        }
      })
    ],
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      updateAge: 24 * 60 * 60, // 24 hours
    },
    debug: false, // Disable NextAuth debug logging to reduce container logs
    callbacks: {
      async jwt({ token, user, account, profile }) {
        // Helper to check if a string is a valid UUID
        function isUuid(str: string) {
          return typeof str === 'string' && validateUuid(str);
        }
        
        try {
          // If account and user are present (on sign-in), set token fields
          if (account && user) {
            token.accessToken = account.access_token;
            token.id = user.id;
            token.role = user.role || 'Recruiter';
            
            // Get permissions from UserGroup (not from direct field)
            const modulePermissions = Array.isArray(user.modulePermissions) 
              ? (user.modulePermissions as PlatformModuleId[])
              : [];
            token.modulePermissions = modulePermissions;
            
            // Cache user data in token to avoid repeated database calls
            (token as any).name = user.name;
            (token as any).avatarUrl = (user as any).avatarUrl;
            (token as any).personalColor = (user as any).personalColor;
          }
          
          // If token.id is not a valid UUID (e.g., Azure AD providerAccountId), fetch the user by email or azure_oid
          if (typeof token.id === "string" && !validateUuid(token.id)) {
            // Non-UUID token.id detected
            const client = await getPool().connect();
            try {
              const oid = (profile as any)?.oid ?? (profile as any)?.sub ?? profile?.email;
              // Looking up user with oid
              const res = await client.query('SELECT id FROM "User" WHERE email = $1 OR "azure_oid" = $2', [profile?.email, oid]);
              const dbUser = res.rows[0];
              if (dbUser) {
                // Found user with UUID
                token.id = dbUser.id;
              }
            } catch (e) {
              console.error('[JWT CALLBACK] Error fetching user UUID for Azure AD:', e);
            } finally {
              client.release();
            }
          }
          
          // Always fetch fresh permissions and user data to ensure they're up to date
          if (typeof token.id === 'string' && validateUuid(token.id as string)) {
            try {
              const freshPermissions = await getUserPermissions(token.id as string);
              
              // Ensure freshPermissions is always an array
              const modulePermissions = Array.isArray(freshPermissions) 
                ? (freshPermissions as PlatformModuleId[])
                : [];
              token.modulePermissions = modulePermissions;
              
              // Debug log for permission updates removed to reduce log noise
              
              // Also fetch fresh user data to ensure role is up to date
              const userData = await getUserSessionData(token.id as string);
              if (userData) {
                token.role = userData.role as UserProfile['role'];
                (token as any).name = userData.name;
                (token as any).avatarUrl = userData.avatarUrl || userData.image || null;
                (token as any).personalColor = userData.personalColor || null;
              }
            } catch (e) {
              console.error('[JWT CALLBACK] Error fetching user data:', e);
              // Don't set empty permissions, keep existing ones if available
              if (!token.modulePermissions) {
                token.modulePermissions = [];
              }
            }
          }
          
          // Ensure token always has valid structure to prevent React error #185
          if (!token.modulePermissions) {
            token.modulePermissions = [];
          }
          if (!token.role) {
            token.role = 'Recruiter';
          }
          
        } catch (error) {
          console.error('[JWT CALLBACK] Critical error in JWT callback:', error);
          // Ensure token has minimal valid structure
          token.modulePermissions = token.modulePermissions || [];
          token.role = token.role || 'Recruiter';
        }
        
        return token;
      },
      async session({ session, token }) {
        // Defensive check to prevent React error #185
        if (!session || !session.user) {
          console.error('[SESSION CALLBACK] Invalid session object:', session);
          return session;
        }

        try {
          // Validate that token.id is a valid UUID before setting it in session
          if (typeof token.id === 'string' && !validateUuid(token.id)) {
            console.error('[SESSION CALLBACK] Invalid UUID in token.id:', token.id);
            // Don't set an invalid UUID in the session
            session.user.id = '';
          } else {
            session.user.id = token.id as string;
          }
          
          // Ensure role is always a valid string
          const userRole = (token.role as UserProfile['role']) || 'Recruiter';
          session.user.role = userRole;
          
          // Debug log to help identify role issues
          if (!token.role) {
            console.warn('[SESSION CALLBACK] No role found in token, using default:', session.user.role);
          }
          
          // Ensure modulePermissions is always an array to prevent React error #185
          const modulePermissions = Array.isArray(token.modulePermissions) 
            ? (token.modulePermissions as PlatformModuleId[])
            : [];
          session.user.modulePermissions = modulePermissions;
          
          // Debug log for session permissions removed
          
          // Removed session logging to reduce container logs
          
          // Fetch user data including role, avatarUrl and personalColor from database
          // Only fetch if we don't have this data in the token or if this is a new session
          if (token.id && validateUuid(token.id as string) && (!(token as any).avatarUrl || !(token as any).personalColor || !token.role)) {
            try {
              const userData = await getUserSessionData(token.id as string);
              if (userData) {
                // Check if user is active - if not, return a minimal session to invalidate
                if (!userData.isActive) {
                  return {
                    ...session,
                    user: {
                      ...session.user,
                      id: '',
                      role: 'Recruiter',
                      modulePermissions: [],
                      avatarUrl: null,
                      personalColor: null
                    }
                  };
                }
                
                // Add role to session (ensure it's always fresh from database)
                session.user.role = userData.role as UserProfile['role'];
                token.role = userData.role as UserProfile['role'];
                
                // Add name to session (ensure it's always fresh from database)
                session.user.name = userData.name;
                (token as any).name = userData.name;
                
                // Add avatarUrl to session (avatarUrl takes precedence over image)
                session.user.avatarUrl = userData.avatarUrl || userData.image || null;
                // Add personalColor to session (map from snake_case to camelCase)
                session.user.personalColor = userData.personalColor || null;
                // Cache in token for future use
                (token as any).avatarUrl = session.user.avatarUrl;
                (token as any).personalColor = session.user.personalColor;
              }
            } catch (error) {
              console.error('[SESSION CALLBACK] Error fetching user data:', error);
              // Don't fail the session if data fetch fails
            }
          } else {
            // Use cached data from token
            session.user.name = (token as any).name || session.user.name;
            session.user.avatarUrl = (token as any).avatarUrl || null;
            session.user.personalColor = (token as any).personalColor || null;
          }
          
          // Ensure session is properly established even if some data is missing
        } catch (error) {
          console.error('[SESSION CALLBACK] Critical error in session callback:', error);
          // Return a minimal valid session to prevent React error #185
          return {
            ...session,
            user: {
              ...session.user,
              id: '',
              role: 'Recruiter',
              modulePermissions: [],
              avatarUrl: null,
              personalColor: null
            }
          };
        }
        
        return session;
      },
      async signIn({ user, account, profile }) {
         
          // Only handle Azure AD sign-in if Azure AD is configured and this is an Azure AD sign-in
          if (isAzureADConfigured() && account?.provider === 'azure-ad' && profile?.email) {
             
              const client = await getPool().connect();
              try {
                  // Use profile.sub as the unique user ID (OID) if oid is not present
                  const oid = (profile as any)?.oid ?? (profile as any)?.sub ?? profile?.email;
                  const picture = (profile as any).picture ?? null;
                  
                  
                  // Check if user exists by email or Azure OID
                  let res = await client.query('SELECT * FROM "User" WHERE email = $1 OR "azure_oid" = $2', [profile.email, oid]);
                  let dbUser = res.rows[0];
                  
                 
                 

                  if (!dbUser) {
                    
                      // If not, create a new user
                      // For Azure AD users, we need to provide a placeholder password since the field is required
                      // This password will never be used for authentication since Azure AD handles that
                      const placeholderPassword = await bcrypt.hash('azure-ad-placeholder-' + Date.now(), 10);
                      const uuid = uuidv4(); // always generate a new UUID for the user id
                      await client.query(
                          'INSERT INTO "User" (id, name, email, "emailVerified", image, role, password, "authentication_method", "azure_oid") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                          [uuid, profile.name, profile.email, new Date(), picture, 'Recruiter', placeholderPassword, 'azure', oid]
                      );
                      await logAudit('AUDIT', `New user '${profile.name}' created via Azure AD SSO.`, 'Auth:SignIn', uuid);
                     
                      // After creating user, fetch it to get the ID
                      res = await client.query('SELECT * FROM "User" WHERE email = $1 OR "azure_oid" = $2', [profile.email, oid]);
                      dbUser = res.rows[0];
                      
                      // Assign the new user to the Recruiter group by default
                      try {
                          await client.query(
                              'UPDATE "User" SET "userGroupId" = $1 WHERE id = $2',
                              ['00000000-0000-0000-0000-000000000002', dbUser.id] // Recruiter group ID
                          );
                          await logAudit('AUDIT', `User '${profile.name}' assigned to Recruiter group via Azure AD SSO.`, 'Auth:SignIn', dbUser.id);
                      } catch (groupError) {
                          console.error('[AZURE AD SIGNIN] Error assigning user to Recruiter group:', groupError);
                          // Don't fail the sign-in if group assignment fails
                      }
                  }
                  
                  // Use the user's actual ID (either existing or newly created)
                  const userId = dbUser.id; // This is always a UUID
                  
                  
                  // Also create an account entry for the provider
                  
                  res = await client.query('SELECT * FROM "Account" WHERE "provider" = $1 AND "providerAccountId" = $2', [account.provider, account.providerAccountId]);
                  if (res.rows.length === 0) {
                      await client.query(
                          'INSERT INTO "Account" (id, "userId", type, provider, "providerAccountId", access_token, expires_at, scope, token_type, id_token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                          [uuidv4(), userId, account.type, account.provider, account.providerAccountId, account.access_token, account.expires_at, account.scope, account.token_type, account.id_token]
                      );
                  } else {
                      // Check if the existing account entry has the correct userId
                      const existingAccount = res.rows[0];
                      if (existingAccount.userId !== userId) {
                          await client.query(
                              'UPDATE "Account" SET "userId" = $1, access_token = $2, expires_at = $3, scope = $4, token_type = $5, id_token = $6 WHERE id = $7',
                              [userId, account.access_token, account.expires_at, account.scope, account.token_type, account.id_token, existingAccount.id]
                          );
                      }
                  }
              } catch (err) {
                  console.error('[AZURE AD SIGNIN] Error during Azure AD sign-in DB operations:', err);
                  console.error('[AZURE AD SIGNIN] Error details:', {
                      message: err instanceof Error ? err.message : 'Unknown error',
                      stack: err instanceof Error ? err.stack : undefined,
                      profile: { email: profile.email, name: profile.name },
                      account: { provider: account.provider, providerAccountId: account.providerAccountId }
                  });
                  return false; // Prevent sign-in on DB error
              } finally {
                  client.release();
              }
          }
          return true;
      }
    },
    events: {
      async signIn({ user, account }) {
        try {
          await logAudit(
            'AUDIT',
            `User '${user?.name || user?.email || 'Unknown'}' signed in via ${account?.provider || 'credentials'}.`,
            'Auth:SignIn',
            (user as any)?.id || null
          );
        } catch (_) {}
      },
      async signOut({ token, session }) {
        try {
          const actingUserId = (token as any)?.id || null;
          const userName = session?.user?.name || session?.user?.email || 'User';
          await logAudit(
            'AUDIT',
            `User '${userName}' signed out.`,
            'Auth:SignOut',
            actingUserId
          );
        } catch (_) {}
      }
    },
    pages: {
      signIn: '/auth/signin',
    },
    secret: process.env.NEXTAUTH_SECRET,
  }; 

/**
 * Helper for session and permission checks
 * @param requiredPermission - The permission required to access the resource
 * @param request - The NextRequest object
 * @returns Promise<{session?: any, error?: NextResponse}>
 */
export async function requireSessionAndPermission(requiredPermission: string, request: NextRequest) {
  const session = await getServerSession(authOptions);
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
export function verifyApiToken(token: string): any | null {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
} 