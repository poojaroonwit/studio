"use client";

import React, { useState, useEffect } from 'react';
import { createEventSource, closeEventSource } from '@/lib/event-source-utils';

interface RealTimeStatusProps {
  onDataUpdate?: () => void;
}

export function RealTimeStatus({ onDataUpdate }: RealTimeStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('Never');
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let fallbackInterval: NodeJS.Timeout;
    
    if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
      // eslint-disable-next-line no-console
  
    }
    
    const eventSource = createEventSource('/api/sse');
    
    eventSource.onopen = () => {
      if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
        // eslint-disable-next-line no-console

      }
      setIsConnected(true);
      // Set initial timestamp when connected
      setLastUpdate(new Date().toLocaleTimeString());
      
      // Set up fallback interval to update timestamp every 5 seconds when connected
      fallbackInterval = setInterval(() => {
        if (mounted && isConnected) {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            // eslint-disable-next-line no-console
            console.log('[RealTimeStatus] Fallback interval update');
          }
          setLastUpdate(new Date().toLocaleTimeString());
        }
      }, 5000); // Update every 5 seconds for better performance
    };
    
    eventSource.onmessage = (event) => {
      if (mounted) {
        try {
          const data = JSON.parse(event.data);
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            // eslint-disable-next-line no-console
    
          }
          setEventCount(prev => prev + 1);
          
          setLastUpdate(new Date().toLocaleTimeString());
          
          // Trigger data update callback
          if (onDataUpdate) {
            onDataUpdate();
          }
        } catch (error) {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            // eslint-disable-next-line no-console
            console.error('[RealTimeStatus] Error parsing SSE event:', error);
          }
        }
      }
    };

    // Listen for keepalive events specifically
    eventSource.addEventListener('keepalive', (event) => {
      if (mounted) {
        try {
          const data = JSON.parse(event.data);
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            // eslint-disable-next-line no-console
    
          }
          setEventCount(prev => prev + 1);
          
          // Update timestamp on keepalive to show connection is alive
          setLastUpdate(new Date().toLocaleTimeString());
        } catch (error) {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            // eslint-disable-next-line no-console
            console.error('[RealTimeStatus] Error parsing keepalive event:', error);
          }
        }
      }
    });

    // Listen for connected events
    eventSource.addEventListener('connected', (event) => {
      if (mounted) {
        try {
          const data = JSON.parse(event.data);
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            // eslint-disable-next-line no-console
    
          }
          setEventCount(prev => prev + 1);
          
          setLastUpdate(new Date().toLocaleTimeString());
        } catch (error) {
          if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
            // eslint-disable-next-line no-console
            console.error('[RealTimeStatus] Error parsing connected event:', error);
          }
        }
      }
    });
    
    eventSource.onerror = (error) => {
      if (process.env.NEXT_PUBLIC_SSE_DEBUG === '1') {
        // eslint-disable-next-line no-console
        console.error('[RealTimeStatus] EventSource error:', error);
      }
      setIsConnected(false);
    };
    
    return () => {
      mounted = false;
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
      closeEventSource(eventSource);
    };
  }, [onDataUpdate]);

  return (
    <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-lg">
      <div className={`h-2 w-2 rounded-full animate-pulse ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <span className="text-xs text-muted-foreground">
        {isConnected ? 'Live Updates' : 'Offline'}
      </span>
      {isConnected && (
        <span className="text-xs text-muted-foreground">
          • Last update: {lastUpdate}
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
