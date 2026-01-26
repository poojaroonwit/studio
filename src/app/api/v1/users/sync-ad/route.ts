import { NextRequest, NextResponse } from 'next/server';
import { isAzureADConfigured } from '@/lib/auth';
import { hasAnyPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Hiring Manager User Group ID (default for Azure AD synced users)
const HIRING_MANAGER_GROUP_ID = '00000000-0000-0000-0000-000000000003';

/**
 * Get Microsoft Graph API client using client credentials flow
 */
async function getGraphClient() {
  if (!isAzureADConfigured()) {
    throw new Error('Azure AD is not configured');
  }

  const tenantId = process.env.AZURE_AD_TENANT_ID!;
  const clientId = process.env.AZURE_AD_CLIENT_ID!;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET!;

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  const client = Client.initWithMiddleware({ authProvider });
  return client;
}

/**
 * Fetch all users from Azure AD
 */
async function fetchAzureADUsers(graphClient: Client) {
  const users: any[] = [];
  let nextLink: string | undefined;

  do {
    const url = nextLink || '/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,department,jobTitle';
    const response = await graphClient.api(url).get();

    if (response.value) {
      users.push(...response.value);
    }

    nextLink = response['@odata.nextLink'];
  } while (nextLink);

  return users;
}

/**
 * POST /api/v1/users/sync-ad
 * Sync users from Azure AD to the system
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        message: 'Unauthorized: User session required.'
      },
      { status: 401 }
    );
  }

  const hasUserCreatePermission = hasAnyPermission(session.user, ['USERS_CREATE']);

  if (!hasUserCreatePermission) {
    await logAudit(
      'WARN',
      `Forbidden attempt to sync AD users by ${session?.user?.email || 'Unknown'} (ID: ${session?.user?.id || 'N/A'}). Required: USERS_CREATE permission.`,
      'API:V1:Users:SyncAD',
      session?.user?.id
    );
    return NextResponse.json(
      {
        success: false,
        message: 'Forbidden: You must have USERS_CREATE permission to sync users from Azure AD.'
      },
      { status: 403 }
    );
  }

  if (!isAzureADConfigured()) {
    return NextResponse.json(
      {
        success: false,
        message: 'Azure AD is not configured. Please configure Azure AD credentials in environment variables.'
      },
      { status: 400 }
    );
  }

  const client = await getPool().connect();
  let graphClient: Client | null = null;

  try {
    // Get Microsoft Graph client
    graphClient = await getGraphClient();

    // Fetch all users from Azure AD
    const adUsers = await fetchAzureADUsers(graphClient);

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    // Filter enabled users and prepare data
    const enabledUsers = adUsers.filter(u => u.accountEnabled !== false);
    const userDataMap = new Map();

    for (const adUser of enabledUsers) {
      const email = adUser.mail || adUser.userPrincipalName;
      if (!email || !adUser.id) continue;

      userDataMap.set(email, {
        email,
        name: adUser.displayName || email.split('@')[0],
        azureOid: adUser.id,
        department: adUser.department || null,
        jobTitle: adUser.jobTitle || null
      });
    }

    if (userDataMap.size === 0) {
      return NextResponse.json({
        success: true,
        message: 'No enabled users found to sync',
        data: results,
      });
    }

    // Batch query: Get all existing users in one query
    const emails = Array.from(userDataMap.keys());
    const azureOids = Array.from(userDataMap.values()).map(u => u.azureOid);

    const existingUsersResult = await client.query(
      'SELECT id, email, "azure_oid", "userGroupId" FROM "User" WHERE email = ANY($1::text[]) OR "azure_oid" = ANY($2::text[])',
      [emails, azureOids]
    );

    const existingUsersByEmail = new Map();
    const existingUsersByOid = new Map();

    for (const user of existingUsersResult.rows) {
      existingUsersByEmail.set(user.email, user);
      if (user.azure_oid) {
        existingUsersByOid.set(user.azure_oid, user);
      }
    }

    // Prepare batch operations
    const usersToUpdate: any[] = [];
    const usersToCreate: any[] = [];

    for (const [email, userData] of userDataMap) {
      try {
        const existingUser = existingUsersByEmail.get(email) || existingUsersByOid.get(userData.azureOid);

        if (existingUser) {
          // User exists - update azure_oid if missing
          if (!existingUser.azure_oid) {
            usersToUpdate.push({
              id: existingUser.id,
              azureOid: userData.azureOid
            });
          } else {
            results.skipped++;
          }
        } else {
          // User doesn't exist - prepare for creation
          usersToCreate.push(userData);
        }
      } catch (error) {
        results.errors.push({
          email,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Batch update existing users
    if (usersToUpdate.length > 0) {
      await client.query('BEGIN');
      try {
        for (const user of usersToUpdate) {
          await client.query(
            'UPDATE "User" SET "azure_oid" = $1, "authentication_methods" = $2 WHERE id = $3',
            [user.azureOid, ['azure_ad'], user.id]
          );
        }
        await client.query('COMMIT');
        results.updated = usersToUpdate.length;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    // Batch create new users
    if (usersToCreate.length > 0) {
      // SECURITY: Use cryptographically secure random for placeholder password
      const crypto = require('crypto');
      const secureRandom = crypto.randomBytes(32).toString('hex');
      const placeholderPassword = await bcrypt.hash('azure-ad-placeholder-' + Date.now() + '-' + secureRandom, 10);

      await client.query('BEGIN');
      try {
        for (const userData of usersToCreate) {
          const userId = uuidv4();
          await client.query(
            `INSERT INTO "User" (
              id, name, email, "emailVerified", role, password, 
              "authentication_methods", "azure_oid", "userGroupId", "is_active",
              department, "jobTitle",
              "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
            [
              userId,
              userData.name,
              userData.email,
              new Date(),
              'Recruiter',
              placeholderPassword,
              ['azure_ad'],
              userData.azureOid,
              HIRING_MANAGER_GROUP_ID,
              true,
              userData.department,
              userData.jobTitle,
            ]
          );
        }
        await client.query('COMMIT');
        results.created = usersToCreate.length;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    // Log audit trail
    await logAudit(
      'AUDIT',
      `Azure AD user sync completed by ${session.user.email}. Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`,
      'API:V1:Users:SyncAD',
      session.user.id,
      {
        created: results.created,
        updated: results.updated,
        skipped: results.skipped,
        errorCount: results.errors.length,
        totalAdUsers: adUsers.length,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Sync completed. Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`,
      data: results,
    });
  } catch (error) {
    console.error('[V1 AD SYNC] Error:', error);
    await logAudit(
      'ERROR',
      `Azure AD user sync failed by ${session.user.email}. Error: ${error instanceof Error ? error.message : String(error)}`,
      'API:V1:Users:SyncAD',
      session.user.id
    );

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to sync users from Azure AD',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
