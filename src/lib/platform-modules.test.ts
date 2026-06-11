import { describe, expect, it } from 'vitest';

import { PLATFORM_MODULE_CATEGORIES, PLATFORM_MODULES } from './platform-modules';

describe('platform modules catalog', () => {
  it('preserves the complete ordered permission catalog', () => {
    expect(PLATFORM_MODULES).toHaveLength(86);
    expect(PLATFORM_MODULES[0]?.id).toBe('applicantS_VIEW');
    expect(PLATFORM_MODULES.at(-1)?.id).toBe('EVALUATION_LINKS_MANAGE_ALL');
  });

  it('uses unique ids and known categories for every module', () => {
    const ids = PLATFORM_MODULES.map((module) => module.id);
    const categories = new Set(Object.values(PLATFORM_MODULE_CATEGORIES));

    expect(new Set(ids).size).toBe(ids.length);
    expect(PLATFORM_MODULES.every((module) => categories.has(module.category))).toBe(true);
  });
});
