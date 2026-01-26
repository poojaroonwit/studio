# User & Access Management

## The Story of Identity Control

| Feature | Description |
| :--- | :--- |
| **What** | The administrative engine for managing users, permission sets, and team structures. |
| **Who** | **System Administrators** and **HR Operations Leaders**. |
| **When** | During employee onboarding, department restructuring, or security audits. |
| **Why** | To maintain strict data privacy standards while enabling seamless collaboration across the hiring team. |
| **Where** | Under the **Settings > User Management** and **Settings > Roles** menus. |
| **How** | 1. Add user by email <br> 2. Assign primary **Role** <br> 3. Create Custom Role in **Unified Role Drawer** <br> 4. Toggle granular permissions <br> 5. Group users into Teams |

## 1. Managing Users
Add and manage the life-cycle of your platform users:
- **Creation**: Add users by email and assign their primary role (e.g., Recruiter).
- **Security**: Trigger password resets for local users or manage their connection to Azure AD.
- **Deactivation**: Instantly revoke access for departing staff while preserving their historical hiring data.

## 2. Roles & Permissions (RBAC)
The **Unified Role Drawer** provides a visual grid for managing modular permissions:
- **Module Control**: Choose who can create Jobs vs. who can only view Candidates.
- **Action Level**: Define if a role can "Edit" or "Delete" specific data types.

## 3. Team Management
Group users into operationally logical units (e.g., "Tech Hiring Unit").
- **Shared Access**: Teams can be configured to see all candidates belonging to the group's active positions.
- **Visual Distinction**: Assign team colors to make the dashboard calendar and pipeline lists easily scannable.

## 4. How to Verify (Test Case)
To verify user setup:
1.  **Navigate**: Go to **"Settings > User Management"**.
2.  **Act**: Add a new user with a unique test email and assign them the **"Recruiter"** role.
3.  **Confirm**: Search for the new user in the list and ensure their status is **"Active"**. Log out and log in with the new credentials (if local) to verify access.

