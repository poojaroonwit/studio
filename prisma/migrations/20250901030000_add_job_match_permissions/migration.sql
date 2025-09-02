-- Add Job Match Permissions Migration
-- This script adds the new JOB_MATCH_VIEW and JOB_MATCH_MANAGE permissions to the Admin role
-- All other roles will have these permissions disabled by default

-- Update Admin role to include new job match permissions
-- Ensure permissions column exists and default is an empty text[]
ALTER TABLE "UserGroup" ALTER COLUMN permissions SET DEFAULT ARRAY[]::text[];

-- Append both permissions idempotently with proper casts
UPDATE "UserGroup"
SET permissions = (
  CASE 
    WHEN NOT ('JOB_MATCH_VIEW' = ANY(permissions)) THEN array_append(COALESCE(permissions, ARRAY[]::text[]), 'JOB_MATCH_VIEW'::text)
    ELSE permissions
  END
)
WHERE name = 'Admin';

UPDATE "UserGroup"
SET permissions = (
  CASE 
    WHEN NOT ('JOB_MATCH_MANAGE' = ANY(permissions)) THEN array_append(COALESCE(permissions, ARRAY[]::text[]), 'JOB_MATCH_MANAGE'::text)
    ELSE permissions
  END
)
WHERE name = 'Admin';

-- Note: Recruiter and Hiring Manager roles are not updated
-- They will have these permissions disabled by default as requested
