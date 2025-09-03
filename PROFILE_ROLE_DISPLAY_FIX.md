# Profile Role Display Fix

## Problem Description

The "Edit My Profile" modal was showing "No role assigned" for users who should have roles. This issue occurred because:

1. **Database Schema Migration**: The system migrated from junction tables (`User_UserGroup`) to direct foreign keys (`User.userGroupId`)
2. **Missing User Group Assignments**: Some users don't have a `userGroupId` set in the database
3. **Role Display Logic**: The profile modal was only looking for roles based on `userGroupIds` field, without fallback logic

## Root Cause

The profile modal displays roles by:
1. Looking up the user's group by `userGroupIds[0]` (which maps to `userGroupId`)
2. If no group is found, showing "No role assigned"

However, users might not have a `userGroupId` set due to:
- Incomplete database migrations
- Users created before the migration
- Missing default group assignments

## Solution Implemented

### 1. Enhanced Role Display Logic

Both `RedesignedUserModal` and `UnifiedUserModal` now include fallback logic:

```typescript
{(() => {
  // Try to find the user's group by ID first
  const userGroup = userGroups.find(g => g.id === field.value?.[0]);
  if (userGroup) {
    return userGroup.name;
  }
  
  // Fallback: try to find by role name if userGroupId is not set
  const currentRole = form.getValues('role');
  if (currentRole) {
    const roleBasedGroup = userGroups.find(g => 
      g.name.toLowerCase().includes(currentRole.toLowerCase()) ||
      currentRole.toLowerCase().includes(g.name.toLowerCase())
    );
    if (roleBasedGroup) {
      return roleBasedGroup.name;
    }
    return currentRole; // Show the role string if no matching group found
  }
  
  return 'No role assigned';
})()}
```

### 2. Loading States and Error Handling

Added proper loading states and error handling:
- Shows "Loading role..." while fetching user groups
- Shows "Unable to load roles" if user groups fail to load
- Graceful fallback to role string if no group match is found

### 3. Database Fix Script

Created `scripts/fix-user-group-assignments.js` to:
- Identify users without `userGroupId` assignments
- Assign them to appropriate groups based on their current role
- Fall back to default group if no role-based match is found

## Files Modified

1. **`src/components/users/RedesignedUserModal.tsx`**
   - Enhanced role display logic with fallbacks
   - Added loading states and error handling
   - Improved debugging with console logs

2. **`src/components/users/UnifiedUserModal.tsx`**
   - Applied the same role display logic improvements
   - Consistent behavior across both modal components

3. **`scripts/fix-user-group-assignments.js`** (New)
   - Database maintenance script to fix missing user group assignments
   - Can be run manually to resolve existing issues

## How to Use

### Immediate Fix (UI)
The UI improvements are already in place and will show roles correctly for most users.

### Database Fix (Recommended)
Run the database fix script to resolve underlying data issues:

```bash
node scripts/fix-user-group-assignments.js
```

This script will:
1. Check for users without group assignments
2. Assign them to appropriate groups based on their role
3. Use default groups as fallback
4. Provide detailed logging of all changes

## Testing

To verify the fix:

1. Open "Edit My Profile" modal
2. Check browser console for debug logs
3. Verify role is displayed correctly
4. If still showing "No role assigned", run the database fix script

## Prevention

To prevent this issue in the future:

1. **User Creation**: Ensure new users are always assigned to a user group
2. **Migration Scripts**: Run database migrations completely before deploying
3. **Data Validation**: Add checks to ensure all users have group assignments
4. **Default Groups**: Maintain a default user group for fallback scenarios

## Related Issues

This fix addresses the broader issue of user group management during the schema migration from junction tables to direct foreign keys. Similar issues may exist in other parts of the system that rely on user group relationships.
