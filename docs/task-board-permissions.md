# Task Board Permissions System

## Overview

The Task Board feature now has a comprehensive permission system that controls access and functionality based on user roles and permissions. You can adjust these permissions in both **User Settings** and **Role Settings**.

## Permissions

### TASK_BOARD_VIEW
- **Description**: Allows viewing the task board for managing candidate tasks and workflow
- **Access Level**: Basic access to view the task board
- **Default Assignment**: 
  - Admin users
  - Recruiter users  
  - Hiring Manager users

### TASK_BOARD_MANAGE_ALL
- **Description**: Allows viewing and managing tasks for all recruiters (Admin functionality)
- **Access Level**: Advanced access to view and manage all tasks across all recruiters
- **Default Assignment**: 
  - Admin users only

## How to Adjust Permissions

### 🔧 **Role Settings (User Groups)**

1. **Navigate to Role Settings**:
   - Go to **Settings** → **Roles & Permissions**
   - Or navigate to `/settings/user-groups`

2. **Select a Role**:
   - Click on any role (Admin, Recruiter, Hiring Manager, or custom roles)
   - Click the **"Permissions"** button or **"Edit"** button

3. **Adjust Task Board Permissions**:
   - In the permissions modal, find the **"Candidate Management"** section
   - Look for these two permissions:
     - ✅ **"View Task Board"** (`TASK_BOARD_VIEW`)
     - ✅ **"Manage All Tasks"** (`TASK_BOARD_MANAGE_ALL`)
   - Check/uncheck the boxes to enable/disable permissions
   - Click **"Save"** to apply changes

4. **Permission Recommendations by Role**:
   - **Admin Role**: Both permissions enabled
   - **Recruiter Role**: Only "View Task Board" enabled
   - **Hiring Manager Role**: Only "View Task Board" enabled
   - **Custom Roles**: Configure based on your needs

### 👤 **User Settings (Individual Users)**

1. **Navigate to User Management**:
   - Go to **Settings** → **Manage Users**
   - Or navigate to `/settings/users`

2. **Select a User**:
   - Click on any user in the list
   - Click the **"Edit"** button

3. **Adjust Individual Permissions**:
   - In the edit modal, go to the **"Permissions"** tab
   - Find the **"Candidate Management"** section
   - Look for:
     - ✅ **"View Task Board"** (`TASK_BOARD_VIEW`)
     - ✅ **"Manage All Tasks"** (`TASK_BOARD_MANAGE_ALL`)
   - Check/uncheck to override group permissions
   - Click **"Save"** to apply changes

4. **Individual vs Group Permissions**:
   - Individual permissions override group permissions
   - Users inherit permissions from their assigned groups
   - You can grant additional permissions to specific users

## Role-Based Access

### Admin Users
- ✅ **TASK_BOARD_VIEW**: Can view the task board
- ✅ **TASK_BOARD_MANAGE_ALL**: Can view and manage all tasks for all recruiters
- ✅ **Full Access**: Can see all candidates and filter by any recruiter

### Recruiter Users
- ✅ **TASK_BOARD_VIEW**: Can view the task board
- ❌ **TASK_BOARD_MANAGE_ALL**: Cannot manage all tasks
- ✅ **Limited Access**: Can only see their own assigned candidates

### Hiring Manager Users
- ✅ **TASK_BOARD_VIEW**: Can view the task board
- ❌ **TASK_BOARD_MANAGE_ALL**: Cannot manage all tasks
- ✅ **Limited Access**: Can only see their own assigned candidates

## Implementation Details

### Sidebar Navigation
The task board menu item is only visible to users who have:
- `TASK_BOARD_VIEW` permission, OR
- `CANDIDATES_VIEW` permission, OR
- Admin role

### Page Access Control
The `/my-tasks` page has server-side permission checks that prevent unauthorized access.

### Task Filtering
- **Admin users**: Can see all candidates and filter by any recruiter
- **Other users**: Can only see candidates assigned to them

## Default Permissions Setup

### User Groups
The following permissions are automatically assigned to default user groups:

#### Admin Group
```sql
permissions = [
  'TASK_BOARD_VIEW',
  'TASK_BOARD_MANAGE_ALL',
  -- ... other permissions
]
```

#### Recruiter Group
```sql
permissions = [
  'TASK_BOARD_VIEW',
  -- ... other permissions
]
```

#### Hiring Manager Group
```sql
permissions = [
  'TASK_BOARD_VIEW',
  -- ... other permissions
]
```

## Migration

### For Existing Installations
Run the migration script to update existing users and user groups:

```bash
node scripts/update-task-board-permissions.js
```

This script will:
1. Add `TASK_BOARD_VIEW` to Admin, Recruiter, and Hiring Manager user groups
2. Add `TASK_BOARD_MANAGE_ALL` to Admin user group only
3. Update individual user permissions based on their role
4. Verify the updates were successful

### For New Installations
The permissions are automatically included in:
- `prisma/seed.ts` - For seeded data
- `prisma/init-db.sql` - For database initialization

## Step-by-Step Configuration Examples

### Example 1: Give a Recruiter Admin-like Task Board Access

1. Go to **Settings** → **Manage Users**
2. Find the recruiter user and click **"Edit"**
3. Go to the **"Permissions"** tab
4. In **"Candidate Management"** section, check:
   - ✅ **"View Task Board"**
   - ✅ **"Manage All Tasks"**
5. Click **"Save"**

### Example 2: Create a Custom Role for Task Board Managers

1. Go to **Settings** → **Roles & Permissions**
2. Click **"Create New Role"**
3. Name it "Task Board Manager"
4. In permissions, check:
   - ✅ **"View Task Board"**
   - ✅ **"Manage All Tasks"**
   - ✅ **"View Candidates"**
5. Click **"Create Role"**
6. Assign this role to users who should manage all tasks

### Example 3: Restrict a User's Task Board Access

1. Go to **Settings** → **Manage Users**
2. Find the user and click **"Edit"**
3. Go to the **"Permissions"** tab
4. In **"Candidate Management"** section, uncheck:
   - ❌ **"View Task Board"**
5. Click **"Save"**

## Troubleshooting

### Task Board Not Visible
If the task board is not visible in the sidebar:
1. Check if the user has `TASK_BOARD_VIEW` or `CANDIDATES_VIEW` permission
2. Verify the user's role is properly set
3. Check if the user belongs to a user group with the required permissions
4. Check individual user permissions in **Settings** → **Manage Users**

### Azure AD/O365 Users
If Azure AD users cannot see the task board:
1. **Run the Azure AD fix script**: `node scripts/fix-azure-ad-users.js`
2. **Run the permissions update script**: `node scripts/update-task-board-permissions.js`
3. **Log out and log back in** - permissions are cached in the session
4. **Check user group assignment** in Settings → Manage Users
5. **See detailed troubleshooting guide**: [Azure AD Task Board Troubleshooting](./azure-ad-task-board-troubleshooting.md)

### Access Denied Error
If users get an "Access Denied" error when trying to access the task board:
1. Verify the user has the required permissions
2. Check if the permissions were properly migrated
3. Ensure the user's session is valid
4. Check both group and individual permissions

### Cannot See All Tasks (Admin Issue)
If admin users cannot see all tasks:
1. Verify the admin user has `TASK_BOARD_MANAGE_ALL` permission
2. Check if the permission was properly assigned during migration
3. Ensure the user's role is set to 'Admin'
4. Check individual permissions in user settings

### Permission Changes Not Taking Effect
If permission changes don't seem to work:
1. **Log out and log back in** - permissions are cached in the session
2. Check if the user belongs to multiple groups with conflicting permissions
3. Verify that individual permissions are not overriding group permissions
4. Clear browser cache and cookies

## Security Considerations

- Permissions are checked both client-side (for UI visibility) and server-side (for access control)
- The task board page has server-side permission validation
- Task filtering is enforced at the data level to prevent unauthorized access
- All permission changes are logged in the audit system
- Individual user permissions override group permissions
- Changes take effect immediately but may require re-login for session updates

## Best Practices

1. **Use Groups for Common Permissions**: Assign task board permissions through user groups rather than individual users
2. **Limit Admin Access**: Only grant `TASK_BOARD_MANAGE_ALL` to users who truly need to see all tasks
3. **Regular Audits**: Periodically review task board permissions to ensure they align with current needs
4. **Document Changes**: Keep track of permission changes for compliance and troubleshooting
5. **Test Permissions**: Always test permission changes with different user roles to ensure they work as expected
