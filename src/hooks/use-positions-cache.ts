import { useState, useEffect, useCallback, useRef } from 'react';
import type { Position } from '@/lib/types';

interface PositionsCache {
  positions: Position[];
  loading: boolean;
  error: boolean;
  lastFetched: number | null;
}

// Global cache to share between components
let globalCache: PositionsCache = {
  positions: [],
  loading: false,
  error: false,
  lastFetched: null
};

// Global abort controller to prevent multiple concurrent requests
let globalAbortController: AbortController | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function usePositionsCache(filterOpenOnly: boolean = false) {
  // Always call hooks in the same order
  const [cache, setCache] = useState<PositionsCache>(globalCache);
  const mountedRef = useRef(true);
  const filterOpenOnlyRef = useRef(filterOpenOnly);

  // Update the ref when the prop changes
  filterOpenOnlyRef.current = filterOpenOnly;

  const fetchPositions = useCallback(async () => {
    // Check if component is still mounted
    if (!mountedRef.current) return;

    // Check if we have fresh cached data
    const now = Date.now();
    if (globalCache.lastFetched && (now - globalCache.lastFetched) < CACHE_DURATION) {
      if (mountedRef.current) {
        setCache(globalCache);
      }
      return;
    }

    // Abort any existing request
    if (globalAbortController) {
      globalAbortController.abort();
    }

    // Create new abort controller
    globalAbortController = new AbortController();
    const controller = globalAbortController;

    globalCache.loading = true;
    if (mountedRef.current) {
      setCache(globalCache);
    }

    let timeoutId: NodeJS.Timeout | null = null;

    try {
      console.log('[PositionsCache] Fetching positions...');
      
      // Add a timeout so the UI won't hang indefinitely if the request stalls
      timeoutId = setTimeout(() => {
        if (controller === globalAbortController) {
          controller.abort();
        }
      }, 10000);

      const response = await fetch('/api/positions/all', { signal: controller.signal });
      
      // Check if component is still mounted and this is still the current request
      if (!mountedRef.current || controller !== globalAbortController) {
        return;
      }
      
      // Clear timeout on successful response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      console.log(`[PositionsCache] Response status: ${response.status}`);
      
      if (!response.ok) {
        let errorMessage = 'Failed to fetch positions';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          console.error('[PositionsCache] Failed to parse error response:', parseError);
        }
        
        console.error(`[PositionsCache] API error: ${response.status} - ${errorMessage}`);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      let fetchedPositions = data.data || [];
      
      console.log(`[PositionsCache] Successfully fetched ${fetchedPositions.length} positions`);
      
      // Filter for open headcount only if requested
      if (filterOpenOnlyRef.current) {
        fetchedPositions = fetchedPositions.filter((pos: Position) => pos.isOpen);
        console.log(`[PositionsCache] Filtered to ${fetchedPositions.length} open positions`);
      }
      
      // Update global cache
      globalCache = {
        positions: fetchedPositions,
        loading: false,
        error: false,
        lastFetched: now
      };
      
      if (mountedRef.current) {
        setCache(globalCache);
      }
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Check if this is an AbortError (expected when component unmounts or new request starts)
      if (error instanceof Error && error.name === 'AbortError') {
        // This is expected behavior - don't log as error
        console.log('[PositionsCache] Request aborted (expected)');
        return;
      }

      // Check if component is still mounted and this is still the current request
      if (!mountedRef.current || controller !== globalAbortController) {
        console.log('[PositionsCache] Request cancelled - component unmounted or new request started');
        return;
      }

      // Log actual errors (not aborts)
      console.error('[PositionsCache] Error fetching positions:', error);
      
      globalCache = {
        ...globalCache,
        loading: false,
        error: true
      };
      
      if (mountedRef.current) {
        setCache(globalCache);
      }
    }
  }, []); // No dependencies - using ref instead

  const refreshPositions = useCallback(() => {
    console.log('[PositionsCache] Manually refreshing positions...');
    globalCache.lastFetched = null; // Force refresh
    fetchPositions();
  }, [fetchPositions]);

  useEffect(() => {
    mountedRef.current = true;
    fetchPositions();
    
    return () => {
      mountedRef.current = false;
    };
  }, [fetchPositions]);

  return {
    positions: cache.positions,
    loading: cache.loading,
    error: cache.error,
    refreshPositions
  };
}
