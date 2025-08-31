"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

interface ClickProtectionConfig {
  debounceMs?: number;
  timeoutMs?: number;
  actionName?: string;
  onBlocked?: () => void;
  onExcessiveClicks?: () => void;
}

interface ClickProtectionReturn {
  isActioning: boolean;
  handleProtectedClick: (action: () => void | Promise<void>) => void;
  handleProtectedAsyncClick: (action: () => Promise<void>) => Promise<void>;
  reset: () => void;
}

export function useClickProtection(config: ClickProtectionConfig = {}): ClickProtectionReturn {
  const {
    debounceMs = 200,
    timeoutMs = 500,
    actionName = 'action',
    onBlocked,
    onExcessiveClicks
  } = config;

  const [isActioning, setIsActioning] = useState(false);
  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setIsActioning(false);
    lastClickTimeRef.current = 0;
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = null;
    }
  }, []);

  const handleProtectedClick = useCallback((action: () => void | Promise<void>) => {
    // Check if component is still mounted
    if (!isMountedRef.current) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    // Prevent rapid clicks
    if (timeSinceLastClick < debounceMs) {
      console.log(`${actionName} blocked: too rapid clicking`);
      onExcessiveClicks?.();
      return;
    }
    
    // Prevent action if already actioning
    if (isActioning) {
      console.log(`${actionName} blocked: already actioning`);
      onBlocked?.();
      return;
    }
    
    lastClickTimeRef.current = now;
    setIsActioning(true);
    
    // Clear any existing timeout
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
    }
    
    // Set timeout to reset action state
    actionTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsActioning(false);
      }
    }, timeoutMs);
    
    try {
      const result = action();
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error(`${actionName} error:`, error);
          if (isMountedRef.current) {
            setIsActioning(false);
          }
        });
      }
    } catch (error) {
      console.error(`${actionName} error:`, error);
      if (isMountedRef.current) {
        setIsActioning(false);
      }
    }
  }, [actionName, debounceMs, timeoutMs, isActioning, onBlocked, onExcessiveClicks]);

  const handleProtectedAsyncClick = useCallback(async (action: () => Promise<void>) => {
    // Check if component is still mounted
    if (!isMountedRef.current) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    
    // Prevent rapid clicks
    if (timeSinceLastClick < debounceMs) {
      console.log(`${actionName} blocked: too rapid clicking`);
      onExcessiveClicks?.();
      return;
    }
    
    // Prevent action if already actioning
    if (isActioning) {
      console.log(`${actionName} blocked: already actioning`);
      onBlocked?.();
      return;
    }
    
    lastClickTimeRef.current = now;
    setIsActioning(true);
    
    // Clear any existing timeout
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
    }
    
    try {
      await action();
    } catch (error) {
      console.error(`${actionName} error:`, error);
    } finally {
      // Set timeout to reset action state
      actionTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setIsActioning(false);
        }
      }, timeoutMs);
    }
  }, [actionName, debounceMs, timeoutMs, isActioning, onBlocked, onExcessiveClicks]);

  return {
    isActioning,
    handleProtectedClick,
    handleProtectedAsyncClick,
    reset
  };
}
