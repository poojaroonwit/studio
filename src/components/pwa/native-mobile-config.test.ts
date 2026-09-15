import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type NativeConfig = {
  appId?: string;
  appName?: string;
  webDir?: string;
  server?: {
    url?: string;
    cleartext?: boolean;
    allowNavigation?: string[];
  };
  android?: {
    allowMixedContent?: boolean;
  };
};

type MobilePackage = {
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

const repoRoot = process.cwd();
const readJson = <T,>(relativePath: string): T =>
  JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T;

describe('native mobile ESS shell', () => {
  it('keeps one secure Hrive native identity and launches into ESS', () => {
    const config = readJson<NativeConfig>('mobile/capacitor.config.json');

    expect(config.appId).toBe('co.outborn.people');
    expect(config.appName).toBe('Hrive');
    expect(config.webDir).toBe('www');
    expect(config.server?.url).toBe('https://people.outborn.co/employee-portal');
    expect(config.server?.cleartext).toBe(false);
    expect(config.android?.allowMixedContent).toBe(false);
    expect(config.server?.allowNavigation).toContain('people.outborn.co');
  });

  it('supports both native platforms from the same workspace', () => {
    const mobilePackage = readJson<MobilePackage>('mobile/package.json');

    expect(mobilePackage.dependencies?.['@capacitor/core']).toBeTruthy();
    expect(mobilePackage.dependencies?.['@capacitor/ios']).toBeTruthy();
    expect(mobilePackage.dependencies?.['@capacitor/android']).toBeTruthy();
    expect(mobilePackage.scripts?.['native:open:ios']).toBeTruthy();
    expect(mobilePackage.scripts?.['native:open:android']).toBeTruthy();
  });
});
