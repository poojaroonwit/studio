import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAzureADConfigured } from '@/lib/auth';
import { hasAnyPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/auditLog';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { ClientSecretCredential } from '@azure/identity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
 * Lookup user in Azure AD by email and fetch additional fields
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { message: 'Unauthorized: User session required.' },
      { status: 401 }
    );
  }

  const hasUserViewPermission = hasAnyPermission(session.user, ['USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT']);

  if (!hasUserViewPermission) {
    await logAudit(
      'WARN',
      `Forbidden attempt to lookup AD user by ${session?.user?.email || 'Unknown'} (ID: ${session?.user?.id || 'N/A'}). Required: USERS_VIEW permission.`,
      'API:Users:LookupAD',
      session?.user?.id
    );
    return NextResponse.json(
      { message: 'Forbidden: You must have USERS_VIEW permission to lookup users in Azure AD.' },
      { status: 403 }
    );
  }

  if (!isAzureADConfigured()) {
    return NextResponse.json(
      { message: 'Azure AD is not configured. Please configure Azure AD credentials in environment variables.' },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { message: 'Email parameter is required.' },
      { status: 400 }
    );
  }

  let graphClient: Client | null = null;

  try {
    // Get Microsoft Graph client
    graphClient = await getGraphClient();

    // Lookup user by email - try multiple approaches
    const selectFields = 'id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,mobilePhone,businessPhones,officeLocation,accountEnabled';

    let adUser = null;

    // Approach 1: Try direct access by userPrincipalName (most common case)
    try {
      // console.log(`[AD LOOKUP] Trying direct access: /users/${email}`);
      const response = await graphClient
        .api(`/users/${encodeURIComponent(email)}`)
        .select(selectFields)
        .get();

      if (response && response.id) {
        adUser = response;
        // console.log(`[AD LOOKUP] Found user via direct access: ${adUser.displayName}`);
      }
    } catch (error: any) {
      // 404 is expected if user not found this way, continue to other methods
      if (error?.statusCode !== 404) {
        console.error('[AD LOOKUP] Error with direct access:', error?.message || error);
      }
    }

    // Approach 2: Try to find by mail property
    if (!adUser) {
      try {
        // console.log(`[AD LOOKUP] Trying filter by mail: ${email}`);
        const response = await graphClient
          .api(`/users?$filter=mail eq '${email}'&$select=${selectFields}`)
          .get();

        if (response.value && response.value.length > 0) {
          adUser = response.value[0];
          // console.log(`[AD LOOKUP] Found user via mail filter: ${adUser.displayName}`);
        }
      } catch (error: any) {
        console.error('[AD LOOKUP] Error searching by mail:', error?.message || error);
      }
    }

    // Approach 3: If not found by mail, try userPrincipalName filter
    if (!adUser) {
      try {
        // console.log(`[AD LOOKUP] Trying filter by userPrincipalName: ${email}`);
        const response = await graphClient
          .api(`/users?$filter=userPrincipalName eq '${email}'&$select=${selectFields}`)
          .get();

        if (response.value && response.value.length > 0) {
          adUser = response.value[0];
          // console.log(`[AD LOOKUP] Found user via userPrincipalName filter: ${adUser.displayName}`);
        }
      } catch (error: any) {
        console.error('[AD LOOKUP] Error searching by userPrincipalName:', error?.message || error);
      }
    }

    // Approach 4: Try startsWith search (case-insensitive, partial match)
    if (!adUser) {
      try {
        // console.log(`[AD LOOKUP] Trying startsWith search: ${email}`);
        const emailLower = email.toLowerCase();
        const response = await graphClient
          .api(`/users?$filter=startswith(toLower(mail),'${emailLower}') or startswith(toLower(userPrincipalName),'${emailLower}')&$select=${selectFields}`)
          .get();

        if (response.value && response.value.length > 0) {
          // Find exact match in case-insensitive manner
          adUser = response.value.find((u: any) =>
            u.mail?.toLowerCase() === emailLower ||
            u.userPrincipalName?.toLowerCase() === emailLower
          ) || response.value[0];
          // console.log(`[AD LOOKUP] Found user via startsWith search: ${adUser.displayName}`);
        }
      } catch (error: any) {
        console.error('[AD LOOKUP] Error with startsWith search:', error?.message || error);
      }
    }

    if (!adUser) {
      // console.log(`[AD LOOKUP] User not found in Azure AD: ${email}`);
      return NextResponse.json(
        { message: 'User not found in Azure AD.' },
        { status: 404 }
      );
    }

    // Return user data with additional fields
    const userData = {
      id: adUser.id,
      displayName: adUser.displayName,
      email: adUser.mail || adUser.userPrincipalName,
      userPrincipalName: adUser.userPrincipalName,
      jobTitle: adUser.jobTitle || null,
      department: adUser.department || null,
      officeLocation: adUser.officeLocation || null,
      mobilePhone: adUser.mobilePhone || null,
      businessPhones: adUser.businessPhones || [],
      accountEnabled: adUser.accountEnabled,
    };

    return NextResponse.json(userData, { status: 200 });
  } catch (error) {
    console.error('[AD LOOKUP] Error:', error);
    await logAudit(
      'ERROR',
      `Azure AD user lookup failed by ${session.user.email}. Error: ${error instanceof Error ? error.message : String(error)}`,
      'API:Users:LookupAD',
      session.user.id
    );

    return NextResponse.json(
      {
        message: 'Failed to lookup user in Azure AD',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

