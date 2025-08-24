# Job Match Permissions System

## Overview

The Job Match feature now has a comprehensive permission system that controls access and functionality based on user roles and permissions. You can adjust these permissions in both **User Settings** and **Role Settings**.

## Permissions

### JOB_MATCH_VIEW
- **Description**: Allows viewing job match information for candidates
- **Access Level**: Basic access to view job match data
- **Default Assignment**: 
  - Admin users only
  - All other roles: Disabled by default

### JOB_MATCH_MANAGE
- **Description**: Allows adding, editing, and deleting job matches for candidates
- **Access Level**: Advanced access to manage job match data
- **Default Assignment**: 
  - Admin users only
  - All other roles: Disabled by default

## How to Adjust Permissions

### 🔧 **Role Settings (User Groups)**

1. **Navigate to Role Settings**:
   - Go to **Settings** → **Roles & Permissions**
   - Or navigate to `/settings/user-groups`

2. **Select a Role**:
   - Click on any role (Admin, Recruiter, Hiring Manager, or custom roles)
   - Click the **"Permissions"** button or **"Edit"** button

3. **Adjust Job Match Permissions**:
   - In the permissions modal, find the **"Candidate Management"** section
   - Look for these two permissions:
     - ✅ **"View Job Matches"** (`JOB_MATCH_VIEW`)
     - ✅ **"Manage Job Matches"** (`JOB_MATCH_MANAGE`)
   - Check/uncheck the boxes to enable/disable permissions
   - Click **"Save"** to apply changes

4. **Permission Recommendations by Role**:
   - **Admin Role**: Both permissions enabled
   - **Recruiter Role**: Configure based on your needs
   - **Hiring Manager Role**: Configure based on your needs
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
     - ✅ **"View Job Matches"** (`JOB_MATCH_VIEW`)
     - ✅ **"Manage Job Matches"** (`JOB_MATCH_MANAGE`)
   - Check/uncheck to override group permissions
   - Click **"Save"** to apply changes

4. **Individual vs Group Permissions**:
   - Individual permissions override group permissions
   - Users inherit permissions from their assigned groups
   - You can grant additional permissions to specific users

## Role-Based Access

### Admin Users
- ✅ **JOB_MATCH_VIEW**: Can view job match information
- ✅ **JOB_MATCH_MANAGE**: Can add, edit, and delete job matches
- ✅ **Full Access**: Can manage all job match features

### Recruiter Users (Default)
- ❌ **JOB_MATCH_VIEW**: Cannot view job match information (disabled by default)
- ❌ **JOB_MATCH_MANAGE**: Cannot manage job matches (disabled by default)
- ❌ **No Access**: Cannot access job match features

### Hiring Manager Users (Default)
- ❌ **JOB_MATCH_VIEW**: Cannot view job match information (disabled by default)
- ❌ **JOB_MATCH_MANAGE**: Cannot manage job matches (disabled by default)
- ❌ **No Access**: Cannot access job match features

## Implementation Details

### Frontend Components
Job match features are protected in the following components:
- **JobMatchTab**: Shows access denied if user lacks `JOB_MATCH_VIEW`
- **JobsTab**: Shows access denied if user lacks `JOB_MATCH_VIEW`
- **JobMatchModal**: Shows access denied if user lacks `JOB_MATCH_VIEW`
- **Copy buttons**: Only visible if user has `JOB_MATCH_MANAGE`
- **Click interactions**: Only enabled if user has `JOB_MATCH_MANAGE`

### API Endpoints
All job match API endpoints are protected:
- **GET** `/api/v1/candidates/[id]/job-matches` - Requires `JOB_MATCH_VIEW`
- **POST** `/api/v1/candidates/[id]/job-matches` - Requires `JOB_MATCH_MANAGE`
- **PUT** `/api/v1/candidates/[id]/job-matches` - Requires `JOB_MATCH_MANAGE`
- **PATCH** `/api/v1/candidates/[id]/job-matches` - Requires `JOB_MATCH_MANAGE`
- **DELETE** `/api/v1/candidates/[id]/job-matches` - Requires `JOB_MATCH_MANAGE`
- **GET** `/api/v1/candidates/[id]/job-matches/[matchId]` - Requires `JOB_MATCH_VIEW`
- **PUT** `/api/v1/candidates/[id]/job-matches/[matchId]` - Requires `JOB_MATCH_MANAGE`
- **DELETE** `/api/v1/candidates/[id]/job-matches/[matchId]` - Requires `JOB_MATCH_MANAGE`
- **POST** `/api/v1/candidates/[id]/job-matches/add` - Requires `JOB_MATCH_MANAGE`

### Database Permissions
Job match permissions are stored in the `UserGroup` table and assigned to users through the `User_UserGroup` relationship.

## Default Permissions Setup

### User Groups
The following permissions are automatically assigned to default user groups:

**Admin Group**:
- ✅ `JOB_MATCH_VIEW` - Enabled
- ✅ `JOB_MATCH_MANAGE` - Enabled

**Recruiter Group**:
- ❌ `JOB_MATCH_VIEW` - Disabled (default)
- ❌ `JOB_MATCH_MANAGE` - Disabled (default)

**Hiring Manager Group**:
- ❌ `JOB_MATCH_VIEW` - Disabled (default)
- ❌ `JOB_MATCH_MANAGE` - Disabled (default)

## Common Permission Combinations

### 🎯 **Standard Recruiter (Default)**
```
☐ View Job Matches
☐ Manage Job Matches
```
- Cannot access any job match features
- Can still manage candidates and positions

### 🎯 **Recruiter with Job Match Access**
```
☑ View Job Matches
☐ Manage Job Matches
```
- Can view job match information
- Cannot modify job matches

### 🎯 **Senior Recruiter / Team Lead**
```
☑ View Job Matches
☑ Manage Job Matches
```
- Can view and manage all job match features
- Full access to job match functionality

### 🎯 **Admin**
```
☑ View Job Matches
☑ Manage Job Matches
```
- Full access to all job match features
- Can manage the entire job match system

## Quick Reference

| Permission | Admin | Recruiter | Hiring Manager | Custom Role |
|------------|-------|-----------|----------------|-------------|
| View Job Matches | ✅ | ❌ | ❌ | Configurable |
| Manage Job Matches | ✅ | ❌ | ❌ | Configurable |

## Troubleshooting UI Issues

### Permission Not Visible
If you don't see the job match permissions:
1. Check if you're logged in as an Admin user
2. Verify the permissions exist in the database
3. Clear browser cache and refresh the page

### Access Denied Messages
If users see "Access Denied" messages:
1. Check their role permissions in User Groups
2. Check their individual user permissions
3. Ensure they have the required `JOB_MATCH_VIEW` permission

### API Errors (403 Forbidden)
If API calls return 403 errors:
1. Verify the user has the correct permissions
2. Check if the permission is enabled for their role
3. Ensure the API endpoint is checking the right permission

## Migration Notes

### From Previous Version
- Job match features were previously controlled by `CANDIDATES_MANAGE` permission
- New dedicated permissions provide more granular control
- Default behavior: All non-admin users have job match access disabled
- Admin users retain full access to all job match features

### Database Updates
The following database changes are required:
1. New permissions added to `PLATFORM_MODULES`
2. Admin role updated to include new permissions
3. Other roles remain unchanged (permissions disabled by default)
