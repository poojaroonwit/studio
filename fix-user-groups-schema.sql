-- Fix User Groups Database Schema
-- This script ensures the database schema is properly migrated from junction tables to direct foreign keys

-- Step 1: Check if UserGroup table exists and create if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'UserGroup') THEN
        CREATE TABLE "UserGroup" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
            "is_default" BOOLEAN DEFAULT false,
            "is_system_role" BOOLEAN DEFAULT false,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX "UserGroup_is_default_idx" ON "UserGroup"("is_default");
        CREATE INDEX "UserGroup_is_system_role_idx" ON "UserGroup"("is_system_role");
        
        RAISE NOTICE 'UserGroup table created';
    ELSE
        RAISE NOTICE 'UserGroup table already exists';
    END IF;
END $$;

-- Step 2: Check if User table has userGroupId column and add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'User' AND column_name = 'userGroupId'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "userGroupId" UUID;
        RAISE NOTICE 'userGroupId column added to User table';
    ELSE
        RAISE NOTICE 'userGroupId column already exists in User table';
    END IF;
END $$;

-- Step 3: Create index on userGroupId if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_indexes 
        WHERE tablename = 'User' AND indexname = 'User_userGroupId_idx'
    ) THEN
        CREATE INDEX "User_userGroupId_idx" ON "User"("userGroupId");
        RAISE NOTICE 'Index on userGroupId created';
    ELSE
        RAISE NOTICE 'Index on userGroupId already exists';
    END IF;
END $$;

-- Step 4: Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.table_constraints 
        WHERE constraint_name = 'User_userGroupId_fkey'
    ) THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_userGroupId_fkey" 
        FOREIGN KEY ("userGroupId") REFERENCES "UserGroup"(id) ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key constraint added';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Step 5: Create default user groups if they don't exist
INSERT INTO "UserGroup" (id, name, description, permissions, "is_default", "is_system_role", "createdAt", "updatedAt")
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Administrators', 'Full system access and management', 
     ARRAY['USERS_PERMISSIONS_MANAGE', 'USER_GROUPS_EDIT', 'SYSTEM_SETTINGS_VIEW', 'SYSTEM_SETTINGS_EDIT', 'LOGS_VIEW', 'UPLOAD_QUEUE_MANAGE', 'CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC', 'CANDIDATES_EDIT_ADVANCED', 'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'POSITIONS_EDIT_ADVANCED', 'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN', 'TASK_BOARD_MANAGE_ALL'], 
     true, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO "UserGroup" (id, name, description, permissions, "is_default", "is_system_role", "createdAt", "updatedAt")
VALUES 
    ('00000000-0000-0000-0000-000000000002', 'Recruiter', 'Standard recruiter access', 
     ARRAY['CANDIDATES_VIEW', 'CANDIDATES_CREATE', 'CANDIDATES_EDIT_BASIC', 'POSITIONS_VIEW', 'POSITIONS_CREATE', 'POSITIONS_EDIT_BASIC', 'TASK_BOARD_VIEW', 'TASK_BOARD_MANAGE_OWN'], 
     true, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO "UserGroup" (id, name, description, permissions, "is_default", "is_system_role", "createdAt", "updatedAt")
VALUES 
    ('00000000-0000-0000-0000-000000000003', 'Hiring Managers', 'View-only access for hiring decisions', 
     ARRAY['CANDIDATES_VIEW', 'POSITIONS_VIEW', 'TASK_BOARD_VIEW'], 
     true, true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Step 6: Migrate existing users to appropriate groups if they don't have groups assigned
-- First, assign Admin users to Administrators group
UPDATE "User" 
SET "userGroupId" = (SELECT id FROM "UserGroup" WHERE name = 'Administrators')
WHERE role = 'Admin' AND "userGroupId" IS NULL;

-- Assign Recruiter users to Recruiter group
UPDATE "User" 
SET "userGroupId" = (SELECT id FROM "UserGroup" WHERE name = 'Recruiter')
WHERE role = 'Recruiter' AND "userGroupId" IS NULL;

-- Assign other users to Hiring Managers group if they don't have a group
UPDATE "User" 
SET "userGroupId" = (SELECT id FROM "UserGroup" WHERE name = 'Hiring Managers')
WHERE "userGroupId" IS NULL;

-- Step 7: Verify the migration results
SELECT 
    'Migration Summary' as info,
    COUNT(*) as total_users,
    COUNT("userGroupId") as users_with_groups,
    COUNT(*) - COUNT("userGroupId") as users_without_groups
FROM "User";

SELECT 
    'User Groups Status' as info,
    ug.name as group_name,
    COUNT(u.id) as user_count
FROM "UserGroup" ug
LEFT JOIN "User" u ON ug.id = u."userGroupId"
GROUP BY ug.id, ug.name
ORDER BY ug.name;

-- Step 8: Show any users that still don't have groups assigned
SELECT 
    'Users Without Groups' as info,
    u.id,
    u.name,
    u.email,
    u.role
FROM "User" u
WHERE u."userGroupId" IS NULL
ORDER BY u.name;
