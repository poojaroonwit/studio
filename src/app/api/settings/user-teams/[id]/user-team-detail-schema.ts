import { z } from 'zod';

export type UserTeamDetailRouteContext = {
  params: Promise<{ id: string }>;
};

export const userTeamUpdateSchema = z.object({
  name: z.string().min(1, 'Team name cannot be empty.'),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export type UserTeamUpdateInput = z.infer<typeof userTeamUpdateSchema>;
