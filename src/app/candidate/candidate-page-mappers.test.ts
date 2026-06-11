import { describe, expect, it } from 'vitest';
import {
  mapCandidateApplicantRow,
  mapCandidatePositionRow,
  mapCandidateRows,
  mapCandidateStageRow,
  toCandidateIsoString,
  toOptionalCandidateIsoString,
} from './candidate-page-mappers';

describe('candidate page mappers', () => {
  it('normalizes candidate dates', () => {
    const date = new Date('2026-01-02T03:04:05.000Z');
    expect(toCandidateIsoString(date)).toBe('2026-01-02T03:04:05.000Z');
    expect(toCandidateIsoString('2026-01-02')).toBe('2026-01-02');
    expect(toOptionalCandidateIsoString(null)).toBeUndefined();
  });

  it('maps applicant rows with related preview data', () => {
    const applicant = mapCandidateApplicantRow({
      id: 'applicant-1',
      name: 'Ada',
      email: 'ada@example.com',
      statusId: 'stage-1',
      positionId: 'position-1',
      positionTitle: 'Engineer',
      recruiterId: 'user-1',
      recruiterName: 'Grace',
      sourceId: 'source-1',
      sourceName: 'Referral',
      applicationDate: '2026-01-01',
      parsedData: '{"score":10}',
      isBlacklisted: null,
    });

    expect(applicant.position?.title).toBe('Engineer');
    expect(applicant.recruiter?.name).toBe('Grace');
    expect(applicant.source?.name).toBe('Referral');
    expect(applicant.parsedData).toEqual({ score: 10 });
    expect(applicant.isBlacklisted).toBe(false);
  });

  it('maps position and stage rows', () => {
    expect(mapCandidatePositionRow({
      id: 'position-1',
      title: 'Engineer',
      gradeName: 'G7',
      gradeSlaDays: 14,
    }).grade?.slaDays).toBe(14);

    expect(mapCandidateStageRow({
      id: 'stage-1',
      name: 'Review',
      sort_order: 3,
    }).sortOrder).toBe(3);
  });

  it('maps all row groups together', () => {
    expect(mapCandidateRows({
      applicants: [],
      positions: [],
      stages: [],
    })).toEqual({
      initialApplicants: [],
      initialAvailablePositions: [],
      initialAvailableStages: [],
    });
  });
});
