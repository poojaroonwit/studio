# Permission System Migration Fix

## Overview
This document describes the fixes applied to resolve permission system issues in the Studio-9 application.

## Issues Identified
1. **Prisma Schema Issue**: The `User_UserGroup` junction table lacked proper foreign key relations to `User` and `UserGroup` models
2. **Database Query Issue**: Permission verification script was using non-existent `userGroupId` column
3. **Permission Alignment Issue**: Scripts failed due to schema mismatches

## Migration Order and Fixes

### 1. Schema Relations Fix
**Migration**: `20250902110000_add_user_usergroup_relations`
- Added foreign key constraints to `User_UserGroup` table
- Established proper CASCADE relationships for data integrity

**Changes**:
```sql
ALTER TABLE "User_UserGroup" ADD CONSTRAINT "User_UserGroup_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User_UserGroup" ADD CONSTRAINT "User_UserGroup_groupId_fkey" 
  FOREIGN KEY ("groupId") REFERENCES "UserGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### 2. Permission System Data Fix
**Migration**: `20250902100000_fix_permission_system_relations`
- Ensures all users have proper group assignments
- Cleans up orphaned User_UserGroup entries
- Fixes null permissions in UserGroup entries
- Aligns user roles with their effective permissions

### 3. Default Group Assignment Fix
**Migration**: `20250902120000_assign_default_groups_to_users`
- Creates default system groups (Administrators, Recruiters, Hiring Managers)
- Assigns users to appropriate groups based on their current role
- Ensures all users have at least one group assignment
- Establishes proper permission hierarchy

**Key Steps**:
1. Assign default groups to users without any group assignments
2. Clean up orphaned junction table entries
3. Ensure all groups have valid permissions arrays
4. Update user roles based on effective permissions from groups
5. Set default role for users without assignments

### 4. Script Fixes
**File**: `src/scripts/reset-permissions.ts`
- Fixed query to check for users without group assignments
- Removed reference to non-existent `userGroupId` column
- Updated to use proper junction table lookup

**File**: `src/scripts/initialize-warning-conditions.ts`
- Fixed column name from `"createdBy"` to `"created_by"` to match database schema

**Before**:
```sql
SELECT u.id, u.email, u."userGroupId"
FROM "User" u
WHERE u."userGroupId" IS NULL
```

**After**:
```sql
SELECT u.id, u.email
FROM "User" u
WHERE NOT EXISTS (
    SELECT 1 FROM "User_UserGroup" uug 
    WHERE uug."userId" = u.id
)
```

### 5. Prisma Schema Updates
**File**: `prisma/schema.prisma`
- Added proper relations to `User_UserGroup` model
- Added reverse relations to `User` and `UserGroup` models

**Changes**:
```prisma
model User_UserGroup {
  userId  String @db.Uuid
  groupId String @db.Uuid
  
  user   User     @relation("UserUserGroups", fields: [userId], references: [id], onDelete: Cascade)
  group  UserGroup @relation("UserGroupUsers", fields: [groupId], references: [id], onDelete: Cascade)

  @@id([userId, groupId])
  @@index([groupId])
  @@index([userId])
}

model User {
  // ... existing fields ...
  userGroups User_UserGroup[] @relation("UserUserGroups")
}

model UserGroup {
  // ... existing fields ...
  users User_UserGroup[] @relation("UserGroupUsers")
}
```

## Migration Execution Order
1. `20250902100000_fix_permission_system_relations` - Data fixes and cleanup
2. `20250902110000_add_user_usergroup_relations` - Schema constraint additions
3. `20250902120000_assign_default_groups_to_users` - Assign users to default groups

## Verification Steps
After applying these migrations:

1. **Check Relations**: Verify foreign key constraints are in place
2. **Check Data Integrity**: Ensure all users have group assignments
3. **Check Permissions**: Verify permission alignment scripts work correctly
4. **Test Application**: Confirm permission-based access control functions properly

## Next Steps
1. Apply migrations to the database using `npx prisma migrate deploy`
2. Regenerate Prisma client with `npx prisma generate`
3. Test permission scripts to ensure they work correctly
4. Verify application functionality with the fixed permission system

## Notes
- All migrations are backward compatible
- Foreign key constraints ensure data integrity
- Permission alignment logic now properly queries the junction table
- Scripts handle edge cases like users without group assignments
