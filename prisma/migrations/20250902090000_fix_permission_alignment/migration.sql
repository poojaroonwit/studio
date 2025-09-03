-- Migration: Align User.role with UserGroup.permissions
-- This migration updates User.role based on effective permissions assigned via UserGroup.permissions

-- Promote to Admin when possessing admin-level permissions
UPDATE "User" 
SET role = 'Admin'
WHERE id IN (
    SELECT DISTINCT u.id
    FROM "User" u
    JOIN "User_UserGroup" uug ON u.id = uug."userId"
    JOIN "UserGroup" ug ON uug."groupId" = ug.id
    WHERE (
        'USERS_PERMISSIONS_MANAGE' = ANY(ug.permissions) OR
        'USER_GROUPS_EDIT' = ANY(ug.permissions) OR
        'SYSTEM_SETTINGS_VIEW' = ANY(ug.permissions) OR
        'SYSTEM_SETTINGS_EDIT' = ANY(ug.permissions) OR
        'LOGS_VIEW' = ANY(ug.permissions) OR
        'UPLOAD_QUEUE_MANAGE' = ANY(ug.permissions)
    ) AND u.role != 'Admin'
);

-- Set to Recruiter when possessing recruiter-level permissions (but not promoted to Admin)
UPDATE "User" 
SET role = 'Recruiters'
WHERE id IN (
    SELECT DISTINCT u.id
    FROM "User" u
    JOIN "User_UserGroup" uug ON u.id = uug."userId"
    JOIN "UserGroup" ug ON uug."groupId" = ug.id
    WHERE (
        'CANDIDATES_VIEW' = ANY(ug.permissions) OR
        'CANDIDATES_CREATE' = ANY(ug.permissions) OR
        'CANDIDATES_EDIT_BASIC' = ANY(ug.permissions) OR
        'POSITIONS_VIEW' = ANY(ug.permissions) OR
        'POSITIONS_CREATE' = ANY(ug.permissions) OR
        'POSITIONS_EDIT_BASIC' = ANY(ug.permissions) OR
        'TASK_BOARD_VIEW' = ANY(ug.permissions) OR
        'TASK_BOARD_MANAGE_OWN' = ANY(ug.permissions)
    ) AND u.role != 'Recruiters' AND u.role != 'Admin'
);

-- Set to Hiring Manager when possessing viewing permissions only (and not higher roles)
UPDATE "User" 
SET role = 'Hiring Manager'
WHERE id IN (
    SELECT DISTINCT u.id
    FROM "User" u
    JOIN "User_UserGroup" uug ON u.id = uug."userId"
    JOIN "UserGroup" ug ON uug."groupId" = ug.id
    WHERE (
        'CANDIDATES_VIEW' = ANY(ug.permissions) OR
        'POSITIONS_VIEW' = ANY(ug.permissions) OR
        'TASK_BOARD_VIEW' = ANY(ug.permissions)
    ) AND u.role != 'Hiring Manager' AND u.role != 'Recruiters' AND u.role != 'Admin'
);


