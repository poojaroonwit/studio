# Troubleshooting Seeding Issues

## Common Seeding Error: SystemPromptCategory Constraint Issue

### Error Message
```
PrismaClientUnknownRequestError: 
Invalid `prisma.systemPromptCategory.upsert()` invocation:
Error occurred during query execution:
ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "42P10", message: "there is no unique or exclusion constraint matching the ON CONFLICT specification", severity: "ERROR", detail: None, column: None, hint: None }), transient: false })
```

### What This Means
This error occurs when the database schema doesn't match the Prisma schema. Specifically, the `SystemPromptCategory` table is missing the unique constraint on the `name` field that the seed script expects.

### Quick Fix

#### Option 1: Use the Fix Schema Script (Recommended)
```bash
# Run the automated fix script
npm run db:fix-schema

# Then try seeding again
npm run db:auto
```

#### Option 2: Manual Fix
```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Sync database schema
npx prisma db push --accept-data-loss

# 3. Try seeding again
npx prisma db seed
```

#### Option 3: Reset and Recreate (Development Only)
```bash
# WARNING: This will delete all data
npm run db:reset

# Then run auto-migration
npm run db:auto
```

### Why This Happens

1. **Schema Drift**: The database schema has diverged from the Prisma schema
2. **Missing Migrations**: The unique constraint wasn't properly applied
3. **Development Environment**: Schema changes were made without proper migrations

### Prevention

1. **Always use migrations in production**:
   ```bash
   npm run db:dev -- --name add_unique_constraint
   ```

2. **Check schema consistency**:
   ```bash
   npm run db:status
   ```

3. **Use the auto-migration system**:
   ```bash
   npm run db:auto
   ```

### Verification

After fixing, verify the schema is correct:
```bash
# Check migration status
npm run db:status

# Verify unique constraint exists
npx prisma db execute --stdin <<< "
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'SystemPromptCategory' AND constraint_type = 'UNIQUE';
"
```

### Alternative Seeding Approach

If the issue persists, you can manually create the categories:

```sql
-- Connect to your database and run:
INSERT INTO "SystemPromptCategory" (id, name, description, color, "is_active", "created_at", "updated_at") 
VALUES 
  (gen_random_uuid(), 'Job Description Generation', 'Prompts for generating job descriptions and requirements', '#3B82F6', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Candidate Analysis', 'Prompts for analyzing candidate profiles and qualifications', '#10B981', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Email Templates', 'Prompts for generating email templates and communications', '#F59E0B', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Report Generation', 'Prompts for generating reports and summaries', '#8B5CF6', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'General', 'General purpose prompts for various tasks', '#6B7280', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;
```

### Getting Help

If the issue persists:

1. **Check the logs** for more detailed error information
2. **Verify your DATABASE_URL** is correct
3. **Ensure you have proper database permissions**
4. **Check if the database is accessible** from your application

### Related Commands

```bash
# Check database connection
npx prisma db execute --stdin <<< "SELECT 1;"

# View current schema
npx prisma db pull

# Reset Prisma client
npx prisma generate

# Check for schema differences
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma
```
