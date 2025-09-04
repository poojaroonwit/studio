// Shared SSE Hook - Single connection for all components
// This prevents multiple SSE connections and reduces event frequency

import { useEffect, useRef, useState, useCallback } from 'react';
// Use native EventSource directly

interface SSEEvent {
  type: string;
  data: any;
  timestamp: string;
}

interface SharedSSEState {
  isConnected: boolean;
  eventCount: number;
  lastUpdate: string;
  error: string | null;
}

// Global SSE connection state
let globalEventSource: EventSource | null = null;
let globalState: SharedSSEState = {
  isConnected: false,
  eventCount: 0,
  lastUpdate: 'Never',
  error: null
};

// Global event listeners
const globalEventListeners = new Set<(event: SSEEvent) => void>();
const globalStateListeners = new Set<(state: SharedSSEState) => void>();

// Notify all listeners of state changes
function notifyStateListeners() {
  globalStateListeners.forEach(listener => listener(globalState));
}

// Notify all listeners of events
function notifyEventListeners(event: SSEEvent) {
  globalEventListeners.forEach(listener => listener(event));
}

// Initialize global SSE connection
function initializeGlobalSSE() {
  if (globalEventSource) {
    return; // Already initialized
  }

  try {
    globalEventSource = new EventSource('/api/sse');
    
    // Set a timeout to prevent hanging connections
    const connectionTimeout = setTimeout(() => {
      if (globalEventSource && !globalState.isConnected) {
        console.warn('[SharedSSE] Connection timeout, closing');
        try {
          globalEventSource.close();
        } catch (e) {
          console.warn('[SharedSSE] Error closing timed out connection:', e);
        }
        globalEventSource = null;
        globalState.isConnected = false;
        globalState.error = 'Connection timeout';
        notifyStateListeners();
      }
    }, 15000); // 15 second timeout
    
    globalEventSource.onopen = () => {
      clearTimeout(connectionTimeout); // Clear the timeout since we connected
      globalState.isConnected = true;
      globalState.error = null;
      globalState.lastUpdate = new Date().toLocaleTimeString();
      notifyStateListeners();
    };

    globalEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Only count meaningful events, not keepalive or connected events
        if (data.type && !['keepalive', 'connected'].includes(data.type)) {
          globalState.eventCount++;
        }
        
        globalState.lastUpdate = new Date().toLocaleTimeString();
        
        // Notify event listeners
        notifyEventListeners({
          type: data.type || 'message',
          data,
          timestamp: new Date().toISOString()
        });
        
        // Notify state listeners
        notifyStateListeners();
      } catch (error) {
        console.error('[SharedSSE] Error parsing event:', error);
      }
    };

    globalEventSource.addEventListener('keepalive', (event) => {
      try {
        const data = JSON.parse(event.data);
        globalState.lastUpdate = new Date().toLocaleTimeString();
        notifyStateListeners();
      } catch (error) {
        console.error('[SharedSSE] Error parsing keepalive:', error);
      }
    });

    globalEventSource.addEventListener('connected', (event) => {
      try {
        const data = JSON.parse(event.data);
        globalState.lastUpdate = new Date().toLocaleTimeString();
        notifyStateListeners();
      } catch (error) {
        console.error('[SharedSSE] Error parsing connected:', error);
      }
    });

    globalEventSource.onerror = (error) => {
      clearTimeout(connectionTimeout); // Clear the timeout
      console.warn('[SharedSSE] Connection error:', error);
      globalState.isConnected = false;
      globalState.error = 'Connection error';
      notifyStateListeners();
      
      // Close the connection to prevent infinite retry loops
      try {
        if (globalEventSource) {
          globalEventSource.close();
        }
      } catch (e) {
        console.warn('[SharedSSE] Error closing failed connection:', e);
      }
      globalEventSource = null;
    };

  } catch (error) {
    globalState.error = 'Failed to initialize connection';
    notifyStateListeners();
  }
}

// Cleanup global SSE connection
function cleanupGlobalSSE() {
  if (globalEventSource) {
    try { globalEventSource.close(); } catch {}
    globalEventSource = null;
    globalState.isConnected = false;
    globalState.error = null;
    notifyStateListeners();
  }
}

export function useSharedSSE() {
  const [state, setState] = useState<SharedSSEState>(globalState);
  const eventListenerRef = useRef<(event: SSEEvent) => void>();
  const stateListenerRef = useRef<(state: SharedSSEState) => void>();

  // Initialize global connection on first use
  useEffect(() => {
    initializeGlobalSSE();
  }, []);

  // Subscribe to state changes
  useEffect(() => {
    stateListenerRef.current = (newState: SharedSSEState) => {
      setState(newState);
    };
    
    globalStateListeners.add(stateListenerRef.current);
    
    return () => {
      if (stateListenerRef.current) {
        globalStateListeners.delete(stateListenerRef.current);
      }
    };
  }, []);

  // Subscribe to events
  const subscribeToEvents = useCallback((callback: (event: SSEEvent) => void) => {
    eventListenerRef.current = callback;
    globalEventListeners.add(callback);
    
    return () => {
      globalEventListeners.delete(callback);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventListenerRef.current) {
        globalEventListeners.delete(eventListenerRef.current);
      }
    };
  }, []);

  return {
    ...state,
    subscribeToEvents,
    reconnect: initializeGlobalSSE,
    disconnect: cleanupGlobalSSE
  };
}

// Export cleanup function for global cleanup
export { cleanupGlobalSSE };
