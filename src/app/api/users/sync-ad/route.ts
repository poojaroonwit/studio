import { NextRequest, NextResponse } from 'next/server';
import { isAzureADConfigured } from '@/lib/auth';
import { hasAnyPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Client, ResponseType } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';
import { minioClient, MINIO_BUCKET, ensureBucketExists } from '@/lib/minio';
import { randomUUID } from 'crypto';

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

async function fetchAndUploadAvatar(graphClient: Client, azureOid: string): Promise<string | null> {
  try {
    // 1. Fetch photo from Graph API
    // Using simple fetch here because the Client's stream handling can be tricky to convert to buffer for MinIO
    // But since we have the client, let's try to use it if possible. 
    // Actually, getting the raw stream is better.
    // However, for Simplicity and robustness with MinIO putObject (which takes Buffer/Stream), let's use the graphClient.
    
    let photoStream;
    try {
        photoStream = await graphClient.api(`/users/${azureOid}/photo/$value`)
            .responseType(ResponseType.ARRAYBUFFER)
            .get();
    } catch (e: any) {
        if (e.statusCode === 404) return null; // No photo
        // console.warn(`Failed to fetch photo for ${azureOid}:`, e.statusCode);
        return null;
    }

    if (!photoStream) return null;

    const buffer = Buffer.from(photoStream);
    if (buffer.length === 0) return null;

    // 2. Upload to MinIO
    await ensureBucketExists();
    const timestamp = Date.now();
    const objectName = `profile-images/${timestamp}-${randomUUID()}.jpg`; // Graph API usually returns JPEG
    
    await minioClient.putObject(MINIO_BUCKET, objectName, buffer, buffer.length, {
      'Content-Type': 'image/jpeg',
      'x-amz-meta-uploaded-by': 'system-sync',
      'x-amz-meta-original-source': 'azure-ad',
    });

    // 3. Generate URL
    // Use the same URL format as the upload-image route
    const webAppUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:8021'}/api/secure-file/preview?filePath=${encodeURIComponent(objectName)}`;
    return webAppUrl;

  } catch (error) {
    console.error(`Error syncing avatar for ${azureOid}:`, error);
    return null;
  }
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
        results,
      });
    }

    // Batch query: Get all existing users in one query
    const emails = Array.from(userDataMap.keys());
    const azureOids = Array.from(userDataMap.values()).map(u => u.azureOid);
    
    // Extract unique departments
    const departments = new Set<string>();
    for (const user of userDataMap.values()) {
      if (user.department) {
        departments.add(user.department);
      }
    }

    // Sync Departments to User Teams
    const departmentToTeamIdMap = new Map<string, string>();
    if (departments.size > 0) {
      const departmentNames = Array.from(departments);
      
      // Find existing teams
      const existingTeamsResult = await client.query(
        'SELECT id, name FROM "UserTeam" WHERE name = ANY($1)',
        [departmentNames]
      );

      for (const team of existingTeamsResult.rows) {
        departmentToTeamIdMap.set(team.name, team.id);
      }

      // Create missing teams
      const missingDepartments = departmentNames.filter(d => !departmentToTeamIdMap.has(d));
      if (missingDepartments.length > 0) {
        await client.query('BEGIN');
        try {
          for (const deptName of missingDepartments) {
             const newTeamId = uuidv4();
             await client.query(
               'INSERT INTO "UserTeam" (id, name, description, "is_active", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())',
               [newTeamId, deptName, `Synced from Azure AD Department: ${deptName}`, true]
             );
             departmentToTeamIdMap.set(deptName, newTeamId);
          }
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          console.error('Error creating user teams for departments:', error);
          // Don't fail the whole sync, just log and continue - users will just not have teams assigned for failed ones
        }
      }
    }

    const existingUsersResult = await client.query(
      'SELECT id, email, "azure_oid", "userGroupId" FROM "User" WHERE email = ANY($1) OR "azure_oid" = ANY($2)',
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

    // Pre-fetch access token for avatar sync
    // We already have 'token' from line 125

    // OPTIMIZATION: Process in parallel chunks to avoid timeouts
    const userEntries = Array.from(userDataMap.entries());
    const CHUNK_SIZE = 5;
    
    for (let i = 0; i < userEntries.length; i += CHUNK_SIZE) {
      const chunk = userEntries.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(async ([email, userData]) => {
        try {
          const existingUser = existingUsersByEmail.get(email) || existingUsersByOid.get(userData.azureOid);
          const teamId = userData.department ? departmentToTeamIdMap.get(userData.department) : null;
          
          // Determine if we should sync avatar
          let avatarUrl = existingUser?.avatarUrl;
          
          // Policy: Sync avatar if new user OR existing user has no avatar
          // To force update every time, remove the check. defaulting to "fill if missing" for performance
          const shouldFetchAvatar = !existingUser || !existingUser.avatarUrl;
          
          if (shouldFetchAvatar && graphClient) {
             const fetchedUrl = await fetchAndUploadAvatar(graphClient, userData.azureOid);
             if (fetchedUrl) {
               avatarUrl = fetchedUrl;
             }
          }

          if (existingUser) {
            // User exists - update details
            usersToUpdate.push({
              id: existingUser.id,
              azureOid: userData.azureOid,
              department: userData.department,
              userTeamId: teamId,
              avatarUrl: avatarUrl
            });
          } else {
            // User doesn't exist - prepare for creation
            usersToCreate.push({
              ...userData,
              userTeamId: teamId,
              avatarUrl: avatarUrl
            });
          }
        } catch (error) {
          results.errors.push({
            email,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }));
    }

    // Batch update existing users
    if (usersToUpdate.length > 0) {
      await client.query('BEGIN');
      try {
        for (const user of usersToUpdate) {
          // Construct update query dynamically based on what needs updating
          await client.query(
            'UPDATE "User" SET "azure_oid" = $1, "authentication_method" = $2, "department" = $3, "userTeamId" = $4, "avatarUrl" = COALESCE($5, "avatarUrl") WHERE id = $6',
            [user.azureOid, 'azure', user.department, user.userTeamId, user.avatarUrl, user.id]
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
              "authentication_method", "azure_oid", "userGroupId", "is_active",
              department, "jobTitle", "userTeamId", "avatarUrl",
              "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
            [
              userId,
              userData.name,
              userData.email,
              new Date(),
              'Recruiter',
              placeholderPassword,
              'azure',
              userData.azureOid,
              HIRING_MANAGER_GROUP_ID,
              true,
              userData.department,
              userData.jobTitle,
              userData.userTeamId,
              userData.avatarUrl,
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

