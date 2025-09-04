import { useEffect, useRef, useState } from 'react';
import { safeFetch } from '@/lib/safe-fetch';

interface SSEFallbackOptions {
  fallbackIntervalMs?: number;
  enableFallback?: boolean;
}

/**
 * Fallback hook that provides polling when SSE is not available
 * This prevents the app from getting stuck when SSE fails
 */
export function useSSEFallback(options: SSEFallbackOptions = {}) {
  const {
    fallbackIntervalMs = 30000, // 30 second polling interval
    enableFallback = true
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = () => {
    if (!enableFallback || intervalRef.current) {
      return;
    }

    console.log('[SSEFallback] Starting fallback polling');
    setIsPolling(true);

    intervalRef.current = setInterval(async () => {
      try {
        // Just ping a lightweight endpoint to keep the connection alive
        const result = await safeFetch('/api/sse/status', { timeoutMs: 5000 });
        if (result.ok) {
          setLastPollTime(new Date());
        } else {
          console.warn('[SSEFallback] Polling endpoint failed:', result.error);
        }
      } catch (error) {
        console.warn('[SSEFallback] Polling error:', error);
      }
    }, fallbackIntervalMs);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPolling(false);
      console.log('[SSEFallback] Stopped fallback polling');
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    isPolling,
    lastPollTime,
    startPolling,
    stopPolling
  };
}
