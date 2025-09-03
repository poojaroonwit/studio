-- Fix User Groups - Direct Database Script
-- Run this script directly in your database to fix user group issues

-- Step 1: Reset all groups to not be default
UPDATE "UserGroup" 
SET "is_default" = false, "updatedAt" = NOW()
WHERE "is_default" = true;

-- Step 2: Create or update the Recruiter group (set as default)
INSERT INTO "UserGroup" (id, name, description, permissions, "is_default", "is_system_role", "createdAt", "updatedAt")
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Recruiter', 'Standard recruiter access', 
   ARRAY['CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC', 'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN', 'DASHBOARD_VIEW', 'USER_PREFERENCES_MANAGE_OWN'], 
   true, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  "is_default" = EXCLUDED."is_default",
  "is_system_role" = EXCLUDED."is_system_role",
  "updatedAt" = NOW();

-- Step 3: Create or update the Administrators group
INSERT INTO "UserGroup" (id, name, description, permissions, "is_default", "is_system_role", "createdAt", "updatedAt")
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Administrators', 'Full system access and management', 
   ARRAY['USERS_PERMISSIONS_MANAGE', 'USER_GROUPS_EDIT', 'SYSTEM_SETTINGS_VIEW', 'SYSTEM_SETTINGS_EDIT', 'LOGS_VIEW', 'UPLOAD_QUEUE_MANAGE', 'CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC', 'CANDIDATES_EDIT_SENSITIVE', 'CANDIDATES_DELETE', 'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'POSITIONS_EDIT_ADVANCED', 'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN', 'TASK_BOARD_MANAGE_ALL'], 
   false, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  "is_default" = EXCLUDED."is_default",
  "is_system_role" = EXCLUDED."is_system_role",
  "updatedAt" = NOW();

-- Step 4: Create or update the Hiring Managers group
INSERT INTO "UserGroup" (id, name, description, permissions, "is_default", "is_system_role", "createdAt", "updatedAt")
VALUES 
  ('00000000-0000-0000-0000-000000000003', 'Hiring Managers', 'View-only access for hiring decisions', 
   ARRAY['CANDIDATES_VIEW', 'CANDIDATES_VIEW_DETAILED', 'CANDIDATES_COMMENTS_VIEW', 'POSITIONS_VIEW', 'TASK_BOARD_VIEW', 'DASHBOARD_VIEW', 'USER_PREFERENCES_MANAGE_OWN'], 
   false, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  "is_default" = EXCLUDED."is_default",
  "is_system_role" = EXCLUDED."is_system_role",
  "updatedAt" = NOW();

-- Step 5: Handle any existing groups with old names (rename them to match the expected names)
UPDATE "UserGroup" 
SET name = 'Recruiter', "updatedAt" = NOW()
WHERE name = 'Recruiter' AND id != '00000000-0000-0000-0000-000000000002';

UPDATE "UserGroup" 
SET name = 'Administrators', "updatedAt" = NOW()
WHERE name = 'Admin' AND id != '00000000-0000-0000-0000-000000000001';

UPDATE "UserGroup" 
SET name = 'Hiring Managers', "updatedAt" = NOW()
WHERE name = 'Hiring Manager' AND id != '00000000-0000-0000-0000-000000000003';

-- Step 6: Ensure only one group is set as default
UPDATE "UserGroup" 
SET "is_default" = false, "updatedAt" = NOW()
WHERE id != '00000000-0000-0000-0000-000000000002';

-- Step 7: Verify the final state
SELECT 
  'Final User Groups State' as info,
  id,
  name,
  "is_default",
  "is_system_role",
  array_length(permissions, 1) as permission_count
FROM "UserGroup"
ORDER BY "is_default" DESC, name;

-- Step 8: Show any users that might need group assignments
SELECT 
  'Users Without Group Assignment' as info,
  u.id,
  u.name,
  u.email,
  u.role,
  u."userGroupId"
FROM "User" u
WHERE u."userGroupId" IS NULL
ORDER BY u.name;
