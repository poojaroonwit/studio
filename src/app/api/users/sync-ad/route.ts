import { NextRequest, NextResponse } from 'next/server';
import { isGraphConfiguredAsync, getGraphClient } from '@/lib/graphClient';
import { hasAnyPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';
import { getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { ResponseType } from '@microsoft/microsoft-graph-client';
// Imports moved to lib/graphClient
import { minioClient, MINIO_BUCKET, ensureBucketExists } from '@/lib/minio';
import { randomUUID } from 'crypto';
import { logUserActivity } from '@/lib/userActivityLog';

import { auth } from '@/auth';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// local getGraphClient removed in favor of @/lib/graphClient

/**
 * Fetch all users from Azure AD with extended profile fields
 */
async function fetchAzureADUsers(graphClient: any) {
  const users: any[] = [];
  let nextLink: string | undefined;

  // Extended fields for comprehensive user profile sync
  const selectFields = [
    'id', 'displayName', 'mail', 'userPrincipalName', 'accountEnabled',
    'department', 'jobTitle', 'officeLocation',
    // New fields
    'employeeId', 'companyName', 'employeeType', 'employeeHireDate',
    'onPremisesSamAccountName',
    // Contact info
    'streetAddress', 'city', 'state', 'postalCode', 'country',
    'businessPhones', 'mobilePhone', 'otherMails'
  ].join(',');

  do {
    const url = nextLink || `/users?$select=${selectFields}&$expand=manager($select=displayName,mail)`;
    const response = await graphClient.api(url).get();

    if (response.value) {
      users.push(...response.value);
    }

    nextLink = response['@odata.nextLink'];
  } while (nextLink);

  return users;
}


async function fetchAndUploadAvatar(graphClient: any, azureOid: string): Promise<string | null> {
  try {
    // 1. Fetch photo from Graph API
    let photoStream;
    try {
      photoStream = await graphClient.api(`/users/${azureOid}/photo/$value`)
        .responseType(ResponseType.ARRAYBUFFER)
        .get();
    } catch (e: any) {
      if (e.statusCode === 404) return null; // No photo
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

    // 3. Generate URL (Relative URL to work across environments)
    const webAppUrl = `/api/secure-file/preview?filePath=${encodeURIComponent(objectName)}`;
    return webAppUrl;

  } catch (error) {
    console.error(`Error syncing avatar for ${azureOid}:`, error);
    return null;
  }
}

/**
 * Sync users from Azure AD to the system with streaming progress response
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  const encoder = new TextEncoder();

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

  if (!await isGraphConfiguredAsync()) {
    return NextResponse.json(
      { message: 'Azure AD is not configured. Please configure Azure AD credentials in environment variables.' },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (message: string, isError: boolean = false) => {
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'progress', message, isError }) + '\n'));
      };

      const sendResult = (data: any) => {
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'result', ...data }) + '\n'));
      };

      const client = await getPool().connect();

      try {
        sendProgress('Connecting to Azure AD...');
        // Get Microsoft Graph client
        const graphClient = await getGraphClient();

        sendProgress('Fetching users from Azure AD...');
        // Fetch all users from Azure AD
        const adUsers = await fetchAzureADUsers(graphClient);

        sendProgress(`Fetched ${adUsers.length} users from Azure AD. Processing...`);

        const results = {
          created: 0,
          updated: 0,
          deleted: 0, // Users marked as deleted from AD
          errors: [] as Array<{ email: string; error: string }>,
        };

        // Process ALL users (not just enabled) so we can sync account status for existing users
        const userDataMap = new Map();

        for (const adUser of adUsers) {
          const email = adUser.mail || adUser.userPrincipalName;
          if (!email || !adUser.id) continue;

          // Build contact info JSON
          const contactInfo = {
            streetAddress: adUser.streetAddress || null,
            city: adUser.city || null,
            stateOrProvince: adUser.state || null,
            postalCode: adUser.postalCode || null,
            country: adUser.country || null,
            businessPhone: adUser.businessPhones?.[0] || null,
            mobilePhone: adUser.mobilePhone || null,
            otherEmails: adUser.otherMails || []
          };

          userDataMap.set(email, {
            email,
            name: adUser.displayName || email.split('@')[0],
            azureOid: adUser.id,
            department: adUser.department || null,
            jobTitle: adUser.jobTitle || null,
            officeLocation: adUser.officeLocation || null,
            // New fields
            employeeId: adUser.employeeId || null,
            companyName: adUser.companyName || null,
            employeeType: adUser.employeeType || null,
            hireDate: adUser.employeeHireDate ? new Date(adUser.employeeHireDate) : null,
            manager: adUser.manager?.displayName || null,
            managerEmail: adUser.manager?.mail || null,
            samAccountName: adUser.onPremisesSamAccountName || null,
            contactInfo: contactInfo,
            // Account status - sync enabled/disabled state
            accountEnabled: adUser.accountEnabled !== false
          });
        }

        if (userDataMap.size === 0) {
          sendResult({
            success: true,
            message: 'No enabled users found to sync',
            results,
          });
          client.release();
          controller.close();
          return;
        }

        // Batch query: Get all existing users in one query
        const emails = Array.from(userDataMap.keys());
        const azureOids = Array.from(userDataMap.values()).map(u => u.azureOid);

        sendProgress('Syncing departments and teams...');

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
            'SELECT id, name FROM "UserTeam" WHERE name = ANY($1::text[])',
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
          'SELECT id, email, "azure_oid", "userGroupId", "avatarUrl" FROM "User" WHERE email = ANY($1::text[]) OR "azure_oid" = ANY($2::text[])',
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

        sendProgress('Processing users and syncing avatars...');

        // Prepare batch operations
        const usersToUpdate: any[] = [];
        const usersToCreate: any[] = [];

        // OPTIMIZATION: Process in parallel chunks to avoid timeouts
        const userEntries = Array.from(userDataMap.entries());
        const CHUNK_SIZE = 5;

        for (let i = 0; i < userEntries.length; i += CHUNK_SIZE) {
          const chunk = userEntries.slice(i, i + CHUNK_SIZE);

          // Emit progress every chunk
          sendProgress(`Processing users ${Math.min(i + CHUNK_SIZE, userEntries.length)} of ${userEntries.length}...`);

          await Promise.all(chunk.map(async ([email, userData]) => {
            try {
              const existingUser = existingUsersByEmail.get(email) || existingUsersByOid.get(userData.azureOid);
              const teamId = userData.department ? departmentToTeamIdMap.get(userData.department) : null;

              // Determine if we should sync avatar
              let avatarUrl = existingUser?.avatarUrl;

              // Policy: Sync avatar if new user OR existing user has no avatar
              const shouldFetchAvatar = !existingUser || !existingUser.avatarUrl;

              if (shouldFetchAvatar && graphClient) {
                const fetchedUrl = await fetchAndUploadAvatar(graphClient, userData.azureOid);
                if (fetchedUrl) {
                  avatarUrl = fetchedUrl;
                }
              }

              if (existingUser) {
                // User exists - update details with all Azure AD profile fields
                usersToUpdate.push({
                  id: existingUser.id,
                  azureOid: userData.azureOid,
                  department: userData.department,
                  userTeamId: teamId,
                  avatarUrl: avatarUrl,
                  officeLocation: userData.officeLocation,
                  employeeId: userData.employeeId,
                  companyName: userData.companyName,
                  employeeType: userData.employeeType,
                  hireDate: userData.hireDate,
                  manager: userData.manager,
                  samAccountName: userData.samAccountName,
                  contactInfo: userData.contactInfo,
                  isActive: userData.accountEnabled // Sync account enabled status
                });
              } else if (userData.accountEnabled) {
                // Only create NEW users if account is enabled in Azure AD
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
          sendProgress(`Updating ${usersToUpdate.length} existing users in database...`);
          await client.query('BEGIN');
          try {
            for (const user of usersToUpdate) {
              // Update with all Azure AD profile fields including account status
              await client.query(
                `UPDATE "User" SET 
                  "azure_oid" = $1, "authentication_methods" = $2, "department" = $3, 
                  "userTeamId" = $4, "avatarUrl" = COALESCE($5, "avatarUrl"),
                  "office_location" = COALESCE($6, "office_location"),
                  "employee_id" = COALESCE($7, "employee_id"),
                  "company_name" = COALESCE($8, "company_name"),
                  "employee_type" = COALESCE($9, "employee_type"),
                  "hire_date" = COALESCE($10, "hire_date"),
                  "manager" = COALESCE($11, "manager"),
                  "manager_email" = COALESCE($12, "manager_email"),
                  "sam_account_name" = COALESCE($13, "sam_account_name"),
                  "contact_info" = COALESCE($14, "contact_info"),
                  "is_active" = $15
                WHERE id = $16`,
                [
                  user.azureOid, ['azure_ad'], user.department, user.userTeamId, user.avatarUrl,
                  user.officeLocation, user.employeeId, user.companyName, user.employeeType,
                  user.hireDate, user.manager, user.managerEmail, user.samAccountName,
                  user.contactInfo ? JSON.stringify(user.contactInfo) : null,
                  user.isActive,
                  user.id
                ]
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
          sendProgress(`Creating ${usersToCreate.length} new users in database...`);
          // SECURITY: Use cryptographically secure random for placeholder password
          const crypto = require('crypto');
          const secureRandom = crypto.randomBytes(32).toString('hex');
          const placeholderPassword = await bcrypt.hash('azure-ad-placeholder-' + Date.now() + '-' + secureRandom, 10);

          // Ensure Hiring Manager group exists and get its ID
          let hiringManagerGroupId: string;
          const groupResult = await client.query(
            'SELECT id FROM "UserGroup" WHERE name = $1',
            ['Hiring Manager']
          );

          if (groupResult.rows.length > 0) {
            hiringManagerGroupId = groupResult.rows[0].id;
          } else {
            // Create if not exists (fallback)
            hiringManagerGroupId = uuidv4();
            await client.query(
              `INSERT INTO "UserGroup" (id, name, description, permissions, "is_default", "is_system_role", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
              [
                hiringManagerGroupId,
                'Hiring Manager',
                'View-only access for hiring decisions',
                ['CANDIDATES_VIEW', 'CANDIDATES_VIEW_DETAILED', 'CANDIDATES_COMMENTS_VIEW', 'POSITIONS_VIEW', 'TASK_BOARD_VIEW', 'DASHBOARD_VIEW', 'USER_PREFERENCES_MANAGE_OWN'],
                false,
                false
              ]
            );
          }

          await client.query('BEGIN');
          try {
            for (const userData of usersToCreate) {
              const userId = uuidv4();
              await client.query(
                `INSERT INTO "User" (
                  id, name, email, "emailVerified", role, password, 
                  "authentication_methods", "azure_oid", "userGroupId", "is_active",
                  department, "position_title", "userTeamId", "avatarUrl",
                  "office_location", "employee_id", "company_name", "employee_type",
                  "hire_date", "manager", "manager_email", "sam_account_name", "contact_info",
                  "createdAt", "updatedAt"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW())`,
                [
                  userId,
                  userData.name,
                  userData.email,
                  new Date(),
                  'Hiring Manager',
                  placeholderPassword,
                  ['azure_ad'],
                  userData.azureOid,
                  hiringManagerGroupId,
                  true,
                  userData.department,
                  userData.jobTitle,
                  userData.userTeamId,
                  userData.avatarUrl,
                  userData.officeLocation,
                  userData.employeeId,
                  userData.companyName,
                  userData.employeeType,
                  userData.hireDate,
                  userData.manager,
                  userData.managerEmail,
                  userData.samAccountName,
                  userData.contactInfo ? JSON.stringify(userData.contactInfo) : null,
                ]
              );
            }
            await client.query('COMMIT');
            results.created = usersToCreate.length;

            // Log activity for each created user
            for (const userData of usersToCreate) {
              // Find the user ID - query by email since we just created them
              const createdUser = await client.query(
                'SELECT id FROM "User" WHERE email = $1',
                [userData.email]
              );
              if (createdUser.rows[0]) {
                await logUserActivity({
                  userId: createdUser.rows[0].id,
                  action: 'AD_SYNC_CREATED',
                  details: { syncedBy: session.user.email },
                  performedBy: session.user.id
                });
              }
            }
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          }
        }

        // Log activity for updated users
        for (const user of usersToUpdate) {
          await logUserActivity({
            userId: user.id,
            action: 'AD_SYNC_UPDATE',
            details: {
              syncedBy: session.user.email,
              isActive: user.isActive
            },
            performedBy: session.user.id
          });
        }

        // DETECT USERS DELETED FROM AZURE AD
        sendProgress('Checking for deleted users...');

        // Find users in our DB with azure_oid but NOT in the current AD user list
        const adOidsSet = new Set(Array.from(userDataMap.values()).map((u: any) => u.azureOid));

        const azureUsersInDB = await client.query(
          'SELECT id, email, "azure_oid", "deleted_from_ad" FROM "User" WHERE "azure_oid" IS NOT NULL AND "deleted_from_ad" = false AND \'azure_ad\' = ANY("authentication_methods")'
        );

        const usersDeletedFromAD = azureUsersInDB.rows.filter(
          (dbUser: any) => !adOidsSet.has(dbUser.azure_oid)
        );

        if (usersDeletedFromAD.length > 0) {
          sendProgress(`Marking ${usersDeletedFromAD.length} users as deleted...`);
          await client.query('BEGIN');
          try {
            for (const deletedUser of usersDeletedFromAD) {
              // Mark as deleted from AD and disable account
              await client.query(
                'UPDATE "User" SET "deleted_from_ad" = true, "is_active" = false WHERE id = $1',
                [deletedUser.id]
              );

              // Log activity
              await logUserActivity({
                userId: deletedUser.id,
                action: 'DELETED_FROM_AD',
                details: {
                  markedBy: 'AD_SYNC',
                  previousEmail: deletedUser.email,
                  syncedBy: session.user.email
                },
                performedBy: session.user.id
              });

              results.deleted++;
            }
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            console.error('[AD SYNC] Failed to mark deleted users:', error);
            // Don't throw - continue with sync
          }
        }

        sendProgress('Sync completed successfully.');

        // Log audit trail
        await logAudit(
          'AUDIT',
          `Azure AD user sync completed by ${session.user.email}. Created: ${results.created}, Updated: ${results.updated}, Deleted: ${results.deleted}, Errors: ${results.errors.length}`,
          'API:Users:SyncAD',
          session.user.id,
          {
            created: results.created,
            updated: results.updated,
            deleted: results.deleted,
            errorCount: results.errors.length,
            totalAdUsers: adUsers.length,
          }
        );

        sendResult({
          success: true,
          message: `Sync completed. Created: ${results.created}, Updated: ${results.updated}, Deleted from AD: ${results.deleted}, Errors: ${results.errors.length}`,
          results,
        });

      } catch (error) {
        console.error('[AD SYNC] Error:', error);

        // Log the error
        await logAudit(
          'ERROR',
          `Azure AD user sync failed by ${session.user.email}. Error: ${error instanceof Error ? error.message : String(error)}`,
          'API:Users:SyncAD',
          session.user.id
        );

        // Send error as result
        sendResult({
          success: false,
          message: 'Failed to sync users from Azure AD',
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        client.release();
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/json' }, // We'll parse NDJSON or just concatenated JSONs, but let's stick to text/plain or stick to chunks
  });
}
