import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/**
 * Custom hook to validate user sessions and handle invalid sessions
 * @param options - Configuration options
 * @param options.validateInterval - How often to validate the session (in milliseconds, default: 5 minutes)
 * @param options.autoSignOut - Whether to automatically sign out on invalid session (default: true)
 * @param options.redirectTo - Where to redirect after sign out (default: '/auth/signin')
 */
export function useSessionValidation(options: {
  validateInterval?: number;
  autoSignOut?: boolean;
  redirectTo?: string;
} = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(false);
  const lastValidationTime = useRef<number>(0);
  const validationInProgress = useRef<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const lastSessionIdRef = useRef<string | undefined>(undefined);
  
  // Memoize options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(() => ({
    validateInterval: options.validateInterval || 5 * 60 * 1000, // 5 minutes
    autoSignOut: options.autoSignOut !== false, // default true
    redirectTo: options.redirectTo || '/auth/signin'
  }), [options.validateInterval, options.autoSignOut, options.redirectTo]);

  // Memoize session ID to prevent unnecessary re-renders
  const sessionId = useMemo(() => session?.user?.id, [session?.user?.id]);

  const validateSession = useCallback(async () => {
    if (status !== 'authenticated' || !session) {
      return;
    }

    // Prevent concurrent validation calls
    if (validationInProgress.current) {
      return;
    }

    // Prevent excessive validation calls - increased minimum interval to 60 seconds
    const now = Date.now();
    if (now - lastValidationTime.current < 60000) { // Minimum 60 seconds between validations
      return;
    }

    try {
      validationInProgress.current = true;
      setIsValidating(true);
      lastValidationTime.current = now;

      const response = await fetch('/api/auth/validate-session', {
        method: 'GET',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.warn('Session validation failed:', errorData.error);
        
        if (memoizedOptions.autoSignOut) {
          await signOut({ 
            callbackUrl: `${memoizedOptions.redirectTo}?signout=true`,
            redirect: false 
          });
          // Manually redirect after signOut completes
          if (typeof window !== 'undefined') {
            window.location.href = `${memoizedOptions.redirectTo}?signout=true`;
          }
        }
      }
    } catch (error) {
      console.error('Session validation error:', error);
      // Don't auto sign out on network errors, only on validation failures
      // This prevents users from being logged out due to temporary network issues
    } finally {
      setIsValidating(false);
      validationInProgress.current = false;
    }
  }, [session, status, memoizedOptions.autoSignOut, memoizedOptions.redirectTo]);

  // Memoize the effect dependencies to prevent unnecessary re-renders
  const effectDependencies = useMemo(() => ({
    status,
    sessionId,
    validateInterval: memoizedOptions.validateInterval
  }), [status, sessionId, memoizedOptions.validateInterval]);

  useEffect(() => {
    if (effectDependencies.status !== 'authenticated') {
      // Clear any existing interval when not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Only initialize once per session
    if (hasInitializedRef.current && lastSessionIdRef.current === effectDependencies.sessionId) {
      return;
    }
    
    hasInitializedRef.current = true;
    lastSessionIdRef.current = effectDependencies.sessionId;

    // Validate immediately
    validateSession();

    // Set up periodic validation
    intervalRef.current = setInterval(validateSession, effectDependencies.validateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [effectDependencies, validateSession]);

  // Memoize the return value to prevent unnecessary re-renders
  const memoizedValue = useMemo(() => ({
    isValidating,
    isAuthenticated: status === 'authenticated',
    session,
    validateSession
  }), [isValidating, status, session, validateSession]);

  return memoizedValue;
} 