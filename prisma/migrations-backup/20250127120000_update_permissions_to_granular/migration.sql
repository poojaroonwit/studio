-- Migration: Update permissions to granular system
-- This migration updates existing UserGroup permissions from old broad permissions to new granular permissions

-- Update Admin role permissions
UPDATE "UserGroup" 
SET permissions = ARRAY[
  -- Dashboard & Reports
  'DASHBOARD_VIEW',
  'REPORTS_GENERATE',
  
  -- Candidates - View & Create
  'CANDIDATES_VIEW',
  'CANDIDATES_VIEW_DETAILED',
  'CANDIDATES_CREATE',
  'CANDIDATES_EDIT_BASIC',
  'CANDIDATES_EDIT_SENSITIVE',
  'CANDIDATES_DELETE',
  
  -- Candidates - Source Management
  'CANDIDATES_SOURCE_ASSIGN',
  'CANDIDATES_SOURCE_ASSIGN_BULK',
  
  -- Candidates - Recruiter Management
  'CANDIDATES_RECRUITER_ASSIGN',
  'CANDIDATES_RECRUITER_ASSIGN_BULK',
  
  -- Candidates - Pipeline Management
  'CANDIDATES_PIPELINE_STAGE_UPDATE',
  'CANDIDATES_PIPELINE_STAGE_BULK_UPDATE',
  
  -- Candidates - Documents & Comments
  'CANDIDATES_RESUMES_UPLOAD',
  'CANDIDATES_RESUMES_DELETE',
  'CANDIDATES_COMMENTS_VIEW',
  'CANDIDATES_COMMENTS_ADD',
  'CANDIDATES_COMMENTS_EDIT',
  'CANDIDATES_COMMENTS_DELETE',
  
  -- Candidates - Import/Export
  'CANDIDATES_IMPORT',
  'CANDIDATES_EXPORT',
  
  -- Positions
  'POSITIONS_VIEW',
  'POSITIONS_CREATE',
  'POSITIONS_EDIT_BASIC',
  'POSITIONS_EDIT_DETAILED',
  'POSITIONS_RECRUITER_ASSIGN',
  'POSITIONS_DELETE',
  'POSITIONS_IMPORT',
  'POSITIONS_EXPORT',
  
  -- Users & User Groups
  'USERS_VIEW',
  'USERS_CREATE',
  'USERS_EDIT',
  'USERS_DELETE',
  'USERS_PERMISSIONS_MANAGE',
  'USER_GROUPS_VIEW',
  'USER_GROUPS_CREATE',
  'USER_GROUPS_EDIT',
  'USER_GROUPS_DELETE',
  
  -- Task Board
  'TASK_BOARD_VIEW',
  'TASK_BOARD_MANAGE_OWN',
  'TASK_BOARD_MANAGE_ALL',
  
  -- Recruitment Stages
  'RECRUITMENT_STAGES_VIEW',
  'RECRUITMENT_STAGES_CREATE',
  'RECRUITMENT_STAGES_EDIT',
  'RECRUITMENT_STAGES_DELETE',
  
  -- User Preferences
  'USER_PREFERENCES_MANAGE_OWN',
  'USER_PREFERENCES_MANAGE_ALL',
  
  -- Bulk Upload
  'BULK_UPLOAD_EXECUTE',
  
  -- System Settings
  'SYSTEM_SETTINGS_VIEW',
  'SYSTEM_SETTINGS_EDIT'
]
WHERE name = 'Admin';

-- Update Recruiter role permissions
UPDATE "UserGroup" 
SET permissions = ARRAY[
  -- Dashboard
  'DASHBOARD_VIEW',
  
  -- Candidates - View & Basic Edit
  'CANDIDATES_VIEW',
  'CANDIDATES_VIEW_DETAILED',
  'CANDIDATES_CREATE',
  'CANDIDATES_EDIT_BASIC',
  
  -- Candidates - Source Management
  'CANDIDATES_SOURCE_ASSIGN',
  
  -- Candidates - Recruiter Management
  'CANDIDATES_RECRUITER_ASSIGN',
  
  -- Candidates - Pipeline Management
  'CANDIDATES_PIPELINE_STAGE_UPDATE',
  
  -- Candidates - Documents & Comments
  'CANDIDATES_RESUMES_UPLOAD',
  'CANDIDATES_COMMENTS_VIEW',
  'CANDIDATES_COMMENTS_ADD',
  
  -- Candidates - Import/Export
  'CANDIDATES_IMPORT',
  'CANDIDATES_EXPORT',
  
  -- Positions
  'POSITIONS_VIEW',
  'POSITIONS_CREATE',
  'POSITIONS_EDIT_BASIC',
  'POSITIONS_RECRUITER_ASSIGN',
  'POSITIONS_IMPORT',
  'POSITIONS_EXPORT',
  
  -- Task Board
  'TASK_BOARD_VIEW',
  'TASK_BOARD_MANAGE_OWN',
  
  -- Recruitment Stages
  'RECRUITMENT_STAGES_VIEW',
  
  -- User Preferences
  'USER_PREFERENCES_MANAGE_OWN',
  
  -- Bulk Upload
  'BULK_UPLOAD_EXECUTE'
]
WHERE name = 'Recruiter';

-- Update any other roles that might have old permissions
-- Replace old broad permissions with new granular ones
UPDATE "UserGroup" 
SET permissions = array_replace(
  permissions,
  'CANDIDATES_MANAGE',
  'CANDIDATES_CREATE'
)
WHERE 'CANDIDATES_MANAGE' = ANY(permissions);

UPDATE "UserGroup" 
SET permissions = array_replace(
  permissions,
  'POSITIONS_MANAGE',
  'POSITIONS_CREATE'
)
WHERE 'POSITIONS_MANAGE' = ANY(permissions);

UPDATE "UserGroup" 
SET permissions = array_replace(
  permissions,
  'USERS_MANAGE',
  'USERS_VIEW'
)
WHERE 'USERS_MANAGE' = ANY(permissions);

UPDATE "UserGroup" 
SET permissions = array_replace(
  permissions,
  'CANDIDATES_STATUS_CHANGE',
  'CANDIDATES_PIPELINE_STAGE_UPDATE'
)
WHERE 'CANDIDATES_STATUS_CHANGE' = ANY(permissions);

UPDATE "UserGroup" 
SET permissions = array_replace(
  permissions,
  'CANDIDATES_STATUS_BULK_CHANGE',
  'CANDIDATES_PIPELINE_STAGE_BULK_UPDATE'
)
WHERE 'CANDIDATES_STATUS_BULK_CHANGE' = ANY(permissions);

UPDATE "UserGroup" 
SET permissions = array_replace(
  permissions,
  'POSITIONS_EDIT',
  'POSITIONS_EDIT_BASIC'
)
WHERE 'POSITIONS_EDIT' = ANY(permissions);

-- Add missing permissions that might be needed for basic functionality
UPDATE "UserGroup" 
SET permissions = array_append(permissions, 'DASHBOARD_VIEW')
WHERE name != 'Admin' AND name != 'Recruiter' AND NOT ('DASHBOARD_VIEW' = ANY(permissions));

UPDATE "UserGroup" 
SET permissions = array_append(permissions, 'CANDIDATES_VIEW')
WHERE name != 'Admin' AND name != 'Recruiter' AND NOT ('CANDIDATES_VIEW' = ANY(permissions));

UPDATE "UserGroup" 
SET permissions = array_append(permissions, 'POSITIONS_VIEW')
WHERE name != 'Admin' AND name != 'Recruiter' AND NOT ('POSITIONS_VIEW' = ANY(permissions));
