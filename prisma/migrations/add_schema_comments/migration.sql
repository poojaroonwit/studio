-- Add comprehensive schema documentation comments
-- Generated from Prisma schema for studio-2 project

-- =====================================================
-- USER MANAGEMENT TABLES
-- =====================================================

-- User: Core user accounts and authentication
COMMENT ON TABLE "User" IS 'User accounts with authentication, roles, and profile information';
COMMENT ON COLUMN "User"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "User"."name" IS 'Full name of the user';
COMMENT ON COLUMN "User"."email" IS 'Unique email address for login';
COMMENT ON COLUMN "User"."password" IS 'Hashed password for authentication';
COMMENT ON COLUMN "User"."role" IS 'User role for authorization (admin, recruiter, etc.)';
COMMENT ON COLUMN "User"."avatarUrl" IS 'URL to user avatar image';
COMMENT ON COLUMN "User"."image" IS 'URL to user profile image';
COMMENT ON COLUMN "User"."dataAiHint" IS 'AI personalization hints for this user';
COMMENT ON COLUMN "User"."authentication_method" IS 'Authentication method (basic, azure, etc.)';
COMMENT ON COLUMN "User"."force_password_change" IS 'Flag to force password change on next login';
COMMENT ON COLUMN "User"."emailVerified" IS 'Timestamp when email was verified';
COMMENT ON COLUMN "User"."is_active" IS 'Whether the user account is active';
COMMENT ON COLUMN "User"."createdAt" IS 'Account creation timestamp';
COMMENT ON COLUMN "User"."updatedAt" IS 'Last profile update timestamp';
COMMENT ON COLUMN "User"."azure_oid" IS 'Azure Active Directory object ID';
COMMENT ON COLUMN "User"."userGroupId" IS 'Foreign key to UserGroup - role-based permissions';
COMMENT ON COLUMN "User"."userTeamId" IS 'Foreign key to UserTeam - team assignment';
COMMENT ON COLUMN "User"."module_permissions" IS 'Array of module-level permissions';
COMMENT ON COLUMN "User"."personal_color" IS 'User preferred UI color theme';

-- UserGroup: Role-based access control groups
COMMENT ON TABLE "UserGroup" IS 'User groups for role-based access control and permissions';
COMMENT ON COLUMN "UserGroup"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "UserGroup"."name" IS 'Unique group name (e.g., Admin, Recruiter)';
COMMENT ON COLUMN "UserGroup"."description" IS 'Description of group purpose and permissions';
COMMENT ON COLUMN "UserGroup"."permissions" IS 'Array of permission strings for this group';
COMMENT ON COLUMN "UserGroup"."is_default" IS 'Whether this is the default group for new users';
COMMENT ON COLUMN "UserGroup"."is_system_role" IS 'Whether this is a system-managed role';
COMMENT ON COLUMN "UserGroup"."createdAt" IS 'Group creation timestamp';
COMMENT ON COLUMN "UserGroup"."updatedAt" IS 'Last group update timestamp';

-- UserTeam: Team organization for users
COMMENT ON TABLE "UserTeam" IS 'Teams for organizing users into working groups';
COMMENT ON COLUMN "UserTeam"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "UserTeam"."name" IS 'Unique team name';
COMMENT ON COLUMN "UserTeam"."description" IS 'Team description and purpose';
COMMENT ON COLUMN "UserTeam"."color" IS 'Team color for UI display';
COMMENT ON COLUMN "UserTeam"."is_active" IS 'Whether the team is currently active';
COMMENT ON COLUMN "UserTeam"."createdAt" IS 'Team creation timestamp';
COMMENT ON COLUMN "UserTeam"."updatedAt" IS 'Last team update timestamp';

-- Account: External authentication provider accounts
COMMENT ON TABLE "Account" IS 'External authentication provider accounts linked to users';
COMMENT ON COLUMN "Account"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "Account"."userId" IS 'Foreign key to User - account owner';
COMMENT ON COLUMN "Account"."type" IS 'Account type (oauth, credentials, etc.)';
COMMENT ON COLUMN "Account"."provider" IS 'Authentication provider (google, azure, etc.)';
COMMENT ON COLUMN "Account"."providerAccountId" IS 'Account ID from the provider';
COMMENT ON COLUMN "Account"."refresh_token" IS 'OAuth refresh token';
COMMENT ON COLUMN "Account"."access_token" IS 'OAuth access token';
COMMENT ON COLUMN "Account"."expires_at" IS 'Token expiration timestamp';
COMMENT ON COLUMN "Account"."token_type" IS 'Type of token (Bearer, etc.)';
COMMENT ON COLUMN "Account"."scope" IS 'OAuth scopes granted';
COMMENT ON COLUMN "Account"."id_token" IS 'OpenID Connect ID token';
COMMENT ON COLUMN "Account"."session_state" IS 'OAuth session state';

-- =====================================================
-- POSITION AND RECRUITMENT TABLES
-- =====================================================

-- Position: Job positions and requisitions
COMMENT ON TABLE "Position" IS 'Job positions, requisitions, and open roles';
COMMENT ON COLUMN "Position"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "Position"."title" IS 'Job title or position name';
COMMENT ON COLUMN "Position"."department" IS 'Department or business unit';
COMMENT ON COLUMN "Position"."description" IS 'Detailed job description';
COMMENT ON COLUMN "Position"."matchCriteria" IS 'Criteria for applicant matching';
COMMENT ON COLUMN "Position"."isOpen" IS 'Whether the position is currently open';
COMMENT ON COLUMN "Position"."positionLevel" IS 'Position level or seniority';
COMMENT ON COLUMN "Position"."recruiterId" IS 'Foreign key to User - assigned recruiter';
COMMENT ON COLUMN "Position"."customAttributes" IS 'Custom position attributes (JSON)';
COMMENT ON COLUMN "Position"."createdAt" IS 'Position creation timestamp';
COMMENT ON COLUMN "Position"."updatedAt" IS 'Last position update timestamp';
COMMENT ON COLUMN "Position"."companyId" IS 'Company identifier (if multi-tenant)';
COMMENT ON COLUMN "Position"."gradeId" IS 'Foreign key to Grade - position grade/band';
COMMENT ON COLUMN "Position"."positionAttribute" IS 'Additional position attributes';

-- Grade: Position grading and banding system
COMMENT ON TABLE "Grade" IS 'Position grades, bands, and levels with SLA requirements';
COMMENT ON COLUMN "Grade"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "Grade"."name" IS 'Unique grade name (e.g., Senior, Manager)';
COMMENT ON COLUMN "Grade"."label" IS 'Display label for the grade';
COMMENT ON COLUMN "Grade"."description" IS 'Grade description and requirements';
COMMENT ON COLUMN "Grade"."min_level" IS 'Minimum level number for this grade';
COMMENT ON COLUMN "Grade"."max_level" IS 'Maximum level number for this grade';
COMMENT ON COLUMN "Grade"."sla_days" IS 'SLA requirement in days for this grade';
COMMENT ON COLUMN "Grade"."color" IS 'Display color for this grade';
COMMENT ON COLUMN "Grade"."is_active" IS 'Whether this grade is currently active';
COMMENT ON COLUMN "Grade"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "Grade"."createdAt" IS 'Grade creation timestamp';
COMMENT ON COLUMN "Grade"."updatedAt" IS 'Last grade update timestamp';

-- PositionLevel: Predefined position levels
COMMENT ON TABLE "PositionLevel" IS 'Predefined position levels and seniority tiers';
COMMENT ON COLUMN "PositionLevel"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "PositionLevel"."name" IS 'Unique level name (e.g., Junior, Senior)';
COMMENT ON COLUMN "PositionLevel"."description" IS 'Level description and requirements';
COMMENT ON COLUMN "PositionLevel"."color" IS 'Display color for this level';
COMMENT ON COLUMN "PositionLevel"."is_active" IS 'Whether this level is currently active';
COMMENT ON COLUMN "PositionLevel"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "PositionLevel"."createdAt" IS 'Level creation timestamp';
COMMENT ON COLUMN "PositionLevel"."updatedAt" IS 'Last level update timestamp';

-- =====================================================
-- applicant MANAGEMENT TABLES
-- =====================================================

-- applicant: Job applicants and applicants
COMMENT ON TABLE "applicant" IS 'Job applicants, applicants, and talent pool members';
COMMENT ON COLUMN "applicant"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "applicant"."name" IS 'applicant full name';
COMMENT ON COLUMN "applicant"."email" IS 'applicant email address';
COMMENT ON COLUMN "applicant"."phone" IS 'applicant phone number';
COMMENT ON COLUMN "applicant"."positionId" IS 'Foreign key to Position - applied position';
COMMENT ON COLUMN "applicant"."recruiterId" IS 'Foreign key to User - assigned recruiter';
COMMENT ON COLUMN "applicant"."fitScore" IS 'AI-calculated fit score (0-100)';
COMMENT ON COLUMN "applicant"."applicationDate" IS 'Date when applicant applied';
COMMENT ON COLUMN "applicant"."parsedData" IS 'Parsed resume/CV data (JSON)';
COMMENT ON COLUMN "applicant"."customAttributes" IS 'Custom applicant attributes (JSON)';
COMMENT ON COLUMN "applicant"."resumePath" IS 'File path to stored resume';
COMMENT ON COLUMN "applicant"."createdAt" IS 'applicant creation timestamp';
COMMENT ON COLUMN "applicant"."updatedAt" IS 'Last applicant update timestamp';
COMMENT ON COLUMN "applicant"."avatarUrl" IS 'applicant avatar image URL';
COMMENT ON COLUMN "applicant"."dataAiHint" IS 'AI hints for applicant processing';
COMMENT ON COLUMN "applicant"."assignmentJustification" IS 'Notes on recruiter assignment decisions';
COMMENT ON COLUMN "applicant"."educationData" IS 'Education history (JSON array)';
COMMENT ON COLUMN "applicant"."experienceData" IS 'Work experience history (JSON array)';
COMMENT ON COLUMN "applicant"."companyId" IS 'Company identifier (if multi-tenant)';
COMMENT ON COLUMN "applicant"."sourceId" IS 'Foreign key to applicantSource - application source';
COMMENT ON COLUMN "applicant"."subSource" IS 'Sub-source identifier (e.g., specific job board)';
COMMENT ON COLUMN "applicant"."statusId" IS 'Foreign key to RecruitmentStage - current stage';
COMMENT ON COLUMN "applicant"."isPinned" IS 'Whether applicant is pinned by users';
COMMENT ON COLUMN "applicant"."pinnedAt" IS 'Timestamp when applicant was pinned';

-- RecruitmentStage: applicant pipeline stages
COMMENT ON TABLE "RecruitmentStage" IS 'Recruitment pipeline stages and workflow states';
COMMENT ON COLUMN "RecruitmentStage"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "RecruitmentStage"."name" IS 'Unique stage name (e.g., Applied, Interview)';
COMMENT ON COLUMN "RecruitmentStage"."description" IS 'Stage description and requirements';
COMMENT ON COLUMN "RecruitmentStage"."is_system" IS 'Whether this is a system-defined stage';
COMMENT ON COLUMN "RecruitmentStage"."sort_order" IS 'Sort order in pipeline';
COMMENT ON COLUMN "RecruitmentStage"."color_complete" IS 'Color when stage is completed';
COMMENT ON COLUMN "RecruitmentStage"."color_badge" IS 'Badge color for this stage';

-- applicantSource: Sources of applicant applications
COMMENT ON TABLE "applicantSource" IS 'Sources where applicants come from (job boards, referrals, etc.)';
COMMENT ON COLUMN "applicantSource"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "applicantSource"."name" IS 'Unique source name (e.g., LinkedIn, Indeed)';
COMMENT ON COLUMN "applicantSource"."description" IS 'Source description and details';
COMMENT ON COLUMN "applicantSource"."allow_sub_source" IS 'Whether sub-sources are allowed';
COMMENT ON COLUMN "applicantSource"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "applicantSource"."is_active" IS 'Whether this source is currently active';
COMMENT ON COLUMN "applicantSource"."createdAt" IS 'Source creation timestamp';
COMMENT ON COLUMN "applicantSource"."updatedAt" IS 'Last source update timestamp';
COMMENT ON COLUMN "applicantSource"."logo" IS 'Source logo URL';
COMMENT ON COLUMN "applicantSource"."email" IS 'Contact email for this source';

-- TransitionRecord: Audit trail of applicant stage changes
COMMENT ON TABLE "TransitionRecord" IS 'Audit trail of applicant stage and position transitions';
COMMENT ON COLUMN "TransitionRecord"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "TransitionRecord"."applicantId" IS 'Foreign key to applicant';
COMMENT ON COLUMN "TransitionRecord"."positionId" IS 'Foreign key to Position (if applicable)';
COMMENT ON COLUMN "TransitionRecord"."date" IS 'Transition date and time';
COMMENT ON COLUMN "TransitionRecord"."stage" IS 'Stage name at time of transition';
COMMENT ON COLUMN "TransitionRecord"."notes" IS 'Notes about the transition';
COMMENT ON COLUMN "TransitionRecord"."actingUserId" IS 'Foreign key to User - who made the change';
COMMENT ON COLUMN "TransitionRecord"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "TransitionRecord"."updatedAt" IS 'Last record update timestamp';

-- =====================================================
-- HEADCOUNT AND ASSIGNMENT TABLES
-- =====================================================

-- Headcount: Approved positions and applicant assignments
COMMENT ON TABLE "Headcount" IS 'Approved headcount positions and applicant assignments';
COMMENT ON COLUMN "Headcount"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "Headcount"."positionId" IS 'Foreign key to Position';
COMMENT ON COLUMN "Headcount"."type" IS 'Headcount type (new, replacement, etc.)';
COMMENT ON COLUMN "Headcount"."status" IS 'Current status (vacant, filled, etc.)';
COMMENT ON COLUMN "Headcount"."applicantId" IS 'Foreign key to applicant (if filled)';
COMMENT ON COLUMN "Headcount"."onboardingDate" IS 'Planned onboarding date';
COMMENT ON COLUMN "Headcount"."requestDate" IS 'Date when headcount was requested';
COMMENT ON COLUMN "Headcount"."notes" IS 'Headcount notes and details';
COMMENT ON COLUMN "Headcount"."memo_id" IS 'Related memo or document ID';
COMMENT ON COLUMN "Headcount"."custom_fields" IS 'Custom headcount fields (JSON)';
COMMENT ON COLUMN "Headcount"."createdAt" IS 'Headcount creation timestamp';
COMMENT ON COLUMN "Headcount"."updatedAt" IS 'Last headcount update timestamp';

-- =====================================================
-- COMMENTS AND ATTACHMENTS
-- =====================================================

-- applicantComment: Comments on applicants
COMMENT ON TABLE "applicantComment" IS 'Comments and notes on applicants by users';
COMMENT ON COLUMN "applicantComment"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "applicantComment"."applicantId" IS 'Foreign key to applicant';
COMMENT ON COLUMN "applicantComment"."authorId" IS 'Foreign key to User - comment author';
COMMENT ON COLUMN "applicantComment"."content" IS 'Comment content and text';
COMMENT ON COLUMN "applicantComment"."createdAt" IS 'Comment creation timestamp';
COMMENT ON COLUMN "applicantComment"."updatedAt" IS 'Last comment update timestamp';
COMMENT ON COLUMN "applicantComment"."attachmentIds" IS 'Array of attachment IDs';

-- Attachment: File attachments for applicants and headcounts
COMMENT ON TABLE "Attachment" IS 'File attachments for applicants, headcounts, and comments';
COMMENT ON COLUMN "Attachment"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "Attachment"."applicantId" IS 'Foreign key to applicant (optional)';
COMMENT ON COLUMN "Attachment"."uploadedById" IS 'Foreign key to User - who uploaded';
COMMENT ON COLUMN "Attachment"."filePath" IS 'File system path to stored file';
COMMENT ON COLUMN "Attachment"."fileName" IS 'Original file name';
COMMENT ON COLUMN "Attachment"."label" IS 'Attachment label or description';
COMMENT ON COLUMN "Attachment"."isPrimary" IS 'Whether this is the primary attachment';
COMMENT ON COLUMN "Attachment"."uploadedAt" IS 'Upload timestamp';
COMMENT ON COLUMN "Attachment"."updatedAt" IS 'Last attachment update timestamp';
COMMENT ON COLUMN "Attachment"."headcountId" IS 'Foreign key to Headcount (optional)';

-- =====================================================
-- UPLOAD AND PROCESSING TABLES
-- =====================================================

-- UploadQueue: File upload processing queue
COMMENT ON TABLE "upload_queue" IS 'Queue for processing uploaded files (resumes, documents)';
COMMENT ON COLUMN "upload_queue"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "upload_queue"."file_name" IS 'Original file name';
COMMENT ON COLUMN "upload_queue"."file_size" IS 'File size in bytes';
COMMENT ON COLUMN "upload_queue"."status" IS 'Processing status (pending, processing, completed, failed)';
COMMENT ON COLUMN "upload_queue"."error" IS 'Error message if processing failed';
COMMENT ON COLUMN "upload_queue"."error_details" IS 'Detailed error information';
COMMENT ON COLUMN "upload_queue"."source" IS 'Upload source or category';
COMMENT ON COLUMN "upload_queue"."source_id" IS 'Foreign key to applicantSource';
COMMENT ON COLUMN "upload_queue"."sub_source" IS 'Sub-source identifier';
COMMENT ON COLUMN "upload_queue"."upload_date" IS 'Upload timestamp';
COMMENT ON COLUMN "upload_queue"."completed_date" IS 'Processing completion timestamp';
COMMENT ON COLUMN "upload_queue"."upload_id" IS 'External upload identifier';
COMMENT ON COLUMN "upload_queue"."created_by" IS 'Foreign key to User - who initiated upload';
COMMENT ON COLUMN "upload_queue"."updated_at" IS 'Last queue update timestamp';
COMMENT ON COLUMN "upload_queue"."file_path" IS 'File system path to uploaded file';
COMMENT ON COLUMN "upload_queue"."webhook_payload" IS 'Webhook payload data (JSON)';
COMMENT ON COLUMN "upload_queue"."position_id" IS 'Foreign key to Position (if applicable)';
COMMENT ON COLUMN "upload_queue"."process_date" IS 'Processing start timestamp';

-- =====================================================
-- MATCHING AND AI TABLES
-- =====================================================

-- JobMatch: AI-powered job matching results
COMMENT ON TABLE "JobMatch" IS 'AI-powered matching results between applicants and jobs';
COMMENT ON COLUMN "JobMatch"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "JobMatch"."applicantId" IS 'Foreign key to applicant';
COMMENT ON COLUMN "JobMatch"."jobId" IS 'External job identifier';
COMMENT ON COLUMN "JobMatch"."jobTitle" IS 'Job title from external source';
COMMENT ON COLUMN "JobMatch"."fitScore" IS 'AI-calculated match score';
COMMENT ON COLUMN "JobMatch"."matchReasons" IS 'Array of reasons for the match';
COMMENT ON COLUMN "JobMatch"."job_description_summary" IS 'Summary of job description';
COMMENT ON COLUMN "JobMatch"."createdAt" IS 'Match creation timestamp';
COMMENT ON COLUMN "JobMatch"."updatedAt" IS 'Last match update timestamp';
COMMENT ON COLUMN "JobMatch"."companyId" IS 'Company identifier (if multi-tenant)';

-- =====================================================
-- CUSTOM FIELDS AND CONFIGURATION
-- =====================================================

-- CustomFieldDefinition: Dynamic custom field definitions
COMMENT ON TABLE "CustomFieldDefinition" IS 'Definitions for dynamic custom fields across entities';
COMMENT ON COLUMN "CustomFieldDefinition"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "CustomFieldDefinition"."model_name" IS 'Target model name (applicant, Position, etc.)';
COMMENT ON COLUMN "CustomFieldDefinition"."field_key" IS 'Unique field key within model';
COMMENT ON COLUMN "CustomFieldDefinition"."label" IS 'Display label for the field';
COMMENT ON COLUMN "CustomFieldDefinition"."field_type" IS 'Field type (text, select, date, etc.)';
COMMENT ON COLUMN "CustomFieldDefinition"."options" IS 'Field options and configuration (JSON)';
COMMENT ON COLUMN "CustomFieldDefinition"."is_required" IS 'Whether field is required';
COMMENT ON COLUMN "CustomFieldDefinition"."sort_order" IS 'Display sort order';
COMMENT ON COLUMN "CustomFieldDefinition"."createdAt" IS 'Field definition creation timestamp';
COMMENT ON COLUMN "CustomFieldDefinition"."updatedAt" IS 'Last field definition update timestamp';
COMMENT ON COLUMN "CustomFieldDefinition"."allow_custom_options" IS 'Whether users can add custom options';
COMMENT ON COLUMN "CustomFieldDefinition"."attribute_code" IS 'External system attribute code';
COMMENT ON COLUMN "CustomFieldDefinition"."attribute_label" IS 'External system attribute label';
COMMENT ON COLUMN "CustomFieldDefinition"."edit_roles" IS 'Roles allowed to edit this field';
COMMENT ON COLUMN "CustomFieldDefinition"."field_code" IS 'Unique field code';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_applicant_detail" IS 'Show in applicant detail view';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_filter" IS 'Show in filter options';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_full_applicant_detail" IS 'Show in full applicant detail';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_headcount_detail" IS 'Show in headcount detail';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_position_settings" IS 'Show in position settings';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_task_board_filter" IS 'Show in task board filters';
COMMENT ON COLUMN "CustomFieldDefinition"."applicant_detail_section" IS 'Section in applicant detail';
COMMENT ON COLUMN "CustomFieldDefinition"."position_detail_section" IS 'Section in position detail';
COMMENT ON COLUMN "CustomFieldDefinition"."view_roles" IS 'Roles allowed to view this field';

-- CustomFieldOption: Options for custom select fields
COMMENT ON TABLE "CustomFieldOption" IS 'Option values for custom select/dropdown fields';
COMMENT ON COLUMN "CustomFieldOption"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "CustomFieldOption"."custom_field_definition_id" IS 'Foreign key to CustomFieldDefinition';
COMMENT ON COLUMN "CustomFieldOption"."value" IS 'Stored option value';
COMMENT ON COLUMN "CustomFieldOption"."label" IS 'Display label for the option';
COMMENT ON COLUMN "CustomFieldOption"."color" IS 'Display color for the option';
COMMENT ON COLUMN "CustomFieldOption"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "CustomFieldOption"."is_active" IS 'Whether this option is active';
COMMENT ON COLUMN "CustomFieldOption"."createdAt" IS 'Option creation timestamp';
COMMENT ON COLUMN "CustomFieldOption"."updatedAt" IS 'Last option update timestamp';

-- =====================================================
-- SYSTEM CONFIGURATION TABLES
-- =====================================================

-- SystemSetting: Global system configuration
COMMENT ON TABLE "SystemSetting" IS 'Global system configuration key-value pairs';
COMMENT ON COLUMN "SystemSetting"."key" IS 'Primary key - setting key';
COMMENT ON COLUMN "SystemSetting"."value" IS 'Setting value';
COMMENT ON COLUMN "SystemSetting"."createdAt" IS 'Setting creation timestamp';
COMMENT ON COLUMN "SystemSetting"."updatedAt" IS 'Last setting update timestamp';

-- SystemPreference: Per-user system preferences
COMMENT ON TABLE "SystemPreference" IS 'Per-user system preferences and settings';
COMMENT ON COLUMN "SystemPreference"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "SystemPreference"."userId" IS 'Foreign key to User';
COMMENT ON COLUMN "SystemPreference"."key" IS 'Preference key';
COMMENT ON COLUMN "SystemPreference"."value" IS 'Preference value';
COMMENT ON COLUMN "SystemPreference"."createdAt" IS 'Preference creation timestamp';
COMMENT ON COLUMN "SystemPreference"."updatedAt" IS 'Last preference update timestamp';

-- UserUIDisplayPreference: UI display preferences
COMMENT ON TABLE "UserUIDisplayPreference" IS 'Per-user UI display preferences and customizations';
COMMENT ON COLUMN "UserUIDisplayPreference"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "UserUIDisplayPreference"."userId" IS 'Foreign key to User';
COMMENT ON COLUMN "UserUIDisplayPreference"."model_type" IS 'Target model type (applicant, Position, etc.)';
COMMENT ON COLUMN "UserUIDisplayPreference"."attribute_key" IS 'UI attribute key';
COMMENT ON COLUMN "UserUIDisplayPreference"."ui_preference" IS 'UI preference value';
COMMENT ON COLUMN "UserUIDisplayPreference"."custom_note" IS 'Custom note for this preference';
COMMENT ON COLUMN "UserUIDisplayPreference"."createdAt" IS 'Preference creation timestamp';
COMMENT ON COLUMN "UserUIDisplayPreference"."updatedAt" IS 'Last preference update timestamp';

-- =====================================================
-- DASHBOARD AND ANALYTICS TABLES
-- =====================================================

-- Dashboard: User-created analytics dashboards
COMMENT ON TABLE "Dashboard" IS 'User-created analytics dashboards and reports';
COMMENT ON COLUMN "Dashboard"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "Dashboard"."name" IS 'Dashboard name';
COMMENT ON COLUMN "Dashboard"."description" IS 'Dashboard description';
COMMENT ON COLUMN "Dashboard"."userId" IS 'Foreign key to User - dashboard owner';
COMMENT ON COLUMN "Dashboard"."layout" IS 'Dashboard layout type (grid, etc.)';
COMMENT ON COLUMN "Dashboard"."theme" IS 'Dashboard theme';
COMMENT ON COLUMN "Dashboard"."isPublic" IS 'Whether dashboard is publicly shared';
COMMENT ON COLUMN "Dashboard"."createdAt" IS 'Dashboard creation timestamp';
COMMENT ON COLUMN "Dashboard"."updatedAt" IS 'Last dashboard update timestamp';

-- DashboardShare: Dashboard sharing permissions
COMMENT ON TABLE "DashboardShare" IS 'User access permissions for shared dashboards';
COMMENT ON COLUMN "DashboardShare"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "DashboardShare"."dashboardId" IS 'Foreign key to Dashboard';
COMMENT ON COLUMN "DashboardShare"."userId" IS 'Foreign key to User';
COMMENT ON COLUMN "DashboardShare"."permission" IS 'Permission level (view, edit)';
COMMENT ON COLUMN "DashboardShare"."createdAt" IS 'Share creation timestamp';
COMMENT ON COLUMN "DashboardShare"."updatedAt" IS 'Last share update timestamp';

-- DashboardWidget: Widgets on dashboards
COMMENT ON TABLE "DashboardWidget" IS 'Widgets and charts on dashboards';
COMMENT ON COLUMN "DashboardWidget"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "DashboardWidget"."dashboardId" IS 'Foreign key to Dashboard';
COMMENT ON COLUMN "DashboardWidget"."type" IS 'Widget type (chart, table, etc.)';
COMMENT ON COLUMN "DashboardWidget"."title" IS 'Widget title';
COMMENT ON COLUMN "DashboardWidget"."config" IS 'Widget configuration (JSON)';
COMMENT ON COLUMN "DashboardWidget"."position" IS 'Widget position and layout (JSON)';
COMMENT ON COLUMN "DashboardWidget"."dataSource" IS 'Data source for the widget';
COMMENT ON COLUMN "DashboardWidget"."createdAt" IS 'Widget creation timestamp';
COMMENT ON COLUMN "DashboardWidget"."updatedAt" IS 'Last widget update timestamp';

-- =====================================================
-- NOTIFICATIONS AND LOGGING TABLES
-- =====================================================

-- Notification: User notifications
COMMENT ON TABLE "Notification" IS 'User notifications and alerts';
COMMENT ON COLUMN "Notification"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "Notification"."userId" IS 'Foreign key to User';
COMMENT ON COLUMN "Notification"."type" IS 'Notification type (info, warning, error)';
COMMENT ON COLUMN "Notification"."title" IS 'Notification title';
COMMENT ON COLUMN "Notification"."message" IS 'Notification message content';
COMMENT ON COLUMN "Notification"."data" IS 'Additional notification data (JSON)';
COMMENT ON COLUMN "Notification"."isRead" IS 'Whether notification has been read';
COMMENT ON COLUMN "Notification"."createdAt" IS 'Notification creation timestamp';
COMMENT ON COLUMN "Notification"."updatedAt" IS 'Last notification update timestamp';

-- LogEntry: Application and system logs
COMMENT ON TABLE "LogEntry" IS 'Application and system log entries';
COMMENT ON COLUMN "LogEntry"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "LogEntry"."timestamp" IS 'Log entry timestamp';
COMMENT ON COLUMN "LogEntry"."level" IS 'Log level (info, warn, error, debug)';
COMMENT ON COLUMN "LogEntry"."message" IS 'Log message content';
COMMENT ON COLUMN "LogEntry"."source" IS 'Log source component';
COMMENT ON COLUMN "LogEntry"."actingUserId" IS 'Foreign key to User - who triggered the log';
COMMENT ON COLUMN "LogEntry"."details" IS 'Structured log details (JSON)';
COMMENT ON COLUMN "LogEntry"."createdAt" IS 'Log entry creation timestamp';

-- AuditLog: Security and audit trail
COMMENT ON TABLE "AuditLog" IS 'Security audit trail and compliance logging';
COMMENT ON COLUMN "AuditLog"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "AuditLog"."level" IS 'Audit level (info, warning, critical)';
COMMENT ON COLUMN "AuditLog"."message" IS 'Audit message';
COMMENT ON COLUMN "AuditLog"."source" IS 'Audit source component';
COMMENT ON COLUMN "AuditLog"."actingUserId" IS 'Foreign key to User - who performed action';
COMMENT ON COLUMN "AuditLog"."details" IS 'Structured audit details (JSON)';
COMMENT ON COLUMN "AuditLog"."timestamp" IS 'Audit event timestamp';
COMMENT ON COLUMN "AuditLog"."user_id" IS 'Related user ID';
COMMENT ON COLUMN "AuditLog"."action" IS 'Action performed';
COMMENT ON COLUMN "AuditLog"."entity" IS 'Entity type affected';
COMMENT ON COLUMN "AuditLog"."entity_id" IS 'Entity ID affected';

-- =====================================================
-- WEBHOOK AND INTEGRATION TABLES
-- =====================================================

-- Webhook: Outbound webhook configurations
COMMENT ON TABLE "Webhook" IS 'Outbound webhook configurations for external integrations';
COMMENT ON COLUMN "Webhook"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "Webhook"."name" IS 'Webhook name';
COMMENT ON COLUMN "Webhook"."url" IS 'Target webhook URL';
COMMENT ON COLUMN "Webhook"."method" IS 'HTTP method (POST, PUT, etc.)';
COMMENT ON COLUMN "Webhook"."headers" IS 'HTTP headers (JSON)';
COMMENT ON COLUMN "Webhook"."auth_header_name" IS 'Authentication header name';
COMMENT ON COLUMN "Webhook"."auth_header_value" IS 'Authentication header value';
COMMENT ON COLUMN "Webhook"."auth_password" IS 'Authentication password';
COMMENT ON COLUMN "Webhook"."auth_token" IS 'Authentication token';
COMMENT ON COLUMN "Webhook"."auth_type" IS 'Authentication type (none, basic, bearer)';
COMMENT ON COLUMN "Webhook"."auth_username" IS 'Authentication username';
COMMENT ON COLUMN "Webhook"."createdAt" IS 'Webhook creation timestamp';
COMMENT ON COLUMN "Webhook"."events" IS 'Array of events to trigger webhook';
COMMENT ON COLUMN "Webhook"."is_active" IS 'Whether webhook is active';
COMMENT ON COLUMN "Webhook"."retry_count" IS 'Number of retry attempts';
COMMENT ON COLUMN "Webhook"."timeout" IS 'Request timeout in seconds';
COMMENT ON COLUMN "Webhook"."updatedAt" IS 'Last webhook update timestamp';
COMMENT ON COLUMN "Webhook"."body_template" IS 'Request body template';
COMMENT ON COLUMN "Webhook"."field_mappings" IS 'Field mapping configuration (JSON)';
COMMENT ON COLUMN "Webhook"."include_metadata" IS 'Whether to include metadata';
COMMENT ON COLUMN "Webhook"."custom_payload" IS 'Whether to use custom payload';

-- WebhookBodyConfig: Per-event webhook body configurations
COMMENT ON TABLE "WebhookBodyConfig" IS 'Per-event webhook body templates and configurations';
COMMENT ON COLUMN "WebhookBodyConfig"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "WebhookBodyConfig"."webhook_id" IS 'Foreign key to Webhook';
COMMENT ON COLUMN "WebhookBodyConfig"."event_type" IS 'Event type for this configuration';
COMMENT ON COLUMN "WebhookBodyConfig"."body_template" IS 'Request body template for this event';
COMMENT ON COLUMN "WebhookBodyConfig"."field_mappings" IS 'Field mappings for this event (JSON)';
COMMENT ON COLUMN "WebhookBodyConfig"."is_active" IS 'Whether this configuration is active';
COMMENT ON COLUMN "WebhookBodyConfig"."created_at" IS 'Configuration creation timestamp';
COMMENT ON COLUMN "WebhookBodyConfig"."updated_at" IS 'Last configuration update timestamp';

-- WebhookLog: Webhook delivery logs
COMMENT ON TABLE "WebhookLog" IS 'Logs of webhook delivery attempts and results';
COMMENT ON COLUMN "WebhookLog"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "WebhookLog"."webhook_id" IS 'Foreign key to Webhook';
COMMENT ON COLUMN "WebhookLog"."event_type" IS 'Event type that triggered webhook';
COMMENT ON COLUMN "WebhookLog"."payload" IS 'Request payload sent (JSON)';
COMMENT ON COLUMN "WebhookLog"."response_status" IS 'HTTP response status code';
COMMENT ON COLUMN "WebhookLog"."response_body" IS 'HTTP response body';
COMMENT ON COLUMN "WebhookLog"."success" IS 'Whether delivery was successful';
COMMENT ON COLUMN "WebhookLog"."error_message" IS 'Error message if delivery failed';
COMMENT ON COLUMN "WebhookLog"."duration_ms" IS 'Delivery duration in milliseconds';
COMMENT ON COLUMN "WebhookLog"."createdAt" IS 'Log entry creation timestamp';

-- =====================================================
-- AI AND PROMPT MANAGEMENT TABLES
-- =====================================================

-- SystemPromptCategory: Categories for AI prompts
COMMENT ON TABLE "SystemPromptCategory" IS 'Categories for organizing system AI prompts';
COMMENT ON COLUMN "SystemPromptCategory"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "SystemPromptCategory"."name" IS 'Unique category name';
COMMENT ON COLUMN "SystemPromptCategory"."description" IS 'Category description';
COMMENT ON COLUMN "SystemPromptCategory"."color" IS 'Display color for category';
COMMENT ON COLUMN "SystemPromptCategory"."is_active" IS 'Whether category is active';
COMMENT ON COLUMN "SystemPromptCategory"."created_at" IS 'Category creation timestamp';
COMMENT ON COLUMN "SystemPromptCategory"."updated_at" IS 'Last category update timestamp';

-- SystemPrompt: AI prompt templates
COMMENT ON TABLE "SystemPrompt" IS 'Pre-defined AI prompt templates and instructions';
COMMENT ON COLUMN "SystemPrompt"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "SystemPrompt"."name" IS 'Prompt name';
COMMENT ON COLUMN "SystemPrompt"."description" IS 'Prompt description and use case';
COMMENT ON COLUMN "SystemPrompt"."content" IS 'Prompt content and instructions';
COMMENT ON COLUMN "SystemPrompt"."categoryId" IS 'Foreign key to SystemPromptCategory';
COMMENT ON COLUMN "SystemPrompt"."is_active" IS 'Whether prompt is active';
COMMENT ON COLUMN "SystemPrompt"."created_at" IS 'Prompt creation timestamp';
COMMENT ON COLUMN "SystemPrompt"."updated_at" IS 'Last prompt update timestamp';

-- =====================================================
-- WARNING SYSTEM TABLES
-- =====================================================

-- WarningConfiguration: Rules for generating warnings
COMMENT ON TABLE "WarningConfiguration" IS 'Configuration rules for generating system warnings';
COMMENT ON COLUMN "WarningConfiguration"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "WarningConfiguration"."name" IS 'Configuration name';
COMMENT ON COLUMN "WarningConfiguration"."description" IS 'Configuration description';
COMMENT ON COLUMN "WarningConfiguration"."entity_type" IS 'Target entity type (applicant, Position, etc.)';
COMMENT ON COLUMN "WarningConfiguration"."field" IS 'Field to monitor';
COMMENT ON COLUMN "WarningConfiguration"."condition" IS 'Condition type';
COMMENT ON COLUMN "WarningConfiguration"."operator" IS 'Comparison operator';
COMMENT ON COLUMN "WarningConfiguration"."value" IS 'Comparison value';
COMMENT ON COLUMN "WarningConfiguration"."threshold" IS 'Threshold value';
COMMENT ON COLUMN "WarningConfiguration"."severity" IS 'Warning severity (warning, error)';
COMMENT ON COLUMN "WarningConfiguration"."is_active" IS 'Whether configuration is active';
COMMENT ON COLUMN "WarningConfiguration"."is_public" IS 'Whether configuration is public';
COMMENT ON COLUMN "WarningConfiguration"."created_by" IS 'Foreign key to User - who created';
COMMENT ON COLUMN "WarningConfiguration"."created_at" IS 'Configuration creation timestamp';
COMMENT ON COLUMN "WarningConfiguration"."updated_at" IS 'Last configuration update timestamp';
COMMENT ON COLUMN "WarningConfiguration"."conditions" IS 'Complex conditions array (JSON)';
COMMENT ON COLUMN "WarningConfiguration"."logical_operator" IS 'Logical operator for conditions';
COMMENT ON COLUMN "WarningConfiguration"."cross_entity_conditions" IS 'Cross-entity conditions (JSON)';
COMMENT ON COLUMN "WarningConfiguration"."condition_groups" IS 'Grouped conditions (JSON)';

-- WarningConfigurationShare: Sharing of warning configurations
COMMENT ON TABLE "WarningConfigurationShare" IS 'Sharing permissions for warning configurations';
COMMENT ON COLUMN "WarningConfigurationShare"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "WarningConfigurationShare"."configuration_id" IS 'Foreign key to WarningConfiguration';
COMMENT ON COLUMN "WarningConfigurationShare"."user_id" IS 'Foreign key to User';
COMMENT ON COLUMN "WarningConfigurationShare"."created_at" IS 'Share creation timestamp';

-- Warning: Generated warnings based on configurations
COMMENT ON TABLE "Warning" IS 'Generated warnings based on configuration rules';
COMMENT ON COLUMN "Warning"."id" IS 'Primary key - UUID identifier';
COMMENT ON COLUMN "Warning"."configuration_id" IS 'Foreign key to WarningConfiguration';
COMMENT ON COLUMN "Warning"."entity_type" IS 'Entity type that triggered warning';
COMMENT ON COLUMN "Warning"."entity_id" IS 'Entity ID that triggered warning';
COMMENT ON COLUMN "Warning"."field" IS 'Field that triggered warning';
COMMENT ON COLUMN "Warning"."current_value" IS 'Current field value';
COMMENT ON COLUMN "Warning"."expected_value" IS 'Expected field value';
COMMENT ON COLUMN "Warning"."message" IS 'Warning message';
COMMENT ON COLUMN "Warning"."severity" IS 'Warning severity';
COMMENT ON COLUMN "Warning"."created_at" IS 'Warning creation timestamp';
COMMENT ON COLUMN "Warning"."updated_at" IS 'Last warning update timestamp';

-- WarningSystemStatus: Warning system health status
COMMENT ON TABLE "WarningSystemStatus" IS 'Health and initialization status of the warning system';
COMMENT ON COLUMN "WarningSystemStatus"."id" IS 'Primary key - system identifier';
COMMENT ON COLUMN "WarningSystemStatus"."initialized" IS 'Whether warning system is initialized';
COMMENT ON COLUMN "WarningSystemStatus"."initializedAt" IS 'Initialization timestamp';
COMMENT ON COLUMN "WarningSystemStatus"."lastCheckAt" IS 'Last health check timestamp';
COMMENT ON COLUMN "WarningSystemStatus"."createdAt" IS 'Status record creation timestamp';
COMMENT ON COLUMN "WarningSystemStatus"."updatedAt" IS 'Last status update timestamp';
