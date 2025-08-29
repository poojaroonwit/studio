# Permission Audit Fix - Recruiter Candidate Card Visibility

## Issue Summary

Recruiters were unable to see candidate cards due to critical permission logic errors in the API endpoints and frontend components. The issues were caused by incorrect boolean logic in permission checks and wrong permission references that prevented users with proper permissions from accessing candidate data.

## Root Cause Analysis

### The Problem
The permission checking logic in several API endpoints was using `||` (OR) instead of `&&` (AND) in the permission validation:

**Incorrect Logic:**
```typescript
if (
  session.user.role !== 'Admin' ||
  !session.user.modulePermissions?.includes(requiredPermission)
) {
  // Deny access
}
```

**What this meant:**
- If user is NOT Admin OR doesn't have the permission → Deny access
- A Recruiter with `CANDIDATES_VIEW` permission would be denied because they are NOT Admin
- Only Admins would be allowed, regardless of their specific permissions

### Correct Logic
```typescript
if (
  session.user.role !== 'Admin' &&
  !session.user.modulePermissions?.includes(requiredPermission)
) {
  // Deny access
}
```

**What this means:**
- If user is NOT Admin AND doesn't have the permission → Deny access
- A Recruiter with `CANDIDATES_VIEW` permission would be allowed
- An Admin would be allowed regardless of specific permissions
- Only users without Admin role AND without the specific permission would be denied

## Files Fixed

### 1. API Endpoints with Permission Logic Errors

#### `src/app/api/candidates/route.ts`
- **Issue**: `requireSessionAndPermission` function had incorrect `||` logic
- **Impact**: Recruiters with `CANDIDATES_VIEW` permission were denied access to candidate data
- **Fix**: Changed `||` to `&&` in permission check

#### `src/app/api/candidates/fit-score-counts/route.ts`
- **Issue**: Same permission logic error in fit score counts endpoint
- **Impact**: Recruiters couldn't access fit score statistics
- **Fix**: Changed `||` to `&&` in permission check

#### `src/app/api/settings/recruitment-stages/reorder/route.ts`
- **Issue**: Permission check for recruitment stage reordering
- **Impact**: Users with `RECRUITMENT_STAGES_MANAGE` permission couldn't reorder stages
- **Fix**: Changed `||` to `&&` in permission check

#### `src/app/api/v1/candidates/bulk-upload-cv/route.ts`
- **Issue**: Permission check for bulk CV upload
- **Impact**: Users with `BULK_UPLOAD_EXECUTE` permission couldn't upload CVs
- **Fix**: Changed `||` to `&&` in permission check

### 2. Frontend Components with Wrong Permission References

#### `src/components/dashboard/DashboardPageClient.tsx`
- **Issue**: Checking for user management permissions (`USERS_VIEW`, `USERS_CREATE`, etc.) to determine candidate visibility
- **Impact**: Recruiters with `CANDIDATES_VIEW` permission couldn't see candidates because they lacked user management permissions
- **Fix**: Changed to check for `CANDIDATES_VIEW` permission directly
- **Additional Fix**: Removed incorrect `session?.user?.session?.user` references

#### `src/components/layout/SidebarNav.tsx`
- **Issue**: Checking for user management permissions to determine access to "My Task Board"
- **Impact**: Users with `TASK_BOARD_VIEW` permission couldn't access task board
- **Fix**: Changed to check for `TASK_BOARD_VIEW` and `CANDIDATES_VIEW` permissions

#### `src/components/users/UnifiedUserModal.tsx`
- **Issue**: Incorrect `session?.user?.session?.user?.modulePermissions` reference
- **Impact**: User management permissions weren't being checked correctly
- **Fix**: Removed incorrect nested session reference

## Permission System Overview

### How Permissions Work
1. **Admin Role**: Has access to everything regardless of specific permissions
2. **Specific Permissions**: Users with specific module permissions can access those features
3. **No Permissions**: Users without Admin role and without specific permissions are denied

### Key Candidate Permissions
- `CANDIDATES_VIEW`: View candidate information (required for seeing candidate cards)
- `CANDIDATES_CREATE`: Create new candidates
- `CANDIDATES_EDIT_BASIC`: Edit basic candidate information
- `CANDIDATES_EDIT_SENSITIVE`: Edit sensitive candidate data
- `CANDIDATES_DELETE`: Delete candidates
- `CANDIDATES_EXPORT`: Export candidate data
- `CANDIDATES_IMPORT`: Import candidate data

### Recruiter Default Permissions
Recruiters typically have:
- ✅ `CANDIDATES_VIEW` - Can view candidates
- ✅ `CANDIDATES_EDIT_BASIC` - Can edit basic information
- ✅ `CANDIDATES_RECRUITER_ASSIGN` - Can assign candidates to themselves
- ❌ `CANDIDATES_DELETE` - Cannot delete candidates
- ❌ `CANDIDATES_EXPORT` - Cannot export data

## Testing the Fix

### Before Fix
- Recruiters with `CANDIDATES_VIEW` permission received 403 Forbidden errors
- Candidate cards were not visible in the UI
- API calls to `/api/candidates` returned permission errors
- Task board access was incorrectly restricted
- User management features had permission checking issues

### After Fix
- Recruiters with `CANDIDATES_VIEW` permission can now see candidate cards
- API calls work correctly for users with proper permissions
- Task board access works for users with appropriate permissions
- Permission system functions as intended across all components

## Verification Steps

1. **Check Recruiter Permissions**: Ensure recruiters have `CANDIDATES_VIEW` permission
2. **Test API Access**: Verify `/api/candidates` endpoint works for recruiters
3. **UI Verification**: Confirm candidate cards are visible in the dashboard
4. **Task Board Access**: Verify users with `TASK_BOARD_VIEW` can access task board
5. **Permission Audit**: Review other permission checks for similar issues

## Prevention Measures

1. **Code Review**: Always review permission logic for correct boolean operators
2. **Testing**: Test with different user roles and permission combinations
3. **Documentation**: Document expected permission behavior
4. **Automated Tests**: Add unit tests for permission scenarios
5. **Permission Reference**: Always use `session?.user?.modulePermissions` not nested session references

## Related Documentation

- `PERMISSION_SYSTEM_OVERVIEW.md` - General permission system documentation
- `PERMISSION_FIX_SUMMARY.md` - Previous permission fixes
- `docs/Detailed-Permission-System-Implementation.md` - Detailed implementation guide

## Status

✅ **FIXED** - All identified permission logic errors have been corrected
✅ **TESTED** - Changes have been applied and tested
✅ **DOCUMENTED** - This audit and fix has been documented

---

**Date**: December 2024
**Issue**: Recruiter candidate card visibility and permission system audit
**Resolution**: Fixed permission logic in API endpoints and frontend components
**Impact**: Recruiters can now see candidate cards with proper permissions, task board access works correctly, and user management permissions are properly enforced
