# User Role Assignment Fix

## Issue Description

The system had a mismatch between the `User.role` field and the `User_UserGroup` table assignments. Users had their `role` field set to "Recruiter" but were not assigned to the Recruiter group in the `User_UserGroup` table, causing the role & permission table to show 0 users for the Recruiter role.

## Root Cause

The system uses two different mechanisms for managing user roles:

1. **User.role field** - A simple string field in the User table (e.g., "Recruiter", "Admin", "Hiring Manager")
2. **User_UserGroup table** - A many-to-many relationship table that links users to user groups (roles)

The user count in the role & permission table is calculated from the `User_UserGroup` table, not the `User.role` field. When users were created or updated, their `role` field was set correctly, but they weren't automatically assigned to the corresponding group in the `User_UserGroup` table.

## Solution

### 1. Fixed Existing Users

Created and ran a script (`scripts/fix-user-role-assignments.js`) that:
- Identified all users with mismatched role assignments
- Automatically assigned users to the correct group based on their `role` field
- Fixed 6 users who had "Recruiter" role but weren't in the Recruiter group

### 2. Prevented Future Issues

Updated the user creation API (`src/app/api/users/route.ts`) to automatically assign users to the appropriate group when they are created, based on their role:

```typescript
// Define role to group ID mappings
const roleToGroupId = {
  'Admin': '00000000-0000-0000-0000-000000000001',
  'Recruiter': '00000000-0000-0000-0000-000000000002',
  'Hiring Manager': '00000000-0000-0000-0000-000000000003'
};

// Assign user to the appropriate group based on role
userGroups: roleToGroupId[role] ? {
  create: {
    groupId: roleToGroupId[role]
  }
} : undefined,
```

## Scripts Created

### 1. Diagnostic Script: `scripts/check-user-role-assignments.js`

This script checks the current state of user role assignments and reports:
- Users with correct assignments
- Users with mismatched assignments
- User group counts
- Summary statistics

**Usage:**
```bash
node scripts/check-user-role-assignments.js
```

### 2. Fix Script: `scripts/fix-user-role-assignments.js`

This script automatically fixes mismatched user role assignments by:
- Identifying users with incorrect group assignments
- Assigning them to the correct group based on their `role` field
- Providing detailed logging of the fix process
- Verifying the results

**Usage:**
```bash
node scripts/fix-user-role-assignments.js
```

## Role to Group Mappings

| Role | Group ID | Group Name |
|------|----------|------------|
| Admin | 00000000-0000-0000-0000-000000000001 | Admin |
| Recruiter | 00000000-0000-0000-0000-000000000002 | Recruiter |
| Hiring Manager | 00000000-0000-0000-0000-000000000003 | Hiring Manager |

## Verification

After running the fix script, the user group counts should be:
- **Admin**: 1 user
- **Recruiter**: 6 users  
- **Hiring Manager**: 0 users

## Prevention

To prevent this issue from recurring:

1. **New User Creation**: The API now automatically assigns users to the correct group
2. **Role Updates**: When updating a user's role, ensure they are also assigned to the corresponding group
3. **Regular Checks**: Run the diagnostic script periodically to identify any new mismatches

## Related Files

- `scripts/check-user-role-assignments.js` - Diagnostic script
- `scripts/fix-user-role-assignments.js` - Fix script
- `src/app/api/users/route.ts` - Updated user creation API
- `src/app/api/settings/user-groups/route.ts` - User groups API (calculates user counts)
- `prisma/schema.prisma` - Database schema with User and UserGroup models
