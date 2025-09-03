-- Migration: Fix Single Default Role
-- This migration ensures only one user group is set as default to prevent role assignment confusion

-- Step 1: Reset all groups to not be default
UPDATE "UserGroup" 
SET "is_default" = false, "updatedAt" = NOW()
WHERE "is_default" = true;

-- Step 2: Set only the Recruiter group as default (this is the most common role for new users)
UPDATE "UserGroup" 
SET "is_default" = true, "updatedAt" = NOW()
WHERE name = 'Recruiter';

-- Step 3: If Recruiter group doesn't exist, create it and set as default
INSERT INTO "UserGroup" (id, name, description, permissions, "is_default", "is_system_role", "createdAt", "updatedAt")
SELECT 
  '00000000-0000-0000-0000-000000000002',
  'Recruiter',
  'Standard recruiter access',
  ARRAY['CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC', 'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN', 'DASHBOARD_VIEW', 'USER_PREFERENCES_MANAGE_OWN'],
  true,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "UserGroup" WHERE name = 'Recruiter'
);

-- Step 4: Ensure all users have proper group assignments
-- For users without any group assignment, assign them to the default Recruiter group
INSERT INTO "User_UserGroup" ("userId", "groupId")
SELECT u.id, ug.id
FROM "User" u
CROSS JOIN "UserGroup" ug
WHERE ug.name = 'Recruiter' 
  AND ug."is_default" = true
  AND NOT EXISTS (
    SELECT 1 FROM "User_UserGroup" uug 
    WHERE uug."userId" = u.id
  );

-- Step 5: Update user roles based on their effective permissions
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
SET role = 'Recruiter'
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
    ) AND u.role != 'Recruiter' AND u.role != 'Admin'
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
    ) AND u.role != 'Hiring Manager' AND u.role != 'Recruiter' AND u.role != 'Admin'
);

-- Step 6: Set default role for users without any group assignments
UPDATE "User" 
SET role = 'Recruiter'
WHERE role IS NULL OR role = '';

-- Step 7: Verify the fix - ensure only one group is default
DO $$
DECLARE
    default_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO default_count FROM "UserGroup" WHERE "is_default" = true;
    IF default_count != 1 THEN
        RAISE EXCEPTION 'Migration failed: Expected exactly 1 default group, but found %', default_count;
    END IF;
    
    RAISE NOTICE 'Migration successful: Exactly 1 default group found';
END $$;
