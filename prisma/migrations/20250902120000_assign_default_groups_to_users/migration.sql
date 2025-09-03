-- Migration: Assign Default Groups to Users
-- This migration ensures all users have proper group assignments

-- Step 1: Create default groups if they don't exist
INSERT INTO "UserGroup" (id, name, description, permissions, "is_default", "is_system_role", "created_at", "updated_at")
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Administrators', 'Full system access and management', 
   ARRAY['USERS_PERMISSIONS_MANAGE', 'USER_GROUPS_EDIT', 'SYSTEM_SETTINGS_VIEW', 'SYSTEM_SETTINGS_EDIT', 'LOGS_VIEW', 'UPLOAD_QUEUE_MANAGE', 'CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC', 'CANDIDATES_EDIT_ADVANCED', 'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'POSITIONS_EDIT_ADVANCED', 'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN', 'TASK_BOARD_MANAGE_ALL'], 
   false, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO "UserGroup" (id, name, description, permissions, "is_default", "is_system_role", "created_at", "updated_at")
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Recruiters', 'Standard recruiter access', 
   ARRAY['CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC', 'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN'], 
   true, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO "UserGroup" (id, name, description, permissions, "is_default", "is_system_role", "created_at", "updated_at")
VALUES 
  ('00000000-0000-0000-0000-000000000003', 'Hiring Managers', 'View-only access for hiring decisions', 
   ARRAY['CANDIDATES_VIEW', 'POSITIONS_VIEW', 'TASK_BOARD_VIEW'], 
   false, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Step 2: Assign users to appropriate groups based on their current role
-- First, assign Admin users to Administrators group
INSERT INTO "User_UserGroup" ("userId", "groupId")
SELECT u.id, ug.id
FROM "User" u
CROSS JOIN "UserGroup" ug
WHERE ug.name = 'Administrators'
  AND u.role = 'Admin'
  AND NOT EXISTS (
    SELECT 1 FROM "User_UserGroup" uug 
    WHERE uug."userId" = u.id AND uug."groupId" = ug.id
  );

-- Assign Recruiter users to Recruiters group
INSERT INTO "User_UserGroup" ("userId", "groupId")
SELECT u.id, ug.id
FROM "User" u
CROSS JOIN "UserGroup" ug
WHERE ug.name = 'Recruiters'
  AND u.role = 'Recruiters'
  AND NOT EXISTS (
    SELECT 1 FROM "User_UserGroup" uug 
    WHERE uug."userId" = u.id AND uug."groupId" = ug.id
  );

-- Assign Hiring Manager users to Hiring Managers group
INSERT INTO "User_UserGroup" ("userId", "groupId")
SELECT u.id, ug.id
FROM "User" u
CROSS JOIN "UserGroup" ug
WHERE ug.name = 'Hiring Managers'
  AND u.role = 'Hiring Manager'
  AND NOT EXISTS (
    SELECT 1 FROM "User_UserGroup" uug 
    WHERE uug."userId" = u.id AND uug."groupId" = ug.id
  );

-- Step 3: For any users still without group assignments, assign them to Recruiters group (default)
INSERT INTO "User_UserGroup" ("userId", "groupId")
SELECT u.id, ug.id
FROM "User" u
CROSS JOIN "UserGroup" ug
WHERE ug.name = 'Recruiters'
  AND NOT EXISTS (
    SELECT 1 FROM "User_UserGroup" uug 
    WHERE uug."userId" = u.id
  );

-- Step 4: Update user roles to match their group permissions
-- This will be handled by the permission alignment script, but we ensure the structure is correct
