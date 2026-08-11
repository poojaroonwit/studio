import { describe, expect, it } from 'vitest';

import { summarizeAppKitRecords } from './appkit-setup-preview';

describe('summarizeAppKitRecords', () => {
  it('returns safe display fields and limits the preview sample', () => {
    const records = Array.from({ length: 7 }, (_, index) => ({
      name: `Stage ${index + 1}`,
      description: `Description ${index + 1}`,
      apiKey: `secret-${index + 1}`,
    }));

    expect(summarizeAppKitRecords('recruitment-stages', records)).toEqual({
      featureId: 'recruitment-stages',
      count: 7,
      items: Array.from({ length: 5 }, (_, index) => ({
        label: `Stage ${index + 1}`,
        detail: `Description ${index + 1}`,
      })),
    });
  });
});
