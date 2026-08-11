import { describe, expect, it } from 'vitest';

import {
  getDefaultHrSetupItem,
  getHrSetupItemsByLabels,
  getHrSetupReadiness,
  getUniqueHrSetupItems,
  hrSetupMapColumns,
  hrSetupMilestones,
} from './hr-setup-workspace-model';
import type { SettingsPageItem } from './settings-page-model';

const designation: SettingsPageItem = {
  href: '/positions',
  label: 'Designation',
  description: 'Configure job titles.',
  tab: 'HR Setup',
  section: 'Organization',
};

const grades: SettingsPageItem = {
  href: '/settings/grades',
  label: 'Grades',
  description: 'Configure grades.',
  tab: 'HR Setup',
  section: 'Position Configuration',
};

describe('HR Setup workspace model', () => {
  it('deduplicates repeated destinations without removing distinct configurations', () => {
    expect(getUniqueHrSetupItems([designation, grades, grades])).toEqual([designation, grades]);
  });

  it('selects Designation as the initial guided configuration', () => {
    expect(getDefaultHrSetupItem([grades, designation])).toBe(designation);
  });

  it('orders map items according to the requested architecture labels', () => {
    expect(getHrSetupItemsByLabels([grades, designation], ['Designation', 'Grades'])).toEqual([designation, grades]);
  });

  it('uses real setup feature status where a configuration has a readiness signal', () => {
    expect(getHrSetupReadiness(grades, [{ id: 'grades', count: 2, ready: true }])).toBe('ready');
    expect(getHrSetupReadiness(grades, [{ id: 'grades', count: 0, ready: false }])).toBe('attention');
    expect(getHrSetupReadiness(designation, [])).toBe('available');
  });

  it('places employee documents in the policies setup flow', () => {
    expect(hrSetupMilestones.find(item => item.label === 'Policies & time')?.itemLabels)
      .toContain('Employee Documents');
    expect(hrSetupMapColumns.find(item => item.label === 'Policies & operations')?.itemLabels)
      .toContain('Employee Documents');
  });
});
