# Stage Filter Fix - Case-Insensitive Matching

## Problem Description

The task board was showing "no candidates" when filtering by stage, even for admin users. This was caused by **case sensitivity mismatches** between the UI stage names and the database candidate status values.

### Root Cause

1. **UI sends**: `filters.stage = "Applied"` (title case)
2. **API maps to**: `status` parameter
3. **Database has**: `status = "applied"` (lowercase)
4. **Result**: No matches found due to case sensitivity

## Solution Implemented

### 1. Case-Insensitive API Filtering

Modified `src/app/api/candidates/route.ts` to use case-insensitive matching:

```typescript
// Before: Exact match
whereClauses.push(`c.status = $${paramIndex++}`);

// After: Case-insensitive match
whereClauses.push(`LOWER(c.status) = LOWER($${paramIndex++})`);
```

### 2. Database Migration Script

Created a comprehensive migration script to standardize all candidate statuses to title case.

## Files Modified

- `src/app/api/candidates/route.ts` - Updated status filter logic
- `prisma/migrations/20250128000000_fix_stage_mismatches/migration.sql` - SQL migration script
- `scripts/fix-stage-mismatches.js` - Node.js migration runner
- `package.json` - Added npm scripts

## How to Fix

### Option 1: Run the Migration Script (Recommended)

```bash
# First, do a dry run to see what would change
npm run fix:stages:dry-run

# Then run the actual migration
npm run fix:stages
```

### Option 2: Manual Database Update

```sql
-- Check current statuses
SELECT DISTINCT status, COUNT(*) as count 
FROM "Candidate" 
WHERE status IS NOT NULL AND status != '' 
GROUP BY status;

-- Update to title case (example)
UPDATE "Candidate" 
SET status = 'Applied' 
WHERE LOWER(status) = 'applied';
```

### Option 3: Environment Variables

Set your database connection details:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=studio2
export DB_USER=postgres
export DB_PASSWORD=your_password

# Then run the script
node scripts/fix-stage-mismatches.js
```

## What the Migration Does

1. **Analyzes** current candidate statuses in the database
2. **Maps** common variations to standardized values:
   - `applied` → `Applied`
   - `APPLIED` → `Applied`
   - `interview scheduled` → `Interview Scheduled`
   - `interview_scheduled` → `Interview Scheduled`
3. **Updates** all candidate records to use standardized statuses
4. **Creates** missing recruitment stages if needed
5. **Verifies** the changes were successful

## Expected Results

After running the migration:

- ✅ Stage filters will work for all users (admin and recruiters)
- ✅ Case sensitivity issues will be resolved
- ✅ UI stages will match database statuses exactly
- ✅ Task board will show candidates correctly when filtering

## Verification

After running the migration, verify the fix:

1. **Check the task board** - filter by different stages
2. **Verify admin users** can see candidates when filtering
3. **Check database** - all statuses should be in title case
4. **Test API** - stage filters should return expected results

## Rollback (If Needed)

If you need to rollback the changes:

```sql
-- Check what was changed
SELECT * FROM "Candidate" WHERE "updatedAt" > NOW() - INTERVAL '1 hour';

-- Restore from backup if available
-- Or manually revert specific statuses
```

## Troubleshooting

### Common Issues

1. **Permission denied**: Ensure your database user has UPDATE privileges
2. **Connection failed**: Check database connection settings
3. **Schema mismatch**: Verify your database schema matches the expected structure

### Debug Mode

The migration script provides detailed logging:

```bash
# Run with verbose output
DEBUG=true npm run fix:stages
```

### Manual Verification

```sql
-- Check if the fix worked
SELECT 
    'Before' as phase,
    status,
    COUNT(*) as count
FROM "Candidate" 
WHERE status IS NOT NULL AND status != ''
GROUP BY status
ORDER BY count DESC;
```

## Performance Impact

- **Migration time**: Typically 1-5 minutes depending on candidate count
- **Database impact**: Minimal - only updates status field
- **Downtime**: None required - can run while system is active
- **Rollback**: Quick - just restore from backup if needed

## Future Prevention

To prevent this issue from recurring:

1. **Standardize** all new candidate statuses to title case
2. **Use constants** for status values in your application code
3. **Add validation** to ensure status values match expected format
4. **Regular audits** of database status values

## Support

If you encounter issues:

1. Check the console output for error messages
2. Verify database connectivity
3. Ensure proper database permissions
4. Check the migration logs for specific failures
