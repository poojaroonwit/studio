import { useMemo, useRef, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface SafeSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    modulePermissions: string[];
    avatarUrl?: string | null;
    personalColor?: string | null;
  } | null;
  expires: string;
}

export function useSafeSession() {
  const { data: session, status } = useSession();
  const [stableSession, setStableSession] = useState<SafeSession | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSessionRef = useRef<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Handle real-time session updates with debouncing
  useEffect(() => {
    if (session && session !== lastSessionRef.current) {
      // Mark as updating
      setIsUpdating(true);
      
      // Clear any existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Debounce the session update to prevent rapid re-renders during real-time updates
      updateTimeoutRef.current = setTimeout(() => {
        if (!session || !session.user) {
          setStableSession(null);
          lastSessionRef.current = null;
          setIsUpdating(false);
          return;
        }
        
        // Ensure modulePermissions is always an array
        const safeUser = {
          ...session.user,
          modulePermissions: Array.isArray(session.user.modulePermissions) 
            ? session.user.modulePermissions 
            : []
        };
        
        const safeSession: SafeSession = {
          ...session,
          user: safeUser
        };
        
        setStableSession(safeSession);
        lastSessionRef.current = session;
        setIsUpdating(false);
      }, 50); // Short debounce for real-time updates
    } else if (!session) {
      setStableSession(null);
      lastSessionRef.current = null;
      setIsUpdating(false);
    }
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [session]);

  // Create a safe session that handles real-time updates
  const safeSession = useMemo(() => {
    if (!session || !session.user) {
      return null;
    }
    
    // Use stable session if available, otherwise create safe session
    if (stableSession) {
      return stableSession;
    }
    
    // Ensure modulePermissions is always an array
    const safeUser = {
      ...session.user,
      modulePermissions: Array.isArray(session.user.modulePermissions) 
        ? session.user.modulePermissions 
        : []
    };
    
    return {
      ...session,
      user: safeUser
    } as SafeSession;
  }, [session, stableSession]);

  // Get cached session for use during updates
  const getCachedSession = () => {
    return lastSessionRef.current;
  };

  return {
    session: safeSession,
    status,
    isUpdating,
    getCachedSession
  };
}
