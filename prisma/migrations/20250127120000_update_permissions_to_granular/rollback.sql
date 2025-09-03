-- Rollback Migration: Revert permissions to old broad system
-- This migration reverts UserGroup permissions back to the old broad permissions

-- Revert Admin role permissions to old broad permissions
UPDATE "UserGroup" 
SET permissions = ARRAY[
  'DASHBOARD_VIEW',
  'CANDIDATES_MANAGE',
  'POSITIONS_MANAGE',
  'USERS_MANAGE',
  'TASK_BOARD_MANAGE',
  'RECRUITMENT_STAGES_MANAGE',
  'SYSTEM_SETTINGS_MANAGE',
  'BULK_UPLOAD_MANAGE'
]
WHERE name = 'Admin';

-- Revert Recruiter role permissions to old broad permissions
UPDATE "UserGroup" 
SET permissions = ARRAY[
  'DASHBOARD_VIEW',
  'CANDIDATES_VIEW',
  'CANDIDATES_CREATE',
  'CANDIDATES_EDIT',
  'CANDIDATES_STATUS_CHANGE',
  'POSITIONS_VIEW',
  'POSITIONS_CREATE',
  'POSITIONS_EDIT',
  'TASK_BOARD_VIEW',
  'TASK_BOARD_MANAGE_OWN'
]
WHERE name = 'Recruiters';

-- Revert any other roles that might have been updated
-- Replace new granular permissions with old broad ones
UPDATE "UserGroup" 
SET permissions = array_replace(
  permissions,
  'CANDIDATES_CREATE',
  'CANDIDATES_MANAGE'
)
WHERE 'CANDIDATES_CREATE' = ANY(permissions) AND 'CANDIDATES_EDIT_BASIC' = ANY(permissions);

UPDATE "UserGroup" 
SET permissions = array_replace(
  permissions,
  'POSITIONS_CREATE',
  'POSITIONS_MANAGE'
)
WHERE 'POSITIONS_CREATE' = ANY(permissions) AND 'POSITIONS_EDIT_BASIC' = ANY(permissions);

UPDATE "UserGroup" 
SET permissions = array_replace(
  permissions,
  'USERS_VIEW',
  'USERS_MANAGE'
)
WHERE 'USERS_VIEW' = ANY(permissions) AND 'USERS_CREATE' = ANY(permissions);

UPDATE "UserGroup" 
SET permissions = array_replace(
  permissions,
  'CANDIDATES_PIPELINE_STAGE_UPDATE',
  'CANDIDATES_STATUS_CHANGE'
)
WHERE 'CANDIDATES_PIPELINE_STAGE_UPDATE' = ANY(permissions);

UPDATE "UserGroup" 
SET permissions = array_replace(
  permissions,
  'CANDIDATES_PIPELINE_STAGE_BULK_UPDATE',
  'CANDIDATES_STATUS_BULK_CHANGE'
)
WHERE 'CANDIDATES_PIPELINE_STAGE_BULK_UPDATE' = ANY(permissions);

UPDATE "UserGroup" 
SET permissions = array_replace(
  permissions,
  'POSITIONS_EDIT_BASIC',
  'POSITIONS_EDIT'
)
WHERE 'POSITIONS_EDIT_BASIC' = ANY(permissions);
