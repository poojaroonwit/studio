-- Migration: Add _ALL permission types to existing user groups
-- This migration adds the new _ALL permission types to existing user groups

-- Update Admin role permissions to include _ALL permissions
UPDATE "UserGroup" 
SET permissions = array_cat(permissions, ARRAY[
  'applicantS_EDIT_BASIC_ALL',
  'applicantS_EDIT_SENSITIVE_ALL', 
  'applicantS_RECRUITER_ASSIGN_ALL',
  'applicantS_PIPELINE_STAGE_UPDATE_ALL',
  'applicantS_RESUMES_UPLOAD_ALL',
  'applicantS_COMMENTS_ADD_ALL'
])
WHERE name = 'Admin' AND 'applicantS_EDIT_BASIC_ALL' != ALL(permissions);

-- Update Recruiter role permissions to include _ALL permissions
UPDATE "UserGroup" 
SET permissions = array_cat(permissions, ARRAY[
  'applicantS_EDIT_BASIC_ALL',
  'applicantS_RECRUITER_ASSIGN_ALL',
  'applicantS_PIPELINE_STAGE_UPDATE_ALL',
  'applicantS_RESUMES_UPLOAD_ALL',
  'applicantS_COMMENTS_ADD_ALL'
])
WHERE name = 'Recruiter' AND 'applicantS_EDIT_BASIC_ALL' != ALL(permissions);

-- Create a new "Senior Recruiter" role with _ALL permissions
INSERT INTO "UserGroup" (id, name, description, permissions, "isDefault", "isSystemRole", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'Senior Recruiter',
  'Senior recruiter with access to all applicants',
  ARRAY[
    'applicantS_VIEW',
    'applicantS_VIEW_DETAILED', 
    'applicantS_CREATE',
    'applicantS_EDIT_BASIC_ALL',
    'applicantS_EDIT_SENSITIVE_ALL',
    'applicantS_RECRUITER_ASSIGN_ALL',
    'applicantS_PIPELINE_STAGE_UPDATE_ALL',
    'applicantS_RESUMES_UPLOAD_ALL',
    'applicantS_COMMENTS_ADD_ALL',
    'applicantS_IMPORT',
    'applicantS_EXPORT'
  ],
  false,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "UserGroup" WHERE name = 'Senior Recruiter');
