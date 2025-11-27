// src/app/api/auth/[...nextauth]/route.ts
/**
 * NextAuth v5 (Auth.js) Route Handler
 * 
 * This is the simplified route handler for NextAuth v5.
 * NextAuth v5 is designed for Next.js 15 App Router and doesn't have
 * the route detection issues that v4 had.
 */

import { handlers } from '@/auth';

export const { GET, POST } = handlers;
