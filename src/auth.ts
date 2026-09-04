/**
 * Obsi People authentication configuration.
 *
 * Outborn Account is the authoritative human identity provider in production.
 * Local credentials and Azure AD are legacy fallbacks for development only and
 * must be explicitly enabled via feature flags. Production fails closed without
 * Outborn Account configuration.
 *
 * HR permissions, employee linkage, and session mappings remain Obsi People-owned
 * regardless of identity provider.
 */

import NextAuth from 'next-auth';
import AzureAD from 'next-auth/providers/azure-ad';

import { getResolvedAzureAdSettings } from '@/lib/auth-azure-ad-settings';
import { buildAuthCallbacks } from '@/lib/auth-callbacks';
import { buildCredentialsProvider } from '@/lib/auth-credentials-provider';
import { buildAuthEvents } from '@/lib/auth-events';
import { getConfiguredOutbornAccountProvider } from '@/lib/auth-outborn-account-provider';

const getAuthConfig = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const outbornAccountProvider = getConfiguredOutbornAccountProvider();

  // In production, Outborn Account is required and authoritative.
  if (isProduction && !outbornAccountProvider) {
    throw new Error(
      'Production requires Outborn Account configuration. Set OUTBORN_ACCOUNT_AUTH_URL and OUTBORN_HRIVE_WEB_CLIENT_ID.',
    );
  }

  // Development/testing: legacy providers are opt-in only.
  const legacyAzureEnabled = process.env.HRIVE_LEGACY_AZURE_AUTH_ENABLED === 'true' && !isProduction;
  const legacyCredentialsEnabled = process.env.HRIVE_LEGACY_CREDENTIALS_AUTH_ENABLED === 'true' && !isProduction;
  const azureAdSettings = legacyAzureEnabled ? await getResolvedAzureAdSettings() : null;

  const providers = [
    ...(outbornAccountProvider ? [outbornAccountProvider] : []),
    ...(legacyAzureEnabled && azureAdSettings?.isConfigured ? [
      AzureAD({
        clientId: azureAdSettings.clientId!,
        clientSecret: azureAdSettings.clientSecret!,
        issuer: `https://login.microsoftonline.com/${azureAdSettings.tenantId}/v2.0`,
        authorization: {
          params: {
            scope: 'openid profile email',
            response_mode: 'query',
          },
        },
        checks: ['pkce', 'state'],
      }),
    ] : []),
    ...(legacyCredentialsEnabled ? [buildCredentialsProvider()] : []),
  ];

  if (providers.length === 0) {
    throw new Error(
      'No authentication providers configured. Production requires Outborn Account. Development requires explicit feature flags.',
    );
  }

  return {
    providers,
    trustHost: true,
    session: {
      strategy: 'jwt' as const,
      maxAge: 8 * 60 * 60,
    },
    cookies: {
      sessionToken: {
        name: 'next-auth.session-token',
        options: {
          httpOnly: true,
          sameSite: 'lax' as const,
          path: '/',
          secure: isProduction && process.env.NEXTAUTH_URL?.startsWith('https://'),
        },
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
      signIn: '/auth/signin',
      error: '/auth/signin',
    },
    callbacks: buildAuthCallbacks(),
    events: buildAuthEvents(),
  };
};

export const { handlers, auth, signIn, signOut } = NextAuth(getAuthConfig);
