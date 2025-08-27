import { useState, useEffect, useCallback } from 'react';
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

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function usePositionsCache(filterOpenOnly: boolean = false) {
  const [cache, setCache] = useState<PositionsCache>(globalCache);

  const fetchPositions = useCallback(async () => {
    // Check if we have fresh cached data
    const now = Date.now();
    if (globalCache.lastFetched && (now - globalCache.lastFetched) < CACHE_DURATION) {
      setCache(globalCache);
      return;
    }

    globalCache.loading = true;
    setCache(globalCache);

    let timeoutId: NodeJS.Timeout | null = null;

    try {
      console.log('[PositionsCache] Fetching positions...');
      
      // Add a timeout so the UI won't hang indefinitely if the request stalls
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/positions/all', { signal: controller.signal });
      
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
      if (filterOpenOnly) {
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
      
      setCache(globalCache);
    } catch (error) {
      // Clear timeout on error
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      console.error('[PositionsCache] Error fetching positions:', error);
      globalCache = {
        ...globalCache,
        loading: false,
        error: true
      };
      setCache(globalCache);
    }
  }, [filterOpenOnly]);

  const refreshPositions = useCallback(() => {
    console.log('[PositionsCache] Manually refreshing positions...');
    globalCache.lastFetched = null; // Force refresh
    fetchPositions();
  }, [fetchPositions]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return {
    positions: cache.positions,
    loading: cache.loading,
    error: cache.error,
    refreshPositions
  };
}
