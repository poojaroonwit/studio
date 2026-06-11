import { describe, expect, it } from 'vitest';

import { getAppLayoutPageTitle } from './app-layout-view-utils';

describe('app layout view utilities', () => {
  it('derives page titles from pathnames', () => {
    expect(getAppLayoutPageTitle('/')).toBe('Dashboard');
    expect(getAppLayoutPageTitle(null)).toBe('Dashboard');
    expect(getAppLayoutPageTitle('/positions')).toBe('Positions');
    expect(getAppLayoutPageTitle('/settings/system-settings')).toBe('System-settings');
  });
});
