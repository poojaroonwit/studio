import { z } from 'zod';

const contactInfoSchema = z.object({
  email: z.string(), // required
  phone: z.string().optional(),
}).strict();

const personalInfoSchema = z.object({
  title_honorific: z.string().optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  nickname: z.string().optional(),
  location: z.string().optional(),
  introduction_aboutme: z.string().optional(),
}).strict();

const jobSuitableEntrySchema = z.object({
  suitable_career: z.string().optional(),
  suitable_job_level: z.string().optional(),
  suitable_job_position: z.string().optional(),
  suitable_salary_bath_month: z.union([
    z.string(),
    z.number().transform(val => val.toString()),
    z.boolean().transform(() => ''),
  ]).optional(),
}).strict();

const skillsEntrySchema = z.object({
  segment_skill: z.string().optional(),
  skill: z.array(z.string()).optional(),
}).strict();

export const candidateInfoSchema = z.union([
  z.object({
    contact_info: contactInfoSchema, // required
    personal_info: personalInfoSchema.optional(),
    cv_language: z.string().optional(),
    skills: z.array(skillsEntrySchema).optional(),
    job_suitable: z.array(jobSuitableEntrySchema).optional(),
    // Accept both UUID or name; will be resolved at runtime
    status: z.string().optional(),
    job_applied: z.any().optional(),
    job_matches: z.array(z.any()).optional(),
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
  };
});

export const structuredEducationSchema = z.object({
  university: z.string().optional(),
  major: z.string().optional(),
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
  ]).optional(),
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
  company: z.string().optional(),
  position: z.string().optional(),
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
  ]).optional(),
  description: z.string().optional(),
}).strict(); 