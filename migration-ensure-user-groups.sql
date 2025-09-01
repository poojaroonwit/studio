-- Migration: Ensure all users have proper user group assignments
-- This migration ensures that all users are assigned to appropriate user groups
-- based on their current role, moving from role-based to permission-based access

-- 1. First, let's see the current state of users and their group assignments
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

-- 2. Find users without any group assignments
SELECT 
    u.id,
    u.name,
    u.email,
    u.role
FROM "User" u
LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
WHERE uug."userId" IS NULL
ORDER BY u.name;

-- 3. Assign users to appropriate groups based on their current role
-- Admin users get Admin group
INSERT INTO "User_UserGroup" ("userId", "groupId")
SELECT u.id, '00000000-0000-0000-0000-000000000001' -- Admin group ID
FROM "User" u
LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId" AND uug."groupId" = '00000000-0000-0000-0000-000000000001'
WHERE u.role = 'Admin' AND uug."userId" IS NULL
ON CONFLICT ("userId", "groupId") DO NOTHING;

-- Recruiter users get Recruiter group
INSERT INTO "User_UserGroup" ("userId", "groupId")
SELECT u.id, '00000000-0000-0000-0000-000000000002' -- Recruiter group ID
FROM "User" u
LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId" AND uug."groupId" = '00000000-0000-0000-0000-000000000002'
WHERE u.role = 'Recruiter' AND uug."userId" IS NULL
ON CONFLICT ("userId", "groupId") DO NOTHING;

-- Hiring Manager users get Hiring Manager group (if it exists)
INSERT INTO "User_UserGroup" ("userId", "groupId")
SELECT u.id, ug.id
FROM "User" u
CROSS JOIN "UserGroup" ug
LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId" AND uug."groupId" = ug.id
WHERE u.role = 'Hiring Manager' 
  AND ug.name = 'Hiring Manager'
  AND uug."userId" IS NULL
ON CONFLICT ("userId", "groupId") DO NOTHING;

-- 4. Update user roles to match their group permissions (optional - for consistency)
-- This ensures that the role field reflects the actual permissions
UPDATE "User" 
SET role = 'Admin'
WHERE id IN (
    SELECT DISTINCT u.id
    FROM "User" u
    JOIN "User_UserGroup" uug ON u.id = uug."userId"
    JOIN "UserGroup" ug ON uug."groupId" = ug.id
    WHERE ug.name = 'Admin' AND u.role != 'Admin'
);

UPDATE "User" 
SET role = 'Recruiter'
WHERE id IN (
    SELECT DISTINCT u.id
    FROM "User" u
    JOIN "User_UserGroup" uug ON u.id = uug."userId"
    JOIN "UserGroup" ug ON uug."groupId" = ug.id
    WHERE ug.name = 'Recruiter' AND u.role != 'Recruiter'
);

-- 5. Final verification - show all users with their groups and permissions
SELECT 
    u.id,
    u.name,
    u.email,
    u.role as current_role,
    array_agg(DISTINCT ug.name) as user_groups,
    array_agg(DISTINCT perm) as all_permissions,
    CASE 
        WHEN 'USERS_MANAGE' = ANY(array_agg(DISTINCT perm)) THEN 'Admin-level'
        WHEN 'CANDIDATES_CREATE' = ANY(array_agg(DISTINCT perm)) THEN 'Recruiter-level'
        ELSE 'Basic'
    END as permission_level
FROM "User" u
LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
LEFT JOIN "UserGroup" ug ON uug."groupId" = ug.id
LEFT JOIN LATERAL unnest(ug.permissions) AS perm ON true
GROUP BY u.id, u.name, u.email, u.role
ORDER BY u.name;
