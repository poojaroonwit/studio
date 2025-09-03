-- Fix Permission Alignment - User Group Permissions Approach
-- The system uses UserGroup.permissions as the primary permission source
-- User.role should be updated to match the user's permission level

-- 1. First, let's see the current state of users and their group permissions
SELECT 
    u.id,
    u.name,
    u.email,
    u.role as current_role,
    array_agg(DISTINCT ug.name) as user_groups,
    array_agg(DISTINCT perm) as all_permissions
FROM "User" u
LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
LEFT JOIN "UserGroup" ug ON uug."groupId" = ug.id
LEFT JOIN LATERAL unnest(ug.permissions) AS perm ON true
GROUP BY u.id, u.name, u.email, u.role
ORDER BY u.name;

-- 2. Check which users have admin-level permissions but wrong role
SELECT 
    u.id,
    u.name,
    u.email,
    u.role as current_role,
    array_agg(DISTINCT ug.name) as user_groups,
    array_agg(DISTINCT perm) as admin_permissions
FROM "User" u
JOIN "User_UserGroup" uug ON u.id = uug."userId"
JOIN "UserGroup" ug ON uug."groupId" = ug.id
LEFT JOIN LATERAL unnest(ug.permissions) AS perm ON true
WHERE (
    'USERS_PERMISSIONS_MANAGE' = ANY(ug.permissions) OR
    'USER_GROUPS_EDIT' = ANY(ug.permissions) OR
    'SYSTEM_SETTINGS_VIEW' = ANY(ug.permissions) OR
    'SYSTEM_SETTINGS_EDIT' = ANY(ug.permissions) OR
    'LOGS_VIEW' = ANY(ug.permissions) OR
    'UPLOAD_QUEUE_MANAGE' = ANY(ug.permissions)
) AND u.role != 'Admin'
GROUP BY u.id, u.name, u.email, u.role;

-- 3. Update users who have admin-level permissions to have Admin role
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

-- 4. Update users who have recruiter-level permissions to have Recruiter role
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

-- 5. Update users who have hiring manager permissions to have Hiring Manager role
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

-- 6. Verify the changes
SELECT 
    u.id,
    u.name,
    u.email,
    u.role as updated_role,
    array_agg(DISTINCT ug.name) as user_groups,
    array_agg(DISTINCT perm) as all_permissions
FROM "User" u
LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
LEFT JOIN "UserGroup" ug ON uug."groupId" = ug.id
LEFT JOIN LATERAL unnest(ug.permissions) AS perm ON true
GROUP BY u.id, u.name, u.email, u.role
ORDER BY u.name;
