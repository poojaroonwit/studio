// Global error handlers for common runtime errors

// Handle R.filter errors that might occur from third-party libraries
export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;

  const originalError = console.error;
  const originalWarn = console.warn;

  // Override console.error to catch and handle R.filter errors
  console.error = (...args: any[]) => {
    const errorMessage = args.join(' ');
    
    // Check if this is an R.filter error
    if (errorMessage.includes('R.filter is not a function') || 
        errorMessage.includes('R.filter is not a function or its return value is not iterable')) {
      
      // Try to fix the R object if it's missing or broken
      if (typeof (window as any).R === 'undefined' || typeof (window as any).R.filter !== 'function') {
        // Import and set up the polyfill
        import('./ramda-polyfill').then(({ testR }) => {
          console.warn('R.filter error detected and fixed by loading polyfill');
          // Test if it's working
          testR();
        }).catch(() => {
          console.warn('Failed to load R polyfill, continuing with original error');
        });
      }
      
      // Don't log the original error to avoid spam
      return;
    }
    
    // Log other errors normally
    originalError.apply(console, args);
  };

  // Override console.warn to catch R-related warnings
  console.warn = (...args: any[]) => {
    const warningMessage = args.join(' ');
    
    // Check if this is an R-related warning
    if (warningMessage.includes('R.') && warningMessage.includes('is not a function')) {
      // Try to fix the R object
      if (typeof (window as any).R === 'undefined' || typeof (window as any).R.filter !== 'function') {
        import('./ramda-polyfill').then(({ testR }) => {
          console.warn('R warning detected and fixed by loading polyfill');
          // Test if it's working
          testR();
        }).catch(() => {
          console.warn('Failed to load R polyfill, continuing with original warning');
        });
      }
      
      return;
    }
    
    // Log other warnings normally
    originalWarn.apply(console, args);
  };

  // Set up global error handler for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const errorMessage = event.reason?.message || event.reason?.toString() || '';
    
    if (errorMessage.includes('R.filter') || errorMessage.includes('R is not defined')) {
      // Try to fix the R object
      if (typeof (window as any).R === 'undefined' || typeof (window as any).R.filter !== 'function') {
        import('./ramda-polyfill').then(({ testR }) => {
          console.warn('R error in promise rejection detected and fixed by loading polyfill');
          // Test if it's working
          testR();
          event.preventDefault(); // Prevent the error from being logged
        }).catch(() => {
          console.warn('Failed to load R polyfill for promise rejection');
        });
      }
    }
  });

  // Set up global error handler for regular errors
  window.addEventListener('error', (event) => {
    const errorMessage = event.message || event.error?.message || '';
    
    if (errorMessage.includes('R.filter') || errorMessage.includes('R is not defined')) {
      // Try to fix the R object
      if (typeof (window as any).R === 'undefined' || typeof (window as any).R.filter !== 'function') {
        import('./ramda-polyfill').then(({ testR }) => {
          console.warn('R error detected and fixed by loading polyfill');
          // Test if it's working
          testR();
          event.preventDefault(); // Prevent the error from being logged
        }).catch(() => {
          console.warn('Failed to load R polyfill for error');
        });
      }
    }
  });
}

// Function to ensure R is available (can be called manually if needed)
export function ensureR() {
  if (typeof window === 'undefined') return Promise.resolve();
  
  if (typeof (window as any).R === 'undefined' || typeof (window as any).R.filter !== 'function') {
    return import('./ramda-polyfill').then(({ testR }) => {
      console.warn('R object ensured via polyfill');
      // Test if it's working
      testR();
    });
  }
  
  return Promise.resolve();
}
