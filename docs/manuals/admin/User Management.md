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

## 1. Managing Users (CRUD)
Take full control of your organization's access.

### 1.1 Adding a New User
1.  Click **"Invite User"**.
2.  **Email**: Enter work email address.
3.  **Role**: Assign initial permission level (e.g., *Recruiter*).
4.  **Send Invite**: User receives a temporary link relative to their login method (SSO or Local).

### 1.2 Deactivating Users
When an employee leaves, secure their data instantly:
1.  Locate user in the table.
2.  Click **"Deactivate"** (Do NOT delete, to preserve history).
3.  **Result**: User cannot login, but their past interview notes and assigned jobs remain visible.

### 1.3 Resetting Access
*   **Password Reset**: Click the "Lock" icon to send a reset link (only for non-SSO users).
*   **Unlock Account**: Re-enable a user who was previously deactivated.

## 2. Roles & Permissions (RBAC)
The **Unified Role Drawer** configures what each user can see and do.

### 2.1 Default Roles Matrix
| Action | Admin | Recruiter | Hiring Manager | Interviewer |
| :--- | :---: | :---: | :---: | :---: |
| **System Settings** | ✅ | ❌ | ❌ | ❌ |
| **User Mgmt** | ✅ | ❌ | ❌ | ❌ |
| **Create Jobs** | ✅ | ✅ | ❌ | ❌ |
| **View Salaries** | ✅ | ✅ | ❌ | ❌ |
| **View Candidates**| ✅ | ✅ | ✅ (Assigned) | ✅ (Assigned) |
| **Submit Score** | ✅ | ✅ | ✅ | ✅ |
| **Hire/Reject** | ✅ | ✅ | ❌ | ❌ |

### 2.2 Custom Roles
Need a hybrid role? Create a **"Coordinator"** role:
1.  Go to **Roles** tab.
2.  Click **"New Role"**.
3.  Toggle permissions ON/OFF (e.g., *Can View Candidates* but *Cannot View Salary*).

## 3. Team Management
Group users into operationally logical units (e.g., "Tech Hiring Unit").
- **Shared Access**: Teams can be configured to see all candidates belonging to the group's active positions.
- **Visual Distinction**: Assign team colors to make the dashboard calendar and pipeline lists easily scannable.

## 4. How to Verify (Test Case)
To verify user setup:
1.  **Navigate**: Go to **"Settings > User Management"**.
2.  **Act**: Add a new user with a unique test email and assign them the **"Recruiter"** role.
3.  **Confirm**: Search for the new user in the list and ensure their status is **"Active"**. Log out and log in with the new credentials (if local) to verify access.

