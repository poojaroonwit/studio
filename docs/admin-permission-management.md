# Admin Permission Management System

## Overview

The admin permission management system allows admin users to adjust their own permissions while maintaining security for critical system functions. This feature ensures that admin users can customize their access levels while preventing them from accidentally removing essential permissions that could lock them out of the system.

## Key Features

### 🔐 **Self-Permission Management**
- Admin users can modify their own permissions through the user profile interface
- A dedicated "Permissions" tab is available when admin users edit their own profile
- Visual indicators show which permissions are protected and cannot be removed

### 🛡️ **Security Protections**
- Critical permissions (`USERS_MANAGE`, `USER_GROUPS_MANAGE`) are protected and cannot be removed
- Clear visual warnings and explanations about protected permissions
- Server-side validation prevents removal of critical permissions
- Comprehensive audit logging for all permission changes

### 🎯 **Flexible Permission Control**
- Admin users can add or remove non-critical permissions
- Permission changes take effect immediately
- Individual permissions can be toggled on/off as needed
- Support for all 36 available system permissions

## How to Use

### Accessing Permission Management

1. **Navigate to User Management**:
   - Go to **Settings** → **Manage Users**
   - Or navigate to `/settings/users`

2. **Edit Your Own Profile**:
   - Find your user account in the list
   - Click the **"Edit"** button (three dots menu → Edit User)

3. **Access Permissions Tab**:
   - In the edit modal, you'll see a **"Permissions"** tab (only visible to admin users editing their own profile)
   - Click on the **"Permissions"** tab to access permission management

### Managing Permissions

1. **View Current Permissions**:
   - See all your current permissions organized by category
   - Protected permissions are clearly marked with a "Protected" badge

2. **Add Permissions**:
   - Check the boxes for permissions you want to add
   - Permissions are organized by category for easy navigation

3. **Remove Permissions**:
   - Uncheck the boxes for permissions you want to remove
   - Protected permissions cannot be unchecked (checkbox is disabled)

4. **Save Changes**:
   - Click **"Save Changes"** to apply your permission modifications
   - Changes take effect immediately

## Protected Permissions

The following permissions are protected and cannot be removed from admin accounts:

### USERS_MANAGE
- **Purpose**: Allows managing user accounts and their direct permissions
- **Protection Reason**: Essential for user management functionality
- **Impact if Removed**: Would prevent creating, editing, or deleting users

### USER_GROUPS_MANAGE
- **Purpose**: Allows managing user groups (roles) and their assigned permissions
- **Protection Reason**: Critical for role and permission management
- **Impact if Removed**: Would prevent managing roles and group permissions

## Visual Indicators

### Protected Permission Indicators
- **"Protected" Badge**: Orange badge next to protected permission names
- **Disabled Checkbox**: Protected permissions show disabled checkboxes when selected
- **Warning Message**: Clear explanation that protected permissions cannot be removed
- **Security Notice**: Prominent warning box explaining the protection system

### Permission Categories
Permissions are organized into logical categories:
- **Candidate Management**: All candidate-related permissions
- **Position Management**: Job position management permissions
- **User Access Control**: User and role management permissions
- **System Configuration**: System settings and preferences
- **Upload & Automation**: File upload and automation features
- **Logging & Audit**: System logs and audit trail access
- **Analytics & Reporting**: Dashboard and analytics access
- **Department Management**: Department-specific permissions

## Security Considerations

### Server-Side Protection
- All permission changes are validated on the server
- Protected permissions cannot be removed even through API calls
- Comprehensive audit logging tracks all permission modifications
- Session validation ensures only authorized users can modify permissions

### Audit Logging
All permission changes are logged with:
- **User ID**: Who made the change
- **Target User**: Whose permissions were modified
- **Changes Made**: Specific permissions added/removed
- **Timestamp**: When the change occurred
- **Security Level**: WARN level for attempted protected permission removal

### Error Handling
- Clear error messages for attempted protected permission removal
- Graceful handling of permission conflicts
- User-friendly feedback for all permission operations

## API Endpoints

### User Update Endpoint
- **URL**: `PUT /api/users/{id}`
- **Permission Check**: Validates user can modify target user
- **Protected Permission Check**: Prevents removal of critical permissions
- **Audit Logging**: Logs all permission changes

### Permission Validation
- **Critical Permissions**: `USERS_MANAGE`, `USER_GROUPS_MANAGE`
- **Validation Logic**: Server-side checks prevent removal of protected permissions
- **Error Response**: Clear error message for attempted violations

## Best Practices

### For Admin Users
1. **Review Current Permissions**: Regularly check your current permissions
2. **Minimize Permissions**: Only keep permissions you actually need
3. **Test Changes**: Verify functionality after permission changes
4. **Document Changes**: Keep track of permission modifications

### For System Administrators
1. **Monitor Audit Logs**: Regularly review permission change logs
2. **Backup Permissions**: Keep records of admin permission configurations
3. **Emergency Access**: Maintain emergency access procedures
4. **Regular Reviews**: Periodically review admin permission assignments

## Troubleshooting

### Common Issues

#### "Cannot remove critical permissions" Error
- **Cause**: Attempting to remove `USERS_MANAGE` or `USER_GROUPS_MANAGE`
- **Solution**: These permissions are protected and cannot be removed
- **Workaround**: Contact system administrator if you need to modify these permissions

#### Permissions Tab Not Visible
- **Cause**: Not an admin user or not editing your own profile
- **Solution**: Only admin users can see the permissions tab when editing their own profile
- **Alternative**: Use role management to modify permissions through groups

#### Permission Changes Not Taking Effect
- **Cause**: Browser cache or session issues
- **Solution**: Refresh the page or log out and log back in
- **Verification**: Check the permissions tab to confirm changes

### Emergency Recovery
If an admin user accidentally removes too many permissions:

1. **Database Recovery**: Restore from backup if available
2. **Direct Database Update**: Manually update user permissions in database
3. **Admin Override**: Use another admin account (e.g., admin@qsncc.com) to restore permissions
4. **System Reset**: As last resort, reset admin permissions to defaults

## Future Enhancements

### Planned Features
- **Permission Templates**: Predefined permission sets for common roles
- **Bulk Permission Management**: Modify multiple users' permissions at once
- **Permission History**: Track permission changes over time
- **Advanced Validation**: More granular permission dependency checking

### Security Improvements
- **Two-Factor Authentication**: Require 2FA for permission changes
- **Approval Workflow**: Require approval for critical permission changes
- **Time-Limited Permissions**: Temporary permission grants
- **Permission Analytics**: Usage tracking for permissions

## Technical Implementation

### Frontend Components
- **UnifiedUserModal**: Main user editing interface with permissions tab
- **RolePermissionSelector**: Permission selection component with protection support
- **Protected Permission UI**: Visual indicators for protected permissions

### Backend API
- **Permission Validation**: Server-side checks for protected permissions
- **Audit Logging**: Comprehensive logging of all permission changes
- **Session Management**: Secure session handling for permission operations

### Database Schema
- **User Permissions**: Stored in `User.module_permissions` array
- **Protected Permissions**: Defined in application logic
- **Audit Trail**: Stored in `AuditLog` table with detailed change tracking
