# User Groups API 500 Error Fix

## Problem Description

The API endpoint `/api/settings/user-groups/{id}/members` is returning a 500 Internal Server Error when trying to fetch group members. This error is caused by a database schema migration issue where the system has been migrated from junction tables to direct foreign keys, but the migration may not be complete.

## Root Cause Analysis

The issue occurs because:

1. **Database Schema Migration**: The system was migrated from a junction table approach (`User_UserGroup`) to direct foreign keys (`User.userGroupId`)
2. **Incomplete Migration**: The migration may not have been completed properly, leaving the database in an inconsistent state
3. **Missing Tables/Columns**: The `UserGroup` table or `userGroupId` column might not exist or be properly configured
4. **API Fallback**: The API code was not designed to handle both old and new schema approaches gracefully

## Files Modified

### 1. API Endpoint (`src/app/api/settings/user-groups/[id]/members/route.ts`)

**Changes Made:**
- Added fallback logic to try both direct foreign key and junction table approaches
- Improved error handling to prevent 500 errors
- Added graceful degradation when database schema is incomplete
- Added detailed logging for debugging

**Key Features:**
- **Primary Approach**: Tries the new direct foreign key query first
- **Fallback Approach**: If that fails, tries the old junction table approach
- **Graceful Degradation**: Returns empty results with warnings instead of 500 errors
- **Audit Logging**: Logs all attempts and failures for debugging

### 2. Database Migration Script (`fix-user-groups-schema.sql`)

**What It Does:**
- Creates the `UserGroup` table if it doesn't exist
- Adds the `userGroupId` column to the `User` table if missing
- Creates necessary indexes and foreign key constraints
- Creates default user groups (Administrators, Recruiters, Hiring Managers)
- Migrates existing users to appropriate groups
- Provides verification queries to check migration status

### 3. Migration Runner (`run-user-groups-migration.js`)

**What It Does:**
- Connects to the database using environment variables
- Executes the SQL migration script step by step
- Provides detailed progress reporting
- Verifies the migration results
- Handles errors gracefully

## How to Fix the Issue

### Option 1: Run the Migration Script (Recommended)

1. **Set up environment variables:**
   ```bash
   # Create .env.local file with your database connection
   DATABASE_URL=postgresql://username:password@host:port/database
   DB_SSL=false  # or true if using SSL
   ```

2. **Run the migration:**
   ```bash
   node run-user-groups-migration.js
   ```

3. **Verify the fix:**
   - The API endpoint should now work without 500 errors
   - Check the console logs for any remaining issues

### Option 2: Manual Database Fix

If you prefer to run the SQL manually:

1. **Connect to your database** using your preferred database client
2. **Run the SQL script** `fix-user-groups-schema.sql`
3. **Verify the results** using the verification queries at the end of the script

### Option 3: Use the Updated API (Temporary Fix)

The updated API endpoint now handles incomplete migrations gracefully:
- Returns empty results instead of 500 errors
- Provides warnings about migration status
- Logs detailed information for debugging

## Verification Steps

After running the migration, verify that:

1. **UserGroup table exists** and has data:
   ```sql
   SELECT COUNT(*) FROM "UserGroup";
   ```

2. **User table has userGroupId column**:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'User' AND column_name = 'userGroupId';
   ```

3. **Users are assigned to groups**:
   ```sql
   SELECT COUNT("userGroupId") as users_with_groups FROM "User";
   ```

4. **API endpoint works**:
   - Test the endpoint: `GET /api/settings/user-groups/{id}/members`
   - Should return 200 status with users array (even if empty)

## Troubleshooting

### Common Issues

1. **DATABASE_URL not set:**
   - Ensure your environment variables are properly configured
   - Check that the database is accessible from your application

2. **Permission errors:**
   - Ensure the database user has CREATE, ALTER, and INSERT permissions
   - Check that the user can access the User and UserGroup tables

3. **Migration fails partway:**
   - The script is designed to continue even if some statements fail
   - Check the console output for specific error messages
   - Run the verification queries to see what was completed

### Debugging

1. **Check application logs** for detailed error messages
2. **Run the diagnostic script** `test-user-groups-db.js` to identify specific issues
3. **Verify database connectivity** using the health check endpoint
4. **Check database schema** using the verification queries in the migration script

## Expected Results

After successful migration:

- ✅ API endpoint returns 200 status instead of 500
- ✅ Group members are properly fetched
- ✅ Users are assigned to appropriate groups
- ✅ Database schema is consistent and complete
- ✅ No more connection or schema errors

## Rollback (If Needed)

If you need to rollback the changes:

1. **Remove the userGroupId column:**
   ```sql
   ALTER TABLE "User" DROP COLUMN IF EXISTS "userGroupId";
   ```

2. **Drop the UserGroup table:**
   ```sql
   DROP TABLE IF EXISTS "UserGroup" CASCADE;
   ```

3. **Revert the API changes** by restoring the original route.ts file

## Support

If you continue to experience issues:

1. Check the application logs for detailed error messages
2. Verify database connectivity and permissions
3. Run the diagnostic scripts to identify specific problems
4. Check that all environment variables are properly set

## Prevention

To prevent similar issues in the future:

1. **Always test migrations** in a development environment first
2. **Use transaction blocks** for complex schema changes
3. **Implement proper error handling** in API endpoints
4. **Monitor database health** regularly
5. **Keep backup and rollback procedures** ready
