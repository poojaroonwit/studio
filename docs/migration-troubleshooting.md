# Migration Troubleshooting Guide

This guide helps you resolve common Prisma migration issues in the Studio application.

## Common Migration Issues

### 1. Failed Migrations (P3009 Error)

**Error Message:**
```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
```

**Cause:** A previous migration attempt failed and left the database in an inconsistent state.

**Solutions:**

#### Option A: Auto-resolve Failed Migrations (Recommended)
```bash
# Set environment variable to auto-resolve
export RESOLVE_FAILED_MIGRATIONS=true

# Run the entrypoint script
./entrypoint.sh
```

#### Option B: Manual Resolution
```bash
# Use the migration resolution script
node scripts/resolve-migration-issues.js --resolve-failed

# Or manually resolve specific migrations
npx prisma migrate resolve --applied <migration_id>
```

#### Option C: Reset All Migrations (Development Only)
```bash
# WARNING: This will delete all data
node scripts/resolve-migration-issues.js --reset
```

### 2. Database Connection Issues

**Error Message:**
```
❌ ERROR: Cannot connect to database
```

**Solutions:**
- Verify `DATABASE_URL` environment variable is set correctly
- Check if the database server is running
- Ensure network connectivity to the database
- Verify database credentials

### 3. Migration Conflicts

**Error Message:**
```
Error: P3008
The migration `...` is not in a known migration state.
```

**Solutions:**
```bash
# Check migration status
npx prisma migrate status

# Reset migration state (development only)
npx prisma migrate reset --force
```

## Updated Entrypoint Script Features

The `entrypoint.sh` script now includes:

### Enhanced Error Handling
- Database connection verification before migrations
- Automatic detection of failed migrations
- Graceful handling of migration failures

### Environment Variables
- `RESOLVE_FAILED_MIGRATIONS=true` - Automatically resolve failed migrations
- `FORCE_CONTINUE=true` - Continue even if migrations fail
- `SKIP_MIGRATIONS=true` - Skip migration process entirely

### Usage Examples

#### Linux/macOS (bash)
```bash
# Normal startup with auto-resolution
export RESOLVE_FAILED_MIGRATIONS=true
./entrypoint.sh

# Force continue despite errors
export FORCE_CONTINUE=true
./entrypoint.sh

# Skip migrations entirely
export SKIP_MIGRATIONS=true
./entrypoint.sh
```

#### Windows (PowerShell)
```powershell
# Normal startup with auto-resolution
$env:RESOLVE_FAILED_MIGRATIONS="true"
powershell -ExecutionPolicy Bypass -File entrypoint.ps1

# Force continue despite errors
$env:FORCE_CONTINUE="true"
powershell -ExecutionPolicy Bypass -File entrypoint.ps1

# Skip migrations entirely
$env:SKIP_MIGRATIONS="true"
powershell -ExecutionPolicy Bypass -File entrypoint.ps1
```

## Migration Resolution Script

The `scripts/resolve-migration-issues.js` script provides additional tools:

### Commands

```bash
# Check migration status
node scripts/resolve-migration-issues.js

# Resolve failed migrations
node scripts/resolve-migration-issues.js --resolve-failed

# Reset all migrations (interactive)
node scripts/resolve-migration-issues.js --reset

# Force operations (skip prompts)
node scripts/resolve-migration-issues.js --resolve-failed --force
```

### Features
- Interactive migration reset with confirmation
- Automatic failed migration detection and resolution
- Detailed status reporting
- Graceful error handling

## Production Considerations

### Safe Operations
- Use `RESOLVE_FAILED_MIGRATIONS=true` for automatic resolution
- Always backup database before major operations
- Test migration scripts in staging environment first

### Unsafe Operations (Development Only)
- `--reset` flag - Deletes all data
- `prisma migrate reset` - Resets entire database
- Manual migration manipulation

## Troubleshooting Steps

1. **Check Database Connection**
   ```bash
   npx prisma db execute --stdin <<< "SELECT 1;"
   ```

2. **Check Migration Status**
   ```bash
   npx prisma migrate status
   ```

3. **Resolve Failed Migrations**
   ```bash
   node scripts/resolve-migration-issues.js --resolve-failed
   ```

4. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   ```

5. **Verify Schema**
   ```bash
   npx prisma db push --accept-data-loss
   ```

## Emergency Recovery

If the database is in a critical state:

1. **Backup Current State**
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Reset and Recreate**
   ```bash
   npx prisma migrate reset --force
   npx prisma migrate deploy
   npx prisma db seed
   ```

3. **Restore Data** (if needed)
   ```bash
   psql $DATABASE_URL < backup_file.sql
   ```

## Support

For additional help:
- Check Prisma documentation: https://www.prisma.io/docs/guides/migrate
- Review application logs for detailed error messages
- Contact the development team with specific error details
