import { useEffect, useCallback } from 'react';
import { preloadAvatars } from '@/lib/imageUtils';

interface User {
  id: string;
  avatarUrl?: string | null;
  image?: string | null;
}

/**
 * Hook for managing avatar caching and preloading
 */
export function useAvatarCache() {
  /**
   * Preload avatars for a list of users
   */
  const preloadUserAvatars = useCallback(async (users: User[]) => {
    try {
      await preloadAvatars(users);
    } catch (error) {
      console.warn('Failed to preload avatars:', error);
    }
  }, []);

  return {
    preloadUserAvatars
  };
}

/**
 * Hook for preloading avatars when a component mounts
 */
export function usePreloadAvatars(users: User[]) {
  const { preloadUserAvatars } = useAvatarCache();

  useEffect(() => {
    if (users.length > 0) {
      preloadUserAvatars(users);
    }
  }, [users, preloadUserAvatars]);
}

/**
 * Hook for preloading avatars with a delay to avoid blocking the main thread
 */
export function usePreloadAvatarsLazy(users: User[], delay: number = 100) {
  const { preloadUserAvatars } = useAvatarCache();

  useEffect(() => {
    if (users.length > 0) {
      const timeoutId = setTimeout(() => {
        preloadUserAvatars(users);
      }, delay);

      return () => clearTimeout(timeoutId);
    }
  }, [users, preloadUserAvatars, delay]);
}
