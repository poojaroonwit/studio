-- Migration: Simplify User Role and Team Management
-- This migration converts the current many-to-many relationship to direct foreign keys
-- Run this script step by step to ensure data integrity

-- =====================================================
-- STEP 1: Add new foreign key columns to User table
-- =====================================================
ALTER TABLE "User" ADD COLUMN "userGroupId" UUID;
ALTER TABLE "User" ADD COLUMN "userTeamId" UUID;

-- =====================================================
-- STEP 2: Create indexes for the new foreign keys
-- =====================================================
CREATE INDEX "User_userGroupId_idx" ON "User"("userGroupId");
CREATE INDEX "User_userTeamId_idx" ON "User"("userTeamId");

-- =====================================================
-- STEP 3: Verify current data structure
-- =====================================================
-- Check current users and their group memberships
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  array_agg(DISTINCT ug.name) as current_groups,
  array_agg(DISTINCT ut.name) as current_teams
FROM "User" u
LEFT JOIN "User_UserGroup" uug ON u.id = uug."userId"
LEFT JOIN "UserGroup" ug ON uug."groupId" = ug.id
LEFT JOIN "User_UserTeam" uut ON u.id = uut."userId"
LEFT JOIN "UserTeam" ut ON uut."teamId" = ut.id
GROUP BY u.id, u.name, u.email, u.role
ORDER BY u.name;

-- =====================================================
-- STEP 4: Migrate existing data - Set primary UserGroup
-- =====================================================
-- Update users with their primary UserGroup (first one found)
UPDATE "User" 
SET "userGroupId" = (
  SELECT uug."groupId" 
  FROM "User_UserGroup" uug 
  WHERE uug."userId" = "User".id 
  LIMIT 1
);

-- =====================================================
-- STEP 5: Migrate existing data - Set primary UserTeam
-- =====================================================
-- Update users with their primary UserTeam (first one found)
UPDATE "User" 
SET "userTeamId" = (
  SELECT uut."teamId" 
  FROM "User_UserTeam" uut 
  WHERE uut."userId" = "User".id 
  LIMIT 1
);

-- =====================================================
-- STEP 6: Update role field to match UserGroup name
-- =====================================================
UPDATE "User" 
SET role = (
  SELECT ug.name 
  FROM "UserGroup" ug 
  WHERE ug.id = "User"."userGroupId"
);

-- =====================================================
-- STEP 7: Add foreign key constraints
-- =====================================================
ALTER TABLE "User" ADD CONSTRAINT "User_userGroupId_fkey" 
  FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"("id") ON DELETE SET NULL;

ALTER TABLE "User" ADD CONSTRAINT "User_userTeamId_fkey" 
  FOREIGN KEY ("userTeamId") REFERENCES "UserTeam"("id") ON DELETE SET NULL;

-- =====================================================
-- STEP 8: Remove the unused module_permissions column
-- =====================================================
ALTER TABLE "User" DROP COLUMN "module_permissions";

-- =====================================================
-- STEP 9: Verify the migration results
-- =====================================================
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  ug.name as user_group_name,
  ut.name as user_team_name,
  CASE 
    WHEN ug.name IS NULL THEN '⚠️ No UserGroup assigned'
    WHEN ug.name != u.role THEN '⚠️ Role mismatch'
    ELSE '✅ OK'
  END as status
FROM "User" u
LEFT JOIN "UserGroup" ug ON u."userGroupId" = ug.id
LEFT JOIN "UserTeam" ut ON u."userTeamId" = ut.id
ORDER BY u.name;

-- =====================================================
-- STEP 10: Optional - Drop junction tables
-- =====================================================
-- Uncomment these lines if you want to remove the junction tables
-- DROP TABLE "User_UserGroup";
-- DROP TABLE "User_UserTeam";

-- =====================================================
-- STEP 11: Final verification
-- =====================================================
-- Count users by role and group
SELECT 
  u.role,
  ug.name as group_name,
  COUNT(*) as user_count
FROM "User" u
LEFT JOIN "UserGroup" ug ON u."userGroupId" = ug.id
GROUP BY u.role, ug.name
ORDER BY u.role, ug.name;

-- Count users by team
SELECT 
  ut.name as team_name,
  COUNT(*) as user_count
FROM "User" u
LEFT JOIN "UserTeam" ut ON u."userTeamId" = ut.id
GROUP BY ut.name
ORDER BY ut.name;
