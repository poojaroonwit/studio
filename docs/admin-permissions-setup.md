# Admin Role Permissions Setup

## Overview

This document explains how the admin role permissions are configured to ensure full system access. The admin role should have **all available permissions** defined in the system.

## Current Status

✅ **Admin role has all 36 available permissions**
✅ **Admin user direct permissions are correctly set**
✅ **Database initialization and seed files updated**

## Available Permissions (36 total)

### Candidate Management (10 permissions)
- `CANDIDATES_VIEW` - View candidate profiles and lists
- `CANDIDATES_MANAGE` - Add, edit, and delete candidate profiles
- `CANDIDATES_IMPORT` - Bulk import candidate data
- `CANDIDATES_EXPORT` - Bulk export candidate data
- `CANDIDATES_COMMENTS` - Manage candidate comments and attachments
- `CANDIDATES_RESUMES` - Upload and manage candidate resumes
- `CANDIDATES_TRANSITIONS` - Change candidate status and manage pipeline
- `CANDIDATES_RECRUITER_ASSIGN` - Assign candidates to recruiters
- `TASK_BOARD_VIEW` - View task board for candidate workflow
- `TASK_BOARD_MANAGE_ALL` - Manage all tasks across all recruiters

### Position Management (4 permissions)
- `POSITIONS_VIEW` - View job position details and lists
- `POSITIONS_MANAGE` - Add, edit, and delete job positions
- `POSITIONS_IMPORT` - Bulk import position data
- `POSITIONS_EXPORT` - Bulk export position data

### User Access Control (3 permissions)
- `USERS_MANAGE` - Manage user accounts and direct permissions
- `USER_GROUPS_MANAGE` - Manage user groups (roles) and permissions


### System Configuration (6 permissions)
- `SYSTEM_SETTINGS_MANAGE` - Manage global system settings
- `USER_PREFERENCES_MANAGE` - Manage own UI display preferences
- `RECRUITMENT_STAGES_MANAGE` - Manage recruitment pipeline stages
- `CUSTOM_FIELDS_MANAGE` - Define custom data fields
- `WEBHOOK_MAPPING_MANAGE` - Create and manage webhook integrations
- `AI_INTEGRATION_MANAGE` - Configure AI services

### Upload & Automation (3 permissions)
- `UPLOAD_QUEUE_MANAGE` - Manage file upload queue and processing
- `AUTOMATION_UPLOAD` - Use automation features for bulk uploads
- `BULK_UPLOAD` - Bulk upload candidate resumes and files

### Logging & Audit (3 permissions)
- `LOGS_VIEW` - View system and audit logs
- `AUDIT_LOGS_VIEW` - View detailed audit logs
- `WEBHOOK_LOGS_VIEW` - View webhook delivery logs

### Analytics & Reporting (3 permissions)
- `DASHBOARD_VIEW` - View main dashboard with analytics
- `ANALYTICS_VIEW` - View detailed analytics and reports
- `WEBHOOK_ANALYTICS_VIEW` - View webhook performance analytics

### Department Management (4 permissions)
- `HR_DEPARTMENT_MANAGE` - Full HR department management
- `IT_DEPARTMENT_MANAGE` - Full IT department management
- `FINANCE_DEPARTMENT_MANAGE` - Full Finance department management
- `MARKETING_DEPARTMENT_MANAGE` - Full Marketing department management

## Files Updated

### Database Files
- `prisma/init-db.sql` - Updated admin user permissions
- `prisma/seed.ts` - Updated admin user permissions

### Scripts Created
- `scripts/update-admin-permissions.js` - Script to update admin permissions
- `scripts/verify-admin-permissions.js` - Script to verify admin permissions

## How to Update Admin Permissions

### For New Installations
The admin role will automatically have all permissions when:
1. Running `prisma db push` with the updated `init-db.sql`
2. Running `npm run seed` with the updated `seed.ts`

### For Existing Installations
Run the update script to ensure admin has all permissions:

```bash
node scripts/update-admin-permissions.js
```

### To Verify Permissions
Run the verification script to check admin permissions:

```bash
node scripts/verify-admin-permissions.js
```

## Permission Inheritance

The admin role uses a dual permission system:

1. **User Group Permissions**: Admin users inherit permissions from the "Admin" user group
2. **Direct User Permissions**: Admin users also have direct permissions assigned

This ensures that admin users have full access even if there are issues with group membership.

## Troubleshooting

### Missing Permissions
If admin users don't have access to certain features:

1. Run the verification script to check current permissions
2. Run the update script to add missing permissions
3. Check if the permission is properly defined in `src/lib/types.ts`

### Outdated Permissions
If there are outdated permissions (like the old `TASK_BOARD_MANAGE`):

1. The update script will automatically remove outdated permissions
2. Only permissions defined in `PLATFORM_MODULES` will be kept

### Permission Conflicts
If there are conflicts between group and direct permissions:

1. Direct user permissions take precedence
2. The admin role should have both group and direct permissions set correctly

## Security Considerations

- Admin role has full system access
- Admin users can manage all other users and their permissions
- Admin users can access all system logs and audit trails
- Admin users can configure all system settings and integrations

## Future Updates

When adding new permissions to the system:

1. Add the permission to `PLATFORM_MODULES` in `src/lib/types.ts`
2. Update the `ALL_PERMISSIONS` array in the scripts
3. Run the update script to add the permission to admin role
4. Update this documentation

## Verification Commands

```bash
# Check current admin permissions
node scripts/verify-admin-permissions.js

# Update admin permissions if needed
node scripts/update-admin-permissions.js

# Verify again after update
node scripts/verify-admin-permissions.js
```

## Expected Output

When everything is correctly configured, you should see:

```
🔍 Verifying admin role permissions...
📋 Total available permissions: 36
📋 Admin group permissions count: 36

📊 PERMISSION VERIFICATION SUMMARY:
=====================================
✅ Admin role has exactly the right permissions
✅ Permission count matches expected: 36 / 36
✅ Admin user direct permissions are correct

🎉 Verification complete!
```
