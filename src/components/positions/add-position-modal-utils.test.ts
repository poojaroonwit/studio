import { describe, expect, it } from 'vitest';

import {
  getMissingJobDescriptionFields,
  normalizeAddPositionRecruiterOptions,
  normalizeDefaultMatchCriteria,
  normalizeGeneratedJobDescriptionResponse,
} from './add-position-modal-utils';

describe('add position modal utilities', () => {
  it('normalizes recruiter options from the users response', () => {
    expect(normalizeAddPositionRecruiterOptions({
      users: [
        { id: 'user-1', name: 'Ada', avatarUrl: '/ada.png' },
        { id: '', name: 'Missing id' },
        { id: 'user-2', name: '' },
        null,
      ],
    })).toEqual([
      { id: 'user-1', name: 'Ada', avatarUrl: '/ada.png' },
    ]);
    expect(normalizeAddPositionRecruiterOptions(null)).toEqual([]);
  });

  it('normalizes default match criteria safely', () => {
    expect(normalizeDefaultMatchCriteria({ defaultMatchCriteria: 'Must know React' })).toBe('Must know React');
    expect(normalizeDefaultMatchCriteria({ defaultMatchCriteria: null })).toBe('');
    expect(normalizeDefaultMatchCriteria(null)).toBe('');
  });

  it('returns missing fields for AI job description generation', () => {
    expect(getMissingJobDescriptionFields({
      title: 'Engineer',
      department: 'Product',
      positionLevel: 'Senior',
    })).toEqual([]);
    expect(getMissingJobDescriptionFields({
      title: '',
      department: ' ',
      positionLevel: null,
    })).toEqual(['Position Title', 'Department', 'Position Level']);
  });

  it('normalizes generated description responses', () => {
    expect(normalizeGeneratedJobDescriptionResponse({
      description: '<p>Hello</p>',
      error: 'No key',
    })).toEqual({
      description: '<p>Hello</p>',
      error: 'No key',
    });
    expect(normalizeGeneratedJobDescriptionResponse(null)).toEqual({
      description: '',
      error: '',
    });
  });
});
