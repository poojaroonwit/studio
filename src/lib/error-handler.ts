interface ErrorContext {
  errorType: string;
  message: string;
  stack?: string;
  componentStack?: string;
  context?: string;
  dataType?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorLog: ErrorContext[] = [];

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers() {
    // Only setup error handlers on the client side
    if (typeof window === 'undefined') {
      return;
    }

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, 'unhandled_promise_rejection');
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      // Respect other handlers that may have already handled this
      if (event.defaultPrevented) {
        return;
      }

      // Ignore benign ResizeObserver loop error noise
      if (event.message && typeof event.message === 'string' && event.message.includes('ResizeObserver loop completed with undelivered notifications')) {
        return;
      }

      this.handleError(event.error || new Error(event.message), 'global_error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });
  }

  handleError(error: Error | string, errorType: string = 'unknown', additionalContext?: any) {
    const errorContext: ErrorContext = {
      errorType,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server-side',
      url: typeof window !== 'undefined' ? window.location.href : 'server-side',
      ...additionalContext,
    };

    // Special handling for filter errors
    if (errorContext.message.includes('filter is not a function')) {
      this.handleFilterError(errorContext);
    }

    // Special handling for initialization errors (tg, ee variables)
    if (this.isInitializationError(errorContext.message)) {
      this.handleInitializationError(errorContext);
    }

    // Log the error
    this.errorLog.push(errorContext);
    console.error('Global error handler caught:', errorContext);

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorReportingService(errorContext);
    }
  }

  private isInitializationError(message: string): boolean {
    return (
      message.includes('Cannot access') ||
      message.includes('before initialization') ||
      message.includes('is not defined') ||
      message.includes('temporal dead zone') ||
      message.includes('tg') ||
      message.includes('ee')
    );
  }

  private handleInitializationError(errorContext: ErrorContext) {
    const isTgError = errorContext.message.includes('tg');
    const isEeError = errorContext.message.includes('ee');
    const variableName = isTgError ? 'TG' : isEeError ? 'EE' : 'Unknown';

    const enhancedContext = {
      ...errorContext,
      errorType: `${variableName}_initialization_error`,
      suggestions: [
        'Try refreshing the page to reload the JavaScript bundle',
        'Clear your browser cache and reload',
        'Check your internet connection',
        'Try using a different browser or incognito mode',
        'Disable browser extensions temporarily'
      ],
      likelyCause: 'Variable accessed before initialization in minified bundle',
      recommendation: 'This is likely a minified bundle issue. Try refreshing the page.'
    };

    console.error(`${variableName} Variable Initialization Error:`, enhancedContext);
  }

  private handleFilterError(errorContext: ErrorContext) {
    // Extract additional context for filter errors
    const enhancedContext = {
      ...errorContext,
      errorType: 'filter_error',
      suggestions: [
        'Use reactSafeArray.filter() instead of array.filter()',
        'Add defensive checks: Array.isArray(data) ? data.filter(...) : []',
        'Use the useSafeFilter hook for React components',
        'Check API response structure and ensure data is properly initialized',
      ],
    };

    console.error('Filter error detected with enhanced context:', enhancedContext);
    
    // You could also show a user-friendly notification here
    this.showUserNotification('Data filtering error detected. Please refresh the page or contact support if the issue persists.');
  }

  private sendToErrorReportingService(errorContext: ErrorContext) {
    // Implementation for sending to error reporting service (e.g., Sentry, LogRocket, etc.)
    // This is a placeholder - implement based on your error reporting service
    try {
      // Example: Sentry.captureException(error);
      console.log('Error sent to reporting service:', errorContext);
    } catch (reportingError) {
      console.error('Failed to send error to reporting service:', reportingError);
    }
  }

  private showUserNotification(message: string) {
    // Show a user-friendly notification
    // You could integrate this with your toast notification system
    console.warn('User notification:', message);
  }

  getErrorLog(): ErrorContext[] {
    return [...this.errorLog];
  }

  clearErrorLog() {
    this.errorLog = [];
  }

  // Utility method to check if an error is a filter error
  isFilterError(error: Error | string): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('filter is not a function') || 
           message.includes('T.filter is not a function') ||
           message.includes('filter is not a function or its return value is not iterable');
  }

  // Utility method to get debugging information for filter errors
  getFilterErrorDebugInfo(array: any, context: string) {
    return {
      context,
      arrayType: typeof array,
      isArray: Array.isArray(array),
      isNull: array === null,
      isUndefined: array === undefined,
      constructor: array?.constructor?.name,
      length: array?.length,
      keys: array && typeof array === 'object' ? Object.keys(array) : null,
      sample: array && typeof array === 'object' ? JSON.stringify(array).substring(0, 200) + '...' : null,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const globalErrorHandler = GlobalErrorHandler.getInstance();

// Export utility functions
export const isFilterError = (error: Error | string) => globalErrorHandler.isFilterError(error);
export const getFilterErrorDebugInfo = (array: any, context: string) => globalErrorHandler.getFilterErrorDebugInfo(array, context);
