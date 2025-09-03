"use client";

import React, { useState, useEffect } from 'react';
import { createEventSource, closeEventSource } from '@/lib/event-source-utils';

interface RealTimeStatusProps {
  onDataUpdate?: () => void;
}

export function RealTimeStatus({ onDataUpdate }: RealTimeStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('Never');

  useEffect(() => {
    let mounted = true;
    
    console.log('[RealTimeStatus] Setting up EventSource connection...');
    
    const eventSource = createEventSource('/api/sse');
    
    eventSource.onopen = () => {
      console.log('[RealTimeStatus] EventSource connected');
      setIsConnected(true);
    };
    
    eventSource.onmessage = (event) => {
      if (mounted) {
        try {
          const data = JSON.parse(event.data);
          console.log('[RealTimeStatus] Received SSE event:', data);
          
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
    
    eventSource.onerror = (error) => {
      console.error('[RealTimeStatus] EventSource error:', error);
      setIsConnected(false);
    };
    
    return () => {
      mounted = false;
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
    </div>
  );
}
