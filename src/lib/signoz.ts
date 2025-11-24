// src/lib/signoz.ts
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { trace } from '@opentelemetry/api';

let signozLogger: any = null;
let signozEnabled = false;

/**
 * Initialize SigNoz logger
 * This should be called after OpenTelemetry instrumentation is set up
 */
export function initializeSignozLogger(): void {
  // Check if SigNoz is configured via environment variable
  if (!process.env.SIGNOZ_ENABLED || process.env.SIGNOZ_ENABLED !== 'true') {
    return; // SigNoz not enabled, silently skip
  }

  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return; // OTLP endpoint not configured
  }

  try {
    // Get logger from OpenTelemetry API
    // The LoggerProvider should be initialized by instrumentation.ts
    signozLogger = logs.getLogger('fitscan-audit', '1.0.0');
    signozEnabled = true;
  } catch (error) {
    // Logger provider might not be initialized yet, that's okay
    // It will be retried when sendLogToSignoz is called
    signozEnabled = false;
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
  // Check if SigNoz is enabled via environment variable
  if (!process.env.SIGNOZ_ENABLED || process.env.SIGNOZ_ENABLED !== 'true') {
    return; // SigNoz not enabled, silently skip
  }

  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return; // OTLP endpoint not configured, silently skip
  }

  // Try to get logger if not already initialized
  if (!signozLogger) {
    try {
      signozLogger = logs.getLogger('fitscan-audit', '1.0.0');
      signozEnabled = true;
    } catch (error) {
      // Logger provider not initialized yet, skip this log
      return;
    }
  }

  // Double-check logger is available
  if (!signozLogger) {
    return; // Logger not available, silently skip
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
      'service.name': process.env.OTEL_SERVICE_NAME || 'fitscan',
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
  } catch (error) {
    // Log error but don't throw - we don't want SigNoz failures to break logging
    console.error('Failed to send log to SigNoz:', error);
  }
}

/**
 * Check if SigNoz is enabled
 */
export function isSignozEnabled(): boolean {
  return signozEnabled && signozLogger !== null;
}

