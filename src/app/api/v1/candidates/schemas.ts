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
  suitable_salary_bath_month: z.string().optional(),
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
  startMonth: z.number().optional(),
  startYear: z.number().optional(),
  endMonth: z.number().optional(),
  endYear: z.number().optional(),
  isCurrent: z.boolean().optional(),
  GPA: z.string().optional(),
}).strict();

export const structuredExperienceSchema = z.object({
  company: z.string().optional(),
  position: z.string().optional(),
  startMonth: z.number().optional(),
  startYear: z.number().optional(),
  endMonth: z.number().nullable().optional(),
  endYear: z.number().nullable().optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().optional(),
}).strict(); 