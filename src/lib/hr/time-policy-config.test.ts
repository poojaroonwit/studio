import { describe, expect, it } from 'vitest';

import { DEFAULT_TIME_POLICY_CONFIG, parseTimePolicyConfig } from './time-policy-config';

describe('parseTimePolicyConfig', () => {
  it('uses stable defaults when settings are unavailable', () => {
    expect(parseTimePolicyConfig(null)).toEqual(DEFAULT_TIME_POLICY_CONFIG);
  });

  it('applies configured workforce rules', () => {
    expect(parseTimePolicyConfig(JSON.stringify({
      timezone: 'Asia/Tokyo',
      standardWeeklyHours: 37.5,
      lateGraceMinutes: 7,
      overtimeApprovalRequired: false,
      overtimeRoundingMinutes: 30,
      minimumShiftRestHours: 12,
      holidayWorkMultiplier: 3,
    }))).toMatchObject({
      timezone: 'Asia/Tokyo',
      standardWeeklyHours: 37.5,
      lateGraceMinutes: 7,
      overtimeApprovalRequired: false,
      overtimeRoundingMinutes: 30,
      minimumShiftRestHours: 12,
      holidayWorkMultiplier: 3,
    });
  });
});
