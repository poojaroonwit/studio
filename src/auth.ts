/**
 * NextAuth v5 (Auth.js) Configuration
 *
 * This file replaces the old authOptions from src/lib/auth.ts.
 * NextAuth v5 uses a different structure optimized for Next.js 15 App Router.
 */

import NextAuth from 'next-auth';
import AzureAD from 'next-auth/providers/azure-ad';

import { getResolvedAzureAdSettings } from '@/lib/auth-azure-ad-settings';
import { buildAuthCallbacks } from '@/lib/auth-callbacks';
import { buildCredentialsProvider } from '@/lib/auth-credentials-provider';
import { buildAuthEvents } from '@/lib/auth-events';

const getAuthConfig = async () => {
  const azureAdSettings = await getResolvedAzureAdSettings();

  return {
    providers: [
      ...(azureAdSettings.isConfigured ? [
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
      buildCredentialsProvider(),
    ],
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
          secure: process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://'),
        },
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
      signIn: '/auth/signin',
    },
    callbacks: buildAuthCallbacks(),
    events: buildAuthEvents(),
  };
};

export const { handlers, auth, signIn, signOut } = NextAuth(getAuthConfig);
