# Migration Fix Guide

## Problem Description

The Prisma migration is failing because:

1. **Existing Data Conflict**: The database has existing candidates with data, but the migration is trying to add a required `status` column without a default value.

2. **Schema Mismatch**: The current schema expects `statusId` to be required (`String @map("status")`), but the migration only makes it nullable.

3. **Migration Order Issue**: The migration `20240104000000_update_candidate_status_to_recruitment_stage` is trying to run but conflicts with existing data.

## Solution Options

### Option 1: Use the Fix Script (Recommended)

Run the provided fix script to properly handle the existing data:

```bash
node scripts/fix-status-migration.js
```

This script will:
- Create the `RecruitmentStage` table if it doesn't exist
- Add the `statusId` column as nullable
- Populate existing candidates with appropriate status values
- Create recruitment stages for existing status values
- Set default status for candidates without status
- Add proper foreign key constraints and indexes

After running the script:
1. Update your Prisma schema to make `statusId` required (remove the `?`)
2. Run `npx prisma generate`
3. Run `npx prisma db push`

### Option 2: Reset Migration State

If you want to start fresh:

```bash
node scripts/reset-migration-state.js
npx prisma migrate dev --name init
```

**Warning**: This will clear migration history and may require manual handling of existing data.

### Option 3: Manual Database Fix

If you prefer to handle it manually:

1. **Connect to your database** and run:

```sql
-- Create RecruitmentStage table
CREATE TABLE IF NOT EXISTS "RecruitmentStage" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "color_complete" TEXT,
  "color_badge" TEXT,
  CONSTRAINT "RecruitmentStage_pkey" PRIMARY KEY ("id")
);

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS "RecruitmentStage_name_key" ON "RecruitmentStage"("name");

-- Add statusId column (nullable initially)
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "statusId" uuid;

-- Insert default stage
INSERT INTO "RecruitmentStage"(id, name, description, "sort_order", "is_system")
SELECT gen_random_uuid(), 'Applied', 'Default stage for existing candidates', 0, true
WHERE NOT EXISTS (SELECT 1 FROM "RecruitmentStage" WHERE LOWER(name) = 'applied');

-- Update existing candidates with default status
UPDATE "Candidate" 
SET "statusId" = (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'applied' LIMIT 1)
WHERE "statusId" IS NULL;

-- Add foreign key constraint
ALTER TABLE "Candidate"
ADD CONSTRAINT "Candidate_statusId_fkey"
FOREIGN KEY ("statusId") REFERENCES "RecruitmentStage"("id") ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS "Candidate_statusId_idx" ON "Candidate"("statusId");
```

2. **Update your Prisma schema** to make `statusId` required:
   ```prisma
   statusId String @map("status") @db.Uuid
   ```

3. **Generate and push**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

## Current Schema State

The schema has been temporarily updated to make `statusId` nullable:
```prisma
statusId String? @map("status") @db.Uuid
```

This allows the migration to proceed without conflicts. After the data is properly migrated, you should remove the `?` to make it required.

## Verification

After running any of the solutions, verify the migration was successful:

```sql
-- Check that all candidates have statusId
SELECT 
  COUNT(*) as total_candidates,
  COUNT("statusId") as candidates_with_statusId,
  COUNT(*) - COUNT("statusId") as candidates_without_statusId
FROM "Candidate";

-- Check foreign key constraint
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'Candidate' AND constraint_type = 'FOREIGN KEY';
```

## Troubleshooting

### If the fix script fails:

1. Check database connection and permissions
2. Verify the `Candidate` table exists and has data
3. Check for any existing constraints that might conflict

### If db push still fails:

1. Ensure all candidates have a valid `statusId`
2. Check that the `RecruitmentStage` table exists and has data
3. Verify foreign key constraints are properly set up

### If you need to rollback:

1. Drop the `statusId` column: `ALTER TABLE "Candidate" DROP COLUMN "statusId";`
2. Drop the `RecruitmentStage` table if it was created: `DROP TABLE "RecruitmentStage";`
3. Reset migration state using the reset script

## Next Steps

After successfully fixing the migration:

1. **Test your application** to ensure it works with the new schema
2. **Update any code** that references the old `status` field to use `statusId`
3. **Consider dropping the old `status` column** if it's no longer needed
4. **Update your deployment scripts** to handle this migration properly

## Support

If you continue to experience issues:

1. Check the database logs for specific error messages
2. Verify the database connection string and permissions
3. Ensure all required tables and columns exist
4. Consider using `npx prisma db push --force-reset` as a last resort (⚠️ **WARNING**: This will drop all data)
