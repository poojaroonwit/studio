import { useCallback, useState } from 'react';
import { useUploadQueueUpdates } from './use-simple-sse';

interface UploadQueueSSEMessage {
  type: 'queue' | 'error';
  data?: any;
}

interface UseUploadQueueSSEReturn {
  isConnected: boolean;
  lastMessage: UploadQueueSSEMessage | null;
  reconnect: () => void;
}

// Simple upload queue SSE hook
export function useUploadQueueUpdates(): UseUploadQueueSSEReturn {
  const { isConnected, latestUpdate, reconnect } = useUploadQueueUpdates();
  
  const lastMessage = latestUpdate ? {
    type: 'queue' as const,
    data: latestUpdate
  } : null;

  const handleReconnect = useCallback(() => {
    reconnect();
  }, [reconnect]);

  return {
    isConnected,
    lastMessage,
    reconnect: handleReconnect
  };
}
