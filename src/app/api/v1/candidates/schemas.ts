import { z } from 'zod';

const contactInfoSchema = z.object({
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
}).strict();

const personalInfoSchema = z.object({
  title_honorific: z.string().optional().nullable(),
  firstname: z.string().optional().nullable(),
  lastname: z.string().optional().nullable(),
  nickname: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  introduction_aboutme: z.string().optional().nullable(),
}).strict();

const jobSuitableEntrySchema = z.object({
  suitable_career: z.string().optional().nullable(),
  suitable_job_level: z.string().optional().nullable(),
  suitable_job_position: z.string().optional().nullable(),
  suitable_salary_bath_month: z.union([
    z.string(),
    z.number().transform(val => val.toString()),
    z.boolean().transform(() => ''),
  ]).optional().nullable(),
}).strict();

const skillsEntrySchema = z.object({
  segment_skill: z.string().optional().nullable(),
  skill: z.array(z.string()).optional().nullable(),
}).strict();

export const candidateInfoSchema = z.union([
  z.object({
    contact_info: contactInfoSchema.optional().nullable(), // allowed to be null/undefined
    personal_info: personalInfoSchema.optional().nullable(), // allowed to be null/undefined
    cv_language: z.string().optional().nullable(),
    skills: z.array(skillsEntrySchema).optional().nullable(),
    job_suitable: z.array(jobSuitableEntrySchema).optional().nullable(),
    // Accept both UUID or name; will be resolved at runtime
    status: z.string().optional().nullable(),
    job_applied: z.any().optional().nullable(),
    job_matches: z.array(z.any()).optional().nullable(),
    // Email-related fields (optional)
    emailDate: z.string().optional().nullable(),
    emailSubject: z.string().optional().nullable(),
    emailId: z.string().optional().nullable(),
    emailMetadata: z.record(z.any()).optional().nullable(),
  }).strict(),
  z.string().transform(() => ({})),
  z.number().transform(() => ({})),
  z.boolean().transform(() => ({})),
]).transform((data) => {
  // Ensure all fields are properly typed
  return {
    personal_info: (data as any).personal_info || {},
    contact_info: (data as any).contact_info || {},
    cv_language: (data as any).cv_language || '',
    skills: (data as any).skills || [],
    job_suitable: (data as any).job_suitable || [],
    status: (data as any).status || '',
    job_applied: (data as any).job_applied,
    job_matches: (data as any).job_matches || [],
    emailDate: (data as any).emailDate,
    emailSubject: (data as any).emailSubject,
    emailId: (data as any).emailId,
    emailMetadata: (data as any).emailMetadata,
  };
});

export const structuredEducationSchema = z.object({
  university: z.string().optional().nullable(),
  major: z.string().optional().nullable(),
  startMonth: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    }),
    z.boolean().transform(() => undefined),
    z.null()
  ]).nullable().optional(),
  startYear: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    }),
    z.boolean().transform(() => undefined),
    z.null()
  ]).nullable().optional(),
  endMonth: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    }),
    z.boolean().transform(() => undefined),
    z.null()
  ]).nullable().optional(),
  endYear: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    }),
    z.boolean().transform(() => undefined),
    z.null()
  ]).nullable().optional(),
  isCurrent: z.union([
    z.boolean(),
    z.string().transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'true') return true;
      if (lower === 'false') return false;
      return false; // default to false for any other string
    }),
    z.number().transform((val) => val === 1 || val === 0 ? val === 1 : false),
  ]).optional().nullable(),
  GPA: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    }),
    z.boolean().transform(() => undefined),
    z.null()
  ]).nullable().optional(),
}).strict();

export const structuredExperienceSchema = z.object({
  company: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  startMonth: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    }),
    z.boolean().transform(() => undefined),
    z.null()
  ]).nullable().optional(),
  startYear: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    }),
    z.boolean().transform(() => undefined),
    z.null()
  ]).nullable().optional(),
  endMonth: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    }),
    z.boolean().transform(() => undefined),
    z.null()
  ]).nullable().optional(),
  endYear: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    }),
    z.boolean().transform(() => undefined),
    z.null()
  ]).nullable().optional(),
  isCurrent: z.union([
    z.boolean(),
    z.string().transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'true') return true;
      if (lower === 'false') return false;
      return false; // default to false for any other string
    }),
    z.number().transform((val) => val === 1 || val === 0 ? val === 1 : false),
  ]).optional().nullable(),
  description: z.string().optional().nullable(),
}).strict(); 
