import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Outborn Account human-auth boundary', () => {
  it('configures Hrive human authentication with Outborn Account only', () => {
    const authSource = source('src/auth.ts');

    expect(authSource).toContain('getConfiguredOutbornAccountProvider');
    expect(authSource).not.toContain("next-auth/providers/credentials");
    expect(authSource).not.toContain("next-auth/providers/azure-ad");
    expect(authSource).not.toContain('buildCredentialsProvider');
    expect(authSource).not.toContain('HRIVE_LEGACY_AZURE_AUTH_ENABLED');
  });

  it('renders only the Outborn Account sign-in method on desktop and mobile', () => {
    const desktopSource = source('src/app/auth/signin/DesktopSignInViewParts.tsx');
    const mobileSource = source('src/app/auth/signin/MobileSignInCardPart.tsx');

    for (const signInSource of [desktopSource, mobileSource]) {
      expect(signInSource).toContain('OutbornAccountSignInButton');
      expect(signInSource).not.toContain('CredentialsSignInForm');
      expect(signInSource).not.toContain('AzureAdSignInButton');
    }
  });

  it('fails closed for every non-Outborn sign-in provider', () => {
    const callbackSource = source('src/lib/auth-signin-callback.ts');

    expect(callbackSource).toContain("input.account?.provider !== 'outborn-account'");
    expect(callbackSource).not.toContain('handleAzureAdSignIn');
    expect(callbackSource).not.toContain('getResolvedAzureAdSettings');
  });

  it('does not expose local password, MFA, or direct token-mint auth routes', () => {
    const legacyRoutes = [
      'src/app/api/auth/change-password/route.ts',
      'src/app/api/auth/setup-password/route.ts',
      'src/app/api/auth/2fa',
      'src/app/api/v1/auth/login/route.ts',
    ];

    for (const path of legacyRoutes) {
      expect(existsSync(resolve(process.cwd(), path))).toBe(false);
    }
  });

  it('does not ship product-owned password or MFA sign-in components', () => {
    const legacyComponents = [
      'src/components/auth/CredentialsSignInForm.tsx',
      'src/components/auth/AzureAdSignInButton.tsx',
      'src/components/auth/ChangePasswordModal.tsx',
      'src/components/auth/TwoFactorSetup.tsx',
      'src/components/auth/TwoFactorVerify.tsx',
    ];

    for (const path of legacyComponents) {
      expect(existsSync(resolve(process.cwd(), path))).toBe(false);
    }
  });

  it('does not ship legacy credential or Azure human-auth engines', () => {
    const legacyAuthModules = [
      'src/lib/auth-credentials-provider.ts',
      'src/lib/authUtils.ts',
      'src/lib/auth-azure-ad-signin.ts',
      'src/lib/auth-azure-ad-signin-types.ts',
      'src/lib/auth-azure-ad-signin-utils.ts',
      'src/lib/auth-azure-ad-user-operations.ts',
      'src/lib/auth-azure-ad-user-operation-utils.ts',
    ];

    for (const path of legacyAuthModules) {
      expect(existsSync(resolve(process.cwd(), path))).toBe(false);
    }
  });

  it('routes account security through the Outborn Account boundary', () => {
    const headerSource = source('src/components/layout/Header.tsx');
    const modalSource = source('src/components/layout/HeaderProfileModals.tsx');
    const actionsSource = source('src/components/layout/use-header-user-actions.ts');

    expect(headerSource).toContain('/account/security');
    expect(headerSource).not.toContain('setIsChangePasswordModalOpen');
    expect(modalSource).not.toContain('ChangePasswordModal');
    expect(actionsSource).not.toContain('isChangePasswordModalOpen');
    expect(existsSync(resolve(process.cwd(), 'src/app/account/security/page.tsx'))).toBe(true);
  });
});
