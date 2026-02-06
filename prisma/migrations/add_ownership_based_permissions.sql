-- Migration: Add ownership-based permissions to existing user groups
-- This migration adds the new ownership-based permissions to existing user groups

-- Update Admin role permissions to include ownership-based permissions
UPDATE "UserGroup" 
SET permissions = array_cat(permissions, ARRAY[
  'applicantS_EDIT_BASIC_OWN',
  'applicantS_EDIT_SENSITIVE_OWN', 
  'applicantS_RECRUITER_ASSIGN_OWN',
  'applicantS_PIPELINE_STAGE_UPDATE_OWN',
  'applicantS_RESUMES_UPLOAD_OWN',
  'applicantS_COMMENTS_ADD_OWN'
])
WHERE name = 'Admin' AND 'applicantS_EDIT_BASIC_OWN' != ALL(permissions);

-- Update Recruiter role permissions to include ownership-based permissions
UPDATE "UserGroup" 
SET permissions = array_cat(permissions, ARRAY[
  'applicantS_EDIT_BASIC_OWN',
  'applicantS_RECRUITER_ASSIGN_OWN',
  'applicantS_PIPELINE_STAGE_UPDATE_OWN',
  'applicantS_RESUMES_UPLOAD_OWN',
  'applicantS_COMMENTS_ADD_OWN'
])
WHERE name = 'Recruiter' AND 'applicantS_EDIT_BASIC_OWN' != ALL(permissions);

-- Create a new "Limited Recruiter" role with only ownership-based permissions
INSERT INTO "UserGroup" (id, name, description, permissions, "isDefault", "isSystemRole", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'Limited Recruiter',
  'Recruiter with access only to own assigned applicants',
  ARRAY[
    'applicantS_VIEW',
    'applicantS_VIEW_DETAILED', 
    'applicantS_CREATE',
    'applicantS_EDIT_BASIC_OWN',
    'applicantS_SOURCE_ASSIGN',
    'applicantS_RECRUITER_ASSIGN_OWN',
    'applicantS_PIPELINE_STAGE_UPDATE_OWN',
    'applicantS_RESUMES_UPLOAD_OWN',
    'applicantS_COMMENTS_VIEW',
    'applicantS_COMMENTS_ADD_OWN',
    'applicantS_IMPORT',
    'applicantS_EXPORT',
    'POSITIONS_VIEW',
    'POSITIONS_CREATE',
    'POSITIONS_EDIT_BASIC',
    'POSITIONS_RECRUITER_ASSIGN',
    'POSITIONS_IMPORT',
    'POSITIONS_EXPORT',
    'TASK_BOARD_VIEW',
    'TASK_BOARD_MANAGE_OWN',
    'RECRUITMENT_STAGES_VIEW',
    'USER_PREFERENCES_MANAGE_OWN',
    'BULK_UPLOAD_EXECUTE',
    'DASHBOARD_VIEW',
    'REPORTS_GENERATE'
  ],
  false,
  false,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "UserGroup" WHERE name = 'Limited Recruiter');

-- Log the migration
INSERT INTO "AuditLog" (id, level, message, source, "actingUserId", details, "createdAt")
VALUES (
  gen_random_uuid(),
  'INFO',
  'Ownership-based permissions migration completed',
  'Migration:AddOwnershipBasedPermissions',
  NULL,
  '{"migration": "add_ownership_based_permissions", "timestamp": "' || NOW() || '"}',
  NOW()
);
