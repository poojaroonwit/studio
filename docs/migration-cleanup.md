# Migration and Cleanup System

## Overview

The application now uses a simplified migration system that automatically removes migration files after successful deployment. This keeps the deployment clean and prevents migration conflicts in future deployments.

## How It Works

### Entrypoint Script (`entrypoint.sh`)

The entrypoint script has been simplified to:

1. **Wait for database** - Retries connection with configurable timeout
2. **Run migrations** - Uses the new `migrate-and-cleanup.cjs` script
3. **Seed database** - Runs database seeding if needed
4. **Start application** - Launches the main application

### Migration Script (`scripts/migrate-and-cleanup.cjs`)

This script handles both migration and cleanup:

1. **Check for migration files** - Looks for migration directories in `prisma/migrations/`
2. **Run migrations** - Executes `npx prisma migrate deploy`
3. **Clean up files** - Removes migration directories after successful migration
4. **Error handling** - Graceful error handling with force mode support

## Environment Variables

- `DB_MAX_WAIT_SECONDS` - Maximum time to wait for database (default: 60)
- `DB_WAIT_INTERVAL` - Interval between database connection attempts (default: 5)
- `FORCE_CONTINUE` - Continue startup even if migrations fail
- `SKIP_MIGRATION_CLEANUP` - Skip migration file cleanup

## Command Line Options

The migration script supports these flags:

- `--force` - Continue even if migration fails
- `--skip-cleanup` - Skip migration file cleanup

## Benefits

1. **Cleaner deployments** - No leftover migration files
2. **Simplified process** - Single script handles migration and cleanup
3. **Better error handling** - Graceful failure handling with force mode
4. **Reduced complexity** - Removed complex failed migration resolution logic

## Migration Workflow

1. **Development**: Create migrations using `npx prisma migrate dev`
2. **Deployment**: The entrypoint script automatically runs migrations and cleans up
3. **Result**: Clean deployment with no migration files left behind

## Troubleshooting

### Migration Fails
- Check database connection
- Verify migration files are valid
- Use `FORCE_CONTINUE=true` to continue despite failures

### Cleanup Fails
- Migration files are preserved for debugging
- Check file permissions
- Use `SKIP_MIGRATION_CLEANUP=true` to skip cleanup

### Database Not Ready
- Increase `DB_MAX_WAIT_SECONDS` if database takes longer to start
- Check database service status
- Verify `DATABASE_URL` is correct
