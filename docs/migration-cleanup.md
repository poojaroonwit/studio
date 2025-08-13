# Migration Management System

## Overview

The application now uses a two-step migration management system with separate control variables for running migrations and removing migration files.

## How It Works

### Entrypoint Script (`entrypoint.sh`)

The entrypoint script handles migration management in two separate steps:

1. **Wait for database** - Retries connection with configurable timeout
2. **Step 1: Run migrations** - Based on `RUN_MIGRATIONS` variable:
   - **true**: Runs migrations using `run-migrations.cjs`
   - **false**: Skips migrations
3. **Step 2: Remove migration files** - Based on `REMOVE_MIGRATION_FILES` variable:
   - **true**: Removes migration files using `remove-migration-files.cjs`
   - **false**: Preserves migration files
4. **Seed database** - Runs database seeding if needed
5. **Start application** - Launches the main application

### Migration Script (`scripts/run-migrations.cjs`)

This script handles migrations when `RUN_MIGRATIONS=true`:

1. **Check database connection** - Verifies database is accessible
2. **Check existing migrations** - Looks for existing migration files
3. **Smart migration handling**:
   - If migration files exist → Apply existing migrations
   - If no migration files → Create initial migration
4. **Error handling** - Graceful error handling with force mode support

### Migration File Removal Script (`scripts/remove-migration-files.cjs`)

This script removes migration files when `REMOVE_MIGRATION_FILES=true`:

1. **Check for migration files** - Looks for migration directories in `prisma/migrations/`
2. **Remove files** - Deletes migration directories without running migrations
3. **Error handling** - Graceful error handling with force mode support

## Environment Variables

- `DB_MAX_WAIT_SECONDS` - Maximum time to wait for database (default: 60)
- `DB_WAIT_INTERVAL` - Interval between database connection attempts (default: 5)
- `FORCE_CONTINUE` - Continue startup even if operations fail (default: true)
- `REMOVE_MIGRATION_FILES` - Migration file management:
  - **Not set**: Create initial migration (default behavior)
  - **true**: Remove migration files after deployment
  - **false**: Preserve migration files

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

### Default Behavior (REMOVE_MIGRATION_FILES not set)
1. **Development**: Create migrations using `npx prisma migrate dev`
2. **Deployment**: The entrypoint script creates initial migration if needed
3. **Result**: Database is properly initialized with migration files

### Clean Deployment (REMOVE_MIGRATION_FILES=true)
1. **Development**: Create migrations using `npx prisma migrate dev`
2. **Deployment**: The entrypoint script removes migration files after deployment
3. **Result**: Clean deployment with no migration files left behind

### Preserve Files (REMOVE_MIGRATION_FILES=false)
1. **Development**: Create migrations using `npx prisma migrate dev`
2. **Deployment**: The entrypoint script preserves migration files
3. **Result**: Migration files remain for debugging or future use

## Troubleshooting

### Initial Migration Fails
- Check database connection
- Verify Prisma schema is valid
- Use `FORCE_CONTINUE=true` to continue despite failures
- Check if database already has migrations applied

### Migration File Removal Fails
- Migration files are preserved for debugging
- Check file permissions
- Use `REMOVE_MIGRATION_FILES=false` to preserve files
- Use `FORCE_CONTINUE=true` to continue despite cleanup failures

### Database Not Ready
- Increase `DB_MAX_WAIT_SECONDS` if database takes longer to start
- Check database service status
- Verify `DATABASE_URL` is correct
