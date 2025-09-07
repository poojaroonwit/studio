-- Rollback Migration: Revert to Many-to-Many User Role Management
-- Use this script if you need to rollback the simplified user role changes

-- =====================================================
-- STEP 1: Remove foreign key constraints
-- =====================================================
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_userGroupId_fkey";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_userTeamId_fkey";

-- =====================================================
-- STEP 2: Recreate junction tables if they were dropped
-- =====================================================
-- Only run if junction tables were dropped
CREATE TABLE IF NOT EXISTS "User_UserGroup" (
  "userId" UUID NOT NULL,
  "groupId" UUID NOT NULL,
  CONSTRAINT "User_UserGroup_pkey" PRIMARY KEY ("userId", "groupId")
);

CREATE TABLE IF NOT EXISTS "User_UserTeam" (
  "userId" UUID NOT NULL,
  "teamId" UUID NOT NULL,
  CONSTRAINT "User_UserTeam_pkey" PRIMARY KEY ("userId", "teamId")
);

-- =====================================================
-- STEP 3: Add indexes to junction tables
-- =====================================================
CREATE INDEX IF NOT EXISTS "User_UserGroup_userId_idx" ON "User_UserGroup"("userId");
CREATE INDEX IF NOT EXISTS "User_UserGroup_groupId_idx" ON "User_UserGroup"("groupId");
CREATE INDEX IF NOT EXISTS "User_UserTeam_userId_idx" ON "User_UserTeam"("userId");
CREATE INDEX IF NOT EXISTS "User_UserTeam_teamId_idx" ON "User_UserTeam"("teamId");

-- =====================================================
-- STEP 4: Migrate data back to junction tables
-- =====================================================
-- Insert UserGroup relationships
INSERT INTO "User_UserGroup" ("userId", "groupId")
SELECT u.id, u."userGroupId"
FROM "User" u
WHERE u."userGroupId" IS NOT NULL
ON CONFLICT ("userId", "groupId") DO NOTHING;

-- Insert UserTeam relationships
INSERT INTO "User_UserTeam" ("userId", "teamId")
SELECT u.id, u."userTeamId"
FROM "User" u
WHERE u."userTeamId" IS NOT NULL
ON CONFLICT ("userId", "teamId") DO NOTHING;

-- =====================================================
-- STEP 5: Add back module_permissions column
-- =====================================================
ALTER TABLE "User" ADD COLUMN "module_permissions" text[] DEFAULT '{}';

-- =====================================================
-- STEP 6: Update module_permissions from UserGroup
-- =====================================================
UPDATE "User" 
SET "module_permissions" = (
  SELECT ug.permissions 
  FROM "UserGroup" ug 
  WHERE ug.id = "User"."userGroupId"
);

-- =====================================================
-- STEP 7: Remove the new foreign key columns
-- =====================================================
ALTER TABLE "User" DROP COLUMN IF EXISTS "userGroupId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "userTeamId";

-- =====================================================
-- STEP 8: Drop the new indexes
-- =====================================================
DROP INDEX IF EXISTS "User_userGroupId_idx";
DROP INDEX IF EXISTS "User_userTeamId_idx";

-- =====================================================
-- STEP 9: Verify rollback
-- =====================================================
-- Check that junction tables have data
SELECT 
  'User_UserGroup' as table_name,
  COUNT(*) as record_count
FROM "User_UserGroup"
UNION ALL
SELECT 
  'User_UserTeam' as table_name,
  COUNT(*) as record_count
FROM "User_UserTeam";

-- Check users and their relationships
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  array_agg(DISTINCT ug.name) as user_groups,
  array_agg(DISTINCT ut.name) as user_teams,
  u."module_permissions"
FROM "User" u
LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
LEFT JOIN "UserGroup" ug ON uug."groupId" = ug.id
LEFT JOIN "User_UserTeam" uut ON u.id = uut."userId"
LEFT JOIN "UserTeam" ut ON uut."teamId" = ut.id
GROUP BY u.id, u.name, u.email, u.role, u."module_permissions"
ORDER BY u.name;
