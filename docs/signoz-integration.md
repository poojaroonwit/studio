# SigNoz Integration

This document describes the SigNoz observability integration that has been implemented in the application.

## Overview

- **SigNoz**: Integrated for unified observability (logs, metrics, and distributed tracing)
- **Elasticsearch**: Can be used alongside SigNoz for advanced log search capabilities

Both integrations are **optional** and will gracefully degrade if not configured. They can also be used simultaneously.

## Features

### SigNoz Provides

- **Unified Observability**: Single UI for logs, metrics, and traces
- **Distributed Tracing**: End-to-end request tracing across services
- **Metrics**: Application and system metrics
- **Log Correlation**: Link logs with traces using trace IDs
- **Performance Monitoring**: Identify bottlenecks and slow queries

### Elasticsearch Provides (when used alongside)

- **Advanced Log Search**: Full-text search with fuzzy matching
- **Complex Queries**: Advanced filtering and aggregation
- **Log Indexing**: Efficient log storage and retrieval

## Configuration

### Recommended: UI Configuration (No Restart Required)

**The easiest way to configure SigNoz is through the UI:**

1. Navigate to **Settings → System Settings**
2. Click on the **Monitoring & Logging** tab
3. Scroll down to the **SigNoz Observability** card
4. Enable SigNoz and configure:
   - **OTLP Endpoint**: Your SigNoz collector endpoint (e.g., `http://localhost:4318` or `http://signoz:4318` for Docker)
   - **Service Name**: Service name that will appear in SigNoz UI (default: `fitscan`)
5. Click **Save**

**Benefits of UI Configuration:**
- ✅ Takes effect immediately (no application restart required)
- ✅ Settings stored in database (persistent across deployments)
- ✅ Easy to update without editing environment files
- ✅ UI configuration takes precedence over environment variables

### Optional: Environment Variables (Fallback Only)

Environment variables are **optional** and only used as a fallback if not configured in the UI. UI configuration always takes precedence.

```env
# Enable SigNoz integration
SIGNOZ_ENABLED=true

# OpenTelemetry OTLP endpoint (SigNoz collector endpoint)
# For Docker: http://signoz:4318
# For external server: http://your-signoz-server:4318
# For localhost: http://localhost:4318
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Service identification for SigNoz
OTEL_SERVICE_NAME=fitscan

# Optional: Custom headers for OTLP exporter (JSON format)
# Use this if your SigNoz server requires authentication
OTEL_EXPORTER_OTLP_HEADERS={"x-api-key":"your-api-key"}
```

### Getting Your SigNoz Endpoint

1. **If using Docker Compose**: Use `http://signoz:4318` (internal Docker network)
2. **If using external SigNoz server**: Use `http://your-signoz-server:4318`
3. **If using localhost**: Use `http://localhost:4318`

The default OTLP HTTP port is `4318`. For gRPC, use port `4317`.

## Integration Points

### 1. Audit Logging (`src/lib/auditLog.ts`)
   - Automatically sends logs to SigNoz after database write
   - Non-blocking - failures don't affect logging
   - Works alongside Elasticsearch

### 2. API Log Creation (`src/app/api/logs/route.ts`)
   - Automatically sends logs created via API to SigNoz
   - Works alongside Elasticsearch

### 3. OpenTelemetry Instrumentation (`instrumentation.ts`)
   - Automatically initialized on application startup
   - Captures HTTP requests, database queries, and traces
   - Sends traces, metrics, and logs to SigNoz

### 4. Distributed Tracing
   - Automatic instrumentation for:
     - HTTP requests (Next.js API routes)
     - Database queries (PostgreSQL via Prisma)
     - External API calls
   - Trace context propagation across services

## Usage

### Automatic Logging

Logs are automatically sent to SigNoz when you use the audit logging functions:

```typescript
import { logAudit, logAuditEvent } from '@/lib/auditLog';

// This will send to both database, Elasticsearch (if enabled), and SigNoz (if enabled)
await logAudit('INFO', 'User logged in', 'Auth:SignIn', userId, { ip: '127.0.0.1' });

// Audit events also work
await logAuditEvent(userId, 'CREATE', 'Candidate', candidateId, { name: 'John Doe' });
```

### Manual Trace Creation

You can create custom spans for tracing:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('fitscan', '1.0.0');

// Create a span
const span = tracer.startSpan('process-candidate');
try {
  // Your code here
  span.setAttribute('candidate.id', candidateId);
  span.setAttribute('candidate.name', candidateName);
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  throw error;
} finally {
  span.end();
}
```

### Viewing in SigNoz

1. **Logs**: Navigate to "Logs" section in SigNoz UI
2. **Traces**: Navigate to "Traces" section to see distributed traces
3. **Metrics**: Navigate to "Metrics" section for application metrics
4. **Service Map**: View service dependencies and relationships

## Behavior When Not Configured

SigNoz integration is designed to fail gracefully:

- **If SigNoz is disabled in UI or `SIGNOZ_ENABLED` is not set or `false`**: Logs are still written to database and Elasticsearch (if enabled), but not sent to SigNoz
- **If `OTEL_EXPORTER_OTLP_ENDPOINT` is not configured (UI or env)**: OpenTelemetry initialization is skipped
- **If SigNoz server is unreachable**: Errors are logged but don't break the application

This ensures the application continues to function normally even without SigNoz.

## Using Both Elasticsearch and SigNoz

You can enable both simultaneously:

```env
# Enable Elasticsearch for advanced log search
ELASTICSEARCH_URL=http://elasticsearch:9200
ELASTICSEARCH_INDEX=logs

# Enable SigNoz for unified observability
SIGNOZ_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz:4318
OTEL_SERVICE_NAME=fitscan
```

**Benefits of using both:**
- **Elasticsearch**: Best for complex log queries and search
- **SigNoz**: Best for unified observability, traces, and metrics
- **Database**: Primary source of truth for audit logs

Logs will be sent to all three destinations if configured.

## Security Considerations

### SigNoz

- Use authentication headers if your SigNoz server requires it
- Use HTTPS in production (`https://your-signoz-server:4318`)
- Restrict network access to SigNoz server
- Don't include sensitive data in trace attributes or log details

### Sensitive Data Filtering

The instrumentation automatically filters some sensitive headers, but you should:

1. **Avoid logging sensitive data** in audit log details
2. **Use environment variables** for sensitive configuration
3. **Review trace attributes** to ensure no sensitive data is exposed

## Monitoring and Maintenance

### SigNoz

- Monitor SigNoz server health and resource usage
- Set up alerts for critical errors in SigNoz
- Review trace sampling rates (currently 100% in dev, 10% in production)
- Monitor OTLP export success rates

### Performance Impact

- **Tracing**: Minimal overhead (~1-2% in production with sampling)
- **Metrics**: Exported every 60 seconds (configurable)
- **Logs**: Asynchronous, non-blocking

## Troubleshooting

### SigNoz Not Receiving Logs

1. **Check UI Configuration**: Verify SigNoz is enabled in Settings → System Settings → Monitoring & Logging
2. **Verify Endpoint**: Check that the OTLP endpoint is correct in the UI (or environment variable if using fallback)
3. **Check Application Logs**: Look for OpenTelemetry initialization messages
4. **Verify Connectivity**: Ensure SigNoz server is accessible from the application
5. **Check SigNoz UI**: Verify logs/traces are appearing in SigNoz dashboard

### Traces Not Appearing

1. Verify OpenTelemetry instrumentation is initialized (check startup logs)
2. Check that HTTP instrumentation is working
3. Verify trace sampling is enabled
4. Check SigNoz trace explorer

### Metrics Not Showing

1. Verify metric exporter is configured
2. Check export interval (default: 60 seconds)
3. Verify SigNoz metrics endpoint is accessible
4. Check application logs for metric export errors

### Connection Errors

1. **Network connectivity**: Ensure SigNoz server is reachable
2. **Port configuration**: Verify port 4318 (HTTP) or 4317 (gRPC) is correct
3. **Firewall rules**: Check if firewall is blocking connections
4. **Docker networking**: If using Docker, ensure containers are on the same network

## Next Steps

1. **Configure SigNoz**:
   - Set up SigNoz server (Docker or external)
   - **Recommended**: Configure via UI (Settings → System Settings → Monitoring & Logging)
   - **Alternative**: Add environment variables to your `.env` file (requires restart)

2. **Verify Integration**:
   - Check application startup logs for "SigNoz: OpenTelemetry initialized"
   - Create a test log entry
   - Verify it appears in SigNoz UI

3. **Set Up Dashboards**:
   - Create custom dashboards in SigNoz
   - Set up alerts for critical errors
   - Configure service maps

4. **Optional Enhancements**:
   - Add custom metrics
   - Create custom trace spans for critical operations
   - Set up log retention policies in SigNoz

## Related Documentation

- [Sentry and Elasticsearch Integration](./sentry-elasticsearch-integration.md)
- [System Administration](./system-administration.md)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [SigNoz Documentation](https://signoz.io/docs/)

