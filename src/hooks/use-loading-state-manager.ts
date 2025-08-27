/**
 * Loading State Manager Hook
 * 
 * This hook provides comprehensive loading state management without timeouts or retries.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface LoadingStateOptions {
  // Removed timeout and retry options
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  startTime: number | null;
}

export function useLoadingStateManager(options: LoadingStateOptions = {}) {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    startTime: null,
  });

  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
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
  }, []);

  const stopLoading = useCallback((error?: string) => {
    if (!mountedRef.current) return;

    setState(prev => ({
      ...prev,
      isLoading: false,
      error: error || null,
      startTime: null,
    }));
  }, []);

  const setError = useCallback((error: string) => {
    if (!mountedRef.current) return;

    setState(prev => ({
      ...prev,
      isLoading: false,
      error,
      startTime: null,
    }));
  }, []);

  const reset = useCallback(() => {
    if (!mountedRef.current) return;

    setState({
      isLoading: false,
      error: null,
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
    startTime: state.startTime,
    loadingDuration: getLoadingDuration(),
    startLoading,
    stopLoading,
    setError,
    reset,
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
