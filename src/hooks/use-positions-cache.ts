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
    if (
      globalCache.positions.length > 0 &&
      globalCache.lastFetched &&
      now - globalCache.lastFetched < CACHE_DURATION &&
      !globalCache.error
    ) {
      setCache(globalCache);
      return;
    }

    // Set loading state
    globalCache.loading = true;
    globalCache.error = false;
    setCache(globalCache);

    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Add a timeout so the UI won't hang indefinitely if the request stalls
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/positions/all', { signal: controller.signal });
      
      // Clear timeout on successful response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }
      const data = await response.json();
      let fetchedPositions = data.data || [];
      
      // Filter for open headcount only if requested
      if (filterOpenOnly) {
        fetchedPositions = fetchedPositions.filter((pos: Position) => pos.isOpen);
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
      
      console.error('Error fetching positions:', error);
      globalCache = {
        ...globalCache,
        loading: false,
        error: true
      };
      setCache(globalCache);
    }
  }, [filterOpenOnly]);

  const refreshPositions = useCallback(() => {
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
