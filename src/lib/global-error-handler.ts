/**
 * Global error handler for initialization errors
 * Specifically handles 'tg' and 'ee' variable initialization errors
 */

interface ErrorInfo {
  componentStack?: string;
  errorBoundary?: string;
}

class GlobalErrorHandler {
  private errorCount = 0;
  private maxErrors = 5;
  private errorWindow = 60000; // 1 minute
  private lastErrorTime = 0;

  handleError(error: Error, source: string, errorInfo?: ErrorInfo) {
    const now = Date.now();
    
    // Reset error count if it's been more than 1 minute
    if (now - this.lastErrorTime > this.errorWindow) {
      this.errorCount = 0;
    }
    
    this.errorCount++;
    this.lastErrorTime = now;

    // Check if this is a 'tg' or 'ee' variable initialization error
    const isTgError = error.message.includes('tg') && 
                     (error.message.includes('Cannot access') || 
                      error.message.includes('before initialization'));
    const isEeError = error.message.includes('ee') && 
                     (error.message.includes('Cannot access') || 
                      error.message.includes('before initialization'));

    if (isTgError || isEeError) {
      const variableName = isTgError ? 'TG' : 'EE';
      console.error(`${variableName} Variable Initialization Error:`, {
        message: error.message,
        source,
        errorInfo,
        timestamp: new Date().toISOString(),
        errorCount: this.errorCount,
        recommendation: 'This is likely a minified bundle issue. Try refreshing the page.'
      });

      // If we have too many errors, suggest a page refresh
      if (this.errorCount >= this.maxErrors) {
        this.suggestPageRefresh();
      }
    } else {
      // Log other errors normally
      console.error('Global Error:', {
        message: error.message,
        source,
        errorInfo,
        timestamp: new Date().toISOString()
      });
    }
  }

  private suggestPageRefresh() {
    console.warn('Multiple initialization errors detected. Consider refreshing the page.');
    
    // Show a user-friendly notification if possible
    if (typeof window !== 'undefined' && window.confirm) {
      const shouldRefresh = window.confirm(
        'Multiple errors have been detected. Would you like to refresh the page to resolve them?'
      );
      if (shouldRefresh) {
        window.location.reload();
      }
    }
  }

  reset() {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }
}

// Create a singleton instance
export const globalErrorHandler = new GlobalErrorHandler();

// Set up global error handlers
if (typeof window !== 'undefined') {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    globalErrorHandler.handleError(error, 'unhandled_promise_rejection');
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    globalErrorHandler.handleError(error, 'uncaught_error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
}

export default globalErrorHandler;
