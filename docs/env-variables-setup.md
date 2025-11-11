# Environment Variables Setup for Sentry and Elasticsearch

This document explains how to configure Sentry and Elasticsearch using environment variables from your `.env` files.

## Quick Setup

### 1. Create or Update Your `.env.local` File

Copy the relevant sections from `env.local.template` to your `.env.local` file:

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o0.ingest.sentry.io/your-project-id
SENTRY_DSN=https://your-key@o0.ingest.sentry.io/your-project-id

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=logs
ELASTICSEARCH_AUTH=false
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-password
ELASTICSEARCH_SSL_VERIFY=true
ELASTICSEARCH_TIMEOUT=30000
```

### 2. How It Works

Both integrations check for environment variables and only initialize if configured:

- **Sentry**: Only initializes if `NEXT_PUBLIC_SENTRY_DSN` or `SENTRY_DSN` is set
- **Elasticsearch**: Only initializes if `ELASTICSEARCH_URL` is set

If variables are not set, the integrations gracefully skip initialization without errors.

## Environment Variable Reference

### Sentry Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Yes (client) | Client-side DSN for browser error tracking | `https://key@o0.ingest.sentry.io/123` |
| `SENTRY_DSN` | Yes (server) | Server-side DSN for server error tracking | `https://key@o0.ingest.sentry.io/123` |
| `SENTRY_AUTH_TOKEN` | No | Auth token for source maps upload | `your-token` |
| `SENTRY_ORG` | No | Organization slug | `your-org` |
| `SENTRY_PROJECT` | No | Project slug | `your-project` |

**Note**: `NEXT_PUBLIC_*` variables are exposed to the browser. The DSN is safe to expose as it's a public key.

### Elasticsearch Variables

| Variable | Required | Description | Default | Example |
|----------|----------|-------------|---------|---------|
| `ELASTICSEARCH_URL` | Yes | Elasticsearch server URL | - | `http://localhost:9200` |
| `ELASTICSEARCH_INDEX` | No | Index name for logs | `logs` | `logs` |
| `ELASTICSEARCH_AUTH` | No | Enable authentication | `false` | `true` or `false` |
| `ELASTICSEARCH_USERNAME` | Conditional* | Username for authentication | - | `elastic` |
| `ELASTICSEARCH_PASSWORD` | Conditional* | Password for authentication | - | `your-password` |
| `ELASTICSEARCH_SSL_VERIFY` | No | Verify SSL certificates | `true` | `true` or `false` |
| `ELASTICSEARCH_TIMEOUT` | No | Request timeout (ms) | `30000` | `30000` |

*Required only if `ELASTICSEARCH_AUTH=true`

## Configuration Files

### Sentry Configuration Files

All Sentry config files check for DSN before initializing:

- `sentry.client.config.ts` - Uses `process.env.NEXT_PUBLIC_SENTRY_DSN`
- `sentry.server.config.ts` - Uses `process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN`
- `sentry.edge.config.ts` - Uses `process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN`

### Elasticsearch Configuration

The Elasticsearch client (`src/lib/elasticsearch.ts`) reads all configuration from environment variables:

```typescript
// Checks for ELASTICSEARCH_URL before initializing
if (!process.env.ELASTICSEARCH_URL) {
  return null; // Not configured
}

// Reads all settings from env
const node = process.env.ELASTICSEARCH_URL;
const auth = process.env.ELASTICSEARCH_AUTH === 'true' ? {
  username: process.env.ELASTICSEARCH_USERNAME || '',
  password: process.env.ELASTICSEARCH_PASSWORD || '',
} : undefined;
```

## Environment-Specific Configuration

### Development (`.env.local`)

```env
NEXT_PUBLIC_SENTRY_DSN=https://dev-key@o0.ingest.sentry.io/dev-project
SENTRY_DSN=https://dev-key@o0.ingest.sentry.io/dev-project
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_AUTH=false
ELASTICSEARCH_SSL_VERIFY=false
```

### Production (`.env.production` or environment variables)

```env
NEXT_PUBLIC_SENTRY_DSN=https://prod-key@o0.ingest.sentry.io/prod-project
SENTRY_DSN=https://prod-key@o0.ingest.sentry.io/prod-project
ELASTICSEARCH_URL=https://elasticsearch.example.com:9200
ELASTICSEARCH_AUTH=true
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=secure-password
ELASTICSEARCH_SSL_VERIFY=true
```

## Verification

### Check Sentry Initialization

1. Open browser console
2. Look for: `Sentry client: DSN not provided, skipping initialization` (if not configured)
3. Or check Sentry dashboard for events (if configured)

### Check Elasticsearch Connection

1. Check application logs for Elasticsearch initialization messages
2. Test the search endpoint: `GET /api/logs/search?search=test`
3. Check Elasticsearch directly: `curl http://localhost:9200/logs/_search`

## Troubleshooting

### Sentry Not Working

1. **Check environment variable is set**:
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```

2. **Verify in Next.js**: Environment variables starting with `NEXT_PUBLIC_` are available in the browser

3. **Check Sentry dashboard**: Verify events are being received

4. **Restart dev server**: After changing `.env.local`, restart Next.js

### Elasticsearch Not Working

1. **Check environment variable is set**:
   ```bash
   echo $ELASTICSEARCH_URL
   ```

2. **Verify Elasticsearch is running**:
   ```bash
   curl http://localhost:9200
   ```

3. **Check authentication**:
   - If `ELASTICSEARCH_AUTH=true`, ensure username/password are set
   - Test connection: `curl -u username:password http://localhost:9200`

4. **Check SSL settings**:
   - For self-signed certificates, set `ELASTICSEARCH_SSL_VERIFY=false`
   - For production, use `ELASTICSEARCH_SSL_VERIFY=true`

## Best Practices

1. **Never commit `.env.local`**: Add to `.gitignore`
2. **Use different DSNs**: Use separate Sentry projects for dev/staging/production
3. **Secure credentials**: Use secrets management in production (Kubernetes secrets, AWS Secrets Manager, etc.)
4. **Environment-specific configs**: Use different `.env` files for different environments
5. **Validate on startup**: Check that required services are available during application startup

## Next Steps

1. Set up your Sentry account and get your DSN
2. Configure Elasticsearch (local or cloud)
3. Add environment variables to your `.env.local` file
4. Restart your development server
5. Test error capture and log search functionality

