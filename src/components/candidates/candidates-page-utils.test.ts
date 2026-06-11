import { describe, expect, it } from 'vitest';
import {
  buildCandidatesQuery,
  CANDIDATE_OPEN_FILTER_OPTIONS,
  filterCandidatePositions,
  getCandidatePageErrorMessage,
  getDefaultPipelineStageIds,
  getNextPipelineStageSelection,
  isCandidatesFilterActive,
  normalizeCandidatesResponse,
  togglePipelineStageSelection,
  type GroupedCandidatePosition,
} from './candidates-page-utils';
import type { Applicant, RecruitmentStage } from '../../lib/types';

const stage = (id: string, name: string): RecruitmentStage => ({
  id,
  name,
  description: null,
  isSystem: false,
  sortOrder: 0,
});

const applicant = (id: string, name: string, email: string): Applicant => ({
  id,
  name,
  email,
  fitScore: 0,
  parsedData: null,
  positionId: null,
  statusId: 'stage-1',
  applicationDate: '2026-06-08',
  transitionHistory: [],
});

const position = (
  id: string,
  applicants: Applicant[]
): GroupedCandidatePosition => ({
  id,
  title: `Position ${id}`,
  department: 'Engineering',
  description: null,
  matchCriteria: null,
  isOpen: true,
  applicants,
});

describe('candidates-page-utils', () => {
  it('derives default pipeline stages by excluding applied and screening', () => {
    expect(
      getDefaultPipelineStageIds([
        stage('1', 'Applied'),
        stage('2', 'screening'),
        stage('3', 'Interview'),
        stage('4', 'Offer'),
      ])
    ).toEqual(['3', '4']);
  });

  it('builds the candidates query string', () => {
    expect(
      buildCandidatesQuery({
        isOpenFilter: true,
        mineOnlyFilter: false,
        pipelineOnlyFilter: ['stage-1', 'stage-2'],
      })
    ).toBe('isOpen=true&mineOnly=false&pipelineOnly=stage-1%2Cstage-2');

    expect(
      buildCandidatesQuery({
        isOpenFilter: 'any',
        mineOnlyFilter: true,
        pipelineOnlyFilter: [],
      })
    ).toBe('isOpen=any&mineOnly=true&pipelineOnly=false');
  });

  it('defines typed open-filter options for the UI', () => {
    expect(CANDIDATE_OPEN_FILTER_OPTIONS.map(option => option.value)).toEqual([true, false, 'any']);
  });

  it('filters grouped positions by candidate name or email', () => {
    const positions = [
      position('a', [
        applicant('1', 'Ada Lovelace', 'ada@example.com'),
        applicant('2', 'Grace Hopper', 'grace@example.com'),
      ]),
      position('b', [applicant('3', 'Linus Torvalds', 'linus@example.com')]),
    ];

    expect(filterCandidatePositions(positions, '')).toBe(positions);
    expect(filterCandidatePositions(positions, 'ada')).toEqual([
      position('a', [applicant('1', 'Ada Lovelace', 'ada@example.com')]),
    ]);
    expect(filterCandidatePositions(positions, 'EXAMPLE')).toEqual(positions);
    expect(filterCandidatePositions(positions, 'missing')).toEqual([]);
  });

  it('detects active candidate filters', () => {
    expect(
      isCandidatesFilterActive({
        isOpenFilter: 'any',
        mineOnlyFilter: true,
        pipelineOnlyFilter: [],
      })
    ).toBe(false);
    expect(
      isCandidatesFilterActive({
        isOpenFilter: true,
        mineOnlyFilter: true,
        pipelineOnlyFilter: [],
      })
    ).toBe(true);
    expect(
      isCandidatesFilterActive({
        isOpenFilter: 'any',
        mineOnlyFilter: false,
        pipelineOnlyFilter: [],
      })
    ).toBe(true);
    expect(
      isCandidatesFilterActive({
        isOpenFilter: 'any',
        mineOnlyFilter: true,
        pipelineOnlyFilter: ['stage-1'],
      })
    ).toBe(true);
  });

  it('toggles pipeline stage selections', () => {
    expect(getNextPipelineStageSelection(['1', '2'], [{ id: '1' }, { id: '2' }])).toEqual([]);
    expect(getNextPipelineStageSelection(['1'], [{ id: '1' }, { id: '2' }])).toEqual(['1', '2']);

    expect(togglePipelineStageSelection(['1'], '2', true)).toEqual(['1', '2']);
    expect(togglePipelineStageSelection(['1'], '1', true)).toEqual(['1']);
    expect(togglePipelineStageSelection(['1', '2'], '1', false)).toEqual(['2']);
  });

  it('normalizes candidates API responses', () => {
    const positions = [position('a', [applicant('1', 'Ada Lovelace', 'ada@example.com')])];

    expect(normalizeCandidatesResponse({ positions })).toBe(positions);
    expect(normalizeCandidatesResponse({ positions: null })).toEqual([]);
    expect(normalizeCandidatesResponse(null)).toEqual([]);
  });

  it('formats caught candidate page errors', () => {
    expect(getCandidatePageErrorMessage(new Error('Network down'), 'Fallback')).toBe('Network down');
    expect(getCandidatePageErrorMessage('bad', 'Fallback')).toBe('Fallback');
  });
});
