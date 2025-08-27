/**
 * Loading State Manager Hook
 * 
 * This hook provides comprehensive loading state management to prevent
 * infinite loading states and ensure proper cleanup.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface LoadingStateOptions {
  autoTimeout?: number; // Auto-clear loading after timeout (ms)
  maxRetries?: number; // Maximum retry attempts
  retryDelay?: number; // Delay between retries (ms)
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  retryCount: number;
  startTime: number | null;
}

export function useLoadingStateManager(options: LoadingStateOptions = {}) {
  const {
    autoTimeout = 30000, // 30 seconds default
    maxRetries = 3,
    retryDelay = 2000,
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    retryCount: 0,
    startTime: null,
  });

  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const startLoading = useCallback(() => {
    if (!mountedRef.current) return;

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      startTime: Date.now(),
    }));

    // Auto-clear loading after timeout
    if (autoTimeout > 0) {
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Loading timeout - please try again',
          }));
        }
      }, autoTimeout);
    }
  }, [autoTimeout]);

  const stopLoading = useCallback((error?: string) => {
    if (!mountedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      error: error || null,
      startTime: null,
    }));
  }, []);

  const setError = useCallback((error: string) => {
    if (!mountedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      error,
      startTime: null,
    }));
  }, []);

  const retry = useCallback(() => {
    if (!mountedRef.current) return;

    setState(prev => {
      const newRetryCount = prev.retryCount + 1;
      
      if (newRetryCount > maxRetries) {
        return {
          ...prev,
          error: `Maximum retry attempts (${maxRetries}) exceeded`,
          retryCount: newRetryCount,
        };
      }

      return {
        ...prev,
        isLoading: true,
        error: null,
        retryCount: newRetryCount,
        startTime: Date.now(),
      };
    });

    // Auto-retry after delay
    retryTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        // This will trigger a re-render and the parent can handle the retry logic
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    }, retryDelay);
  }, [maxRetries, retryDelay]);

  const reset = useCallback(() => {
    if (!mountedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setState({
      isLoading: false,
      error: null,
      retryCount: 0,
      startTime: null,
    });
  }, []);

  const getLoadingDuration = useCallback(() => {
    if (!state.startTime) return 0;
    return Date.now() - state.startTime;
  }, [state.startTime]);

  return {
    isLoading: state.isLoading,
    error: state.error,
    retryCount: state.retryCount,
    startTime: state.startTime,
    loadingDuration: getLoadingDuration(),
    startLoading,
    stopLoading,
    setError,
    retry,
    reset,
    canRetry: state.retryCount < maxRetries,
  };
}

// Specialized hook for API calls
export function useApiLoadingState(options: LoadingStateOptions = {}) {
  const loadingState = useLoadingStateManager(options);

  const executeWithLoading = useCallback(async <T>(
    apiCall: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: string) => void
  ): Promise<T | null> => {
    loadingState.startLoading();

    try {
      const result = await apiCall();
      loadingState.stopLoading();
      onSuccess?.(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      loadingState.setError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, [loadingState]);

  return {
    ...loadingState,
    executeWithLoading,
  };
}

// Hook for managing multiple loading states
export function useMultiLoadingState() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setLoading = useCallback((key: string, loading: boolean) => {
    if (!mountedRef.current) return;

    setLoadingStates(prev => ({
      ...prev,
      [key]: loading,
    }));
  }, []);

  const startLoading = useCallback((key: string) => {
    setLoading(key, true);
  }, [setLoading]);

  const stopLoading = useCallback((key: string) => {
    setLoading(key, false);
  }, [setLoading]);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);

  const clearAll = useCallback(() => {
    if (!mountedRef.current) return;
    setLoadingStates({});
  }, []);

  return {
    loadingStates,
    setLoading,
    startLoading,
    stopLoading,
    isLoading,
    isAnyLoading,
    clearAll,
  };
}
