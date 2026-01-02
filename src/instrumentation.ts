
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // We import the instrumentation logic dynamically to avoid issues in edge runtime
    // or client-side bundles, although register() runs on server startup.
    const { initializeOpenTelemetrySDK } = await import('@/lib/opentelemetry-sdk');
    await initializeOpenTelemetrySDK();
  }
}
