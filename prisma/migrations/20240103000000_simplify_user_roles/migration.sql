-- Migration: Simplify User Role and Team Management
-- This migration converts the current many-to-many relationship to direct foreign keys
-- Run this script step by step to ensure data integrity

-- =====================================================
-- STEP 1: Add new foreign key columns to User table (idempotent)
-- =====================================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "userGroupId" UUID;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "userTeamId" UUID;

-- =====================================================
-- STEP 2: Create indexes for the new foreign keys (idempotent)
-- =====================================================
CREATE INDEX IF NOT EXISTS "User_userGroupId_idx" ON "User"("userGroupId");
CREATE INDEX IF NOT EXISTS "User_userTeamId_idx" ON "User"("userTeamId");

-- =====================================================
-- Skipped: diagnostics that reference legacy junction tables (they may not exist)

-- =====================================================
DO $$
BEGIN
  IF to_regclass('public."User_UserGroup"') IS NOT NULL THEN
    UPDATE "User" 
    SET "userGroupId" = (
      SELECT uug."groupId" 
      FROM "User_UserGroup" uug 
      WHERE uug."userId" = "User".id 
      LIMIT 1
    );
  END IF;
END $$;

-- =====================================================
DO $$
BEGIN
  IF to_regclass('public."User_UserTeam"') IS NOT NULL THEN
    UPDATE "User" 
    SET "userTeamId" = (
      SELECT uut."teamId" 
      FROM "User_UserTeam" uut 
      WHERE uut."userId" = "User".id 
      LIMIT 1
    );
  END IF;
END $$;

-- =====================================================
-- STEP 6: Update role field to match UserGroup name
-- =====================================================
UPDATE "User" 
SET role = (
  SELECT ug.name 
  FROM "UserGroup" ug 
  WHERE ug.id = "User"."userGroupId"
)
WHERE "userGroupId" IS NOT NULL;

-- =====================================================
-- STEP 7: Add foreign key constraints
-- =====================================================
DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_userGroupId_fkey" 
    FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_userTeamId_fkey" 
    FOREIGN KEY ("userTeamId") REFERENCES "UserTeam"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- STEP 8: Remove the unused module_permissions column
-- =====================================================
ALTER TABLE "User" DROP COLUMN IF EXISTS "modulePermissions";

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
