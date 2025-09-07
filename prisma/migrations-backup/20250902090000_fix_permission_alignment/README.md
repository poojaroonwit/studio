# Fix Permission Alignment

This migration aligns `User.role` with effective permissions assigned via `UserGroup.permissions`.

What it does:
- Promotes users to `Admin` if they have any admin-level permissions (`USERS_PERMISSIONS_MANAGE`, `USER_GROUPS_EDIT`, `SYSTEM_SETTINGS_VIEW/EDIT`, `LOGS_VIEW`, `UPLOAD_QUEUE_MANAGE`).
- Sets users to `Recruiter` if they have recruiter-level permissions and are not already Admin.
- Sets users to `Hiring Manager` based on viewing permissions when not higher roles.

Notes:
- Permissions are authoritative from `UserGroup.permissions`.
- This is an idempotent data-alignment step and does not modify schemas.

