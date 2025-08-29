"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

import { useSession } from 'next-auth/react';
import { useUnifiedRealtime } from '@/hooks/use-unified-realtime-optimized';

interface Warning {
  id: string;
  configurationId: string;
  entityType: string;
  entityId: string;
  field: string;
  currentValue?: string;
  expectedValue?: string;
  message: string;
  severity: string;
  createdAt: string;
  updatedAt: string;
  configuration: {
    id: string;
    name: string;
    description?: string;
  };
}

interface WarningContextType {
  warnings: Warning[];
  unreadCount: number;
  isLoading: boolean;
  fetchWarnings: () => Promise<void>;
  checkEntityWarnings: (entityType: string, entityId: string) => Promise<void>;
}

const WarningContext = createContext<WarningContextType | undefined>(undefined);

export function WarningProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const unreadCount = warnings.length;

  // Set client flag to prevent SSR issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchWarnings = useCallback(async () => {
    if (!session?.user) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/warnings?limit=100&userId=${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setWarnings(data);
      }
    } catch (error) {
      // Error fetching warnings
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  const checkEntityWarnings = useCallback(async (entityType: string, entityId: string) => {
    try {
      const response = await fetch('/api/warnings/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entityType, entityId }),
      });

      if (response.ok) {
        // Refresh warnings after checking
        await fetchWarnings();
      }
    } catch (error) {
      // Error checking entity warnings
    }
  }, [fetchWarnings]);

  // Initialize warnings and trigger automatic check for existing data
  useEffect(() => {
    if (!session?.user || !isClient) return;

    // Fetch current warnings
    fetchWarnings();

    let timeoutId: NodeJS.Timeout | null = null;
    let mounted = true;

    // Check if warning system needs initialization
    const initializeWarningSystem = async () => {
      try {
        const response = await fetch('/api/warnings/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok && mounted) {
          const result = await response.json();
          if (result.initialized) {
            // Warning system initialized automatically
            // Refresh warnings after initialization
            // Clear any existing timeout first
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
              if (mounted) {
                fetchWarnings();
              }
            }, 2000);
          }
        }
      } catch (error) {
        // Error initializing warning system
      }
    };

    initializeWarningSystem();
    
    // Cleanup function
    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
  }, [session?.user?.id, fetchWarnings, isClient]);

  // FIXED: Stabilize callback function to prevent infinite loops
  const handleWarningUpdate = useCallback(() => {
    // Refresh warnings when warning updates are received
    fetchWarnings();
  }, [fetchWarnings]);

  // Use unified real-time hook instead of individual SSE connection (only on client)
  const { isConnected } = useUnifiedRealtime({
    onWarningUpdate: handleWarningUpdate
  });

  // Only run realtime effects on client side
  const shouldUseRealtime = isClient && session?.user;

  return (
    <WarningContext.Provider value={{
      warnings,
      unreadCount,
      isLoading,
      fetchWarnings,
      checkEntityWarnings,
    }}>
      {children}
    </WarningContext.Provider>
  );
}

export function useWarnings() {
  const context = useContext(WarningContext);
  if (context === undefined) {
    throw new Error('useWarnings must be used within a WarningProvider');
  }
  return context;
}
