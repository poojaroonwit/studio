// instrumentation.ts
// This file is automatically loaded by Next.js when instrumentation hook is enabled
// It initializes OpenTelemetry for distributed tracing and metrics

export async function register() {
  // Only initialize in server-side (Node.js) environment
  if (typeof window !== 'undefined') {
    return;
  }

  // Check if SigNoz/OpenTelemetry is enabled
  if (process.env.SIGNOZ_ENABLED !== 'true') {
    return; // SigNoz not enabled, skip initialization
  }

  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
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
    // @ts-expect-error - Resource exists at runtime but TypeScript types may not expose it correctly
    const Resource = resourcesModule.Resource || (resourcesModule as any).Resource || resourcesModule.default?.Resource || resourcesModule.default;
    const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions');
    const { PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics');
    const { LoggerProvider, SimpleLogRecordProcessor } = await import('@opentelemetry/sdk-logs');

    // Get service name and version
    const serviceName = process.env.OTEL_SERVICE_NAME || 'fitscan';
    const serviceVersion = process.env.APP_VERSION || process.env.npm_package_version || 'unknown';

    // Create resource with service information
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });

    // Get OTLP endpoint
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    const tracesEndpoint = `${otlpEndpoint}/v1/traces`;
    const metricsEndpoint = `${otlpEndpoint}/v1/metrics`;
    const logsEndpoint = `${otlpEndpoint}/v1/logs`;

    // Initialize trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: tracesEndpoint,
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS 
        ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
        : {},
    });

    // Initialize metric exporter
    const metricExporter = new OTLPMetricExporter({
      url: metricsEndpoint,
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS 
        ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
        : {},
    });

    // Initialize log exporter
    const logExporter = new OTLPLogExporter({
      url: logsEndpoint,
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS 
        ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
        : {},
    });

    // Initialize SDK
    const sdk = new NodeSDK({
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
    const loggerProvider = new LoggerProvider({
      resource,
    });

    (loggerProvider as any).addLogRecordProcessor(
      new SimpleLogRecordProcessor(logExporter)
    );

    // Set the logger provider globally so it can be used by signoz.ts
    const { logs } = await import('@opentelemetry/api-logs');
    (logs as any).setLoggerProvider(loggerProvider);

    // Start SDK
    sdk.start();

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

