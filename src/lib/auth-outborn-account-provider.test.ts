import { describe, expect, it } from 'vitest';

import { buildOutbornAccountProvider } from './auth-outborn-account-provider';

describe('Outborn Account Auth.js provider', () => {
  it('uses Account OIDC endpoints with PKCE, EdDSA ID tokens, offline access, and no client secret auth', () => {
    const provider = buildOutbornAccountProvider({
      accountBaseUrl: 'https://account.example.com/',
      clientId: 'outborn-hrive-web',
    });
    const clientMetadata = provider.client as Record<string, unknown> | undefined;

    expect(provider.id).toBe('outborn-account');
    expect(provider.issuer).toBe('https://account.example.com/api/auth');
    expect(provider.authorization?.url).toBe('https://account.example.com/api/auth/oauth2/authorize');
    expect(provider.token).toBe('https://account.example.com/api/auth/oauth2/token');
    expect(provider.userinfo).toBe('https://account.example.com/api/auth/oauth2/userinfo');
    expect(provider.checks).toEqual(['pkce', 'state']);
    expect(clientMetadata?.token_endpoint_auth_method).toBe('none');
    expect(clientMetadata?.id_token_signed_response_alg).toBe('EdDSA');
    expect(provider.authorization?.params?.scope).toContain('organizations');
    expect(provider.authorization?.params?.scope).toContain('offline_access');
  });
});
