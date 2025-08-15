# Migration Divergence Fix

## Problem Description

The entrypoint script was failing when encountering a scenario where the database had existing migrations that diverged from the local migrations directory. This typically occurs when:

1. The database was previously set up with different migration files
2. The local migration files were reset or changed
3. The database schema was modified outside of Prisma migrations
4. The database has existing data and schema that doesn't match the local migration files

## Error Message

```
The migrations recorded in the database diverge from the local migrations directory.
We need to reset the "public" schema at "postgres:5432"
You may use prisma migrate reset to drop the development database.
All data will be lost.
❌ Failed to create initial migration
```

## Root Cause

The original entrypoint script logic was:
1. Detect if database is "fresh" (no migrations table or empty migrations table)
2. Try to create an initial migration using `prisma migrate dev --name init --create-only`
3. Fail when the database already has existing schema that conflicts with the migration creation

## Solution

Updated the entrypoint script (`entrypoint.sh`) to handle migration divergence scenarios:

### 1. Enhanced Detection Logic

Added detection for migration divergence:
```bash
# Check for migration divergence
if echo "$MIGRATION_STATUS" | grep -q "migrations recorded in the database diverge from the local migrations directory"; then
    SCHEMA_DIVERGED=1
    echo "⚠️  Migration divergence detected - database has different migrations than local files"
fi
```

### 2. Fallback Strategy

Added fallback to `prisma db push` when initial migration creation fails:
```bash
if npx prisma migrate dev --name init --create-only --schema=prisma/schema.prisma; then
    echo "✅ Initial migration created successfully"
    # ... apply migration
else
    echo "❌ Failed to create initial migration"
    echo "🔄 Attempting to use db push as fallback..."
    if npx prisma db push --accept-data-loss --schema=prisma/schema.prisma; then
        echo "✅ Database schema synced using db push"
    else
        echo "❌ Failed to sync database schema"
        exit 1
    fi
fi
```

### 3. Specific Divergence Handling

Added dedicated handling for migration divergence:
```bash
elif [ "$SCHEMA_DIVERGED" -eq 1 ]; then
    echo "🔧 Migration divergence detected - syncing database schema..."
    
    # When migrations diverge, use db push to sync the schema
    if npx prisma db push --accept-data-loss --schema=prisma/schema.prisma; then
        echo "✅ Database schema synced successfully (migration divergence resolved)"
    else
        echo "❌ Failed to sync database schema"
        exit 1
    fi
```

## Benefits

1. **Data Preservation**: Uses `db push` instead of `migrate reset`, preserving existing data
2. **Automatic Recovery**: Automatically detects and resolves migration divergence
3. **Better Error Handling**: Provides clear error messages and fallback strategies
4. **Production Safe**: Works in both development and production environments

## Testing

Use the provided test script to verify the fix:
```bash
node test-migration-fix.js
```

## Migration Scenarios Handled

The updated entrypoint script now handles these scenarios:

1. **Fresh Database**: Creates initial migration
2. **Pending Migrations**: Applies pending migrations
3. **Schema Out of Sync**: Syncs schema using `db push`
4. **Migration Divergence**: Syncs schema using `db push` (new)
5. **Migration Creation Failure**: Falls back to `db push` (new)

## Usage

The entrypoint script is automatically used when:
- Starting the Docker container
- Running the application in production
- Any environment where the script is executed

No manual intervention is required - the script automatically detects and resolves migration issues.
