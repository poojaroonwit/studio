import { describe, expect, it } from 'vitest';
import {
  getApplicantActivityLogsPage,
  getTransitionActivityNote,
  compareApplicantActivityLogsByNewest,
  type ApplicantActivityLog,
} from './applicant-logs-format-utils';

describe('applicant-logs-format-utils', () => {
  it('formats stage transition notes with stage names and optional notes', () => {
    const stageIdToName = new Map([
      ['stage-1', 'Screening'],
      ['stage-2', 'Interview'],
    ]);

    expect(getTransitionActivityNote({
      currentStage: 'stage-2',
      notes: ' Strong profile ',
      previousStage: 'stage-1',
      stageIdToName,
    })).toBe('Moved from Screening to Interview stage. Note: Strong profile');

    expect(getTransitionActivityNote({
      currentStage: 'stage-2',
      notes: '',
      previousStage: null,
      stageIdToName,
    })).toBe('Entered Interview stage.');
  });

  it('sorts valid activity dates newest first and leaves invalid comparisons equal', () => {
    const older = { time: new Date('2024-01-01') } as ApplicantActivityLog;
    const newer = { time: new Date('2024-01-02') } as ApplicantActivityLog;
    const invalid = { time: new Date('bad-date') } as ApplicantActivityLog;

    expect(compareApplicantActivityLogsByNewest(older, newer)).toBeGreaterThan(0);
    expect(compareApplicantActivityLogsByNewest(newer, older)).toBeLessThan(0);
    expect(compareApplicantActivityLogsByNewest(invalid, older)).toBe(0);
  });

  it('paginates activity logs with total and hasMore metadata', () => {
    const logs = [
      { id: '1' },
      { id: '2' },
      { id: '3' },
    ] as ApplicantActivityLog[];

    expect(getApplicantActivityLogsPage(logs, { limit: 2, offset: 1 })).toEqual({
      data: [{ id: '2' }, { id: '3' }],
      pagination: {
        limit: 2,
        offset: 1,
        hasMore: false,
        total: 3,
      },
    });
  });
});
