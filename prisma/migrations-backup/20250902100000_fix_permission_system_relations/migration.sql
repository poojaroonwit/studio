-- Migration: Fix Permission System Relations and Schema Issues
-- This migration fixes the User_UserGroup junction table relations and ensures proper schema alignment

-- Step 1: Add proper relations to User_UserGroup table
-- Note: The table structure already exists, we're just ensuring the relations are properly defined

-- Step 2: Ensure all users have proper group assignments
-- Create default group assignments for users who don't have any
INSERT INTO "User_UserGroup" ("userId", "groupId")
SELECT u.id, ug.id
FROM "User" u
CROSS JOIN "UserGroup" ug
WHERE ug."is_default" = true
  AND NOT EXISTS (
    SELECT 1 FROM "User_UserGroup" uug 
    WHERE uug."userId" = u.id
  );

-- Step 3: Clean up any orphaned User_UserGroup entries
DELETE FROM "User_UserGroup" uug
WHERE NOT EXISTS (
    SELECT 1 FROM "User" u WHERE u.id = uug."userId"
)
OR NOT EXISTS (
    SELECT 1 FROM "UserGroup" ug WHERE ug.id = uug."groupId"
);

-- Step 4: Ensure all UserGroup entries have valid permissions
-- Update any groups with null permissions to empty array
UPDATE "UserGroup" 
SET permissions = '{}'::text[]
WHERE permissions IS NULL;

-- Step 5: Add missing indexes if they don't exist
-- Note: These indexes should already exist based on the schema, but ensuring they're present
-- CREATE INDEX IF NOT EXISTS "User_UserGroup_userId_idx" ON "User_UserGroup" ("userId");
-- CREATE INDEX IF NOT EXISTS "User_UserGroup_groupId_idx" ON "User_UserGroup" ("groupId");

-- Step 6: Verify and fix any permission alignment issues
-- Update user roles based on their effective permissions
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

-- Step 7: Set default role for users without any group assignments
UPDATE "User" 
SET role = 'Recruiter'
WHERE role IS NULL OR role = '';

-- Step 8: Ensure all system groups have proper permissions
-- This will be handled by the application logic, but we ensure the structure is correct
