# Conditional Migration System

This document explains the conditional migration system implemented to gracefully handle scenarios where migration files are not found.

## Overview

The conditional migration system checks for the existence of migration files before attempting to run migrations. If no migration files are found, the system skips the migration process gracefully instead of failing.

## Features

- ✅ **Automatic Detection**: Automatically detects if migration files exist
- ✅ **Graceful Skipping**: Skips migrations without errors when files are missing
- ✅ **Database Connection Testing**: Verifies database connectivity before proceeding
- ✅ **Force Mode**: Option to force migration attempts even if checks fail
- ✅ **Skip Mode**: Option to completely skip migrations via flag or environment variable
- ✅ **Cross-Platform**: Both Node.js and PowerShell versions available
- ✅ **Detailed Logging**: Clear, colored output showing what's happening

## Scripts

### Node.js Script
- **File**: `scripts/migrate-conditionally.cjs`
- **Usage**: `node scripts/migrate-conditionally.cjs [options]`

### PowerShell Script  
- **File**: `scripts/migrate-conditionally.ps1`
- **Usage**: `powershell -ExecutionPolicy Bypass -File scripts/migrate-conditionally.ps1 [options]`

## NPM Scripts

The following npm scripts are available:

```bash
# Standard conditional migration (recommended)
npm run db:migrate

# Force migration even if checks fail
npm run db:migrate:force

# Skip migrations entirely
npm run db:migrate:skip

# PowerShell version (Windows)
npm run db:migrate:ps

# PowerShell version with force
npm run db:migrate:ps:force
```

## Command Line Options

### Node.js Script Options
- `--force`: Continue even if database connection fails
- `--skip`: Skip migrations entirely

### PowerShell Script Options
- `-Force`: Continue even if database connection fails
- `-Skip`: Skip migrations entirely

## Environment Variables

- `SKIP_MIGRATIONS=true`: Skip migrations entirely (overrides all other settings)
- `NODE_ENV`: Affects migration command selection (dev vs production)

## Behavior Scenarios

### 1. Migration Files Exist
```
✅ Database connection verified
ℹ️  Found 1 migration(s): 20250809133304_initial_setup
ℹ️  Running Prisma migrations...
✅ Database migrations completed successfully
```

### 2. No Migration Directory
```
⚠️  No prisma/migrations directory found
⚠️  Prisma migrations directory not found - skipping migrations
ℹ️  This is expected if this is a fresh installation
✅ Migration process skipped gracefully
```

### 3. Empty Migration Directory
```
⚠️  No migration files found in prisma/migrations directory
⚠️  No migration files found - skipping migrations
ℹ️  This might be expected if the database schema is managed differently
✅ Migration process skipped gracefully
```

### 4. Skip Mode
```
⚠️  Migrations skipped due to --skip flag or SKIP_MIGRATIONS env var
```

### 5. Database Connection Failure
```
❌ Database connection failed: connection refused
❌ Cannot proceed without database connection
```

## Integration Points

### Docker/Production (entrypoint.sh)
```bash
# Run database migrations conditionally
echo "🔄 Running database migrations..."
node scripts/migrate-conditionally.cjs
```

### Development Setup
```bash
# In setup scripts
npm run db:migrate
```

### CI/CD Pipelines
```bash
# For environments where migrations might not exist
npm run db:migrate

# To completely skip migrations
npm run db:migrate:skip
# OR
SKIP_MIGRATIONS=true npm run db:migrate
```

## Use Cases

### 1. Fresh Installations
When deploying to a new environment where no migration files exist yet, the system will gracefully skip migration attempts and continue with the application startup.

### 2. External Migration Management
For environments where database migrations are managed externally (e.g., by a separate deployment pipeline), set `SKIP_MIGRATIONS=true`.

### 3. Development Environment
During development, if migration files are accidentally deleted or not yet created, the system won't crash but will provide helpful guidance.

### 4. Container Deployments
In containerized environments where migration files might be missing from certain builds, the system will gracefully handle the situation.

## Troubleshooting

### Migration Files Missing
```
💡 Tips:
  • If you need to create an initial migration: npx prisma migrate dev --name initial
  • If the database is already set up: This is normal
  • To force migration attempt: use --force flag
```

### Database Connection Issues
1. Check if the database is running
2. Verify `DATABASE_URL` environment variable
3. Ensure network connectivity
4. Use `--force` flag to continue despite connection issues

### Force Migration Execution
If you need to run migrations regardless of checks:
```bash
npm run db:migrate:force
# OR
node scripts/migrate-conditionally.cjs --force
```

## Migration from Old System

### Before (package.json)
```json
{
  "scripts": {
    "db:migrate": "prisma migrate deploy --schema=prisma/schema.prisma"
  }
}
```

### After (package.json)  
```json
{
  "scripts": {
    "db:migrate": "node scripts/migrate-conditionally.cjs",
    "db:migrate:force": "prisma migrate deploy --schema=prisma/schema.prisma",
    "db:migrate:skip": "node scripts/migrate-conditionally.cjs --skip"
  }
}
```

### Before (entrypoint.sh)
```bash
npx prisma migrate deploy
```

### After (entrypoint.sh)
```bash
node scripts/migrate-conditionally.cjs
```

## Best Practices

1. **Always use the conditional migration scripts** instead of direct Prisma commands in production
2. **Set `SKIP_MIGRATIONS=true`** in environments where migrations are managed externally
3. **Use `--force` sparingly** and only when you understand the implications
4. **Monitor logs** to ensure migrations are running when expected
5. **Test in staging** environments that mirror production deployment scenarios

## Security Considerations

- The scripts check for database connectivity before proceeding
- Force mode should be used carefully in production environments
- Environment variables can be used to control behavior without code changes
- Scripts fail safely when encountering unexpected errors (unless forced)

## Performance Impact

- Minimal overhead: Only adds file system checks and database connection tests
- Early exit when migrations are skipped reduces startup time
- Database connection test is lightweight (Prisma client generation)