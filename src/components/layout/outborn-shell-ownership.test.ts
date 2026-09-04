import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getAccountBaseUrl, FALLBACK_APP_IDENTITY } from '@/lib/outborn-account-integration';

const read = (path: string) => readFileSync(path, 'utf8');

describe('OutbornShellOwnership', () => {
  it('resolves the configured Account base URL and keeps a safe Obsi People fallback', () => {
    const original = process.env.OUTBORN_ACCOUNT_AUTH_URL;
    process.env.OUTBORN_ACCOUNT_AUTH_URL = 'https://account.example.com';
    try {
      expect(getAccountBaseUrl()).toBe('https://account.example.com');
      expect(FALLBACK_APP_IDENTITY.id).toBe('obsi-people');
      expect(FALLBACK_APP_IDENTITY.name).toBe('Obsi People');
    } finally {
      if (original) process.env.OUTBORN_ACCOUNT_AUTH_URL = original;
      else delete process.env.OUTBORN_ACCOUNT_AUTH_URL;
    }
  });

  it('mounts the shared Outborn brand, favicon and launcher in the authenticated header', () => {
    const header = read('src/components/layout/Header.tsx');
    expect(header).toContain('OutbornApplicationBrand');
    expect(header).toContain('OutbornApplicationFavicon');
    expect(header).toContain('OutbornApplicationLauncher');
    expect(header).toContain('applicationId="obsi-people"');
    expect(header).toContain("fetch('/api/account/applications'");
    expect(header).toContain('accountHref={accountHref}');
    expect(header).toContain('from "../../../npm/outborn-app-shell"');
    expect(header).not.toContain('HeaderBrandLockup');
  });

  it('normalizes the canonical Account application catalog for the shared shell', () => {
    const route = read('src/app/api/account/applications/route.ts');
    expect(route).toContain('/api/account/applications');
    expect(route).toContain('application.applicationId || application.id');
    expect(route).toContain('application.iconUrl ?? application.logoUrl');
    expect(route).toContain('launchUrl: application.launchUrl ?? null');
    expect(route).toContain("applicationId: 'obsi-people'");
  });

  it('vendors the canonical shared App Shell 0.1.5 without changing the npm dependency lock', () => {
    const manifest = read('package.json');
    const vendoredManifest = read('npm/outborn-app-shell/package.json');
    const layout = read('src/app/layout.tsx');
    expect(manifest).not.toContain('"@outborn/app-shell":');
    expect(manifest).not.toContain('"outborn:sdk:install"');
    expect(vendoredManifest).toContain('"name": "@outborn/app-shell"');
    expect(vendoredManifest).toContain('"version": "0.1.5"');
    expect(layout).toContain("../../npm/outborn-app-shell/src/styles.css");
  });

  it('keeps Account as the production identity authority and removes local password/2FA ownership', () => {
    const auth = read('src/auth.ts');
    const header = read('src/components/layout/Header.tsx');
    expect(auth).toContain("const isProduction = process.env.NODE_ENV === 'production'");
    expect(auth).toContain('Production requires Outborn Account configuration');
    expect(header).toContain('isChangePasswordModalOpen={false}');
    expect(header).toContain("window.location.assign(accountHref)");
  });
});
