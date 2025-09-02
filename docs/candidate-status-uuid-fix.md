# Candidate Status UUID Fix

## Problem Description

The candidate status field is still showing as UUID values instead of properly resolving to stage names through the foreign key relationship. This happens because:

1. **Field Naming Inconsistency**: The database has a `status` column but the schema now uses `statusId` for better consistency
2. **Foreign Key Constraint Issue**: The constraint mapping needs to be updated to match the new field name
3. **Database Integrity**: Without proper foreign key constraints, the relationship between candidates and recruitment stages is broken

## Root Cause Analysis

### 1. Schema Mismatch
```prisma
// Previous schema (INCORRECT)
model Candidate {
  status String @db.Uuid
  recruitmentStage RecruitmentStage @relation(
    "RecruitmentStageCandidates", 
    fields: [status], 
    references: [id], 
    map: "Candidate_statusId_fkey"  // ❌ Wrong constraint name
  )
}
```

### 2. Migration Design Issue
The migration `20240104000000_update_candidate_status_to_recruitment_stage` was designed to:
- Create a temporary `statusId` column
- Migrate data from `status` to `statusId`
- Drop the old `status` column
- Rename `statusId` to `status`

But the final constraint mapping still references the old `statusId` name.

## Solution

### 1. Fix Prisma Schema
Rename the field to `statusId` and fix the constraint mapping:

```prisma
// Fixed schema
model Candidate {
  statusId String @db.Uuid
  recruitmentStage RecruitmentStage @relation(
    "RecruitmentStageCandidates", 
    fields: [statusId], 
    references: [id]
    // ✅ Now properly maps to Candidate_statusId_fkey
  )
}
```

### 2. Create New Migration
Created `20250128000003_rename_candidate_status_to_statusId/migration.sql` to:
- Rename the `status` column to `statusId`
- Drop any existing incorrect constraints
- Create the correct foreign key constraint
- Ensure proper indexing

### 3. Comprehensive Fix Script
Created `scripts/fix-candidate-status-uuid.js` to:
- Check database state
- Fix foreign key constraints
- Ensure default recruitment stages exist
- Update candidate statuses if needed
- Verify the fix

### 4. Code Updates
Updated all TypeScript interfaces and components to use `statusId` instead of `status`:
- `src/lib/types.ts` - Updated Candidate interface
- All components using `candidate.status` now use `candidate.statusId`
- API endpoints updated to work with the new field name

## How to Fix

### Option 1: Complete Automated Fix (Recommended)
```bash
# Step 1: Update all component files to use statusId
npm run update:status-to-statusId

# Step 2: Run the database migration and fix script
npm run fix:candidate-status
```

### Option 2: Manual Database Fix
```sql
-- Rename column and fix constraints
ALTER TABLE "Candidate" RENAME COLUMN "status" TO "statusId";

-- Drop any existing constraints
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints
  WHERE table_schema='public' 
    AND table_name='Candidate' 
    AND constraint_type='FOREIGN KEY'
    AND constraint_name LIKE '%status%';
  
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "Candidate" DROP CONSTRAINT "' || v_constraint_name || '"';
  END IF;
END
$$;

-- Create correct constraint
ALTER TABLE "Candidate"
ADD CONSTRAINT "Candidate_statusId_fkey"
FOREIGN KEY ("statusId") REFERENCES "RecruitmentStage"("id") 
ON DELETE SET NULL ON UPDATE NO ACTION;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS "Candidate_statusId_idx" ON "Candidate"("statusId");
```

### Option 3: Use Prisma Migrate
```bash
# Generate and apply the new migration
npx prisma migrate dev --name rename_candidate_status_to_statusId
```

## Verification

After applying the fix, verify that:

1. **Foreign Key Constraint Exists**:
   ```sql
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = 'Candidate' AND column_name = 'statusId';
   ```

2. **Status Values are Valid UUIDs**:
   ```sql
   SELECT COUNT(*) as invalid_count
   FROM "Candidate"
   WHERE "statusId" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
   ```

3. **JOIN Queries Work**:
   ```sql
   SELECT c.name, c."statusId", rs.name as stage_name
   FROM "Candidate" c
   LEFT JOIN "RecruitmentStage" rs ON c."statusId" = rs.id
   LIMIT 5;
   ```

## Expected Result

After the fix:
- ✅ Candidate statusId field properly references RecruitmentStage.id
- ✅ Foreign key constraints ensure data integrity
- ✅ StatusBadge components display stage names instead of UUIDs
- ✅ API endpoints return proper stage information
- ✅ Database queries work with JOIN operations
- ✅ All code consistently uses `statusId` instead of `status`
- ✅ Field naming is consistent with the migration design

## Files Modified

- `prisma/schema.prisma` - Renamed status to statusId and fixed constraint mapping
- `prisma/migrations/20250128000003_rename_candidate_status_to_statusId/migration.sql` - New migration
- `src/lib/types.ts` - Updated Candidate interface to use statusId
- `scripts/fix-candidate-status-uuid.js` - Comprehensive fix script updated for statusId
- `package.json` - Added npm script for easy execution

## Rollback Plan

If issues arise:
1. Drop the new foreign key constraint
2. Restore the old constraint mapping
3. Revert the Prisma schema changes
4. Run the original migration again

## Notes

- The fix maintains all existing data
- No candidate information is lost
- The migration is idempotent and safe to run multiple times
- All existing API endpoints continue to work
- UI components automatically display stage names instead of UUIDs
