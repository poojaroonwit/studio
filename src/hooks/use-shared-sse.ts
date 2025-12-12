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

// Reconnection management
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000; // 30 seconds max
const INITIAL_RECONNECT_DELAY = 3000; // 3 seconds initial

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

// Schedule automatic reconnection with exponential backoff
function scheduleReconnect() {
  // Clear any existing timer
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Calculate delay with exponential backoff
  const delay = Math.min(
    INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
    MAX_RECONNECT_DELAY
  );

  console.log(`Scheduling SSE reconnect in ${delay}ms (attempt ${reconnectAttempts + 1})`);

  reconnectTimer = setTimeout(() => {
    reconnectAttempts++;
    initializeGlobalSSE();
  }, delay);
}

// Initialize global SSE connection
function initializeGlobalSSE() {
  // Clear any pending reconnection
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (globalEventSource) {
    return; // Already initialized
  }

  try {
    globalEventSource = new EventSource('/api/sse');

    // Set a timeout to prevent hanging connections
    const connectionTimeout = setTimeout(() => {
      if (globalEventSource && !globalState.isConnected) {
        try {
          globalEventSource.close();
        } catch (e) {
        }
        globalEventSource = null;
        globalState.isConnected = false;
        globalState.error = 'Connection timeout';
        notifyStateListeners();
      }
    }, 15000); // 15 second timeout

    globalEventSource.onopen = () => {
      clearTimeout(connectionTimeout); // Clear the timeout since we connected
      reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      globalState.isConnected = true;
      globalState.error = null;
      globalState.lastUpdate = new Date().toLocaleTimeString();
      console.log('SSE connection established');
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
      }
    };

    // Handle named SSE events (e.g., event: upload_queue_update)
    const handleNamedEvent = (eventName: string) => (event: MessageEvent) => {
      try {
        const data = JSON.parse((event as MessageEvent).data as string);
        // Count only meaningful events
        if (data.type && !['keepalive', 'connected'].includes(data.type)) {
          globalState.eventCount++;
        }
        globalState.lastUpdate = new Date().toLocaleTimeString();
        notifyEventListeners({
          type: eventName,
          data,
          timestamp: new Date().toISOString()
        });
        notifyStateListeners();
      } catch (e) {
      }
    };

    // Register listeners for common named events we emit from the server
    globalEventSource.addEventListener('upload_queue_update', handleNamedEvent('upload_queue_update'));

    globalEventSource.addEventListener('keepalive', (event) => {
      try {
        const data = JSON.parse(event.data);
        globalState.lastUpdate = new Date().toLocaleTimeString();
        notifyStateListeners();
      } catch (error) {
      }
    });

    globalEventSource.addEventListener('connected', (event) => {
      try {
        const data = JSON.parse(event.data);
        globalState.lastUpdate = new Date().toLocaleTimeString();
        notifyStateListeners();
      } catch (error) {
      }
    });

    globalEventSource.onerror = (error) => {
      clearTimeout(connectionTimeout); // Clear the timeout
      globalState.isConnected = false;
      globalState.error = 'Connection error - reconnecting...';
      notifyStateListeners();

      // Close the connection to prevent infinite retry loops
      try {
        if (globalEventSource) {
          globalEventSource.close();
        }
      } catch (e) {
      }
      globalEventSource = null;

      // Schedule automatic reconnection
      scheduleReconnect();
    };

  } catch (error) {
    globalState.error = 'Failed to initialize connection';
    notifyStateListeners();
  }
}

// Cleanup global SSE connection
function cleanupGlobalSSE() {
  // Clear any pending reconnection
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (globalEventSource) {
    try { globalEventSource.close(); } catch { }
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
