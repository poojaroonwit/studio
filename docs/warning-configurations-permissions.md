# Warning Configurations Permission System

## Overview

The Warning Configurations feature now has a comprehensive permission system that controls access to manage warning configurations for other users. This allows for more granular control beyond just admin access.

## Permission

### WARNING_CONFIGURATIONS_MANAGE
- **Description**: Allows managing warning configurations for all users
- **Access Level**: Full access to create, edit, delete, and manage warning configurations for any user
- **Default Assignment**: 
  - Admin users (automatically assigned)
  - Can be manually assigned to other users

## How Access Works

### Current User Access
- **All users** can always access their own warning configurations
- Access via: Avatar Popover → "Warning Configurations"

### Other Users Access
- **Admin users**: Can access any user's warning configurations
- **Users with WARNING_CONFIGURATIONS_MANAGE permission**: Can access any user's warning configurations
- **Regular users**: Cannot access other users' warning configurations
- Access via: User Settings → User dropdown → "Warning Configurations"

## How to Assign Permissions

### 🔧 **Role Settings (User Groups)**

1. **Navigate to Role Settings**:
   - Go to **Settings** → **Roles & Permissions**
   - Or navigate to `/settings/user-groups`

2. **Select a Role**:
   - Click on any role (Admin, Recruiter, Hiring Manager, or custom roles)
   - Click the **"Permissions"** button or **"Edit"** button

3. **Add Warning Configurations Permission**:
   - In the permissions modal, find the **"Candidate Management"** section
   - Look for: **"Manage Warning Configurations"** (`WARNING_CONFIGURATIONS_MANAGE`)
   - Check the box to enable the permission
   - Click **"Save"** to apply changes

### 👤 **User Settings (Individual Users)**

1. **Navigate to User Management**:
   - Go to **Settings** → **Manage Users**
   - Or navigate to `/settings/users`

2. **Select a User**:
   - Click on any user in the list
   - Click the **"Edit"** button

3. **Add Individual Permission**:
   - In the edit modal, go to the **"Permissions"** tab
   - Find the **"Candidate Management"** section
   - Look for: **"Manage Warning Configurations"** (`WARNING_CONFIGURATIONS_MANAGE`)
   - Check the box to enable the permission
   - Click **"Save"** to apply changes

## Permission Recommendations by Role

### Admin Role
- ✅ **WARNING_CONFIGURATIONS_MANAGE**: Enabled (default)
- **Purpose**: Full system management including warning configurations

### Recruiter Role
- ❌ **WARNING_CONFIGURATIONS_MANAGE**: Disabled (default)
- **Purpose**: Focus on candidate management, not system configuration

### Hiring Manager Role
- ❌ **WARNING_CONFIGURATIONS_MANAGE**: Disabled (default)
- **Purpose**: Focus on hiring decisions, not system configuration

### Custom Roles
- **System Administrators**: Enable this permission
- **Team Leads**: Consider enabling for team management
- **Regular Users**: Keep disabled for security

## API Access Control

### Endpoints Protected
All warning configuration API endpoints now check for the new permission:

- `GET /api/users/{id}/warning-configurations` - Fetch user's configurations
- `POST /api/users/{id}/warning-configurations` - Create new configuration
- `PUT /api/users/{id}/warning-configurations/{configId}` - Update configuration
- `PATCH /api/users/{id}/warning-configurations/{configId}` - Partial update
- `DELETE /api/users/{id}/warning-configurations/{configId}` - Delete configuration

### Permission Logic
```javascript
const isAdmin = session.user.role === 'Admin';
const hasWarningManagePermission = session.user.modulePermissions?.includes('WARNING_CONFIGURATIONS_MANAGE');
const isAccessingOwn = session.user.id === id;

// Allow access if:
// 1. User is accessing their own configurations, OR
// 2. User is Admin, OR
// 3. User has WARNING_CONFIGURATIONS_MANAGE permission
if (!isAccessingOwn && !isAdmin && !hasWarningManagePermission) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## UI Access Control

### Avatar Popover
- **Always visible** for current user
- **Purpose**: Access to own warning configurations

### User Settings Dropdown
- **Visible to**: Admin users + Users with WARNING_CONFIGURATIONS_MANAGE permission
- **Purpose**: Access to other users' warning configurations

### Permission Check
```javascript
const canAccessOtherUserWarnings = 
  session?.user?.role === 'Admin' || 
  session?.user?.modulePermissions?.includes('USERS_MANAGE') || 
  session?.user?.modulePermissions?.includes('WARNING_CONFIGURATIONS_MANAGE');
```

## Migration Notes

### From Previous Version
- Warning configurations were previously only accessible to admin users
- New permission provides more granular control
- Default behavior: All non-admin users have warning management access disabled
- Admin users retain full access to all warning configuration features

### Database Updates
The following database changes are required:
1. New permission `WARNING_CONFIGURATIONS_MANAGE` added to `PLATFORM_MODULES`
2. Admin users automatically get the new permission
3. Other users remain unchanged (permissions disabled by default)

### Running the Migration Script
To add the permission to existing admin users:

```bash
node scripts/add-warning-configurations-permission.cjs
```

## Security Considerations

### Permission Scope
- **WARNING_CONFIGURATIONS_MANAGE** grants access to ALL users' warning configurations
- This is a powerful permission that should be assigned carefully
- Consider creating more granular permissions if needed in the future

### Audit Logging
All warning configuration operations are logged with:
- User performing the action
- Target user (whose configurations are being modified)
- Action type (CREATE, UPDATE, DELETE)
- Configuration details

### Best Practices
1. **Principle of Least Privilege**: Only assign this permission to users who need it
2. **Regular Review**: Periodically review who has this permission
3. **Monitor Usage**: Check audit logs for unusual warning configuration activity
4. **Documentation**: Keep track of who has this permission and why

## Troubleshooting

### Permission Not Visible
If you don't see the warning configurations permission:
1. Check if you're logged in as an Admin user
2. Verify the permission exists in the database
3. Clear browser cache and refresh the page

### Access Denied Messages
If users see "Access Denied" messages:
1. Check their role permissions in User Groups
2. Check their individual user permissions
3. Ensure they have the required `WARNING_CONFIGURATIONS_MANAGE` permission

### API Errors (403 Forbidden)
If API calls return 403 errors:
1. Verify the user has the correct permissions
2. Check if the permission is enabled for their role
3. Ensure the API endpoint is checking the right permission

### Missing Permission in Dropdown
If the "Warning Configurations" option doesn't appear in user dropdowns:
1. Check if the user has `WARNING_CONFIGURATIONS_MANAGE` permission
2. Verify the permission check logic in the UI components
3. Ensure the permission is properly assigned to the user's role
