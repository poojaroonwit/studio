import { useEffect, useRef, useState, useCallback } from 'react';

type EventData = any;

interface EventSourceOptions {
  withCredentials?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  enableCircuitBreaker?: boolean;
}

export function useEventSource(url: string, options: EventSourceOptions = {}) {
  const {
    withCredentials = false,
    timeoutMs = 30000, // 30 second timeout
    maxRetries = 3,
    retryDelayMs = 5000, // 5 second delay between retries
    enableCircuitBreaker = true
  } = options;

  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<EventData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isCircuitOpen, setIsCircuitOpen] = useState(false);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastErrorTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (e) {
        console.warn('[EventSource] Error closing connection:', e);
      }
      eventSourceRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // Circuit breaker: if too many recent failures, don't retry immediately
    if (enableCircuitBreaker && isCircuitOpen) {
      const timeSinceLastError = Date.now() - lastErrorTimeRef.current;
      if (timeSinceLastError < 60000) { // 1 minute circuit breaker
        console.warn('[EventSource] Circuit breaker open, skipping connection attempt');
        return;
      } else {
        setIsCircuitOpen(false);
        setRetryCount(0);
      }
    }

    // Don't retry if we've exceeded max retries
    if (retryCount >= maxRetries) {
      console.warn('[EventSource] Max retries exceeded, giving up');
      setError(`Connection failed after ${maxRetries} attempts`);
      setIsCircuitOpen(true);
      lastErrorTimeRef.current = Date.now();
      return;
    }

    cleanup();

    try {
      console.log(`[EventSource] Attempting connection to ${url} (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      const es = new EventSource(url, { withCredentials });
      eventSourceRef.current = es;

      // Set connection timeout
      timeoutRef.current = setTimeout(() => {
        console.warn('[EventSource] Connection timeout, closing');
        cleanup();
        setConnected(false);
        setError('Connection timeout');
        
        // Schedule retry
        if (retryCount < maxRetries) {
          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connect();
          }, retryDelayMs);
        } else {
          setIsCircuitOpen(true);
          lastErrorTimeRef.current = Date.now();
        }
      }, timeoutMs);

      es.onopen = () => {
        console.log('[EventSource] Connected successfully');
        cleanup(); // Clear timeout
        setConnected(true);
        setError(null);
        setRetryCount(0);
        setIsCircuitOpen(false);
      };

      es.onerror = (event) => {
        console.warn('[EventSource] Connection error:', event);
        cleanup();
        setConnected(false);
        setError('Connection error');
        
        // Schedule retry
        if (retryCount < maxRetries) {
          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connect();
          }, retryDelayMs);
        } else {
          setIsCircuitOpen(true);
          lastErrorTimeRef.current = Date.now();
        }
      };

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setLastEvent(data);
        } catch {
          setLastEvent(e.data);
        }
      };

    } catch (error) {
      console.error('[EventSource] Failed to create connection:', error);
      setError(`Failed to create connection: ${error}`);
      setConnected(false);
      
      // Schedule retry
      if (retryCount < maxRetries) {
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          connect();
        }, retryDelayMs);
      } else {
        setIsCircuitOpen(true);
        lastErrorTimeRef.current = Date.now();
      }
    }
  }, [url, withCredentials, timeoutMs, maxRetries, retryDelayMs, enableCircuitBreaker, retryCount, isCircuitOpen, cleanup]);

  useEffect(() => {
    connect();
    
    return cleanup;
  }, [connect, cleanup]);

  const reconnect = useCallback(() => {
    console.log('[EventSource] Manual reconnect requested');
    setRetryCount(0);
    setIsCircuitOpen(false);
    setError(null);
    connect();
  }, [connect]);

  return { 
    connected, 
    lastEvent, 
    error, 
    retryCount, 
    isCircuitOpen,
    reconnect 
  };
}


