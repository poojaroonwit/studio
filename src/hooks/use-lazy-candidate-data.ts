import { useState, useCallback, useRef, useEffect } from 'react';

interface LazyDataState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

interface UseLazyCandidateDataOptions {
  candidateId: string;
  type: 'job-matches' | 'attachments' | 'transitions';
  initialLimit?: number;
  autoLoad?: boolean;
}

export function useLazyCandidateData<T>({
  candidateId,
  type,
  initialLimit = 10,
  autoLoad = false
}: UseLazyCandidateDataOptions) {
  const [state, setState] = useState<LazyDataState<T>>({
    data: [],
    loading: false,
    error: null,
    hasMore: true,
    page: 1
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadData = useCallback(async (page = 1, append = false) => {
    if (!candidateId || loadingRef.current || !mountedRef.current) return;

    loadingRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const params = new URLSearchParams({
        type,
        page: page.toString(),
        limit: initialLimit.toString()
      });

      const response = await fetch(`/api/candidates/${candidateId}/additional?${params}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'max-age=60'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${type}: ${response.status}`);
      }

      const result: { data: T[]; pagination: PaginationInfo } = await response.json();

      if (mountedRef.current) {
        setState(prev => ({
          data: append ? [...prev.data, ...result.data] : result.data,
          loading: false,
          error: null,
          hasMore: result.pagination.hasMore,
          page: result.pagination.page
        }));
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, don't update state
        return;
      }

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load data'
        }));
      }
    } finally {
      loadingRef.current = false;
    }
  }, [candidateId, type, initialLimit]);

  const loadMore = useCallback(() => {
    if (!state.hasMore || state.loading) return;
    loadData(state.page + 1, true);
  }, [state.hasMore, state.loading, state.page, loadData]);

  const refresh = useCallback(() => {
    loadData(1, false);
  }, [loadData]);

  const reset = useCallback(() => {
    if (mountedRef.current) {
      setState({
        data: [],
        loading: false,
        error: null,
        hasMore: true,
        page: 1
      });
    }
  }, []);

  // Auto-load on mount if enabled
  if (autoLoad && state.data.length === 0 && !state.loading && !state.error) {
    loadData(1, false);
  }

  return {
    ...state,
    loadData,
    loadMore,
    refresh,
    reset
  };
}
