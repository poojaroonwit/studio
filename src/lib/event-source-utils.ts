// EventSource Utility Functions
// Provides simple EventSource creation and management for components

export function createEventSource(url: string): EventSource {
  const eventSource = new EventSource(url);
  
  // Add error handling
  eventSource.onerror = (error) => {
    // Error handling without logging
  };
  
  // Add connection status handling
  eventSource.onopen = () => {
    // Connection established without logging
  };
  
  return eventSource;
}

export function closeEventSource(eventSource: EventSource | null): void {
  if (eventSource) {
    try {
      eventSource.close();
    } catch (error) {
      // Error handling without logging
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
  
  const eventSource = new EventSource(url, options);
  
  // Add error handling
  eventSource.onerror = (error) => {
    // Error handling without logging
  };
  
  // Add connection status handling
  eventSource.onopen = () => {
    // Connection established without logging
  };
  
  return eventSource;
}
