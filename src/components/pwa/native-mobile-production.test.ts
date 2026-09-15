import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readJson = <T,>(relativePath: string): T => JSON.parse(read(relativePath)) as T;

describe('native mobile production integration', () => {
  it('keeps native capabilities in the mobile workspace without duplicating ESS', () => {
    const pkg = readJson<{ dependencies?: Record<string, string> }>('mobile/package.json');
    for (const dependency of [
      '@capacitor/push-notifications',
      '@capacitor/network',
      '@capacitor/camera',
      '@capacitor/filesystem',
      '@capacitor/share',
      '@aparajita/capacitor-secure-storage',
      '@aparajita/capacitor-biometric-auth',
    ]) {
      expect(pkg.dependencies?.[dependency]).toBeTruthy();
    }
    expect(read('mobile/capacitor.config.json')).toContain('https://people.outborn.co/employee-portal');
  });

  it('wires the native bridge into shared client providers', () => {
    const providers = read('src/components/providers/ClientProviders.tsx');
    expect(providers).toContain("import { NativeMobileRuntime }");
    expect(providers).toContain('<NativeMobileRuntime />');
  });

  it('keeps native device tokens out of ordinary user preferences', () => {
    const preferencesRoute = read('src/app/api/user-preferences/route.ts');
    expect(preferencesRoute).toContain('NATIVE_DEVICE_MODEL_TYPE');
    expect(preferencesRoute).toContain('NOT: { modelType: NATIVE_DEVICE_MODEL_TYPE }');
  });

  it('builds both native platforms in CI and has explicit store release automation', () => {
    const ci = read('.github/workflows/native-mobile.yml');
    const release = read('.github/workflows/native-release.yml');
    expect(ci).toContain('assembleDebug');
    expect(ci).toContain('iphonesimulator');
    expect(release).toContain('bundleRelease');
    expect(release).toContain('upload-google-play');
    expect(release).toContain('altool --upload-app');
  });

  it('serves association files for Android App Links and Apple Universal Links', () => {
    expect(read('src/app/.well-known/assetlinks.json/route.ts')).toContain('co.outborn.people');
    expect(read('src/app/.well-known/apple-app-site-association/route.ts')).toContain('co.outborn.people');
  });
});
