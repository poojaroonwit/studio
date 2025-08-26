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
  ('00000000-0000-0000-0000-000000000001', 'Admin', 'Full system access', ARRAY['CANDIDATES_VIEW','CANDIDATES_MANAGE','CANDIDATES_IMPORT','CANDIDATES_EXPORT','CANDIDATES_COMMENTS','CANDIDATES_RESUMES','CANDIDATES_TRANSITIONS','CANDIDATES_RECRUITER_ASSIGN','TASK_BOARD_VIEW','TASK_BOARD_MANAGE_ALL','JOB_MATCH_VIEW','JOB_MATCH_MANAGE','POSITIONS_VIEW','POSITIONS_MANAGE','POSITIONS_IMPORT','POSITIONS_EXPORT','USERS_MANAGE','USER_GROUPS_MANAGE','SYSTEM_SETTINGS_MANAGE','USER_PREFERENCES_MANAGE','RECRUITMENT_STAGES_MANAGE','CUSTOM_FIELDS_MANAGE','WEBHOOK_MAPPING_MANAGE','AI_INTEGRATION_MANAGE','UPLOAD_QUEUE_MANAGE','AUTOMATION_UPLOAD','BULK_UPLOAD','LOGS_VIEW','AUDIT_LOGS_VIEW','WEBHOOK_LOGS_VIEW','DASHBOARD_VIEW','ANALYTICS_VIEW','WEBHOOK_ANALYTICS_VIEW'], true, true, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'Recruiter', 'Can manage candidates and positions', ARRAY['CANDIDATES_VIEW','CANDIDATES_MANAGE','CANDIDATES_IMPORT','CANDIDATES_EXPORT','CANDIDATES_COMMENTS','CANDIDATES_RESUMES','CANDIDATES_TRANSITIONS','CANDIDATES_RECRUITER_ASSIGN','TASK_BOARD_VIEW','POSITIONS_VIEW','POSITIONS_MANAGE','POSITIONS_IMPORT','POSITIONS_EXPORT','RECRUITMENT_STAGES_MANAGE','USER_PREFERENCES_MANAGE','BULK_UPLOAD','AUTOMATION_UPLOAD','DASHBOARD_VIEW','ANALYTICS_VIEW'], true, false, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Hiring Manager', 'Can view candidates and positions', ARRAY['CANDIDATES_VIEW','POSITIONS_VIEW','TASK_BOARD_VIEW','DASHBOARD_VIEW','USER_PREFERENCES_MANAGE'], true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Assign admin user to Admin group
INSERT INTO "User_UserGroup" ("userId", "groupId")
SELECT u.id, '00000000-0000-0000-0000-000000000001'
FROM "User" u
WHERE u.email = 'admin@ncc.com'
ON CONFLICT ("userId", "groupId") DO NOTHING;

 