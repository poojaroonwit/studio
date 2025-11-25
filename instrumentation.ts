// instrumentation.ts
// This file is automatically loaded by Next.js when instrumentation hook is enabled
// It initializes OpenTelemetry for distributed tracing and metrics

export async function register() {
  // Delegate to the dynamic initialization function
  const { initializeOpenTelemetrySDK } = await import('./src/lib/opentelemetry-sdk');
  await initializeOpenTelemetrySDK();
}

