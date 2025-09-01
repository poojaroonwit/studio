# Permission-Based Access Control Migration

## Overview

This migration updates the codebase to use permission-based access control from user groups instead of role-based access control, except for admin users who retain full system access.

## Key Changes

### 1. New Permission System (`src/lib/permissions.ts`)

Created a centralized permission checking system with the following functions:

- `hasPermission()` - Check if user has a specific permission
- `hasAnyPermission()` - Check if user has any of the specified permissions
- `hasAllPermissions()` - Check if user has all of the specified permissions
- `getUserPermissionDescription()` - Get human-readable permission description
- `PERMISSION_GROUPS` - Common permission groups for easier checking

### 2. Updated Core Authentication (`src/lib/auth.ts`)

- Updated `requireSessionAndPermission()` to use permission-based checks
- Admin users still have full access to everything
- Non-admin users are checked against their specific permissions

### 3. Updated API Endpoints

The following API endpoints have been updated to use the new permission system:

- `/api/auth/check-permissions` - Permission checking endpoint
- `/api/upload-queue/upload-file` - File upload permissions
- `/api/upload-queue` - Upload queue management
- `/api/positions/route` - Position creation
- `/api/positions/export` - Position export

### 4. Updated Frontend Components

The following frontend components have been updated:

- `src/app/settings/page.tsx` - Settings page access control
- `src/app/settings/layout.tsx` - Settings navigation access control
- `src/app/my-tasks/page.tsx` - Task board access control

### 5. Database Migration

Created migration scripts to ensure all users have proper user group assignments:

- `migration-ensure-user-groups.sql` - SQL migration script
- `scripts/migrate-to-permission-based.js` - Node.js migration script

## How It Works

### For Admin Users
- Admin users (`role === 'Admin'`) have full access to everything
- No permission checks are performed for admin users
- This maintains backward compatibility and administrative control

### For Non-Admin Users
- Access is controlled by permissions from their assigned user groups
- Permissions are loaded from the `UserGroup.permissions` array
- Users can be assigned to multiple groups, and permissions are merged
- Specific permission checks are performed for each action

### Permission Checking Examples

```typescript
// Check if user can create candidates
const canCreateCandidate = hasPermission(
  user.role,
  user.modulePermissions,
  'CANDIDATES_CREATE'
);

// Check if user can manage upload queue
const canManageUploadQueue = hasAnyPermission(
  user.role,
  user.modulePermissions,
  ['USERS_MANAGE', 'UPLOAD_QUEUE_MANAGE']
);

// Check if user has all required permissions for a complex operation
const canPerformComplexOperation = hasAllPermissions(
  user.role,
  user.modulePermissions,
  ['CANDIDATES_VIEW', 'CANDIDATES_EDIT_BASIC', 'POSITIONS_VIEW']
);
```

## Migration Steps

### 1. Run the Database Migration

```bash
# Option 1: Run the Node.js script
node scripts/migrate-to-permission-based.js

# Option 2: Run the SQL directly
psql -d your_database -f migration-ensure-user-groups.sql
```

### 2. Verify User Group Assignments

The migration script will:
- Show current user group assignments
- Find users without group assignments
- Assign users to appropriate groups based on their current role
- Update user roles for consistency
- Provide a final verification report

### 3. Test the New Permission System

After running the migration:
1. Test admin user access (should work as before)
2. Test non-admin user access (should be controlled by permissions)
3. Verify that users can only access features they have permissions for

## Benefits

### 1. Granular Control
- Fine-grained permission control instead of broad role-based access
- Users can have specific permissions without getting full role access
- More flexible permission assignments

### 2. Security
- Reduced risk of privilege escalation
- Clear separation between admin and non-admin access
- Audit trail for permission-based access

### 3. Maintainability
- Centralized permission checking logic
- Consistent permission checking across the codebase
- Easy to add new permissions or modify existing ones

### 4. Scalability
- Support for multiple user groups per user
- Easy to create custom permission sets
- Flexible permission inheritance

## Common Permission Groups

The system includes predefined permission groups for common use cases:

### Candidate Management
- `CANDIDATES_VIEW` - View candidates
- `CANDIDATES_CREATE` - Create candidates
- `CANDIDATES_EDIT_BASIC` - Edit basic candidate information
- `CANDIDATES_EDIT_SENSITIVE` - Edit sensitive candidate information
- `CANDIDATES_DELETE` - Delete candidates

### Position Management
- `POSITIONS_VIEW` - View positions
- `POSITIONS_CREATE` - Create positions
- `POSITIONS_EDIT_BASIC` - Edit basic position information
- `POSITIONS_EDIT_DETAILED` - Edit detailed position information
- `POSITIONS_DELETE` - Delete positions

### User Management
- `USERS_VIEW` - View users
- `USERS_CREATE` - Create users
- `USERS_EDIT` - Edit users
- `USERS_DELETE` - Delete users
- `USERS_PERMISSIONS_MANAGE` - Manage user permissions

### System Administration
- `SYSTEM_SETTINGS_VIEW` - View system settings
- `SYSTEM_SETTINGS_EDIT` - Edit system settings
- `LOGS_VIEW` - View system logs
- `LOGS_EXPORT` - Export system logs
- `UPLOAD_QUEUE_MANAGE` - Manage upload queue

## Backward Compatibility

The migration maintains full backward compatibility:

1. **Admin users** continue to have full access as before
2. **Existing user roles** are preserved and mapped to appropriate permissions
3. **API endpoints** continue to work with the same authentication
4. **Frontend components** continue to function with the same user experience

## Troubleshooting

### Users Can't Access Features They Should Have

1. Check if the user is assigned to the correct user group
2. Verify that the user group has the required permissions
3. Check the user's `modulePermissions` in the session
4. Ensure the permission check is using the correct permission name

### Permission Checks Not Working

1. Verify that the `hasPermission()` function is imported correctly
2. Check that the permission name matches exactly (case-sensitive)
3. Ensure the user's session includes `modulePermissions`
4. Check the database for user group assignments

### Migration Issues

1. Run the migration script in a test environment first
2. Check the migration logs for any errors
3. Verify that all users have group assignments after migration
4. Test with different user types to ensure proper access control

## Future Enhancements

### 1. Dynamic Permission Groups
- Allow creation of custom permission groups
- Support for permission inheritance
- Hierarchical permission structures

### 2. Permission Auditing
- Track permission changes over time
- Audit logs for permission-based access
- Permission usage analytics

### 3. Advanced Permission Features
- Time-based permissions
- Conditional permissions based on data
- Permission delegation between users

## Conclusion

This migration successfully transforms the codebase from role-based to permission-based access control while maintaining full backward compatibility for admin users. The new system provides better security, flexibility, and maintainability while ensuring a smooth transition for existing users.
