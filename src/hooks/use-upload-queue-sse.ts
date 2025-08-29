import { useCallback, useState } from 'react';
import { useUnifiedRealtime } from './use-unified-realtime';

interface UploadQueueSSEMessage {
  type: 'queue' | 'error';
  data?: any;
}

interface UseUploadQueueSSEReturn {
  isConnected: boolean;
  lastMessage: UploadQueueSSEMessage | null;
  reconnect: () => void;
}

// Centralized upload queue SSE hook using unified realtime system
export function useUploadQueueSSE(): UseUploadQueueSSEReturn {
  const [lastMessage, setLastMessage] = useState<UploadQueueSSEMessage | null>(null);
  
  const { isConnected, reconnect } = useUnifiedRealtime({
    onUploadQueueUpdate: (queueData: any) => {
      setLastMessage({
        type: 'queue',
        data: queueData
      });
    }
  });

  const handleReconnect = useCallback(() => {
    reconnect();
  }, [reconnect]);

  return {
    isConnected,
    lastMessage,
    reconnect: handleReconnect
  };
}
