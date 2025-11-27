// src/lib/opentelemetry-sdk.ts
// Dynamic OpenTelemetry SDK initialization for SigNoz
// This allows the SDK to be initialized/reinitialized when Signoz settings are updated via UI

let sdkInstance: any = null;
let loggerProviderInstance: any = null;

/**
 * Initialize or reinitialize OpenTelemetry SDK
 * This can be called at startup or when Signoz settings are updated
 */
export async function initializeOpenTelemetrySDK(): Promise<void> {
  // Only initialize in server-side (Node.js) environment
  if (typeof window !== 'undefined') {
    return;
  }

  // Shutdown existing SDK and logger provider if they exist
  if (sdkInstance) {
    try {
      await sdkInstance.shutdown();
      console.log('SigNoz: Shut down existing OpenTelemetry SDK');
    } catch (error) {
      console.warn('SigNoz: Error shutting down existing SDK:', error);
    }
    sdkInstance = null;
  }

  // Shutdown existing logger provider if it exists
  if (loggerProviderInstance) {
    try {
      await loggerProviderInstance.shutdown();
      console.log('SigNoz: Shut down existing logger provider');
    } catch (error) {
      console.warn('SigNoz: Error shutting down existing logger provider:', error);
    }
    loggerProviderInstance = null;
    
    // Clear the global logger provider
    try {
      const { logs } = await import('@opentelemetry/api-logs');
      (logs as any).setLoggerProvider(undefined);
    } catch (error) {
      // Ignore errors when clearing logger provider
    }
  }

  // Get SigNoz configuration from database (with env var fallback)
  let signozEnabled = false;
  let otlpEndpoint = '';
  let serviceName = 'fitscan';
  let otlpHeaders = '';

  try {
    // Try to read from database settings
    const { getSystemSetting } = await import('./systemSettings');
    const dbEnabled = await getSystemSetting('signozEnabled');
    const dbEndpoint = await getSystemSetting('signozOtlpEndpoint');
    const dbServiceName = await getSystemSetting('signozServiceName');
    const dbHeaders = await getSystemSetting('signozOtlpHeaders');

    signozEnabled = dbEnabled === 'true' || process.env.SIGNOZ_ENABLED === 'true';
    otlpEndpoint = dbEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '';
    serviceName = dbServiceName || process.env.OTEL_SERVICE_NAME || 'fitscan';
    otlpHeaders = dbHeaders || process.env.OTEL_EXPORTER_OTLP_HEADERS || '';
  } catch (error) {
    // Fallback to environment variables if database read fails
    signozEnabled = process.env.SIGNOZ_ENABLED === 'true';
    otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '';
    serviceName = process.env.OTEL_SERVICE_NAME || 'fitscan';
    otlpHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';
  }

  // Check if SigNoz/OpenTelemetry is enabled
  if (!signozEnabled) {
    console.log('SigNoz: Disabled, skipping OpenTelemetry initialization');
    return; // SigNoz not enabled, skip initialization
  }

  if (!otlpEndpoint) {
    console.log('SigNoz: OTLP endpoint not configured, skipping OpenTelemetry initialization');
    return;
  }

  // Normalize endpoint URL (remove trailing slash if present)
  otlpEndpoint = otlpEndpoint.trim().replace(/\/+$/, '');
  
  // Validate endpoint URL format
  try {
    new URL(otlpEndpoint);
  } catch (error) {
    console.error(`SigNoz: Invalid OTLP endpoint URL format: ${otlpEndpoint}`);
    return;
  }

  try {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { HttpInstrumentation } = await import('@opentelemetry/instrumentation-http');
    const { PgInstrumentation } = await import('@opentelemetry/instrumentation-pg');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-http');
    const { OTLPLogExporter } = await import('@opentelemetry/exporter-logs-otlp-http');
    const resourcesModule = await import('@opentelemetry/resources');
    const Resource = (resourcesModule as any).Resource || ((resourcesModule as any).default?.Resource) || (resourcesModule as any).default;
    const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions');
    const { PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics');
    const { LoggerProvider, BatchLogRecordProcessor } = await import('@opentelemetry/sdk-logs');

    // Get service version
    const serviceVersion = process.env.APP_VERSION || process.env.npm_package_version || 'unknown';

    // Create resource with service information
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });
    const tracesEndpoint = `${otlpEndpoint}/v1/traces`;
    const metricsEndpoint = `${otlpEndpoint}/v1/metrics`;
    const logsEndpoint = `${otlpEndpoint}/v1/logs`;

    // Parse headers (from database or env var)
    // Support both JSON format and plain API key
    let parsedHeaders = {};
    if (otlpHeaders) {
      try {
        parsedHeaders = JSON.parse(otlpHeaders);
      } catch (error) {
        // If not JSON, treat as plain API key and format it
        parsedHeaders = { 'x-api-key': otlpHeaders };
      }
    }

    // Initialize trace exporter with timeout for remote servers
    const traceExporter = new OTLPTraceExporter({
      url: tracesEndpoint,
      headers: parsedHeaders,
      timeoutMillis: 30000, // 30 seconds timeout
    });

    // Initialize metric exporter with timeout for remote servers
    const metricExporter = new OTLPMetricExporter({
      url: metricsEndpoint,
      headers: parsedHeaders,
      timeoutMillis: 30000, // 30 seconds timeout
    });

    // Initialize log exporter with better error handling for remote servers
    const logExporter = new OTLPLogExporter({
      url: logsEndpoint,
      headers: parsedHeaders,
      // Add timeout for remote server connections
      timeoutMillis: 30000, // 30 seconds timeout
    });

    // Initialize SDK
    sdkInstance = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        new HttpInstrumentation({
          // HTTP instrumentation configuration
        }),
        new PgInstrumentation({
          // Capture database query information
          enhancedDatabaseReporting: true,
        }),
      ],
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter as any,
        exportIntervalMillis: 60000, // Export metrics every minute
      }) as any,
    });

    // Initialize logger provider for logs
    loggerProviderInstance = new LoggerProvider({
      resource,
    });

    // Use BatchLogRecordProcessor for better reliability and performance
    // It batches logs and handles errors more gracefully
    (loggerProviderInstance as any).addLogRecordProcessor(
      new BatchLogRecordProcessor(logExporter, {
        maxExportBatchSize: 512,
        exportTimeoutMillis: 30000,
        scheduledDelayMillis: 5000, // Export logs every 5 seconds
      })
    );

    // Set the logger provider globally so it can be used by signoz.ts
    const { logs } = await import('@opentelemetry/api-logs');
    (logs as any).setLoggerProvider(loggerProviderInstance);
    
    // Force logger provider to be ready (if method exists)
    try {
      if (typeof loggerProviderInstance.forceFlush === 'function') {
        await loggerProviderInstance.forceFlush();
      }
    } catch (error) {
      // Ignore forceFlush errors, it's optional
      console.debug('SigNoz: forceFlush not available or failed (this is okay)');
    }

    // Start SDK
    sdkInstance.start();

    console.log(`SigNoz: OpenTelemetry initialized for service "${serviceName}" v${serviceVersion}`);
    console.log(`SigNoz: Sending traces to ${tracesEndpoint}`);
    console.log(`SigNoz: Sending metrics to ${metricsEndpoint}`);
    console.log(`SigNoz: Sending logs to ${logsEndpoint}`);
    if (Object.keys(parsedHeaders).length > 0) {
      console.log(`SigNoz: Using authentication headers`);
    }
    
    // Verify logger provider is accessible
    try {
      const testLogger = logs.getLogger('fitscan-test', '1.0.0');
      console.log('SigNoz: Logger provider verified and ready');
    } catch (error) {
      console.warn('SigNoz: Warning - Logger provider verification failed:', error);
    }
  } catch (error) {
    // Don't crash the application if OpenTelemetry initialization fails
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('SigNoz: Failed to initialize OpenTelemetry:', errorMessage);
    
    // Provide helpful hints for remote server connectivity issues
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('timeout')) {
      console.error('SigNoz: Network connectivity issue detected. Please verify:');
      console.error(`  - Endpoint is reachable: ${otlpEndpoint}`);
      console.error('  - Firewall allows outbound connections to the SigNoz server');
      console.error('  - Network/DNS can resolve the server hostname');
      console.error('  - Port is correct (4318 for HTTP, 4317 for gRPC)');
    }
    
    console.error('SigNoz: Application will continue without distributed tracing');
  }
}

