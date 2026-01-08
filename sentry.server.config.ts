// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only initialize Sentry if DSN is provided via environment variable
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  
  // Enable structured logging
  enableLogs: true,
  
  // Set environment
  environment: process.env.NODE_ENV || 'development',
  
  // Filter out known non-critical errors
  beforeSend(event, hint) {
    // Filter out initialization errors that are expected
    if (event.exception) {
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);
        // Filter out known benign errors
        if (
          message.includes('ResizeObserver loop completed') ||
          message.includes('Cannot access') && message.includes('before initialization')
        ) {
          return null;
        }
      }
    }
    return event;
  },
  });
} else {
  // Sentry not configured - silently skip initialization
  console.log('Sentry server: DSN not provided, skipping initialization');
}

