# Migration: Update Permissions to Granular System

## Overview
This migration updates the permission system from broad, general permissions to granular, specific permissions that provide better security and control.

## What This Migration Does

### For Admin Role:
- Replaces broad permissions with specific granular permissions
- Maintains full system access but with better control
- Includes all new candidate, position, and user management permissions

### For Recruiter Role:
- Updates to use specific permissions instead of broad ones
- Maintains necessary functionality for recruitment tasks
- Removes sensitive permissions that shouldn't be available to recruiters

### For Other Roles:
- Replaces old broad permissions with appropriate granular ones
- Ensures basic viewing permissions are maintained
- Updates deprecated permission names

## Key Changes

### Old → New Permission Mappings:
- `CANDIDATES_MANAGE` → `CANDIDATES_CREATE` (and other specific permissions)
- `POSITIONS_MANAGE` → `POSITIONS_CREATE` (and other specific permissions)
- `USERS_MANAGE` → `USERS_VIEW` (and other specific permissions)
- `CANDIDATES_STATUS_CHANGE` → `CANDIDATES_PIPELINE_STAGE_UPDATE`
- `CANDIDATES_STATUS_BULK_CHANGE` → `CANDIDATES_PIPELINE_STAGE_BULK_UPDATE`
- `POSITIONS_EDIT` → `POSITIONS_EDIT_BASIC`

### New Granular Permissions Added:
- **Candidate Source Management**: `CANDIDATES_SOURCE_ASSIGN`, `CANDIDATES_SOURCE_ASSIGN_BULK`
- **Candidate Recruiter Management**: `CANDIDATES_RECRUITER_ASSIGN`, `CANDIDATES_RECRUITER_ASSIGN_BULK`
- **Candidate Pipeline Management**: `CANDIDATES_PIPELINE_STAGE_UPDATE`, `CANDIDATES_PIPELINE_STAGE_BULK_UPDATE`
- **Position Management**: `POSITIONS_EDIT_BASIC`, `POSITIONS_EDIT_DETAILED`, `POSITIONS_RECRUITER_ASSIGN`

## How to Apply

### Option 1: Using Prisma Migrate
```bash
npx prisma migrate deploy
```

### Option 2: Manual SQL Execution
```bash
# Connect to your database and run:
psql -d your_database -f migration.sql
```

## How to Rollback

If you need to revert this migration:

### Option 1: Using the rollback file
```bash
psql -d your_database -f rollback.sql
```

### Option 2: Manual rollback
The rollback.sql file contains the exact commands to revert all changes.

## Impact

### Before Migration:
- Users had broad permissions that might grant more access than intended
- Difficult to implement fine-grained access control
- Security risks from overly permissive roles

### After Migration:
- Precise control over what each role can do
- Better security through principle of least privilege
- Clear audit trail of specific permissions
- Enhanced UI showing detailed permission descriptions and impact

## Verification

After running the migration, verify that:

1. Admin users can still access all functionality
2. Recruiter users have appropriate access for their role
3. No users have lost essential permissions
4. The permission UI shows detailed descriptions for each permission

## Notes

- This migration is **safe** and **reversible**
- No data loss will occur
- Existing user sessions will continue to work
- The migration only updates role permissions, not user-specific permissions

## Support

If you encounter any issues:
1. Check the rollback.sql file to revert changes
2. Verify your database connection and permissions
3. Ensure you have a backup before running the migration
