// src/lib/signoz.ts
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { trace } from '@opentelemetry/api';
import { getSystemSetting } from './systemSettings';

let signozLogger: any = null;
let signozEnabled = false;
let signozConfig: { enabled: boolean; endpoint: string; serviceName: string; headers: string } | null = null;

/**
 * Get SigNoz configuration from database settings (with env var fallback)
 */
async function getSignozConfig(): Promise<{ enabled: boolean; endpoint: string; serviceName: string; headers: string }> {
  // Check database settings first, then fall back to environment variables
  const dbEnabled = await getSystemSetting('signozEnabled');
  const dbEndpoint = await getSystemSetting('signozOtlpEndpoint');
  const dbServiceName = await getSystemSetting('signozServiceName');
  const dbHeaders = await getSystemSetting('signozOtlpHeaders');

  return {
    enabled: dbEnabled === 'true' || process.env.SIGNOZ_ENABLED === 'true',
    endpoint: dbEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '',
    serviceName: dbServiceName || process.env.OTEL_SERVICE_NAME || 'fitscan',
    headers: dbHeaders || process.env.OTEL_EXPORTER_OTLP_HEADERS || '',
  };
}

/**
 * Initialize SigNoz logger
 * This should be called after OpenTelemetry instrumentation is set up
 */
export async function initializeSignozLogger(): Promise<void> {
  // Skip during build time to prevent build errors
  if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.NEXT_BUILD === 'true') {
    return;
  }

  // Get configuration from database or environment
  signozConfig = await getSignozConfig();

  if (!signozConfig.enabled) {
<<<<<<< HEAD
    console.log('SigNoz: Logger initialization skipped - Signoz is disabled');
=======
    // console.log('SigNoz: Logger initialization skipped - Signoz is disabled');
>>>>>>> ca51ac36
    return; // SigNoz not enabled, silently skip
  }

  if (!signozConfig.endpoint) {
<<<<<<< HEAD
    console.log('SigNoz: Logger initialization skipped - OTLP endpoint not configured');
=======
    // console.log('SigNoz: Logger initialization skipped - OTLP endpoint not configured');
>>>>>>> ca51ac36
    return; // OTLP endpoint not configured
  }

  // Wait for logger provider to be ready (with timeout)
  const maxWaitTime = 10000; // 10 seconds
  const checkInterval = 100; // Check every 100ms
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Check if logger provider is available
      const provider = (logs as any).getLoggerProvider();
      
      if (provider) {
        // Logger provider is ready, get the logger
        signozLogger = logs.getLogger('fitscan-audit', '1.0.0');
        signozEnabled = true;
<<<<<<< HEAD
        console.log(`SigNoz: Logger initialized for service "${signozConfig.serviceName}"`);
=======
        // console.log(`SigNoz: Logger initialized for service "${signozConfig.serviceName}"`);
>>>>>>> ca51ac36
        return;
      }
    } catch (error) {
      // Provider not ready yet, continue waiting
    }
    
    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  // If we get here, logger provider didn't become ready in time
  console.warn('SigNoz: Logger provider not ready after waiting, will retry on first log');
  signozEnabled = false;
}

/**
 * Reinitialize SigNoz logger (call this when settings are updated)
 */
export async function reinitializeSignozLogger(): Promise<void> {
  // Clear existing state
  signozConfig = null;
  signozLogger = null;
  signozEnabled = false;
  
  // Wait a bit for the logger provider to be ready (increased wait time)
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Reinitialize with new configuration
  await initializeSignozLogger();
  
  if (signozEnabled) {
<<<<<<< HEAD
    console.log('SigNoz: Logger reinitialized successfully');
  } else {
    console.log('SigNoz: Logger reinitialized but Signoz is disabled or not configured');
=======
    // console.log('SigNoz: Logger reinitialized successfully');
  } else {
    // console.log('SigNoz: Logger reinitialized but Signoz is disabled or not configured');
>>>>>>> ca51ac36
  }
}

/**
 * Map log level to OpenTelemetry SeverityNumber
 */
function mapLevelToSeverity(level: string): SeverityNumber {
  switch (level.toUpperCase()) {
    case 'ERROR':
      return SeverityNumber.ERROR;
    case 'WARN':
      return SeverityNumber.WARN;
    case 'INFO':
      return SeverityNumber.INFO;
    case 'AUDIT':
      return SeverityNumber.INFO; // AUDIT logs as INFO level
    case 'DEBUG':
      return SeverityNumber.DEBUG;
    default:
      return SeverityNumber.UNSPECIFIED;
  }
}

/**
 * Send log entry to SigNoz via OpenTelemetry Logs API
 */
export async function sendLogToSignoz(
  logEntry: {
    id: string;
    timestamp: Date | string;
    level: string;
    message: string;
    source?: string | null;
    actingUserId?: string | null;
    details?: Record<string, any> | null;
  }
): Promise<void> {
  // Get configuration if not already loaded
  if (!signozConfig) {
    signozConfig = await getSignozConfig();
  }

  if (!signozConfig.enabled) {
    return; // SigNoz not enabled, silently skip
  }

  if (!signozConfig.endpoint) {
    return; // OTLP endpoint not configured, silently skip
  }

  // Try to get logger if not already initialized
  if (!signozLogger) {
    try {
      // Try to initialize the logger (with retry logic similar to initializeSignozLogger)
      const { logs: logsApi } = await import('@opentelemetry/api-logs');
      
      // Wait for logger provider to be ready (with timeout)
      const maxWaitTime = 2000; // 2 seconds (shorter than initialization)
      const checkInterval = 100; // Check every 100ms
      const startTime = Date.now();
      
      let provider = null;
      while (Date.now() - startTime < maxWaitTime) {
        try {
          provider = (logsApi as any).getLoggerProvider();
          if (provider) {
            break; // Provider is ready
          }
        } catch (error) {
          // Provider not ready yet, continue waiting
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
      
      if (!provider) {
        // Provider not ready, try to initialize the logger anyway
        console.warn('SigNoz: Logger provider not ready after waiting, attempting to initialize logger');
        await initializeSignozLogger();
        
        // Try one more time to get the logger
        provider = (logsApi as any).getLoggerProvider();
        if (!provider) {
          console.warn('SigNoz: Logger provider still not available after initialization attempt, skipping log');
          return;
        }
      }
      
      signozLogger = logsApi.getLogger('fitscan-audit', '1.0.0');
      signozEnabled = true;
    } catch (error) {
      // Logger provider not initialized yet, try to initialize it
      console.warn('SigNoz: Logger provider not ready, attempting to initialize:', error);
      try {
        await initializeSignozLogger();
        
        // Try again to get the logger
        const { logs: logsApi } = await import('@opentelemetry/api-logs');
        const provider = (logsApi as any).getLoggerProvider();
        if (provider) {
          signozLogger = logsApi.getLogger('fitscan-audit', '1.0.0');
          signozEnabled = true;
        } else {
          console.warn('SigNoz: Logger provider still not available after initialization, skipping log');
          return;
        }
      } catch (initError) {
        console.warn('SigNoz: Failed to initialize logger, skipping log:', initError);
        return;
      }
    }
  }

  // Double-check logger is available
  if (!signozLogger) {
    console.warn('SigNoz: Logger not available, skipping log');
    return; // Logger not available
  }

  try {
    const timestamp = typeof logEntry.timestamp === 'string' 
      ? new Date(logEntry.timestamp) 
      : logEntry.timestamp;

    // Get current trace context if available
    const activeSpan = trace.getActiveSpan();
    const traceId = activeSpan?.spanContext().traceId;
    const spanId = activeSpan?.spanContext().spanId;

    // Build attributes for the log
    const attributes: Record<string, any> = {
      'log.id': logEntry.id,
      'log.source': logEntry.source || 'unknown',
      'log.level': logEntry.level,
      'service.name': signozConfig?.serviceName || 'fitscan',
      'service.version': process.env.APP_VERSION || 'unknown',
    };

    if (logEntry.actingUserId) {
      attributes['user.id'] = logEntry.actingUserId;
    }

    if (traceId) {
      attributes['trace_id'] = traceId;
    }

    if (spanId) {
      attributes['span_id'] = spanId;
    }

    // Add details as attributes (flatten nested objects)
    if (logEntry.details) {
      Object.entries(logEntry.details).forEach(([key, value]) => {
        // Only add primitive values as attributes
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          attributes[`log.detail.${key}`] = value;
        } else if (value !== null && value !== undefined) {
          // For complex objects, stringify them
          attributes[`log.detail.${key}`] = JSON.stringify(value);
        }
      });
    }

    // Emit log to SigNoz
    signozLogger.emit({
      severityNumber: mapLevelToSeverity(logEntry.level),
      severityText: logEntry.level,
      body: logEntry.message,
      attributes,
      timestamp: timestamp,
    });
    
    // Always log success for debugging (helps diagnose issues)
<<<<<<< HEAD
    console.log(`SigNoz: Log emitted successfully - ${logEntry.level}: ${logEntry.message.substring(0, 50)}...`);
=======
    // console.log(`SigNoz: Log emitted successfully - ${logEntry.level}: ${logEntry.message.substring(0, 50)}...`);
>>>>>>> ca51ac36
    
    // Try to force flush if possible (for immediate sending)
    try {
      const { logs: logsApi } = await import('@opentelemetry/api-logs');
      const provider = (logsApi as any).getLoggerProvider();
      if (provider && typeof provider.forceFlush === 'function') {
        // Don't await - let it flush in background
        provider.forceFlush().catch(() => {
          // Ignore flush errors
        });
      }
    } catch (error) {
      // Ignore flush errors
    }
  } catch (error) {
    // Log error with more details for debugging
    console.error('SigNoz: Failed to send log:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      logId: logEntry.id,
      level: logEntry.level,
      message: logEntry.message.substring(0, 100),
    });
  }
}

/**
 * Check if SigNoz is enabled
 */
export function isSignozEnabled(): boolean {
  return signozEnabled && signozLogger !== null;
}

/**
 * Diagnostic function to check SigNoz configuration and status
 * Returns detailed information about SigNoz setup
 */
export async function diagnoseSignoz(): Promise<{
  enabled: boolean;
  configured: boolean;
  loggerProviderReady: boolean;
  loggerReady: boolean;
  endpoint: string;
  serviceName: string;
  errors: string[];
}> {
  const errors: string[] = [];
  let enabled = false;
  let configured = false;
  let loggerProviderReady = false;
  let loggerReady = false;
  let endpoint = '';
  let serviceName = '';

  try {
    // Get configuration
    const config = await getSignozConfig();
    enabled = config.enabled;
    endpoint = config.endpoint;
    serviceName = config.serviceName;

    if (!enabled) {
      errors.push('SigNoz is disabled in configuration');
      return { enabled, configured: false, loggerProviderReady: false, loggerReady: false, endpoint, serviceName, errors };
    }

    if (!endpoint) {
      errors.push('OTLP endpoint is not configured');
      return { enabled, configured: false, loggerProviderReady: false, loggerReady: false, endpoint, serviceName, errors };
    }

    configured = true;

    // Check if logger provider is available
    try {
      const provider = (logs as any).getLoggerProvider();
      if (provider) {
        loggerProviderReady = true;
      } else {
        errors.push('Logger provider is not set globally');
      }
    } catch (error) {
      errors.push(`Failed to get logger provider: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Check if logger is ready
    if (signozLogger) {
      loggerReady = true;
    } else {
      try {
        const testLogger = logs.getLogger('fitscan-test', '1.0.0');
        if (testLogger) {
          loggerReady = true;
          signozLogger = testLogger; // Use this logger
        }
      } catch (error) {
        errors.push(`Failed to get logger: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    errors.push(`Diagnostic check failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    enabled,
    configured,
    loggerProviderReady,
    loggerReady,
    endpoint,
    serviceName,
    errors,
  };
}

