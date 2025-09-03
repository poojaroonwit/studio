-- Initialize FitScan database with default data
-- This script works with the postgres user and studio_production database

-- Create default admin user (password: nccadmin)
INSERT INTO "User" (id, name, email, password, role, "authentication_method", "force_password_change", "createdAt", "updatedAt") 
VALUES (
  gen_random_uuid(),
  'Admin User',
  'admin@ncc.com',
  '$2a$10$dwiCxbUtCqnXeB2O8BmiyeWHL0e7rOqahafQAUACsnD4EZ9nGqPx2',
  'Admin',
  'basic',
  false,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Note: No default positions created - positions should be added through the UI

-- Create default recruitment stages
INSERT INTO "RecruitmentStage" (id, name, description, "is_system", "sort_order")
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Applied', 'Candidate has submitted their application', true, 1),
  ('550e8400-e29b-41d4-a716-446655440002', 'Screening', 'Initial screening of candidate qualifications', true, 2),
  ('550e8400-e29b-41d4-a716-446655440003', 'Shortlisted', 'Candidate has been shortlisted for further consideration', true, 3),
  ('550e8400-e29b-41d4-a716-446655440004', 'Interview Scheduled', 'Interview has been scheduled with the candidate', true, 4),
  ('550e8400-e29b-41d4-a716-446655440005', 'Interviewing', 'Candidate is currently in the interview process', true, 5),
  ('550e8400-e29b-41d4-a716-446655440006', 'Offer Extended', 'Job offer has been extended to the candidate', true, 6),
  ('550e8400-e29b-41d4-a716-446655440007', 'Offer Accepted', 'Candidate has accepted the job offer', true, 7),
  ('550e8400-e29b-41d4-a716-446655440008', 'Hired', 'Candidate has been hired and started employment', true, 8),
  ('550e8400-e29b-41d4-a716-446655440009', 'Rejected', 'Candidate has been rejected from the process', true, 9),
  ('550e8400-e29b-41d4-a716-446655440010', 'On Hold', 'Candidate application is temporarily on hold', true, 10)
ON CONFLICT (name) DO NOTHING;

-- Create default user groups
INSERT INTO "UserGroup" (id, name, description, permissions, "is_default", "is_system_role", "createdAt", "updatedAt")
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Admin', 'Full system access', ARRAY['CANDIDATES_VIEW','CANDIDATES_VIEW_DETAILED','CANDIDATES_CREATE','CANDIDATES_EDIT_BASIC','CANDIDATES_EDIT_SENSITIVE','CANDIDATES_DELETE','CANDIDATES_SOURCE_ASSIGN','CANDIDATES_SOURCE_ASSIGN_BULK','CANDIDATES_RECRUITER_ASSIGN','CANDIDATES_RECRUITER_ASSIGN_BULK','CANDIDATES_PIPELINE_STAGE_UPDATE','CANDIDATES_PIPELINE_STAGE_BULK_UPDATE','CANDIDATES_RESUMES_UPLOAD','CANDIDATES_RESUMES_DELETE','CANDIDATES_COMMENTS_VIEW','CANDIDATES_COMMENTS_ADD','CANDIDATES_COMMENTS_EDIT','CANDIDATES_IMPORT','CANDIDATES_EXPORT','TASK_BOARD_VIEW','TASK_BOARD_MANAGE_OWN','TASK_BOARD_MANAGE_ALL','JOB_MATCH_VIEW','JOB_MATCH_MANAGE','POSITIONS_VIEW','POSITIONS_CREATE','POSITIONS_EDIT_BASIC','POSITIONS_EDIT_DETAILED','POSITIONS_RECRUITER_ASSIGN','POSITIONS_DELETE','POSITIONS_IMPORT','POSITIONS_EXPORT','USERS_VIEW','USERS_CREATE','USERS_EDIT','USERS_DELETE','USERS_PERMISSIONS_MANAGE','USER_GROUPS_VIEW','USER_GROUPS_CREATE','USER_GROUPS_EDIT','USER_GROUPS_DELETE','SYSTEM_SETTINGS_VIEW','SYSTEM_SETTINGS_EDIT','RECRUITMENT_STAGES_VIEW','RECRUITMENT_STAGES_EDIT','CUSTOM_FIELDS_VIEW','CUSTOM_FIELDS_EDIT','WEBHOOKS_VIEW','WEBHOOKS_EDIT','AI_INTEGRATION_VIEW','AI_INTEGRATION_EDIT','UPLOAD_QUEUE_VIEW','UPLOAD_QUEUE_MANAGE','BULK_UPLOAD_EXECUTE','DASHBOARD_VIEW','REPORTS_GENERATE','WEBHOOK_ANALYTICS_VIEW','LOGS_VIEW','LOGS_EXPORT','APP_PERFORMANCE_VIEW','WARNING_CONFIGURATIONS_VIEW','WARNING_CONFIGURATIONS_MANAGE','USER_PREFERENCES_MANAGE_OWN','USER_PREFERENCES_MANAGE_ALL'], true, true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'Recruiters', 'Can manage candidates and positions', ARRAY['CANDIDATES_VIEW','CANDIDATES_VIEW_DETAILED','CANDIDATES_CREATE','CANDIDATES_EDIT_BASIC','CANDIDATES_SOURCE_ASSIGN','CANDIDATES_RECRUITER_ASSIGN','CANDIDATES_PIPELINE_STAGE_UPDATE','CANDIDATES_RESUMES_UPLOAD','CANDIDATES_COMMENTS_VIEW','CANDIDATES_COMMENTS_ADD','CANDIDATES_IMPORT','CANDIDATES_EXPORT','TASK_BOARD_VIEW','TASK_BOARD_MANAGE_OWN','POSITIONS_VIEW','POSITIONS_CREATE','POSITIONS_EDIT_BASIC','POSITIONS_RECRUITER_ASSIGN','POSITIONS_IMPORT','POSITIONS_EXPORT','RECRUITMENT_STAGES_VIEW','USER_PREFERENCES_MANAGE_OWN','BULK_UPLOAD_EXECUTE','DASHBOARD_VIEW','REPORTS_GENERATE'], true, false, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Hiring Manager', 'Can view candidates and positions', ARRAY['CANDIDATES_VIEW','CANDIDATES_VIEW_DETAILED','CANDIDATES_COMMENTS_VIEW','POSITIONS_VIEW','TASK_BOARD_VIEW','DASHBOARD_VIEW','USER_PREFERENCES_MANAGE_OWN'], true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Assign admin user to Admin group
INSERT INTO "User_UserGroup" ("userId", "groupId")
SELECT u.id, '00000000-0000-0000-0000-000000000001'
FROM "User" u
WHERE u.email = 'admin@ncc.com'
ON CONFLICT ("userId", "groupId") DO NOTHING;

 