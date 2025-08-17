# Task Board Permissions UI Guide

## Where to Find Task Board Permissions

### 📋 **In Role Settings (User Groups)**

**Location**: Settings → Roles & Permissions

1. **Select a Role**:
   ```
   ┌─────────────────────────────────────┐
   │ Roles & Permissions                 │
   ├─────────────────────────────────────┤
   │ [Admin] [Recruiter] [Hiring Manager]│
   │                                     │
   │ Admin Role                          │
   │ [Edit] [Permissions] [Delete]       │
   └─────────────────────────────────────┘
   ```

2. **Click "Permissions" Button**:
   ```
   ┌─────────────────────────────────────┐
   │ Admin - Permission Settings         │
   ├─────────────────────────────────────┤
   │ Candidate Management                │
   │ ┌─────────────────────────────────┐ │
   │ │ ☐ View Candidates              │ │
   │ │ ☐ Manage Candidates            │ │
   │ │ ☐ Import Candidates            │ │
   │ │ ☐ Export Candidates            │ │
   │ │ ☐ Manage Candidate Comments    │ │
   │ │ ☐ Manage Candidate Resumes     │ │
   │ │ ☐ Manage Candidate Transitions │ │
   │ │ ☐ Assign Recruiters            │ │
   │ │ ☑ View Task Board              │ │ ← HERE
   │ │ ☑ Manage All Tasks             │ │ ← HERE
   │ └─────────────────────────────────┘ │
   │                                     │
   │ [Close]                             │
   └─────────────────────────────────────┘
   ```

### 👤 **In User Settings (Individual Users)**

**Location**: Settings → Manage Users

1. **Select a User**:
   ```
   ┌─────────────────────────────────────┐
   │ Manage Users                        │
   ├─────────────────────────────────────┤
   │ John Doe (john@example.com)         │
   │ Role: Recruiter                     │
   │ [Edit] [Delete]                     │
   └─────────────────────────────────────┘
   ```

2. **Click "Edit" and Go to Permissions Tab**:
   ```
   ┌─────────────────────────────────────┐
   │ Edit User - John Doe                │
   ├─────────────────────────────────────┤
   │ [User Info] [Groups] [Permissions]  │
   ├─────────────────────────────────────┤
   │ Direct Permissions                  │
   │                                     │
   │ Candidate Management                │
   │ ┌─────────────────────────────────┐ │
   │ │ ☐ View Candidates              │ │
   │ │ ☐ Manage Candidates            │ │
   │ │ ☐ Import Candidates            │ │
   │ │ ☐ Export Candidates            │ │
   │ │ ☐ Manage Candidate Comments    │ │
   │ │ ☐ Manage Candidate Resumes     │ │
   │ │ ☐ Manage Candidate Transitions │ │
   │ │ ☐ Assign Recruiters            │ │
   │ │ ☑ View Task Board              │ │ ← HERE
   │ │ ☐ Manage All Tasks             │ │ ← HERE
   │ └─────────────────────────────────┘ │
   │                                     │
   │ [Save] [Cancel]                     │
   └─────────────────────────────────────┘
   ```

## Permission Descriptions

### View Task Board (`TASK_BOARD_VIEW`)
- **What it does**: Allows users to see the "My Task Board" menu item and access the task board page
- **Who needs it**: All users who should be able to view and manage their assigned tasks
- **Default**: Enabled for Admin, Recruiter, and Hiring Manager roles

### Manage All Tasks (`TASK_BOARD_MANAGE_ALL`)
- **What it does**: Allows users to see and manage tasks for ALL recruiters (not just their own)
- **Who needs it**: Only users who need admin-like access to view all tasks across the organization
- **Default**: Enabled only for Admin role

## Common Permission Combinations

### 🎯 **Standard Recruiter**
```
☑ View Task Board
☐ Manage All Tasks
```
- Can see their own assigned candidates
- Cannot see other recruiters' tasks

### 🎯 **Senior Recruiter / Team Lead**
```
☑ View Task Board
☑ Manage All Tasks
```
- Can see all candidates and tasks
- Can filter by any recruiter

### 🎯 **Hiring Manager**
```
☑ View Task Board
☐ Manage All Tasks
```
- Can see their assigned candidates
- Cannot see other users' tasks

### 🎯 **Admin**
```
☑ View Task Board
☑ Manage All Tasks
```
- Full access to all tasks and candidates
- Can manage the entire task board

## Quick Reference

| Permission | Admin | Recruiter | Hiring Manager | Custom Role |
|------------|-------|-----------|----------------|-------------|
| View Task Board | ✅ | ✅ | ✅ | Configurable |
| Manage All Tasks | ✅ | ❌ | ❌ | Configurable |

## Troubleshooting UI Issues

### Permission Not Visible
If you don't see the task board permissions:
1. **Refresh the page** - permissions are loaded dynamically
2. **Check your own permissions** - you need `USER_GROUPS_MANAGE` to edit roles
3. **Clear browser cache** - UI components may be cached

### Changes Not Saving
If permission changes don't save:
1. **Check for validation errors** - look for red error messages
2. **Ensure you have permission** - you need appropriate admin rights
3. **Try again** - sometimes network issues can cause failures

### UI Looks Different
If the UI doesn't match this guide:
1. **Check your browser** - ensure you're using a modern browser
2. **Check the version** - this guide is for the latest version
3. **Contact support** - if the UI is significantly different
