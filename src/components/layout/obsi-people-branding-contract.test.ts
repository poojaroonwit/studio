import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { normalizeAppName } from '../../lib/branding';
import { DEFAULT_APP_NAME } from '../../lib/constants';

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Obsi People branding contract', () => {
  it('uses Obsi People as the default and migrates legacy Hrive names', () => {
    expect(DEFAULT_APP_NAME).toBe('Obsi People');
    expect(normalizeAppName('hrive')).toBe('Obsi People');
    expect(normalizeAppName('HRI')).toBe('Obsi People');
    expect(normalizeAppName('fitscan')).toBe('Obsi People');
  });

  it('renders the shared header lockup as Obsi People with People in dark grey', () => {
    const lockup = source('src/components/layout/HeaderBrandLockup.tsx');
    const header = source('src/components/layout/Header.tsx');

    expect(lockup).toContain('Obsi');
    expect(lockup).toContain('People');
    expect(lockup).toContain('text-slate-500');
    expect(lockup).not.toContain('/brand/hrive-wordmark-transparent.png');
    expect(lockup).not.toContain('hrive application');
    expect(header).not.toContain('— hrive —');
  });
});
