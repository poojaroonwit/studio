import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hook to handle logout redirects and prevent getting stuck
 * @param isAuthenticated - Whether the user is currently authenticated
 * @param redirectPath - The path to redirect to (default: '/auth/signin')
 */
export function useLogoutRedirect(isAuthenticated: boolean, redirectPath: string = '/auth/signin') {
  const router = useRouter();
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Clear any existing timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    // Reset redirect flag when authentication status changes
    if (isAuthenticated) {
      hasRedirectedRef.current = false;
      return;
    }

    // If not authenticated and we haven't redirected yet
    if (!isAuthenticated && !hasRedirectedRef.current) {
      // Check if we're already on the signin page or if a logout is in progress
      const isOnSigninPage = typeof window !== 'undefined' && window.location.pathname === '/auth/signin';
      const isLogoutInProgress = typeof window !== 'undefined' && window.location.search.includes('signout=true');
      
      if (!isOnSigninPage && !isLogoutInProgress) {
        // Set a timeout to prevent getting stuck
        redirectTimeoutRef.current = setTimeout(() => {
          if (!hasRedirectedRef.current) {
            console.log('[LOGOUT_REDIRECT] Redirecting to signin page after timeout');
            hasRedirectedRef.current = true;
            router.replace(redirectPath);
          }
        }, 1000); // 1 second timeout
      }
    }

    // Cleanup function
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, redirectPath, router]);

  return {
    hasRedirected: hasRedirectedRef.current
  };
}
