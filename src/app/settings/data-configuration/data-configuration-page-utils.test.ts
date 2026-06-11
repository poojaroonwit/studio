import { describe, expect, it } from 'vitest';

import {
  buildDataConfigurationNavigationGroups,
  DATA_CONFIGURATION_FALLBACK_PAGE,
  DEFAULT_DATA_CONFIGURATION_PAGE,
  getAllowedDataConfigurationPage,
  getDataConfigurationLimitedAccessMessage,
  isShowLogoOnlyEnabled,
} from './data-configuration-page-utils';

describe('data-configuration-page-utils', () => {
  it('falls back from recruitment stages when stage permissions are missing', () => {
    expect(getAllowedDataConfigurationPage(DEFAULT_DATA_CONFIGURATION_PAGE, false)).toBe(DATA_CONFIGURATION_FALLBACK_PAGE);
    expect(getAllowedDataConfigurationPage('position-grades', false)).toBe('position-grades');
  });

  it('builds navigation groups from permission flags', () => {
    expect(buildDataConfigurationNavigationGroups(true, true).map((group) => group.title)).toEqual([
      'Applicant',
      'Position',
      'System',
    ]);

    const limitedNavigation = buildDataConfigurationNavigationGroups(false, false);

    expect(limitedNavigation.map((group) => group.title)).toEqual(['Applicant', 'Position']);
    expect(limitedNavigation[0].items.map((item) => item.id)).toEqual(['Applicant-sources']);
  });

  it('derives limited-access messages and logo visibility', () => {
    expect(getDataConfigurationLimitedAccessMessage(true, true)).toBeNull();
    expect(getDataConfigurationLimitedAccessMessage(false, true)).toContain('recruitment stages');
    expect(getDataConfigurationLimitedAccessMessage(true, false)).toContain('custom fields');
    expect(getDataConfigurationLimitedAccessMessage(false, false)).toContain('recruitment stages or custom fields');
    expect(isShowLogoOnlyEnabled(true)).toBe(true);
    expect(isShowLogoOnlyEnabled('true')).toBe(true);
    expect(isShowLogoOnlyEnabled('false')).toBe(false);
  });
});
