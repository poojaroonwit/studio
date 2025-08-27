
// Global cleanup utilities
window.addEventListener('beforeunload', () => {
  // Clean up all EventSource connections
  const eventSources = document.querySelectorAll('script[src*="EventSource"]');
  eventSources.forEach(script => {
    if (script.src) {
      const eventSource = new EventSource(script.src);
      eventSource.close();
    }
  });

  // Clear all timeouts and intervals
  const highestTimeoutId = setTimeout(() => {}, 0);
  for (let i = 0; i < highestTimeoutId; i++) {
    clearTimeout(i);
    clearInterval(i);
  }
});

// Monitor for memory leaks
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const memoryInfo = (performance as any).memory;
    if (memoryInfo && memoryInfo.usedJSHeapSize > 100 * 1024 * 1024) {
      console.warn('🚨 High memory usage detected:', Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024), 'MB');
    }
  }, 10000);
}
