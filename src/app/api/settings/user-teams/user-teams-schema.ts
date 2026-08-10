import { z } from 'zod';

export const userTeamSchema = z.object({
  name: z.string().min(1, 'Team name cannot be empty.'),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export type UserTeamInput = z.infer<typeof userTeamSchema>;
