# Azure AD/O365 Task Board Access Troubleshooting

## Overview

This guide helps resolve task board access issues when users log in via Azure AD (O365). The task board should be visible to all authenticated users who have the appropriate permissions, regardless of whether they use Azure AD or basic authentication.

## Common Issues

### ❌ **Task Board Not Visible After Azure AD Login**

**Symptoms:**
- User can log in successfully via Azure AD/O365
- Task board menu item is not visible in the sidebar
- User gets "Access Denied" when trying to access `/my-tasks` directly

**Root Causes:**
1. **Missing Group Assignment**: Azure AD users not assigned to user groups
2. **Missing Permissions**: User doesn't have `TASK_BOARD_VIEW` permission
3. **Session Issues**: Permissions not properly loaded in session
4. **Role Assignment**: User role not properly set

## Solutions

### 🔧 **Solution 1: Check User Group Assignment**

1. **Run the Azure AD Fix Script**:
   ```bash
   node scripts/fix-azure-ad-users.js
   ```

2. **Verify User Group Assignment**:
   - Go to **Settings** → **Manage Users**
   - Find the Azure AD user
   - Check if they are assigned to any groups
   - If not, manually assign them to the appropriate group

### 🔧 **Solution 2: Check User Permissions**

1. **Verify Task Board Permissions**:
   - Go to **Settings** → **Manage Users**
   - Click **"Edit"** on the Azure AD user
   - Go to **"Permissions"** tab
   - Check if **"View Task Board"** is enabled in the **"Candidate Management"** section

2. **Check Group Permissions**:
   - Go to **Settings** → **Roles & Permissions**
   - Check the group the user belongs to
   - Verify **"View Task Board"** is enabled

### 🔧 **Solution 3: Force Session Refresh**

1. **Log Out and Log Back In**:
   - Permissions are cached in the session
   - Log out completely and log back in via Azure AD

2. **Clear Browser Cache**:
   - Clear browser cache and cookies
   - Try accessing the application again

### 🔧 **Solution 4: Manual Permission Assignment**

If the user still doesn't have access:

1. **Assign Direct Permissions**:
   - Go to **Settings** → **Manage Users**
   - Edit the Azure AD user
   - Go to **"Permissions"** tab
   - Manually check **"View Task Board"** and **"Manage All Tasks"** if needed
   - Save changes

2. **Create Custom Role** (if needed):
   - Go to **Settings** → **Roles & Permissions**
   - Create a new role with task board permissions
   - Assign this role to the Azure AD user

## Diagnostic Steps

### 📊 **Step 1: Check User Status**

Run this query to check Azure AD user status:

```sql
SELECT 
  u.name,
  u.email,
  u.role,
  u."authentication_method",
  array_agg(ug.name) as groups,
  array_agg(ug.permissions) as group_permissions
FROM "User" u
LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
LEFT JOIN "UserGroup" ug ON uug."groupId" = ug.id
WHERE u."authentication_method" = 'azure'
GROUP BY u.id, u.name, u.email, u.role, u."authentication_method";
```

### 📊 **Step 2: Check Individual Permissions**

```sql
SELECT 
  u.name,
  u.email,
  u."modulePermissions" as direct_permissions
FROM "User" u
WHERE u."authentication_method" = 'azure';
```

### 📊 **Step 3: Verify Task Board Permissions**

```sql
SELECT 
  u.name,
  u.email,
  CASE 
    WHEN 'TASK_BOARD_VIEW' = ANY(u."modulePermissions") THEN 'Direct'
    WHEN 'TASK_BOARD_VIEW' = ANY(
      SELECT unnest(permissions) 
      FROM "UserGroup" ug 
      JOIN "User_UserGroup" uug ON ug.id = uug."groupId" 
      WHERE uug."userId" = u.id
    ) THEN 'Group'
    ELSE 'None'
  END as task_board_access
FROM "User" u
WHERE u."authentication_method" = 'azure';
```

## Prevention

### ✅ **For New Azure AD Users**

The system now automatically:
1. Creates new Azure AD users with the 'Recruiter' role
2. Assigns them to the Recruiter user group
3. Inherits task board permissions from the group

### ✅ **For Existing Azure AD Users**

Run these scripts to ensure proper setup:

```bash
# Fix Azure AD user group assignments
node scripts/fix-azure-ad-users.js

# Update task board permissions
node scripts/update-task-board-permissions.js
```

## Configuration

### 🔧 **Default Azure AD User Setup**

When a new user signs in via Azure AD, they are automatically:

1. **Created with these defaults**:
   - Role: `Recruiter`
   - Authentication Method: `azure`
   - Group Assignment: `Recruiter` group

2. **Inherit these permissions**:
   - `TASK_BOARD_VIEW` (from Recruiter group)
   - Other Recruiter permissions

### 🔧 **Customizing Azure AD User Assignment**

To change the default group assignment for new Azure AD users:

1. **Edit the Authentication Flow**:
   - Modify `src/lib/auth.ts` in the `signIn` callback
   - Change the group ID assignment logic

2. **Create Custom Assignment Logic**:
   ```javascript
   // Example: Assign based on email domain
   if (profile.email.endsWith('@admin.company.com')) {
     groupId = '00000000-0000-0000-0000-000000000001'; // Admin group
   } else {
     groupId = '00000000-0000-0000-0000-000000000002'; // Recruiter group
   }
   ```

## Troubleshooting Checklist

### ✅ **Before Contacting Support**

- [ ] User can log in via Azure AD
- [ ] User is assigned to a user group
- [ ] User group has `TASK_BOARD_VIEW` permission
- [ ] User has logged out and back in after permission changes
- [ ] Browser cache has been cleared
- [ ] User is not using an incognito/private browsing window

### ✅ **Common Solutions to Try**

1. **Run the fix scripts**:
   ```bash
   node scripts/fix-azure-ad-users.js
   node scripts/update-task-board-permissions.js
   ```

2. **Manually assign permissions**:
   - Go to Settings → Manage Users
   - Edit the user and assign permissions directly

3. **Check user role and group**:
   - Verify the user has the correct role
   - Ensure they're assigned to the right group

4. **Test with basic authentication**:
   - Try logging in with username/password
   - Compare permissions between authentication methods

## Support Information

### 📞 **When to Contact Support**

Contact support if:
- User still can't access task board after trying all solutions
- Permission changes are not saving
- Azure AD authentication is failing
- Multiple users are affected

### 📋 **Information to Provide**

When reporting issues, include:
- User email address
- Authentication method used (Azure AD)
- Error messages received
- Steps taken to troubleshoot
- Results of diagnostic queries above

## Related Documentation

- [Task Board Permissions System](./task-board-permissions.md)
- [Task Board Permissions UI Guide](./task-board-permissions-ui-guide.md)
- [Azure AD Authentication Setup](../architecture-diagram.md)
