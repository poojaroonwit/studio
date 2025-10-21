"use client";

import React, { useEffect } from 'react';
import { useSharedSSE } from '@/hooks/use-shared-sse';

interface RealTimeStatusProps {
  onDataUpdate?: () => void;
}

export function RealTimeStatus({ onDataUpdate }: RealTimeStatusProps) {
  const { isConnected, eventCount, lastUpdate, error, subscribeToEvents } = useSharedSSE();

  useEffect(() => {
    // Subscribe to events and trigger data updates
    const unsubscribe = subscribeToEvents((event) => {
      // Trigger data update callback for meaningful events
      if (onDataUpdate && !['keepalive', 'connected'].includes(event.type)) {
        onDataUpdate();
      }
    });

    return unsubscribe;
  }, [onDataUpdate, subscribeToEvents]);

  return (
    <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-lg">
      <span className="text-xs text-muted-foreground">
        {isConnected ? 'Live Updates' : 'Offline'}
      </span>
      {isConnected && (
        <span className="text-xs text-muted-foreground">
          • Last update: {lastUpdate}
        </span>
      )}
      {error && (
        <span className="text-xs text-red-500">
          • Error: {error}
        </span>
      )}
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <span className="text-xs text-muted-foreground">
          • Events: {eventCount}
        </span>
      )}
    </div>
  );
}