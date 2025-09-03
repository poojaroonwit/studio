// EventSource Utility Functions
// Provides simple EventSource creation and management for components

export function createEventSource(url: string): EventSource {
  console.log('[EventSource Utils] Creating EventSource connection to:', url);
  
  const eventSource = new EventSource(url);
  
  // Add error handling
  eventSource.onerror = (error) => {
    console.error('[EventSource Utils] EventSource error:', error);
  };
  
  // Add connection status logging
  eventSource.onopen = () => {
    console.log('[EventSource Utils] EventSource connected to:', url);
  };
  
  return eventSource;
}

export function closeEventSource(eventSource: EventSource | null): void {
  if (eventSource) {
    console.log('[EventSource Utils] Closing EventSource connection');
    try {
      eventSource.close();
    } catch (error) {
      console.error('[EventSource Utils] Error closing EventSource:', error);
    }
  }
}

// Helper function to check if EventSource is supported
export function isEventSourceSupported(): boolean {
  return typeof EventSource !== 'undefined';
}

// Helper function to create EventSource with custom options
export function createEventSourceWithOptions(url: string, options?: EventSourceInit): EventSource {
  if (!isEventSourceSupported()) {
    throw new Error('EventSource is not supported in this browser');
  }
  
  console.log('[EventSource Utils] Creating EventSource with options:', { url, options });
  
  const eventSource = new EventSource(url, options);
  
  // Add error handling
  eventSource.onerror = (error) => {
    console.error('[EventSource Utils] EventSource error:', error);
  };
  
  // Add connection status logging
  eventSource.onopen = () => {
    console.log('[EventSource Utils] EventSource connected to:', url);
  };
  
  return eventSource;
}
