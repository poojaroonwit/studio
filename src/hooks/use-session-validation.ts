import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
// Removed complex dynamic performance - using simple constants instead

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(false);
  const lastValidationTime = useRef<number>(0);
  const validationInProgress = useRef<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const lastSessionIdRef = useRef<string | undefined>(undefined);
  
  // Simple constants instead of complex dynamic performance - optimized for better performance
  const DEFAULT_VALIDATE_INTERVAL = 30 * 60 * 1000; // Increased from 15 to 30 minutes
  const DEFAULT_REQUEST_TIMEOUT = 15000; // Increased from 10 to 15 seconds
  
  // Memoize options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(() => ({
    validateInterval: options.validateInterval || DEFAULT_VALIDATE_INTERVAL,
    autoSignOut: options.autoSignOut !== false, // default true
    redirectTo: options.redirectTo || '/auth/signin'
  }), [options.validateInterval, options.autoSignOut, options.redirectTo]);

  // Memoize session ID to prevent unnecessary re-renders
  const sessionId = useMemo(() => session?.user?.id, [session?.user?.id]);

  const validateSession = useCallback(async () => {
    if (validationInProgress.current) return;
    
    // Skip validation if we're on the signin page or during logout
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const isSignoutInProgress = searchParams.get('signout') === 'true';
      
      if (pathname === '/auth/signin' || isSignoutInProgress) {
        return;
      }
    }
    
    // Check current session status before validating
    if (status !== 'authenticated') {
      return;
    }
    
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
        signal: AbortSignal.timeout(DEFAULT_REQUEST_TIMEOUT),
      });

      // Handle 500 errors gracefully - might be during logout
      if (response.status === 500) {
        // Check if we're still authenticated, if not, skip validation
        if (status !== 'authenticated') {
          return;
        }
        // If still authenticated but got 500, log but don't sign out
        console.warn('Session validation returned 500, but user is still authenticated. Skipping validation.');
        return;
      }

      if (!response.ok) {
        // Only throw for non-500 errors
        if (response.status !== 401 && response.status !== 403) {
          throw new Error('Session validation failed');
        }
        // For 401/403, check if session is still valid
        const sessionData = await response.json().catch(() => ({}));
        if (!sessionData.user && memoizedOptions.autoSignOut) {
          await signOut({ redirect: false });
          router.push(memoizedOptions.redirectTo);
        }
        return;
      }

      const sessionData = await response.json();
      
      if (!sessionData.user) {
        if (memoizedOptions.autoSignOut) {
          await signOut({ redirect: false });
          router.push(memoizedOptions.redirectTo);
        }
      }
    } catch (error) {
      // Check if error is due to abort (timeout) or network issue
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          // Network timeout - don't sign out, just log
          console.warn('Session validation timeout, skipping');
          return;
        }
        // Check if we're still authenticated before logging error
        if (status === 'authenticated') {
          console.error('Session validation error:', error);
        }
      }
      // Don't auto-signout on network errors to prevent false positives
    } finally {
      setIsValidating(false);
      validationInProgress.current = false;
    }
  }, [memoizedOptions, router, status]);

  // Memoize the effect dependencies to prevent unnecessary re-renders
  const effectDependencies = useMemo(() => ({
    status,
    sessionId,
    validateInterval: memoizedOptions.validateInterval
  }), [status, sessionId, memoizedOptions.validateInterval]);

  useEffect(() => {
    // Skip validation if we're on the signin page or during logout
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const isSignoutInProgress = searchParams.get('signout') === 'true';
      
      if (pathname === '/auth/signin' || isSignoutInProgress) {
        // Clear any existing interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
    }
    
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
