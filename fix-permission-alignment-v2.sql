-- Fix Permission Alignment v2
-- Run this SQL directly in your database to fix user role alignment
-- This script uses the correct User_UserGroup junction table approach

-- Step 1: Promote to Admin when possessing admin-level permissions
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

-- Step 2: Set to Recruiter when possessing recruiter-level permissions (but not promoted to Admin)
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

-- Step 3: Set to Hiring Manager when possessing viewing permissions only (and not higher roles)
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

-- Step 4: Set default role for users without any group assignments
UPDATE "User" 
SET role = 'Recruiters'
WHERE id NOT IN (
    SELECT DISTINCT u.id
    FROM "User" u
    JOIN "User_UserGroup" uug ON u.id = uug."userId"
) AND role NOT IN ('Admin', 'Recruiters', 'Hiring Manager');

-- Verification: Show the results
SELECT 
    u.name,
    u.email,
    u.role as "Current Role",
    array_agg(DISTINCT ug.name) as "User Groups",
    array_agg(DISTINCT ug.permissions) as "Permissions"
FROM "User" u
LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
LEFT JOIN "UserGroup" ug ON uug."groupId" = ug.id
GROUP BY u.id, u.name, u.email, u.role
ORDER BY u.name;
