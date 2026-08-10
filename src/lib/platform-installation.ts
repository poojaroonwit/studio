import { z } from 'zod';

import prisma from '@/lib/prisma';

export const firstAdminSetupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: z.string().trim().email('Enter a valid email address.').max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
}).refine((input) => input.password === input.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export type FirstAdminSetupInput = z.infer<typeof firstAdminSetupSchema>;

export async function isPlatformSetupRequired() {
  return (await prisma.user.count({ where: { role: 'Admin', isActive: true } })) === 0;
}
