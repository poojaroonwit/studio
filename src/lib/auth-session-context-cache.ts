import type { PlatformModuleId } from '@/lib/types';

export type UserFullContextReason = 'VALID' | 'NOT_FOUND' | 'EXPIRED' | 'INVALIDATED' | 'ERROR';

export type UserFullContextResult = {
  isValid: boolean;
  reason?: UserFullContextReason;
  userId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    image: string | null;
    avatarUrl: string | null;
    personalColor: string | null;
    isActive: boolean;
    twoFactorEnabled: boolean;
    twoFactorMethod: string | null;
    modulePermissions: PlatformModuleId[];
  };
};

const SESSION_CONTEXT_CACHE_TTL_MS = 5000;

const sessionContextCache = new Map<string, {
  expiresAt: number;
  value: UserFullContextResult;
}>();

export function getCachedUserFullContext(sessionToken: string) {
  const cached = sessionContextCache.get(sessionToken);
  if (!cached || cached.expiresAt <= Date.now()) {
    sessionContextCache.delete(sessionToken);
    return null;
  }

  return cached.value;
}

export function setCachedUserFullContext(sessionToken: string, value: UserFullContextResult) {
  sessionContextCache.set(sessionToken, {
    expiresAt: Date.now() + SESSION_CONTEXT_CACHE_TTL_MS,
    value,
  });
}

export function deleteCachedUserFullContext(sessionToken: string) {
  sessionContextCache.delete(sessionToken);
}

export function clearUserFullContextCache(sessionToken?: string) {
  if (sessionToken) {
    deleteCachedUserFullContext(sessionToken);
    return;
  }

  sessionContextCache.clear();
}
