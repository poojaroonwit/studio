-- Migration: Add direct foreign keys for user groups and teams
-- This migration converts from junction table approach to direct foreign keys
-- Added safety checks to prevent errors if columns already exist

-- Check if columns already exist before adding them
DO $$
DECLARE
  userGroupId_exists BOOLEAN;
  userTeamId_exists BOOLEAN;
BEGIN
  -- Check if userGroupId column already exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'User' 
      AND column_name = 'userGroupId'
  ) INTO userGroupId_exists;
  
  -- Check if userTeamId column already exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'User' 
      AND column_name = 'userTeamId'
  ) INTO userTeamId_exists;
  
  -- Only add columns if they don't exist
  IF NOT userGroupId_exists THEN
    RAISE NOTICE 'Adding userGroupId column...';
    ALTER TABLE "User" ADD COLUMN "userGroupId" UUID;
  ELSE
    RAISE NOTICE 'userGroupId column already exists - skipping';
  END IF;
  
  IF NOT userTeamId_exists THEN
    RAISE NOTICE 'Adding userTeamId column...';
    ALTER TABLE "User" ADD COLUMN "userTeamId" UUID;
  ELSE
    RAISE NOTICE 'userTeamId column already exists - skipping';
  END IF;
END
$$;

-- Step 2: Migrate existing data from junction tables (only if columns were just added)
DO $$
DECLARE
  userGroupId_exists BOOLEAN;
  userTeamId_exists BOOLEAN;
  junction_table_exists BOOLEAN;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'User' 
      AND column_name = 'userGroupId'
  ) INTO userGroupId_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'User' 
      AND column_name = 'userTeamId'
  ) INTO userTeamId_exists;
  
  -- Check if junction table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'User_UserGroup'
  ) INTO junction_table_exists;
  
  -- Only migrate data if junction table exists and we have the columns
  IF userGroupId_exists AND userTeamId_exists AND junction_table_exists THEN
    RAISE NOTICE 'Migrating data from junction tables...';
    
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
    
    RAISE NOTICE 'Data migration completed';
  ELSE
    RAISE NOTICE 'Skipping data migration - columns or junction table not available';
  END IF;
END
$$;

-- Step 3: Add foreign key constraints (only if they don't exist)
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  -- Check if userGroupId constraint already exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
      AND table_name = 'User' 
      AND constraint_name = 'User_userGroupId_fkey'
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_userGroupId_fkey" 
        FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added userGroupId foreign key constraint';
  ELSE
    RAISE NOTICE 'userGroupId foreign key constraint already exists - skipping';
  END IF;
  
  -- Check if userTeamId constraint already exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
      AND table_name = 'User' 
      AND constraint_name = 'User_userTeamId_fkey'
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_userTeamId_fkey" 
        FOREIGN KEY ("userTeamId") REFERENCES "UserTeam"(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added userTeamId foreign key constraint';
  ELSE
    RAISE NOTICE 'userTeamId foreign key constraint already exists - skipping';
  END IF;
END
$$;

-- Step 4: Add indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS "User_userGroupId_idx" ON "User"("userGroupId");
CREATE INDEX IF NOT EXISTS "User_userTeamId_idx" ON "User"("userTeamId");

-- Note: Junction tables will be dropped in a future migration after confirming data integrity
