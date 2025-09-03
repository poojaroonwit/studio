-- Migration: Add direct foreign keys for user groups and teams
-- This migration converts from junction table approach to direct foreign keys

-- Step 1: Add new columns to User table
ALTER TABLE "User" ADD COLUMN "userGroupId" UUID;
ALTER TABLE "User" ADD COLUMN "userTeamId" UUID;

-- Step 2: Migrate existing data from junction tables
-- Update users with their first group assignment
UPDATE "User" 
SET "userGroupId" = (
    SELECT "groupId" 
    FROM "User_UserGroup" 
    WHERE "User_UserGroup"."userId" = "User".id 
    LIMIT 1
);

-- Update users with their first team assignment
UPDATE "User" 
SET "userTeamId" = (
    SELECT "teamId" 
    FROM "User_UserTeam" 
    WHERE "User_UserTeam"."userId" = "User".id 
    LIMIT 1
);

-- Step 3: Add foreign key constraints
ALTER TABLE "User" ADD CONSTRAINT "User_userGroupId_fkey" 
    FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"(id) ON DELETE SET NULL;

ALTER TABLE "User" ADD CONSTRAINT "User_userTeamId_fkey" 
    FOREIGN KEY ("userTeamId") REFERENCES "UserTeam"(id) ON DELETE SET NULL;

-- Step 4: Add indexes for performance
CREATE INDEX "User_userGroupId_idx" ON "User"("userGroupId");
CREATE INDEX "User_userTeamId_idx" ON "User"("userTeamId");

-- Note: Junction tables will be dropped in a future migration after confirming data integrity
