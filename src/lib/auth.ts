import { type NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getPool, getMergedUserPermissions } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { logAudit } from '@/lib/auditLog';
import type { UserProfile, PlatformModuleId } from '@/lib/types';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Cache for user validation to reduce database calls
const userValidationCache = new Map<string, { exists: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check if Azure AD is configured
const isAzureADConfigured = () => {
  const hasClientId = process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_ID !== 'your_azure_ad_application_client_id';
  const hasClientSecret = process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_CLIENT_SECRET !== 'your_azure_ad_client_secret_value';
  const hasTenantId = process.env.AZURE_AD_TENANT_ID && process.env.AZURE_AD_TENANT_ID !== 'your_azure_ad_directory_tenant_id';
  
  // Commented out to reduce log spam
  // console.log('Checking Azure AD configuration:');
  // console.log(' - AZURE_AD_CLIENT_ID:', hasClientId ? 'SET' : 'NOT SET');
  // console.log(' - AZURE_AD_CLIENT_SECRET:', hasClientSecret ? 'SET' : 'NOT SET');
  // console.log(' - AZURE_AD_TENANT_ID:', hasTenantId ? 'SET' : 'NOT SET');
  // console.log('Azure AD is configured:', hasClientId && hasClientSecret && hasTenantId);

  return hasClientId && hasClientSecret && hasTenantId;
};

/**
 * Validates that a user exists in the database with caching
 * @param userId - The user ID to validate
 * @returns Promise<boolean> - True if user exists, false otherwise
 */
export async function validateUserExists(userId: string): Promise<boolean> {
  if (!userId) {
    console.log('[USER VALIDATION] No userId provided');
    return false;
  }
  
  // Check cache first
  const cached = userValidationCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[USER VALIDATION] User ${userId} exists (cached): ${cached.exists}`);
    return cached.exists;
  }
  
  const client = await getPool().connect();
  try {
    const result = await client.query('SELECT id FROM "User" WHERE id = $1', [userId]);
    const exists = result.rows.length > 0;
    
    // Update cache
    userValidationCache.set(userId, { exists, timestamp: Date.now() });
    
    console.log(`[USER VALIDATION] User ${userId} exists: ${exists}`);
    return exists;
  } catch (error) {
    console.error('[USER VALIDATION] Error validating user existence:', error);
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
    console.log(`[USER VALIDATION] Cleared cache for user ${userId}`);
  } else {
    userValidationCache.clear();
    console.log('[USER VALIDATION] Cleared all user validation cache');
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
  
          const client = await getPool().connect();
          try {
            const result = await client.query('SELECT * FROM "User" WHERE email = $1', [credentials.email]);
            const user = result.rows[0];
            // console.log('[AUTH DEBUG] User lookup result:', user);
  
            if (user && user.password) {
              const isValid = await bcrypt.compare(credentials.password, user.password);
              // console.log('[AUTH DEBUG] bcrypt.compare result:', isValid);
              if (isValid) {
                // Fetch merged permissions (direct + group)
                const mergedPermissions = await getMergedUserPermissions(user.id) as PlatformModuleId[];
                // Return a user object, omitting the password
                return {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  image: user.image,
                  modulePermissions: mergedPermissions,
                };
              }
            }
            return null;
          } catch (error) {
              console.error('[AUTH DEBUG] Authorize error:', error);
              console.error("Authorize error:", error);
              return null;
          } finally {
              client.release();
          }
        }
      })
    ],
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      updateAge: 24 * 60 * 60, // 24 hours
    },
    callbacks: {
      async jwt({ token, user, account }) {
        if (account && user) {
          token.accessToken = account.access_token;
          token.id = user.id;
          token.role = user.role;
          token.modulePermissions = user.modulePermissions as PlatformModuleId[];
        }
        // If token.id exists, always fetch fresh merged permissions (for session refreshes and permission updates)
        if (token.id) {
          try {
            token.modulePermissions = await getMergedUserPermissions(token.id as string) as PlatformModuleId[];
          } catch (e) {
            console.error('[JWT CALLBACK] Error fetching module permissions:', e);
            token.modulePermissions = [];
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.id as string;
          session.user.role = token.role as UserProfile['role'];
          session.user.modulePermissions = token.modulePermissions as PlatformModuleId[];
        }
        return session;
      },
      async signIn({ user, account, profile }) {
          console.log('[AZURE AD SIGNIN] signIn callback triggered');
          console.log('[AZUREAD SIGNIN] account provider:', account?.provider);
          console.log('[AZUREAD SIGNIN] profile email:', profile?.email);
          console.log('[AZURE AD SIGNIN] isAzureADConfigured():', isAzureADConfigured());
          
          // Only handle Azure AD sign-in if Azure AD is configured and this is an Azure AD sign-in
          if (isAzureADConfigured() && account?.provider === 'azure-ad' && profile?.email) {
              console.log('[AZURE ADSIGNIN] Processing Azure AD sign-in for:', profile.email);
              const client = await getPool().connect();
              try {
                  // Use profile.sub as the unique user ID (OID) if oid is not present
                  const oid = (profile as any).oid ?? (profile as any).sub ?? profile.email;
                  const picture = (profile as any).picture ?? null;
                  
                  console.log('[AZURE AD SIGNIN] User OID:', oid);
                  console.log('[AZURE AD SIGNIN] User name:', profile.name);

                  // Check if user exists by email or Azure OID
                  let res = await client.query('SELECT * FROM "User" WHERE email = $1 OR "azure_oid" = $2', [profile.email, oid]);
                  let dbUser = res.rows[0];
                  
                  console.log('[AZURE AD SIGNIN] Existing user found:', !!dbUser);
                  if (dbUser) {
                      console.log('[AZURE AD SIGNIN] Existing user ID:', dbUser.id);
                  }

                  if (!dbUser) {
                      console.log('[AZURE AD SIGNIN] Creating new user in database');
                      // If not, create a new user
                      // For Azure AD users, we need to provide a placeholder password since the field is required
                      // This password will never be used for authentication since Azure AD handles that
                      const placeholderPassword = await bcrypt.hash('azure-ad-placeholder-' + Date.now(), 10);
                      const uuid = uuidv4(); // always generate a new UUID for the user id
                      await client.query(
                          'INSERT INTO "User" (id, name, email, "emailVerified", image, role, password, "authenticationMethod", "azure_oid") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                          [uuid, profile.name, profile.email, new Date(), picture, 'Recruiter', placeholderPassword, 'azure', oid]
                      );
                      await logAudit('AUDIT', `New user '${profile.name}' created via Azure AD SSO.`, 'Auth:SignIn', uuid);
                      console.log('[AZURE AD SIGNIN] New user created successfully');
                      // After creating user, fetch it to get the ID
                      res = await client.query('SELECT * FROM "User" WHERE email = $1 OR "azure_oid" = $2', [profile.email, oid]);
                      dbUser = res.rows[0];
                  }
                  
                  // Use the user's actual ID (either existing or newly created)
                  const userId = dbUser.id; // This is always a UUID
                  console.log('[AZURE AD SIGNIN] Using user ID for account creation:', userId);
                  
                  // Also create an account entry for the provider
                  console.log('[AZURE AD SIGNIN] Checking for existing account entry');
                  res = await client.query('SELECT * FROM "Account" WHERE "provider" = $1 AND "providerAccountId" = $2', [account.provider, account.providerAccountId]);
                  if (res.rows.length === 0) {
                      console.log('[AZURE AD SIGNIN] Creating account entry');
                      await client.query(
                          'INSERT INTO "Account" (id, "userId", type, provider, "providerAccountId", access_token, expires_at, scope, token_type, id_token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                          [uuidv4(), userId, account.type, account.provider, account.providerAccountId, account.access_token, account.expires_at, account.scope, account.token_type, account.id_token]
                      );
                      console.log('[AZUREAD SIGNIN] Account entry created successfully');
                  } else {
                      console.log('[AZUREAD SIGNIN] Account entry already exists');
                      // Check if the existing account entry has the correct userId
                      const existingAccount = res.rows[0];
                      if (existingAccount.userId !== userId) {
                          console.log('[AZURE AD SIGNIN] Updating existing account entry with correct userId');
                          console.log('[AZURE AD SIGNIN] Old userId:', existingAccount.userId, 'New userId:', userId);
                          await client.query(
                              'UPDATE "Account" SET "userId" = $1, access_token = $2, expires_at = $3, scope = $4, token_type = $5, id_token = $6 WHERE id = $7',
                              [userId, account.access_token, account.expires_at, account.scope, account.token_type, account.id_token, existingAccount.id]
                          );
                          console.log('[AZURE AD SIGNIN] Account entry updated successfully');
                      } else {
                          console.log('[AZURE AD SIGNIN] Account entry already has correct userId');
                      }
                  }
                  
                  console.log('[AZURE AD SIGNIN] Azure AD sign-in completed successfully');
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
          } else {
              console.log('[AZURE AD SIGNIN] Not an Azure AD sign-in or Azure AD not configured');
              console.log('[AZURE AD SIGNIN] - isAzureADConfigured():', isAzureADConfigured());
              console.log('[AZURE AD SIGNIN] - account.provider:', account?.provider);
              console.log('[AZURE AD SIGNIN] - profile.email:', profile?.email);
          }
          return true;
      }
    },
    pages: {
      signIn: '/auth/signin',
    },
    secret: process.env.NEXTAUTH_SECRET,
  }; 

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