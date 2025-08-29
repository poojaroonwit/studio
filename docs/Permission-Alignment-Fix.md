# Permission Alignment Fix

## Overview

This document describes the permission alignment issues found in the system and provides scripts to fix them. The main issues were:

1. **Undefined permissions being used** in code that don't exist in `PLATFORM_MODULES`
2. **Inconsistent permission usage** across different components
3. **Missing permission mappings** for deprecated broad permissions

## Issues Found

### 1. Undefined Permissions

The following permissions were being used in code but are not defined in `PLATFORM_MODULES`:

- `USERS_MANAGE` - Should be mapped to specific user management permissions
- `AUTOMATION_UPLOAD` - Should be mapped to `BULK_UPLOAD_EXECUTE`
- `WEBHOOK_MAPPING_MANAGE` - Should be mapped to `WEBHOOKS_EDIT`

### 2. Permission Mapping

The following broad permissions should be mapped to specific granular permissions:

| Old Permission | New Permissions |
|----------------|-----------------|
| `USERS_MANAGE` | `USERS_VIEW`, `USERS_CREATE`, `USERS_EDIT`, `USERS_DELETE`, `USERS_PERMISSIONS_MANAGE` |
| `AUTOMATION_UPLOAD` | `BULK_UPLOAD_EXECUTE` |
| `WEBHOOK_MAPPING_MANAGE` | `WEBHOOKS_EDIT` |
| `CANDIDATES_MANAGE` | `CANDIDATES_VIEW`, `CANDIDATES_CREATE`, `CANDIDATES_EDIT_BASIC`, `CANDIDATES_EDIT_SENSITIVE` |
| `POSITIONS_MANAGE` | `POSITIONS_VIEW`, `POSITIONS_CREATE`, `POSITIONS_EDIT_BASIC`, `POSITIONS_EDIT_DETAILED` |
| `USER_GROUPS_MANAGE` | `USER_GROUPS_VIEW`, `USER_GROUPS_CREATE`, `USER_GROUPS_EDIT`, `USER_GROUPS_DELETE` |

## Valid Permissions

The system now uses 50+ granular permissions organized into categories:

### Candidate Management (19 permissions)
- `CANDIDATES_VIEW` - View candidate profiles and lists
- `CANDIDATES_VIEW_DETAILED` - View sensitive candidate information
- `CANDIDATES_CREATE` - Create new candidate profiles
- `CANDIDATES_EDIT_BASIC` - Edit basic candidate information
- `CANDIDATES_EDIT_SENSITIVE` - Edit sensitive candidate data
- `CANDIDATES_DELETE` - Delete candidate profiles
- `CANDIDATES_SOURCE_ASSIGN` - Assign candidate source
- `CANDIDATES_SOURCE_ASSIGN_BULK` - Bulk source assignment
- `CANDIDATES_RECRUITER_ASSIGN` - Assign candidates to recruiters
- `CANDIDATES_RECRUITER_ASSIGN_BULK` - Bulk recruiter assignment
- `CANDIDATES_PIPELINE_STAGE_UPDATE` - Update candidate pipeline stage
- `CANDIDATES_PIPELINE_STAGE_BULK_UPDATE` - Bulk pipeline stage updates
- `CANDIDATES_RESUMES_UPLOAD` - Upload candidate resumes
- `CANDIDATES_RESUMES_DELETE` - Delete candidate documents
- `CANDIDATES_COMMENTS_VIEW` - View candidate comments
- `CANDIDATES_COMMENTS_ADD` - Add candidate comments
- `CANDIDATES_COMMENTS_EDIT` - Edit candidate comments
- `CANDIDATES_IMPORT` - Import candidate data
- `CANDIDATES_EXPORT` - Export candidate data

### Position Management (8 permissions)
- `POSITIONS_VIEW` - View job positions
- `POSITIONS_CREATE` - Create job positions
- `POSITIONS_EDIT_BASIC` - Edit basic position information
- `POSITIONS_EDIT_DETAILED` - Edit detailed position information
- `POSITIONS_RECRUITER_ASSIGN` - Assign recruiters to positions
- `POSITIONS_DELETE` - Delete job positions
- `POSITIONS_IMPORT` - Import position data
- `POSITIONS_EXPORT` - Export position data

### User Access Control (8 permissions)
- `USERS_VIEW` - View user accounts
- `USERS_CREATE` - Create user accounts
- `USERS_EDIT` - Edit user accounts
- `USERS_DELETE` - Delete user accounts
- `USERS_PERMISSIONS_MANAGE` - Manage user permissions
- `USER_GROUPS_VIEW` - View user groups/roles
- `USER_GROUPS_CREATE` - Create user groups/roles
- `USER_GROUPS_EDIT` - Edit user groups/roles
- `USER_GROUPS_DELETE` - Delete user groups/roles

### System Configuration (6 permissions)
- `SYSTEM_SETTINGS_VIEW` - View system settings
- `SYSTEM_SETTINGS_EDIT` - Edit system settings
- `RECRUITMENT_STAGES_VIEW` - View recruitment stages
- `RECRUITMENT_STAGES_EDIT` - Edit recruitment stages
- `CUSTOM_FIELDS_VIEW` - View custom fields
- `CUSTOM_FIELDS_EDIT` - Edit custom fields

### Automation & Integration (7 permissions)
- `WEBHOOKS_VIEW` - View webhook configurations
- `WEBHOOKS_EDIT` - Edit webhook configurations
- `AI_INTEGRATION_VIEW` - View AI integration settings
- `AI_INTEGRATION_EDIT` - Edit AI integration settings
- `UPLOAD_QUEUE_VIEW` - View upload queue
- `UPLOAD_QUEUE_MANAGE` - Manage upload queue
- `BULK_UPLOAD_EXECUTE` - Execute bulk uploads

### Analytics & Reporting (3 permissions)
- `DASHBOARD_VIEW` - View dashboard analytics
- `REPORTS_GENERATE` - Generate reports
- `WEBHOOK_ANALYTICS_VIEW` - View webhook analytics

### Logging & Audit (3 permissions)
- `LOGS_VIEW` - View system logs
- `LOGS_EXPORT` - Export system logs
- `APP_PERFORMANCE_VIEW` - View performance metrics

### Task Management (3 permissions)
- `TASK_BOARD_VIEW` - View task board
- `TASK_BOARD_MANAGE_OWN` - Manage own tasks
- `TASK_BOARD_MANAGE_ALL` - Manage all tasks

### Job Matching (2 permissions)
- `JOB_MATCH_VIEW` - View job matches
- `JOB_MATCH_MANAGE` - Manage job matches

### Warning System (2 permissions)
- `WARNING_CONFIGURATIONS_VIEW` - View warning configurations
- `WARNING_CONFIGURATIONS_MANAGE` - Manage warning configurations

### User Preferences (2 permissions)
- `USER_PREFERENCES_MANAGE_OWN` - Manage own preferences
- `USER_PREFERENCES_MANAGE_ALL` - Manage all user preferences

## Fix Scripts

### 1. Database Migration Script

**File**: `scripts/fix-permission-alignment.js`

This script fixes the database by:
- Removing undefined permissions from user groups and users
- Mapping deprecated permissions to valid ones
- Ensuring the Admin group has all valid permissions
- Providing a detailed report of changes

**Usage**:
```bash
node scripts/fix-permission-alignment.js
```

**What it does**:
1. Analyzes all user groups and users
2. Identifies invalid permissions
3. Maps deprecated permissions to valid ones
4. Updates the database
5. Provides a summary of changes

### 2. Code Reference Fix Script

**File**: `scripts/fix-permission-references.js`

This script automatically updates permission references in the codebase:
- Replaces undefined permission checks with valid ones
- Updates permission arrays to use correct permissions
- Maintains proper OR conditions for multiple permissions

**Usage**:
```bash
node scripts/fix-permission-references.js
```

**What it does**:
1. Processes all relevant TypeScript/JavaScript files
2. Replaces undefined permission references
3. Creates proper permission check conditions
4. Provides a detailed report of changes

## Manual Fixes Required

After running the scripts, you may need to manually review and fix:

### 1. Complex Permission Logic

Some components have complex permission logic that may need manual adjustment:

```typescript
// Before (incorrect)
const canManageUsers = session?.user?.modulePermissions?.includes('USERS_MANAGE');

// After (correct)
const canManageUsers = session?.user?.modulePermissions?.includes('USERS_VIEW') ||
                      session?.user?.modulePermissions?.includes('USERS_CREATE') ||
                      session?.user?.modulePermissions?.includes('USERS_EDIT') ||
                      session?.user?.modulePermissions?.includes('USERS_DELETE') ||
                      session?.user?.modulePermissions?.includes('USERS_PERMISSIONS_MANAGE');
```

### 2. API Endpoints

Some API endpoints may need permission updates:

```typescript
// Before
if (!session.user.modulePermissions?.includes('USERS_MANAGE')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// After
const hasUserPermission = session.user.modulePermissions?.includes('USERS_VIEW') ||
                         session.user.modulePermissions?.includes('USERS_CREATE') ||
                         session.user.modulePermissions?.includes('USERS_EDIT') ||
                         session.user.modulePermissions?.includes('USERS_DELETE') ||
                         session.user.modulePermissions?.includes('USERS_PERMISSIONS_MANAGE');

if (!hasUserPermission) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Testing

After applying the fixes, test the following:

1. **User Management**: Ensure users can be created, edited, and deleted with appropriate permissions
2. **Role Management**: Verify that role permissions work correctly
3. **Candidate Management**: Test candidate operations with different permission levels
4. **Position Management**: Verify position operations work with granular permissions
5. **Task Board**: Ensure task board access works for recruiters
6. **Settings Access**: Test settings page access with different permissions

## Rollback Plan

If issues occur, you can rollback by:

1. **Database**: Restore from backup before running the migration script
2. **Code**: Use git to revert the changes made by the reference fix script
3. **Manual**: Manually revert specific permission changes if needed

## Best Practices

### 1. Permission Naming

- Use descriptive, specific permission names
- Follow the pattern: `MODULE_ACTION` (e.g., `CANDIDATES_VIEW`)
- Group related permissions by module

### 2. Permission Checks

- Always check for specific permissions rather than broad ones
- Use OR conditions for multiple related permissions
- Consider creating helper functions for complex permission checks

### 3. Documentation

- Document all permissions in `PLATFORM_MODULES`
- Include detailed descriptions and risk levels
- Keep permission documentation up to date

### 4. Testing

- Test permission changes thoroughly
- Use different user roles to verify access control
- Test both positive and negative permission scenarios

## Conclusion

The permission alignment fix ensures that:

1. All permissions used in code are properly defined
2. Permissions are granular and specific
3. The system maintains proper access control
4. Future permission changes are easier to manage

By following this guide and using the provided scripts, you can successfully align all permissions in your system and maintain a clean, secure permission structure.
