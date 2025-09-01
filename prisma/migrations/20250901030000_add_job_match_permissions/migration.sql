-- Add Job Match Permissions Migration
-- This script adds the new JOB_MATCH_VIEW and JOB_MATCH_MANAGE permissions to the Admin role
-- All other roles will have these permissions disabled by default

-- Update Admin role to include new job match permissions
UPDATE "UserGroup" 
SET permissions = array_append(permissions, 'JOB_MATCH_VIEW', 'JOB_MATCH_MANAGE')
WHERE name = 'Admin' 
AND NOT ('JOB_MATCH_VIEW' = ANY(permissions))
AND NOT ('JOB_MATCH_MANAGE' = ANY(permissions));

-- Note: Recruiter and Hiring Manager roles are not updated
-- They will have these permissions disabled by default as requested
