import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Custom hook to manage avatar refresh state across the application
 * This allows components to force refresh avatars when profile images are updated
 */
export function useAvatarRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: session, update } = useSession();

  const forceRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const forceRefreshForUser = useCallback((userId: string) => {
    // Force refresh for a specific user
    setRefreshKey(prev => prev + 1);
  }, []);

  const refreshSessionAvatar = useCallback(async (newAvatarUrl: string) => {
    if (session?.user) {
      try {
        await update({
          ...session,
          user: {
            ...session.user,
            avatarUrl: newAvatarUrl,
          },
        });
        forceRefresh();
      } catch (error) {
        console.error('Failed to refresh session avatar:', error);
      }
    }
  }, [session, update, forceRefresh]);

  return {
    refreshKey,
    forceRefresh,
    forceRefreshForUser,
    refreshSessionAvatar,
  };
}

/**
 * Hook to get the current avatar refresh state
 * Components can use this to determine if they should force refresh
 */
export function useAvatarRefreshState() {
  const [refreshKey, setRefreshKey] = useState(0);

  const updateRefreshKey = useCallback((newKey: number) => {
    setRefreshKey(newKey);
  }, []);

  return {
    refreshKey,
    updateRefreshKey,
  };
}

/**
 * Hook to automatically refresh avatars when session changes
 */
export function useAvatarSessionSync() {
  const { data: session } = useSession();
  const { forceRefresh } = useAvatarRefresh();

  useEffect(() => {
    // Force refresh when session changes (e.g., after login/logout)
    if (session?.user) {
      forceRefresh();
    }
  }, [session?.user?.avatarUrl, forceRefresh]);

  return { forceRefresh };
}
