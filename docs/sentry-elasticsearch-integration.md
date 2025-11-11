# Sentry and Elasticsearch Integration

This document describes the Sentry error tracking and Elasticsearch log search integrations that have been implemented in the application.

## Overview

- **Sentry**: Integrated for error tracking, exception monitoring, and structured logging
- **Elasticsearch**: Integrated for advanced log search and indexing capabilities

Both integrations are **optional** and will gracefully degrade if not configured.

## Sentry Integration

### Features

- Automatic error capture from:
  - Global error handlers
  - React error boundaries
  - Unhandled promise rejections
  - Next.js error pages
- Structured logging support
- Session replay (configured with privacy settings)
- Performance monitoring (traces)

### Configuration

Add the following environment variables to enable Sentry:

```env
# Client-side DSN (required for browser error tracking)
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o0.ingest.sentry.io/your-project-id

# Server-side DSN (required for server error tracking)
SENTRY_DSN=https://your-key@o0.ingest.sentry.io/your-project-id

# Optional: For source maps upload
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

### Getting Your Sentry DSN

1. Sign up or log in to [Sentry.io](https://sentry.io)
2. Create a new project or select an existing one
3. Go to **Settings** → **Projects** → **Your Project** → **Client Keys (DSN)**
4. Copy the DSN and add it to your environment variables

### Files Created

- `sentry.client.config.ts` - Client-side Sentry configuration
- `sentry.server.config.ts` - Server-side Sentry configuration
- `sentry.edge.config.ts` - Edge runtime Sentry configuration

### Integration Points

1. **Error Handler** (`src/lib/error-handler.ts`)
   - Automatically sends errors to Sentry in production
   - Includes error context, stack traces, and user information

2. **Error Boundary** (`src/components/ui/error-boundary.tsx`)
   - Captures React component errors
   - Includes component stack traces

3. **Error Page** (`src/app/error.tsx`)
   - Captures Next.js page-level errors
   - Includes error digest for tracking

### Usage

Errors are automatically captured. You can also manually log to Sentry:

```typescript
import * as Sentry from '@sentry/nextjs';

// Log an error
Sentry.captureException(new Error('Something went wrong'));

// Log a message
Sentry.logger.info('User logged in', { userId: '123' });
Sentry.logger.error('Database connection failed', { error: error.message });
```

## Elasticsearch Integration

### Features

- Automatic log indexing from:
  - Audit logs (`logAudit` function)
  - Audit events (`logAuditEvent` function)
  - API log creation endpoint
- Advanced search capabilities:
  - Full-text search with fuzzy matching
  - Filter by level, source, user, date range
  - Pagination support
- Automatic index creation with proper mappings

### Configuration

Add the following environment variables to enable Elasticsearch:

```env
# Elasticsearch connection URL
ELASTICSEARCH_URL=http://localhost:9200

# Index name (default: 'logs')
ELASTICSEARCH_INDEX=logs

# Authentication (set to true if required)
ELASTICSEARCH_AUTH=false

# Credentials (required if ELASTICSEARCH_AUTH=true)
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-password

# SSL verification (set to false for self-signed certificates)
ELASTICSEARCH_SSL_VERIFY=true

# Request timeout in milliseconds
ELASTICSEARCH_TIMEOUT=30000
```

### Files Created

- `src/lib/elasticsearch.ts` - Elasticsearch client and utilities
- `src/app/api/logs/search/route.ts` - Elasticsearch search API endpoint

### Integration Points

1. **Audit Logging** (`src/lib/auditLog.ts`)
   - Automatically indexes logs to Elasticsearch after database write
   - Non-blocking - failures don't affect logging

2. **Log API** (`src/app/api/logs/route.ts`)
   - Automatically indexes logs created via API

3. **Startup** (`src/lib/startup.ts`)
   - Automatically creates Elasticsearch index on application startup

### Usage

#### Search Logs via API

```bash
# Full-text search
GET /api/logs/search?search=database%20error&page=1&limit=10

# Filter by level
GET /api/logs/search?level=ERROR&page=1&limit=10

# Filter by date range
GET /api/logs/search?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z

# Combined filters
GET /api/logs/search?search=user&level=ERROR&actingUserId=user-uuid&page=1&limit=20
```

#### Programmatic Usage

```typescript
import { searchLogsInElasticsearch, indexLogToElasticsearch } from '@/lib/elasticsearch';

// Search logs
const results = await searchLogsInElasticsearch({
  search: 'database error',
  level: 'ERROR',
  page: 1,
  limit: 10,
});

// Manually index a log
await indexLogToElasticsearch({
  id: 'log-id',
  timestamp: new Date(),
  level: 'INFO',
  message: 'User logged in',
  source: 'Auth:SignIn',
  actingUserId: 'user-uuid',
  details: { ip: '127.0.0.1' },
});
```

## Behavior When Not Configured

Both integrations are designed to fail gracefully:

- **Sentry**: If DSN is not configured, errors are still logged to console but not sent to Sentry
- **Elasticsearch**: If URL is not configured, logs are still written to the database but not indexed to Elasticsearch

This ensures the application continues to function normally even without these services.

## Security Considerations

### Sentry

- DSN is safe to expose in client-side code (it's a public key)
- Sensitive data should not be included in error messages
- Use `beforeSend` hook in Sentry config to filter sensitive information

### Elasticsearch

- Use authentication in production (`ELASTICSEARCH_AUTH=true`)
- Use SSL/TLS in production (`ELASTICSEARCH_SSL_VERIFY=true`)
- Restrict network access to Elasticsearch cluster
- Consider using Elasticsearch security features (role-based access control)

## Monitoring and Maintenance

### Sentry

- Monitor error rates in Sentry dashboard
- Set up alerts for critical errors
- Review and resolve issues regularly
- Use Sentry's release tracking for deployments

### Elasticsearch

- Monitor index size and disk usage
- Set up index lifecycle management (ILM) for log retention
- Consider using index templates for better organization
- Monitor cluster health and performance

## Troubleshooting

### Sentry Not Capturing Errors

1. Check that `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Verify Sentry initialization in browser console
3. Check Sentry dashboard for received events
4. Review `beforeSend` filters that might be blocking events

### Elasticsearch Not Indexing Logs

1. Check that `ELASTICSEARCH_URL` is accessible
2. Verify Elasticsearch cluster is running
3. Check application logs for Elasticsearch connection errors
4. Verify index exists: `GET http://localhost:9200/logs`
5. Check Elasticsearch cluster health: `GET http://localhost:9200/_cluster/health`

### Search Not Working

1. Verify Elasticsearch search API endpoint is accessible
2. Check authentication credentials if required
3. Review search query syntax
4. Check Elasticsearch logs for errors

## Next Steps

1. **Configure Sentry**:
   - Create a Sentry account and project
   - Add DSN to environment variables
   - Test error capture

2. **Set Up Elasticsearch**:
   - Install and configure Elasticsearch
   - Add connection details to environment variables
   - Verify index creation on startup

3. **Optional Enhancements**:
   - Set up Sentry alerts
   - Configure Elasticsearch index lifecycle policies
   - Add custom tags and context to logs
   - Set up log retention policies

