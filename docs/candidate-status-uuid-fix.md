# Candidate Status UUID Fix

## Problem Description

The candidate status field is still showing as UUID values instead of properly resolving to stage names through the foreign key relationship. This happens because:

1. **Field Naming Inconsistency**: The database has a `status` column but we want to use `statusId` for better consistency
2. **Missing Foreign Key Constraint**: The field doesn't have a proper foreign key constraint to `RecruitmentStage.id`
3. **Relation Mapping Issue**: The Prisma relation needs to be updated to use the new field name

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
Rename the field to `statusId` and ensure proper relation mapping:

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
Created `20250128000005_fix_candidate_status_relation/migration.sql` to:
- Add the missing foreign key constraint for the `status` field
- Ensure proper relation to `RecruitmentStage.id`
- Create proper indexing

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
-- Add foreign key constraint for status field
ALTER TABLE "Candidate"
ADD CONSTRAINT "Candidate_status_fkey"
FOREIGN KEY (status) REFERENCES "RecruitmentStage"("id") 
ON DELETE SET NULL ON UPDATE NO ACTION;

-- Ensure index exists
CREATE INDEX IF NOT EXISTS "Candidate_status_idx" ON "Candidate"(status);
```

### Option 3: Use Prisma Migrate
```bash
# Generate and apply the new migration
npx prisma migrate dev --name fix_candidate_status_relation
```

## Verification

After applying the fix, verify that:

1. **Foreign Key Constraint Exists**:
   ```sql
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = 'Candidate' AND column_name = 'status';
   ```

2. **Status Values are Valid UUIDs**:
   ```sql
   SELECT COUNT(*) as invalid_count
   FROM "Candidate"
   WHERE status !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
   ```

3. **JOIN Queries Work**:
   ```sql
   SELECT c.name, c.status, rs.name as stage_name
   FROM "Candidate" c
   LEFT JOIN "RecruitmentStage" rs ON c.status = rs.id
   LIMIT 5;
   ```

## Expected Result

After the fix:
- ✅ Candidate status field properly references RecruitmentStage.id
- ✅ Foreign key constraints ensure data integrity
- ✅ StatusBadge components display stage names instead of UUIDs
- ✅ API endpoints return proper stage information
- ✅ Database queries work with JOIN operations
- ✅ All code consistently uses `status` field
- ✅ Simple migration without column renaming

## Files Modified

- `prisma/schema.prisma` - Fixed constraint mapping for status field
- `prisma/migrations/20250128000005_fix_candidate_status_relation/migration.sql` - New migration
- `src/lib/types.ts` - Updated Candidate interface to use status field
- `scripts/fix-candidate-status-uuid.js` - Comprehensive fix script
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
