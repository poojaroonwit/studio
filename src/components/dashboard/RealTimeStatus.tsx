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
    
    console.log('[RealTimeStatus] Setting up EventSource connection...');
    
    const eventSource = createEventSource('/api/sse');
    
    eventSource.onopen = () => {
      console.log('[RealTimeStatus] EventSource connected');
      setIsConnected(true);
      // Set initial timestamp when connected
      setLastUpdate(new Date().toLocaleTimeString());
      
      // Set up fallback interval to update timestamp every minute when connected
      fallbackInterval = setInterval(() => {
        if (mounted && isConnected) {
          console.log('[RealTimeStatus] Fallback update - no events received, updating timestamp');
          setLastUpdate(new Date().toLocaleTimeString());
        }
      }, 10000); // Update every 10 seconds for more responsive timestamp
    };
    
    eventSource.onmessage = (event) => {
      if (mounted) {
        try {
          const data = JSON.parse(event.data);
          console.log('[RealTimeStatus] Received SSE event:', data);
          setEventCount(prev => prev + 1);
          
          setLastUpdate(new Date().toLocaleTimeString());
          
          // Trigger data update callback
          if (onDataUpdate) {
            onDataUpdate();
          }
        } catch (error) {
          console.error('[RealTimeStatus] Error parsing SSE event:', error);
        }
      }
    };

    // Listen for keepalive events specifically
    eventSource.addEventListener('keepalive', (event) => {
      if (mounted) {
        try {
          const data = JSON.parse(event.data);
          console.log('[RealTimeStatus] Received keepalive event:', data);
          setEventCount(prev => prev + 1);
          
          // Update timestamp on keepalive to show connection is alive
          setLastUpdate(new Date().toLocaleTimeString());
        } catch (error) {
          console.error('[RealTimeStatus] Error parsing keepalive event:', error);
        }
      }
    });

    // Listen for connected events
    eventSource.addEventListener('connected', (event) => {
      if (mounted) {
        try {
          const data = JSON.parse(event.data);
          console.log('[RealTimeStatus] Received connected event:', data);
          setEventCount(prev => prev + 1);
          
          setLastUpdate(new Date().toLocaleTimeString());
        } catch (error) {
          console.error('[RealTimeStatus] Error parsing connected event:', error);
        }
      }
    });
    
    eventSource.onerror = (error) => {
      console.error('[RealTimeStatus] EventSource error:', error);
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
