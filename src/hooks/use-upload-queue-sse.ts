import { useEffect, useState, useCallback } from 'react';
import { useEnhancedSSE, useEnhancedUploadQueueUpdates } from '@/hooks/use-enhanced-sse';

export function useUploadQueueSSE() {
  const { isConnected: realtimeConnected } = useEnhancedSSE();
  const { isConnected: uploadQueueConnected, hasMainSSE } = useEnhancedUploadQueueUpdates();
  
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(realtimeConnected && uploadQueueConnected);
  }, [realtimeConnected, uploadQueueConnected]);

  const refresh = useCallback(() => {
    setLastUpdate(new Date());
  }, []);

  return {
    isConnected,
    lastUpdate,
    refresh,
    hasMainSSE
  };
}
