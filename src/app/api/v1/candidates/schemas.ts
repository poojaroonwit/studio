import { z } from 'zod';

const contactInfoSchema = z.object({
  email: z.string(),
  phone: z.string(),
}).strict();

const personalInfoSchema = z.object({
  title_honorific: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  nickname: z.string(),
  location: z.string(),
  introduction_aboutme: z.string(),
}).strict();

const jobSuitableEntrySchema = z.object({
  suitable_career: z.string(),
  suitable_job_level: z.string(),
  suitable_job_position: z.string(),
  suitable_salary_bath_month: z.string(),
}).strict();

const skillsEntrySchema = z.object({
  segment_skill: z.string(),
  skill: z.array(z.string()),
}).strict();

export const candidateInfoSchema = z.object({
  personal_info: personalInfoSchema,
  contact_info: contactInfoSchema,
  cv_language: z.string(),
  skills: z.array(skillsEntrySchema),
  job_suitable: z.array(jobSuitableEntrySchema),
  status: z.string(),
}).strict();

export const structuredEducationSchema = z.object({
  university: z.string(),
  major: z.string(),
  startMonth: z.number(),
  startYear: z.number(),
  endMonth: z.number(),
  endYear: z.number(),
  isCurrent: z.boolean(),
  GPA: z.string(),
}).strict();

export const structuredExperienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  startMonth: z.number(),
  startYear: z.number(),
  endMonth: z.number().nullable(),
  endYear: z.number().nullable(),
  isCurrent: z.boolean(),
  description: z.string(),
}).strict(); 