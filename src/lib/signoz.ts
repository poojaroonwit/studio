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
  // Get configuration from database or environment
  signozConfig = await getSignozConfig();

  if (!signozConfig.enabled) {
    return; // SigNoz not enabled, silently skip
  }

  if (!signozConfig.endpoint) {
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
 * Reinitialize SigNoz logger (call this when settings are updated)
 */
export async function reinitializeSignozLogger(): Promise<void> {
  signozConfig = null;
  signozLogger = null;
  signozEnabled = false;
  await initializeSignozLogger();
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

