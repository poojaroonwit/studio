import { useState, useEffect, useCallback } from 'react';
import type { PositionLevel } from '@/lib/types';

export function usePositionLevels() {
  const [levels, setLevels] = useState<PositionLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLevels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/settings/position-levels');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch position levels' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: PositionLevel[] = await response.json();
      setLevels(data);
    } catch (err) {
      console.error('Error fetching position levels:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  const refreshLevels = useCallback(() => {
    fetchLevels();
  }, [fetchLevels]);

  return {
    levels,
    isLoading,
    error,
    refreshLevels
  };
}
