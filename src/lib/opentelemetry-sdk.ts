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

  // Shutdown existing SDK if it exists
  if (sdkInstance) {
    try {
      await sdkInstance.shutdown();
      console.log('SigNoz: Shut down existing OpenTelemetry SDK');
    } catch (error) {
      console.warn('SigNoz: Error shutting down existing SDK:', error);
    }
    sdkInstance = null;
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
    return; // SigNoz not enabled, skip initialization
  }

  if (!otlpEndpoint) {
    console.log('SigNoz: OTLP endpoint not configured, skipping OpenTelemetry initialization');
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
    const { LoggerProvider, SimpleLogRecordProcessor } = await import('@opentelemetry/sdk-logs');

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

    // Initialize trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: tracesEndpoint,
      headers: parsedHeaders,
    });

    // Initialize metric exporter
    const metricExporter = new OTLPMetricExporter({
      url: metricsEndpoint,
      headers: parsedHeaders,
    });

    // Initialize log exporter
    const logExporter = new OTLPLogExporter({
      url: logsEndpoint,
      headers: parsedHeaders,
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

    (loggerProviderInstance as any).addLogRecordProcessor(
      new SimpleLogRecordProcessor(logExporter)
    );

    // Set the logger provider globally so it can be used by signoz.ts
    const { logs } = await import('@opentelemetry/api-logs');
    (logs as any).setLoggerProvider(loggerProviderInstance);

    // Start SDK
    sdkInstance.start();

    console.log(`SigNoz: OpenTelemetry initialized for service "${serviceName}" v${serviceVersion}`);
    console.log(`SigNoz: Sending traces to ${tracesEndpoint}`);
    console.log(`SigNoz: Sending metrics to ${metricsEndpoint}`);
    console.log(`SigNoz: Sending logs to ${logsEndpoint}`);
  } catch (error) {
    // Don't crash the application if OpenTelemetry initialization fails
    console.error('SigNoz: Failed to initialize OpenTelemetry:', error);
    console.error('SigNoz: Application will continue without distributed tracing');
  }
}

