import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export interface UserPresence {
  userId: string;
  userName: string;
  userRole: string;
  avatarUrl?: string | null;
  personalColor?: string | null;
  currentPage: string;
  lastSeen: string;
  isOnline: boolean;
}

export function useUserPresence() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);

  // Update current user's presence
  const updatePresence = useCallback(async () => {
    if (!session?.user?.id || isUpdatingRef.current) return;

    isUpdatingRef.current = true;
    try {
      await fetch('/api/realtime/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          userName: session.user.name || session.user.email || 'User',
          userRole: session.user.role || 'User',
          avatarUrl: (session.user as any).avatarUrl,
          personalColor: (session.user as any).personalColor,
          currentPage: pathname,
        }),
      });
    } catch (error) {
      console.error('Failed to update presence:', error);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [session?.user, pathname]);

  // Fetch all users' presence
  const fetchPresence = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/realtime/presence');
      if (!response.ok) {
        throw new Error('Failed to fetch presence data');
      }
      
      const data = await response.json();
      setOnlineUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch presence:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Remove current user's presence (on logout/unmount)
  const removePresence = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      await fetch('/api/realtime/presence', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      });
    } catch (error) {
      console.error('Failed to remove presence:', error);
    }
  }, [session?.user?.id]);

  // Update presence when pathname changes
  useEffect(() => {
    if (session?.user?.id) {
      updatePresence();
    }
  }, [pathname, session?.user?.id, updatePresence]);

  // Set up periodic presence updates and fetching
  useEffect(() => {
    if (!session?.user?.id) return;

    // Initial presence update
    updatePresence();
    
    // Fetch initial presence data
    fetchPresence();

    // Update presence every 30 seconds
    presenceIntervalRef.current = setInterval(updatePresence, 30000);
    
    // Fetch presence data every 10 seconds
    updateIntervalRef.current = setInterval(fetchPresence, 10000);

    // Cleanup on unmount
    return () => {
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      removePresence();
    };
  }, [session?.user?.id, updatePresence, fetchPresence, removePresence]);

  // Handle page visibility changes
  useEffect(() => {
    // Ensure we're in a browser environment
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updatePresence]);

  // Handle beforeunload (user closing tab/window)
  useEffect(() => {
    // Ensure we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    const handleBeforeUnload = () => {
      removePresence();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [removePresence]);

  return {
    onlineUsers,
    isLoading,
    error,
    updatePresence,
    fetchPresence,
    removePresence,
  };
}
