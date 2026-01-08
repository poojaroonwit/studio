-- Migration: Add _ALL permission types to existing user groups
-- This migration adds the new _ALL permission types to existing user groups

-- Update Admin role permissions to include _ALL permissions
UPDATE "UserGroup" 
SET permissions = array_cat(permissions, ARRAY[
  'CANDIDATES_EDIT_BASIC_ALL',
  'CANDIDATES_EDIT_SENSITIVE_ALL', 
  'CANDIDATES_RECRUITER_ASSIGN_ALL',
  'CANDIDATES_PIPELINE_STAGE_UPDATE_ALL',
  'CANDIDATES_RESUMES_UPLOAD_ALL',
  'CANDIDATES_COMMENTS_ADD_ALL'
])
WHERE name = 'Admin' AND 'CANDIDATES_EDIT_BASIC_ALL' != ALL(permissions);

-- Update Recruiter role permissions to include _ALL permissions
UPDATE "UserGroup" 
SET permissions = array_cat(permissions, ARRAY[
  'CANDIDATES_EDIT_BASIC_ALL',
  'CANDIDATES_RECRUITER_ASSIGN_ALL',
  'CANDIDATES_PIPELINE_STAGE_UPDATE_ALL',
  'CANDIDATES_RESUMES_UPLOAD_ALL',
  'CANDIDATES_COMMENTS_ADD_ALL'
])
WHERE name = 'Recruiter' AND 'CANDIDATES_EDIT_BASIC_ALL' != ALL(permissions);

-- Create a new "Senior Recruiter" role with _ALL permissions
INSERT INTO "UserGroup" (id, name, description, permissions, "isDefault", "isSystemRole", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'Senior Recruiter',
  'Senior recruiter with access to all candidates',
  ARRAY[
    'CANDIDATES_VIEW',
    'CANDIDATES_VIEW_DETAILED', 
    'CANDIDATES_CREATE',
    'CANDIDATES_EDIT_BASIC_ALL',
    'CANDIDATES_EDIT_SENSITIVE_ALL',
    'CANDIDATES_RECRUITER_ASSIGN_ALL',
    'CANDIDATES_PIPELINE_STAGE_UPDATE_ALL',
    'CANDIDATES_RESUMES_UPLOAD_ALL',
    'CANDIDATES_COMMENTS_ADD_ALL',
    'CANDIDATES_IMPORT',
    'CANDIDATES_EXPORT'
  ],
  false,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "UserGroup" WHERE name = 'Senior Recruiter');
