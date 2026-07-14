import { describe, expect, it } from 'vitest';
import {
  normalizeBuiltInApplicant,
  normalizeBuiltInJobMatches,
  parseBuiltInResumeProcessorJson,
} from './built-in-resume-processor-utils';

describe('built-in resume processor normalization', () => {
  it('parses fenced JSON responses', () => {
    expect(parseBuiltInResumeProcessorJson('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it('normalizes applicant data from compact processor JSON', () => {
    const applicant = normalizeBuiltInApplicant({
      applicant: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+1 555 0100',
        fitScore: '88',
        parsedData: { skills: ['analysis'] },
      },
    }, 'ada-resume.pdf');

    expect(applicant).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+1 555 0100',
      fitScore: 88,
    });
    expect(applicant.parsedData.skills).toEqual(['analysis']);
    expect(applicant.parsedData.built_in_resume_processor).toBeTruthy();
  });

  it('falls back to applicant_info and target position job match', () => {
    const applicant = normalizeBuiltInApplicant({
      applicant_info: {
        personal_info: { firstname: 'Grace', lastname: 'Hopper' },
        contact_info: { email: 'grace@example.com' },
      },
    }, 'resume.docx');
    const matches = normalizeBuiltInJobMatches({}, '00000000-0000-0000-0000-000000000001');

    expect(applicant.name).toBe('Grace Hopper');
    expect(applicant.email).toBe('grace@example.com');
    expect(matches).toEqual([{
      jobId: '00000000-0000-0000-0000-000000000001',
      jobTitle: null,
      fitScore: null,
      matchReasons: [],
      job_description_summary: null,
    }]);
  });
});
