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

// Pre-Registered User Group ID
const PRE_REGISTERED_USER_GROUP_ID = '00000000-0000-0000-0000-000000000004';

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
    const url = nextLink || '/users?$select=id,displayName,mail,userPrincipalName,accountEnabled';
    const response = await graphClient.api(url).get();

    if (response.value) {
      users.push(...response.value);
    }

    nextLink = response['@odata.nextLink'];
  } while (nextLink);

  return users;
}

/**
 * Sync users from Azure AD to the system
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json(
      { message: 'Unauthorized: User session required.' },
      { status: 401 }
    );
  }

  const hasUserCreatePermission = hasAnyPermission(session.user, ['USERS_CREATE']);
  
  if (!hasUserCreatePermission) {
    await logAudit(
      'WARN',
      `Forbidden attempt to sync AD users by ${session?.user?.email || 'Unknown'} (ID: ${session?.user?.id || 'N/A'}). Required: USERS_CREATE permission.`,
      'API:Users:SyncAD',
      session?.user?.id
    );
    return NextResponse.json(
      { message: 'Forbidden: You must have USERS_CREATE permission to sync users from Azure AD.' },
      { status: 403 }
    );
  }

  if (!isAzureADConfigured()) {
    return NextResponse.json(
      { message: 'Azure AD is not configured. Please configure Azure AD credentials in environment variables.' },
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
      errors: [] as Array<{ email: string; error: string }>,
    };

    // Process each AD user
    for (const adUser of adUsers) {
      try {
        // Skip disabled accounts
        if (adUser.accountEnabled === false) {
          continue;
        }

        // Get email - prefer mail, fallback to userPrincipalName
        const email = adUser.mail || adUser.userPrincipalName;
        if (!email) {
          results.errors.push({
            email: adUser.displayName || 'Unknown',
            error: 'No email address found',
          });
          continue;
        }

        // Get display name
        const name = adUser.displayName || email.split('@')[0];
        const azureOid = adUser.id;

        if (!azureOid) {
          results.errors.push({
            email,
            error: 'No Azure Object ID found',
          });
          continue;
        }

        // Check if user exists by email or azure_oid
        const existingUserResult = await client.query(
          'SELECT id, "azure_oid", "userGroupId" FROM "User" WHERE email = $1 OR "azure_oid" = $2',
          [email, azureOid]
        );
        const existingUser = existingUserResult.rows[0];

        if (existingUser) {
          // User exists - update azure_oid if missing
          if (!existingUser.azure_oid) {
            await client.query(
              'UPDATE "User" SET "azure_oid" = $1, "authentication_method" = $2 WHERE id = $3',
              [azureOid, 'azure', existingUser.id]
            );
            results.updated++;
          } else {
            // User already synced, skip
            continue;
          }
        } else {
          // User doesn't exist - create new user
          // SECURITY: Use cryptographically secure random for placeholder password
          const crypto = require('crypto');
          const secureRandom = crypto.randomBytes(32).toString('hex');
          const placeholderPassword = await bcrypt.hash('azure-ad-placeholder-' + Date.now() + '-' + secureRandom, 10);
          const userId = uuidv4();

          await client.query(
            `INSERT INTO "User" (
              id, name, email, "emailVerified", role, password, 
              "authentication_method", "azure_oid", "userGroupId", "is_active", 
              "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
            [
              userId,
              name,
              email,
              new Date(),
              'Recruiter', // Role for compatibility, but permissions come from UserGroup
              placeholderPassword,
              'azure',
              azureOid,
              PRE_REGISTERED_USER_GROUP_ID, // Assign to Pre-Registered User group
              true, // isActive
            ]
          );

          results.created++;
        }
      } catch (error) {
        const email = adUser.mail || adUser.userPrincipalName || adUser.displayName || 'Unknown';
        results.errors.push({
          email,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(`[AD SYNC] Error processing user ${email}:`, error);
      }
    }

    // Log audit trail
    await logAudit(
      'AUDIT',
      `Azure AD user sync completed by ${session.user.email}. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors.length}`,
      'API:Users:SyncAD',
      session.user.id,
      {
        created: results.created,
        updated: results.updated,
        errorCount: results.errors.length,
        totalAdUsers: adUsers.length,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Sync completed. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors.length}`,
      results,
    });
  } catch (error) {
    console.error('[AD SYNC] Error:', error);
    await logAudit(
      'ERROR',
      `Azure AD user sync failed by ${session.user.email}. Error: ${error instanceof Error ? error.message : String(error)}`,
      'API:Users:SyncAD',
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

