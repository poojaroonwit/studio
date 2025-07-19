import { z } from 'zod';

const contactInfoSchema = z.object({
  email: z.string().optional(),
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
    z.number().transform(val => val.toString())
  ]).optional(),
}).strict();

const skillsEntrySchema = z.object({
  segment_skill: z.string().optional(),
  skill: z.array(z.string()).optional(),
}).strict();

export const candidateInfoSchema = z.object({
  personal_info: personalInfoSchema.optional(),
  contact_info: contactInfoSchema.optional(),
  cv_language: z.string().optional(),
  skills: z.array(skillsEntrySchema).optional(),
  job_suitable: z.array(jobSuitableEntrySchema).optional(),
  status: z.string().optional(),
}).strict();

export const structuredEducationSchema = z.object({
  university: z.string().optional(),
  major: z.string().optional(),
  startMonth: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    })
  ]).optional(),
  startYear: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    })
  ]).optional(),
  endMonth: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    })
  ]).optional(),
  endYear: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    })
  ]).optional(),
  isCurrent: z.union([
    z.boolean(),
    z.string().transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'true') return true;
      if (lower === 'false') return false;
      return false; // default to false for any other string
    })
  ]).optional(),
  GPA: z.union([
    z.string(),
    z.number().transform(val => val.toString())
  ]).optional(),
}).strict();

export const structuredExperienceSchema = z.object({
  company: z.string().optional(),
  position: z.string().optional(),
  startMonth: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    })
  ]).optional(),
  startYear: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    })
  ]).optional(),
  endMonth: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    }),
    z.null()
  ]).nullable().optional(),
  endYear: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseInt(val);
      return isNaN(num) ? undefined : num;
    }),
    z.null()
  ]).nullable().optional(),
  isCurrent: z.union([
    z.boolean(),
    z.string().transform((val) => {
      const lower = val.toLowerCase();
      if (lower === 'true') return true;
      if (lower === 'false') return false;
      return false; // default to false for any other string
    })
  ]).optional(),
  description: z.string().optional(),
}).strict(); 