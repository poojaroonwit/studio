import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDynamicPerformance } from './use-dynamic-performance';

/**
 * Custom hook to validate user sessions and handle invalid sessions
 * @param options - Configuration options
 * @param options.validateInterval - How often to validate the session (in milliseconds, default: 15 minutes)
 * @param options.autoSignOut - Whether to automatically sign out on invalid session (default: true)
 * @param options.redirectTo - Where to redirect after sign out (default: '/auth/signin')
 */
export function useSessionValidation(options: {
  validateInterval?: number;
  autoSignOut?: boolean;
  redirectTo?: string;
} = {}) {
  const { getOptimizedInterval, getOptimizedTimeout } = useDynamicPerformance();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(false);
  const lastValidationTime = useRef<number>(0);
  const validationInProgress = useRef<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const lastSessionIdRef = useRef<string | undefined>(undefined);
  
  // Get dynamic intervals and timeouts based on system performance
  const dynamicValidateInterval = getOptimizedInterval(15 * 60 * 1000, 'session');
  const dynamicRequestTimeout = getOptimizedTimeout(10000, 'request');
  
  // Memoize options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(() => ({
    validateInterval: options.validateInterval || dynamicValidateInterval,
    autoSignOut: options.autoSignOut !== false, // default true
    redirectTo: options.redirectTo || '/auth/signin'
  }), [options.validateInterval, options.autoSignOut, options.redirectTo, dynamicValidateInterval]);

  // Memoize session ID to prevent unnecessary re-renders
  const sessionId = useMemo(() => session?.user?.id, [session?.user?.id]);

  const validateSession = useCallback(async () => {
    if (validationInProgress.current) return;
    
    const now = Date.now();
    if (now - lastValidationTime.current < memoizedOptions.validateInterval) {
      return;
    }

    validationInProgress.current = true;
    setIsValidating(true);
    lastValidationTime.current = now;

    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(dynamicRequestTimeout),
      });

      if (!response.ok) {
        throw new Error('Session validation failed');
      }

      const sessionData = await response.json();
      
      if (!sessionData.user) {
        if (memoizedOptions.autoSignOut) {
          await signOut({ redirect: false });
          router.push(memoizedOptions.redirectTo);
        }
      }
    } catch (error) {
      console.error('Session validation error:', error);
      // Don't auto-signout on network errors to prevent false positives
    } finally {
      setIsValidating(false);
      validationInProgress.current = false;
    }
  }, [memoizedOptions, router, dynamicRequestTimeout]);

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

    // Set up periodic validation - use dynamic interval
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