# Migration Best Practices Guide

## Overview

This document outlines the best practices for database migrations in the Studio application, ensuring reliable, maintainable, and safe database schema changes.

## Migration Naming Convention

### Format
```
YYYYMMDDHHMMSS_descriptive_action_name.sql
```

### Examples
```sql
-- ✅ Good examples
20250101120000_create_system_prompts_table.sql
20250101120001_add_category_foreign_key_to_system_prompts.sql
20250101120002_migrate_existing_prompts_to_categories.sql

-- ❌ Avoid generic names
20250101000000_add_system_prompts.sql
20250101000001_add_system_prompt_categories.sql
```

### Naming Rules
1. **Use descriptive verbs**: `create_`, `add_`, `modify_`, `remove_`, `migrate_`
2. **Include table names**: `create_system_prompts_table`
3. **Specify relationships**: `add_user_id_foreign_key_to_candidates`
4. **Indicate data operations**: `migrate_existing_data_to_new_structure`

## Migration Structure Best Practices

### 1. **Atomic Changes**
Each migration should make one logical change:

```sql
-- ✅ Good: Single logical change
-- Migration: 20250101120000_create_system_prompts_table.sql
CREATE TABLE "SystemPrompt" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemPrompt_pkey" PRIMARY KEY ("id")
);

-- ❌ Avoid: Multiple unrelated changes
CREATE TABLE "SystemPrompt" (...);
CREATE TABLE "UserPreferences" (...);
ALTER TABLE "Candidate" ADD COLUMN "new_field" TEXT;
```

### 2. **Proper Indexing**
```sql
-- ✅ Good: Create indexes after table creation
CREATE TABLE "SystemPrompt" (...);
CREATE INDEX "SystemPrompt_name_idx" ON "SystemPrompt"("name");
CREATE INDEX "SystemPrompt_category_idx" ON "SystemPrompt"("category");

-- ❌ Avoid: Missing indexes on frequently queried columns
CREATE TABLE "SystemPrompt" (...);
-- No indexes created
```

### 3. **Foreign Key Constraints**
```sql
-- ✅ Good: Proper foreign key with cascade options
ALTER TABLE "SystemPrompt" ADD COLUMN "categoryId" UUID;
ALTER TABLE "SystemPrompt" ADD CONSTRAINT "SystemPrompt_categoryId_fkey" 
    FOREIGN KEY ("categoryId") REFERENCES "SystemPromptCategory"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ❌ Avoid: Missing cascade options or improper constraints
ALTER TABLE "SystemPrompt" ADD COLUMN "categoryId" UUID;
-- No foreign key constraint
```

## Data Migration Best Practices

### 1. **Safe Data Transformations**
```sql
-- ✅ Good: Safe data migration with validation
-- Step 1: Add new column
ALTER TABLE "SystemPrompt" ADD COLUMN "categoryId" UUID;

-- Step 2: Migrate existing data
UPDATE "SystemPrompt" 
SET "categoryId" = (SELECT id FROM "SystemPromptCategory" WHERE name = 'General' LIMIT 1)
WHERE "categoryId" IS NULL;

-- Step 3: Make column NOT NULL after data migration
ALTER TABLE "SystemPrompt" ALTER COLUMN "categoryId" SET NOT NULL;
```

### 2. **Backward Compatibility**
```sql
-- ✅ Good: Maintain backward compatibility during transition
-- Add new column without removing old one immediately
ALTER TABLE "SystemPrompt" ADD COLUMN "categoryId" UUID;
-- Keep old "category" column for backward compatibility
-- Remove in a separate migration after application update
```

### 3. **Data Validation**
```sql
-- ✅ Good: Validate data after migration
-- Verify all records have been migrated
SELECT COUNT(*) FROM "SystemPrompt" WHERE "categoryId" IS NULL;
-- Should return 0

-- Check for orphaned records
SELECT COUNT(*) FROM "SystemPrompt" s
LEFT JOIN "SystemPromptCategory" c ON s."categoryId" = c.id
WHERE c.id IS NULL AND s."categoryId" IS NOT NULL;
-- Should return 0
```

## Rollback Strategy

### 1. **Reversible Migrations**
```sql
-- ✅ Good: Include rollback logic in comments
-- Migration: 20250101120001_add_category_foreign_key_to_system_prompts.sql

-- Forward migration
ALTER TABLE "SystemPrompt" ADD COLUMN "categoryId" UUID;
ALTER TABLE "SystemPrompt" ADD CONSTRAINT "SystemPrompt_categoryId_fkey" 
    FOREIGN KEY ("categoryId") REFERENCES "SystemPromptCategory"("id");

-- Rollback (if needed):
-- ALTER TABLE "SystemPrompt" DROP CONSTRAINT "SystemPrompt_categoryId_fkey";
-- ALTER TABLE "SystemPrompt" DROP COLUMN "categoryId";
```

### 2. **Migration Testing**
```sql
-- ✅ Good: Include test queries in migration
-- Test that foreign key works correctly
INSERT INTO "SystemPromptCategory" ("id", "name") VALUES (gen_random_uuid(), 'Test Category');
INSERT INTO "SystemPrompt" ("id", "name", "content", "categoryId") 
VALUES (gen_random_uuid(), 'Test Prompt', 'Test content', 
        (SELECT id FROM "SystemPromptCategory" WHERE name = 'Test Category'));

-- Clean up test data
DELETE FROM "SystemPrompt" WHERE name = 'Test Prompt';
DELETE FROM "SystemPromptCategory" WHERE name = 'Test Category';
```

## Environment-Specific Considerations

### 1. **Development Environment**
- Use `npx prisma migrate dev` for development
- Test migrations on development database first
- Use `--create-only` flag to review generated SQL

### 2. **Staging Environment**
- Use `npx prisma migrate deploy` for staging
- Test with production-like data volumes
- Validate performance impact

### 3. **Production Environment**
- Use `npx prisma migrate deploy` for production
- Run during maintenance windows
- Have rollback plan ready
- Monitor application performance after migration

## Migration Scripts Best Practices

### 1. **Pre-Migration Checks**
```javascript
// ✅ Good: Validate migration readiness
function validateMigrationReadiness() {
    // Check database connection
    // Verify schema consistency
    // Check for pending transactions
    // Validate migration order
}
```

### 2. **Post-Migration Validation**
```javascript
// ✅ Good: Validate migration success
function validateMigrationSuccess() {
    // Verify schema changes applied
    // Check data integrity
    // Validate indexes created
    // Test application functionality
}
```

### 3. **Error Handling**
```javascript
// ✅ Good: Comprehensive error handling
try {
    await runMigration();
    await validateMigration();
    await cleanup();
} catch (error) {
    await rollbackMigration();
    await notifyTeam(error);
    process.exit(1);
}
```

## CI/CD Integration

### 1. **Migration Testing Pipeline**
```yaml
# ✅ Good: Test migrations in CI/CD
- name: Test Migrations
  run: |
    # Create test database
    # Run migrations
    # Validate schema
    # Run application tests
    # Clean up test database
```

### 2. **Migration Validation**
```yaml
# ✅ Good: Validate migration files
- name: Validate Migration Files
  run: |
    # Check migration naming convention
    # Validate SQL syntax
    # Check for potential issues
    # Verify rollback compatibility
```

## Monitoring and Alerting

### 1. **Migration Monitoring**
- Monitor migration execution time
- Track failed migrations
- Alert on migration failures
- Monitor database performance during migrations

### 2. **Post-Migration Monitoring**
- Monitor application performance
- Track database query performance
- Alert on data integrity issues
- Monitor application errors

## Common Anti-Patterns to Avoid

### 1. **Large Migrations**
```sql
-- ❌ Avoid: Single large migration with many changes
-- Migration: 20250101000000_major_schema_update.sql
-- Creates 10 tables, modifies 5 tables, adds 20 columns
-- This makes rollback difficult and increases risk
```

### 2. **Breaking Changes Without Transition**
```sql
-- ❌ Avoid: Immediate breaking changes
ALTER TABLE "User" DROP COLUMN "old_field";
-- Application will break immediately
```

### 3. **Missing Indexes**
```sql
-- ❌ Avoid: Creating tables without proper indexes
CREATE TABLE "Candidate" (
    "id" UUID PRIMARY KEY,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL
);
-- Missing indexes on frequently queried columns
```

### 4. **Inconsistent Naming**
```sql
-- ❌ Avoid: Inconsistent column naming
CREATE TABLE "User" (
    "id" UUID PRIMARY KEY,
    "user_name" TEXT,  -- snake_case
    "emailAddress" TEXT,  -- camelCase
    "phone_number" TEXT   -- snake_case
);
```

## Migration Checklist

Before deploying a migration:

- [ ] Migration follows naming convention
- [ ] Migration is atomic (single logical change)
- [ ] Proper indexes are created
- [ ] Foreign key constraints are defined
- [ ] Data migration is safe and validated
- [ ] Rollback strategy is documented
- [ ] Migration is tested in development
- [ ] Migration is tested in staging
- [ ] Performance impact is assessed
- [ ] Application compatibility is verified
- [ ] Monitoring is in place
- [ ] Rollback plan is ready

## Tools and Resources

### 1. **Migration Validation Tools**
- Prisma Migrate validation
- SQL syntax checkers
- Database schema validators

### 2. **Testing Tools**
- Database testing frameworks
- Migration testing utilities
- Performance testing tools

### 3. **Monitoring Tools**
- Database monitoring solutions
- Application performance monitoring
- Error tracking systems

## Conclusion

Following these best practices ensures:
- **Reliability**: Migrations execute consistently and safely
- **Maintainability**: Easy to understand and modify migrations
- **Performance**: Optimized database schema and queries
- **Safety**: Proper rollback strategies and error handling
- **Monitoring**: Clear visibility into migration status and impact

Remember: Database migrations are critical operations that can affect your entire application. Always prioritize safety, testing, and proper planning over speed.
