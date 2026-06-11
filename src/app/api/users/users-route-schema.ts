import { z } from 'zod';

export const userRoleEnum = z.enum(['Admin', 'Recruiter', 'Hiring Manager']);

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
  role: userRoleEnum.optional(),
  userTeamIds: z.array(z.string().uuid()).optional().default([]),
  userGroupIds: z.array(z.string().uuid()).optional().default([]),
  authenticationMethods: z.array(z.string()).optional().default(['basic']),
  forcePasswordChange: z.boolean().optional().default(false),
  personalColor: z.string().optional().default('#3B82F6'),
  positionTitle: z.string().optional().nullable(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UserRole = z.infer<typeof userRoleEnum>;

