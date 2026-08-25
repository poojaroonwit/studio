/**
 * Hrive authentication configuration.
 *
 * Outborn Account is the canonical and only human identity provider. Hrive
 * keeps product-specific authorization in its own session, but it does not
 * authenticate passwords or install a second enterprise identity provider.
 */

import NextAuth from 'next-auth';

import { buildAuthCallbacks } from '@/lib/auth-callbacks';
import { buildAuthEvents } from '@/lib/auth-events';
import { getConfiguredOutbornAccountProvider } from '@/lib/auth-outborn-account-provider';

const getAuthConfig = async () => {
  const outbornAccountProvider = getConfiguredOutbornAccountProvider();

  return {
    providers: outbornAccountProvider ? [outbornAccountProvider] : [],
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
