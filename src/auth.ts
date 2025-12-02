/**
 * NextAuth v5 (Auth.js) Configuration
 * 
 * This file replaces the old authOptions from src/lib/auth.ts
 * NextAuth v5 uses a different structure optimized for Next.js 15 App Router
 */

import NextAuth from "next-auth";
import AzureAD from "next-auth/providers/azure-ad";
import Credentials from "next-auth/providers/credentials";
import { getPool } from '@/lib/db';
import { authenticateUser, getUserSessionData, getUserPermissions } from '@/lib/authUtils';
import bcrypt from 'bcryptjs';
import { logAudit } from '@/lib/auditLog';
import type { UserProfile, PlatformModuleId } from '@/lib/types';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';
import { getSystemSetting } from '@/lib/settings';

// Check if Azure AD is configured
const isAzureADConfigured = () => {
  const hasClientId = process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_ID !== 'your_azure_ad_application_client_id';
  const hasClientSecret = process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_CLIENT_SECRET !== 'your_azure_ad_client_secret_value';
  const hasTenantId = process.env.AZURE_AD_TENANT_ID && process.env.AZURE_AD_TENANT_ID !== 'your_azure_ad_directory_tenant_id';

  return hasClientId && hasClientSecret && hasTenantId;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // Azure AD provider (only if configured)
    // IMPORTANT: In Azure AD App Registration, add the following redirect URI:
    // {NEXTAUTH_URL}/api/auth/callback/azure-ad
    // Example: https://yourdomain.com/api/auth/callback/azure-ad
    // NextAuth v5 automatically uses this path for OAuth callbacks
    // 
    // Common OAuthCallbackError causes:
    // 1. Redirect URI mismatch - must match exactly in Azure AD
    // 2. Invalid client secret - check if secret has expired or been rotated
    // 3. Client type mismatch - ensure app is configured as "Web" not "Public client"
    // 4. Missing required API permissions in Azure AD
    ...(isAzureADConfigured() ? [
      AzureAD({
        clientId: process.env.AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        tenantId: process.env.AZURE_AD_TENANT_ID!,
        // Explicitly use tenant-specific endpoint to avoid AADSTS50194 error
        // (single-tenant apps cannot use /common endpoint)
        issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
        authorization: {
          params: {
            scope: "openid profile email",
            response_mode: "query", // Use query mode for better error visibility
          },
        },
        // Add checks configuration
        checks: ["pkce", "state"],
      } as any)
    ] : []),
    // Credentials provider
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, request?: any) {
        // Check if basic auth is enabled
        const basicAuthEnabled = await getSystemSetting('basicAuthEnabled');
        if (basicAuthEnabled === 'false') {
          throw new Error("Basic username/password login is disabled. Please use Azure AD or another configured authentication method.");
        }

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter both email and password.");
        }

        const user = await authenticateUser(credentials.email as string, credentials.password as string);

        if (user) {
          // Detect mobile device from request headers (if available)
          // Note: In NextAuth v5, request parameter may not always be available
          // Mobile detection will also happen in JWT callback as fallback
          let isMobile = false;
          if (request?.headers) {
            const userAgent = request.headers.get?.('user-agent') || request.headers['user-agent'] || '';
            isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
          }
          
          // Store mobile flag in user object (will be passed to JWT callback)
          (user as any).isMobile = isMobile;
          
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
    maxAge: 8 * 60 * 60, // 8 hours (default, will be overridden for mobile)
    updateAge: 2 * 60 * 60, // 2 hours
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true, // Required when behind a proxy/load balancer (e.g., dev-ncc-cv-screening.qsncc.com)
  callbacks: {
    async jwt({ token, user, account, profile }) {
      try {
        // If account and user are present (on sign-in), set token fields
        if (account && user) {
          // Detect mobile device and set session timeout accordingly
          const isMobile = (user as any)?.isMobile ?? (profile as any)?.isMobile ?? false;
          
          // Set mobile flag in token for future reference
          (token as any).isMobile = isMobile;
          
          // Set custom expiration for mobile (3 hours) vs desktop (8 hours)
          const maxAgeSeconds = isMobile ? (3 * 60 * 60) : (8 * 60 * 60);
          (token as any).exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
          
          token.accessToken = account.access_token;
          token.id = user.id;
          token.role = user.role || 'Recruiter';

          const modulePermissions = Array.isArray(user.modulePermissions)
            ? (user.modulePermissions as PlatformModuleId[])
            : [];
          token.modulePermissions = modulePermissions;

          (token as any).name = user.name;
          (token as any).avatarUrl = (user as any).avatarUrl;
          (token as any).personalColor = (user as any).personalColor;
        }

        // If token.id is not a valid UUID, fetch the user by email or azure_oid
        if (typeof token.id === "string" && !validateUuid(token.id)) {
          const client = await getPool().connect();
          try {
            const oid = (profile as any)?.oid ?? (profile as any)?.sub ?? profile?.email;
            const res = await client.query('SELECT id FROM "User" WHERE email = $1 OR "azure_oid" = $2', [profile?.email, oid]);
            const dbUser = res.rows[0];
            if (dbUser) {
              token.id = dbUser.id;
            }
          } catch (e) {
            console.error('[JWT CALLBACK] Error fetching user UUID for Azure AD:', e);
          } finally {
            client.release();
          }
        }

        // Fetch fresh permissions and user data if needed
        if (typeof token.id === 'string' && validateUuid(token.id as string)) {
          const needsFreshData = user || !token.modulePermissions || !token.role || !(token as any).name;

          if (needsFreshData) {
            try {
              const freshPermissions = await getUserPermissions(token.id as string);
              const modulePermissions = Array.isArray(freshPermissions)
                ? (freshPermissions as PlatformModuleId[])
                : [];
              token.modulePermissions = modulePermissions;

              const userData = await getUserSessionData(token.id as string);
              if (userData) {
                token.role = userData.role as UserProfile['role'];
                (token as any).name = userData.name;
                (token as any).avatarUrl = userData.avatarUrl || userData.image || null;
                (token as any).personalColor = userData.personalColor || null;
              }
            } catch (e) {
              console.error('[JWT CALLBACK] Error fetching user data:', e);
              if (!token.modulePermissions) {
                token.modulePermissions = [];
              }
              if (!token.role) {
                token.role = 'Recruiter';
              }
            }
          }
        }

        // Ensure token always has valid structure
        if (!token.modulePermissions) {
          token.modulePermissions = [];
        }
        if (!token.role) {
          token.role = 'Recruiter';
        }
        
        // Check token expiration and set if missing (respect mobile timeout)
        const currentTime = Math.floor(Date.now() / 1000);
        const tokenExp = (token as any).exp;
        
        // If token doesn't have expiration set, set it based on mobile flag
        if (!tokenExp) {
          const isMobile = (token as any).isMobile ?? false;
          const maxAgeSeconds = isMobile ? (3 * 60 * 60) : (8 * 60 * 60);
          (token as any).exp = currentTime + maxAgeSeconds;
        }
      } catch (error) {
        console.error('[JWT CALLBACK] Critical error:', error);
        token.modulePermissions = token.modulePermissions || [];
        token.role = token.role || 'Recruiter';
      }

      return token;
    },
    async session({ session, token }) {
      if (!session || !session.user) {
        console.error('[SESSION CALLBACK] Invalid session object:', session);
        return session;
      }

      // Check if token is expired (respecting mobile 3-hour timeout)
      const currentTime = Math.floor(Date.now() / 1000);
      const tokenExp = (token as any).exp;
      if (tokenExp && tokenExp < currentTime) {
        // Token expired - session will be invalid
        throw new Error('Session expired');
      }

      try {
        // Validate token.id is a valid UUID
        if (typeof token.id === 'string' && !validateUuid(token.id)) {
          console.error('[SESSION CALLBACK] Invalid UUID in token.id:', token.id);
          session.user.id = '';
        } else {
          session.user.id = token.id as string;
        }

        const userRole = (token.role as UserProfile['role']) || 'Recruiter';
        session.user.role = userRole;

        const modulePermissions = Array.isArray(token.modulePermissions)
          ? (token.modulePermissions as PlatformModuleId[])
          : [];
        session.user.modulePermissions = modulePermissions;

        // Fetch user data if needed
        if (token.id && validateUuid(token.id as string) && (!(token as any).avatarUrl || !(token as any).personalColor || !token.role)) {
          try {
            const userData = await getUserSessionData(token.id as string);
            if (userData) {
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

              session.user.role = userData.role as UserProfile['role'];
              token.role = userData.role as UserProfile['role'];
              session.user.name = userData.name;
              (token as any).name = userData.name;
              session.user.avatarUrl = userData.avatarUrl || userData.image || null;
              session.user.personalColor = userData.personalColor || null;
              (token as any).avatarUrl = session.user.avatarUrl;
              (token as any).personalColor = session.user.personalColor;
            }
          } catch (error) {
            console.error('[SESSION CALLBACK] Error fetching user data:', error);
          }
        } else {
          session.user.name = (token as any).name || session.user.name;
          session.user.avatarUrl = (token as any).avatarUrl || null;
          session.user.personalColor = (token as any).personalColor || null;
        }
      } catch (error) {
        console.error('[SESSION CALLBACK] Critical error:', error);
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
      // Handle Azure AD sign-in
      if (isAzureADConfigured() && account?.provider === 'azure-ad' && profile?.email) {
        const client = await getPool().connect();
        try {
          const oid = (profile as any)?.oid ?? (profile as any)?.sub ?? profile?.email;
          const picture = (profile as any).picture ?? null;

          // Validate required profile data
          if (!profile.email) {
            console.error('[AZURE AD SIGNIN] Missing email in profile:', profile);
            await logAudit('ERROR', `Azure AD sign-in failed: Missing email in profile for user ${profile.name || 'Unknown'}.`, 'Auth:SignIn', null);
            return false;
          }

          if (!oid) {
            console.error('[AZURE AD SIGNIN] Missing OID in profile:', profile);
            await logAudit('ERROR', `Azure AD sign-in failed: Missing OID in profile for user ${profile.email}.`, 'Auth:SignIn', null);
            return false;
          }

          let res = await client.query('SELECT * FROM "User" WHERE email = $1 OR "azure_oid" = $2', [profile.email, oid]);
          let dbUser = res.rows[0];

          if (!dbUser) {
            try {
              const placeholderPassword = await bcrypt.hash('azure-ad-placeholder-' + Date.now(), 10);
              const uuid = uuidv4();
              const preRegisteredGroupId = '00000000-0000-0000-0000-000000000004';

              await client.query(
                'INSERT INTO "User" (id, name, email, "emailVerified", image, role, password, "authentication_method", "azure_oid", "userGroupId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                [uuid, profile.name || profile.email, profile.email, new Date(), picture, 'Recruiter', placeholderPassword, 'azure', oid, preRegisteredGroupId]
              );

              res = await client.query('SELECT * FROM "User" WHERE email = $1 OR "azure_oid" = $2', [profile.email, oid]);
              dbUser = res.rows[0];

              if (!dbUser) {
                console.error('[AZURE AD SIGNIN] Failed to retrieve user after creation');
                await logAudit('ERROR', `Azure AD sign-in failed: Could not retrieve user after creation for ${profile.email}.`, 'Auth:SignIn', null);
                return false;
              }

              await logAudit('AUDIT', `New user '${profile.name || profile.email}' created via Azure AD SSO.`, 'Auth:SignIn', dbUser.id);
              await logAudit('AUDIT', `User '${profile.name || profile.email}' assigned to Pre-Registered User group via Azure AD SSO.`, 'Auth:SignIn', dbUser.id);
            } catch (createError) {
              console.error('[AZURE AD SIGNIN] Error creating user:', createError);
              await logAudit('ERROR', `Azure AD sign-in failed: Error creating user ${profile.email}. Error: ${createError instanceof Error ? createError.message : String(createError)}`, 'Auth:SignIn', null);
              return false;
            }
          } else {
            // Check if user is active
            if (!dbUser.is_active) {
              console.error('[AZURE AD SIGNIN] User account is disabled:', profile.email);
              await logAudit('WARN', `Azure AD sign-in blocked: User account ${profile.email} is disabled.`, 'Auth:SignIn', dbUser.id);
              return false;
            }

            if (!dbUser.userGroupId) {
              const preRegisteredGroupId = '00000000-0000-0000-0000-000000000004';
              try {
                await client.query('UPDATE "User" SET "userGroupId" = $1 WHERE id = $2', [preRegisteredGroupId, dbUser.id]);
                await logAudit('AUDIT', `User '${profile.name || profile.email}' assigned to Pre-Registered User group via Azure AD SSO (existing user).`, 'Auth:SignIn', dbUser.id);
              } catch (groupError) {
                console.error('[AZURE AD SIGNIN] Error assigning user to Pre-Registered User group:', groupError);
                // Don't fail sign-in for this, just log the error
              }
            }
          }

          const userId = dbUser.id;

          // Link or update account
          try {
            res = await client.query('SELECT * FROM "Account" WHERE "provider" = $1 AND "providerAccountId" = $2', [account.provider, account.providerAccountId]);
            if (res.rows.length === 0) {
              await client.query(
                'INSERT INTO "Account" (id, "userId", type, provider, "providerAccountId", access_token, expires_at, scope, token_type, id_token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                [uuidv4(), userId, account.type, account.provider, account.providerAccountId, account.access_token, account.expires_at, account.scope, account.token_type, account.id_token]
              );
            } else {
              const existingAccount = res.rows[0];
              if (existingAccount.userId !== userId) {
                await client.query(
                  'UPDATE "Account" SET "userId" = $1, access_token = $2, expires_at = $3, scope = $4, token_type = $5, id_token = $6 WHERE id = $7',
                  [userId, account.access_token, account.expires_at, account.scope, account.token_type, account.id_token, existingAccount.id]
                );
              }
            }
          } catch (accountError) {
            console.error('[AZURE AD SIGNIN] Error linking account (non-critical):', accountError);
            // Don't fail sign-in for account linking errors, just log
          }

          // Set user ID for JWT callback
          if (user) {
            (user as any).id = userId;
          }
        } catch (err) {
          console.error('[AZURE AD SIGNIN] Critical error during Azure AD sign-in DB operations:', err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorStack = err instanceof Error ? err.stack : undefined;
          console.error('[AZURE AD SIGNIN] Error stack:', errorStack);

          try {
            await logAudit('ERROR', `Azure AD sign-in failed: Critical database error for ${profile?.email || 'unknown user'}. Error: ${errorMessage}`, 'Auth:SignIn', null);
          } catch (logError) {
            console.error('[AZURE AD SIGNIN] Failed to log audit entry:', logError);
          }

          return false;
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
      } catch (_) { }
    },
    async signOut({ session, token }: any) {
      try {
        const actingUserId = token?.id || null;
        const userName = session?.user?.name || session?.user?.email || 'User';
        await logAudit(
          'AUDIT',
          `User '${userName}' signed out.`,
          'Auth:SignOut',
          actingUserId
        );
      } catch (_) { }
    }
  }
});

