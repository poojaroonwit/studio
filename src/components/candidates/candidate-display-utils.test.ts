import { describe, expect, it } from 'vitest';
import {
  formatCandidateApplicationDate,
  getCandidateDisplayFitScore,
  getCandidateFitScoreTone,
  getCandidateInitial,
  getCandidateJustification,
  getCandidateStatusColor,
  getCandidateStatusLabel,
  getPositionApplicantPreview,
  getPositionGroupContentClassName,
  isKeyboardActivationKey,
} from './candidate-display-utils';

describe('candidate-display-utils', () => {
  it('normalizes candidate fit scores while preserving unscored values', () => {
    expect(getCandidateDisplayFitScore(null)).toBeNull();
    expect(getCandidateDisplayFitScore(undefined)).toBeNull();
    expect(getCandidateDisplayFitScore(0.86)).toBe(86);
    expect(getCandidateDisplayFitScore(86.4)).toBe(86);
    expect(getCandidateDisplayFitScore(120)).toBe(100);
  });

  it('maps fit score thresholds to text and bar classes', () => {
    expect(getCandidateFitScoreTone(80)).toEqual({
      textClassName: 'text-emerald-600',
      barClassName: 'bg-emerald-500',
    });
    expect(getCandidateFitScoreTone(60)).toEqual({
      textClassName: 'text-blue-600',
      barClassName: 'bg-blue-500',
    });
    expect(getCandidateFitScoreTone(40)).toEqual({
      textClassName: 'text-amber-600',
      barClassName: 'bg-amber-500',
    });
    expect(getCandidateFitScoreTone(39)).toEqual({
      textClassName: 'text-zinc-500',
      barClassName: 'bg-zinc-400',
    });
  });

  it('returns display fallbacks for candidate labels', () => {
    expect(getCandidateInitial(' Ada Lovelace ')).toBe('A');
    expect(getCandidateInitial('')).toBe('?');
    expect(getCandidateStatusLabel({ statusName: 'Interviewing' })).toBe('Interviewing');
    expect(getCandidateStatusLabel({ statusName: null })).toBe('New');
    expect(getCandidateStatusColor({ statusColor: '#2563eb' })).toBe('#2563eb');
    expect(getCandidateStatusColor({ statusColor: null })).toBeUndefined();
    expect(getCandidateJustification({ assignmentJustification: 'Strong match' })).toBe('Strong match');
    expect(getCandidateJustification({ assignmentJustification: null })).toBe('No justification provided.');
  });

  it('formats candidate application dates with the existing UI fallback', () => {
    expect(formatCandidateApplicationDate('2026-06-08')).toBe(new Date('2026-06-08').toLocaleDateString());
    expect(formatCandidateApplicationDate('')).toBe('N/A');
  });

  it('builds applicant previews and overflow counts', () => {
    const applicants = [
      { id: '1', name: 'One' },
      { id: '2', name: 'Two' },
      { id: '3', name: 'Three' },
      { id: '4', name: 'Four' },
    ];

    expect(getPositionApplicantPreview(applicants)).toEqual({
      previewApplicants: applicants.slice(0, 3),
      overflowCount: 1,
    });
    expect(getPositionApplicantPreview(applicants.slice(0, 2))).toEqual({
      previewApplicants: applicants.slice(0, 2),
      overflowCount: 0,
    });
  });

  it('derives content layout classes for each view mode', () => {
    expect(getPositionGroupContentClassName('card')).toContain('grid');
    expect(getPositionGroupContentClassName('list')).toContain('flex flex-col');
    expect(getPositionGroupContentClassName('table')).toContain('rounded-xl');
  });

  it('recognizes keyboard activation keys', () => {
    expect(isKeyboardActivationKey('Enter')).toBe(true);
    expect(isKeyboardActivationKey(' ')).toBe(true);
    expect(isKeyboardActivationKey('Escape')).toBe(false);
  });
});
