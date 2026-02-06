-- Prisma Database Comments Generator v1.4.0

-- User comments
COMMENT ON TABLE "User" IS 'User - Core user table for authentication, profile management, and access control';
COMMENT ON COLUMN "User"."id" IS 'Unique identifier (UUID)';
COMMENT ON COLUMN "User"."name" IS 'Full name of the user';
COMMENT ON COLUMN "User"."email" IS 'Email address (unique, used for login)';
COMMENT ON COLUMN "User"."password" IS 'Hashed password for authentication';
COMMENT ON COLUMN "User"."role" IS 'User role (admin, recruiter, hiring_manager, viewer)';
COMMENT ON COLUMN "User"."avatarUrl" IS 'URL to user avatar image';
COMMENT ON COLUMN "User"."image" IS 'Alternative image URL';
COMMENT ON COLUMN "User"."dataAiHint" IS 'AI hint for data processing';
COMMENT ON COLUMN "User"."authentication_method" IS 'Authentication method (basic, azure_ad)';
COMMENT ON COLUMN "User"."force_password_change" IS 'Flag to force password change on next login';
COMMENT ON COLUMN "User"."emailVerified" IS 'Timestamp when email was verified';
COMMENT ON COLUMN "User"."is_active" IS 'Whether the user account is active';
COMMENT ON COLUMN "User"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "User"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "User"."azure_oid" IS 'Azure AD Object ID for SSO';
COMMENT ON COLUMN "User"."userGroupId" IS 'Reference to user group';
COMMENT ON COLUMN "User"."userTeamId" IS 'Reference to user team';
COMMENT ON COLUMN "User"."module_permissions" IS 'Array of module permissions';
COMMENT ON COLUMN "User"."personal_color" IS 'Personal theme color';
COMMENT ON COLUMN "User"."position_title" IS 'Job title within the organization';
COMMENT ON COLUMN "User"."department" IS 'Department name';
COMMENT ON COLUMN "User"."phone_number" IS 'Contact phone number';
COMMENT ON COLUMN "User"."office_location" IS 'Office location';

-- UserActivityLog comments
COMMENT ON TABLE "UserActivityLog" IS 'UserActivityLog - Tracks all user-related actions for audit and security';

-- Position comments
COMMENT ON TABLE "Position" IS 'Position - Job positions available for recruitment';

-- Grade comments
COMMENT ON TABLE "Grade" IS 'Grade - Job grade levels with SLA and level configurations';

-- PositionLevel comments
COMMENT ON TABLE "PositionLevel" IS 'PositionLevel - Position seniority levels (Entry, Junior, Mid, Senior, etc.)';

-- applicant comments
COMMENT ON TABLE "applicant" IS 'applicant - Job applicants and their application data';

-- RecruitmentStage comments
COMMENT ON TABLE "RecruitmentStage" IS 'RecruitmentStage - Pipeline stages for applicant recruitment workflow';

-- TransitionRecord comments
COMMENT ON TABLE "TransitionRecord" IS 'TransitionRecord - History of applicant stage transitions';

-- LogEntry comments
COMMENT ON TABLE "LogEntry" IS 'LogEntry - General system and application logging';

-- AuditLog comments
COMMENT ON TABLE "AuditLog" IS 'AuditLog - Security and compliance audit trail';

-- UserGroup comments
COMMENT ON TABLE "UserGroup" IS 'UserGroup - User permission groups for role-based access control';

-- UserTeam comments
COMMENT ON TABLE "UserTeam" IS 'UserTeam - Teams for organizing users within the organization';

-- SystemSetting comments
COMMENT ON TABLE "SystemSetting" IS 'SystemSetting - Global application configuration settings';

-- CustomFieldDefinition comments
COMMENT ON TABLE "CustomFieldDefinition" IS 'CustomFieldDefinition - Custom field schema definitions for extensible data models';

-- CustomFieldOption comments
COMMENT ON TABLE "CustomFieldOption" IS 'CustomFieldOption - Predefined options for custom dropdown/select fields';

-- JobMatch comments
COMMENT ON TABLE "JobMatch" IS 'JobMatch - AI-generated job matching results for applicants';

-- upload_queue comments
COMMENT ON TABLE "upload_queue" IS 'UploadQueue - Queue for processing uploaded resume files';

-- UserUIDisplayPreference comments
COMMENT ON TABLE "UserUIDisplayPreference" IS 'UserUIDisplayPreference - User-specific UI display preferences';

-- Account comments
COMMENT ON TABLE "Account" IS 'Account - OAuth/external authentication provider accounts';

-- SystemPreference comments
COMMENT ON TABLE "SystemPreference" IS 'SystemPreference - User-specific system preferences';

-- applicantComment comments
COMMENT ON TABLE "applicantComment" IS 'applicantComment - Comments and notes on applicant profiles';

-- Attachment comments
COMMENT ON TABLE "Attachment" IS 'Attachment - File attachments for applicants and headcounts';

-- Webhook comments
COMMENT ON TABLE "Webhook" IS 'Webhook - Outbound webhook configurations for event notifications';

-- WebhookBodyConfig comments
COMMENT ON TABLE "WebhookBodyConfig" IS 'WebhookBodyConfig - Custom body templates for webhook events';

-- WebhookLog comments
COMMENT ON TABLE "WebhookLog" IS 'WebhookLog - Execution logs for webhook deliveries';

-- Dashboard comments
COMMENT ON TABLE "Dashboard" IS 'Dashboard - Custom dashboard configurations for analytics';

-- DashboardShare comments
COMMENT ON TABLE "DashboardShare" IS 'DashboardShare - Dashboard sharing permissions between users';

-- DashboardWidget comments
COMMENT ON TABLE "DashboardWidget" IS 'DashboardWidget - Individual widgets within a dashboard';

-- SystemPromptCategory comments
COMMENT ON TABLE "SystemPromptCategory" IS 'SystemPromptCategory - Categories for organizing AI system prompts';

-- SystemPrompt comments
COMMENT ON TABLE "SystemPrompt" IS 'SystemPrompt - AI system prompts for various recruitment tasks';

-- applicantSource comments
COMMENT ON TABLE "applicantSource" IS 'applicantSource - applicant sourcing channels (job portals, referrals, etc.)';

-- Notification comments
COMMENT ON TABLE "Notification" IS 'Notification - User notification messages';

-- Headcount comments
COMMENT ON TABLE "Headcount" IS 'Headcount - Position headcount tracking for workforce planning';

-- WarningConfiguration comments
COMMENT ON TABLE "WarningConfiguration" IS 'WarningConfiguration - Configurable warning rules for positions and applicants';

-- WarningConfigurationShare comments
COMMENT ON TABLE "WarningConfigurationShare" IS 'WarningConfigurationShare - Warning configuration sharing between users';

-- Warning comments
COMMENT ON TABLE "Warning" IS 'Warning - Active warnings generated from warning configurations';

-- WarningSystemStatus comments
COMMENT ON TABLE "WarningSystemStatus" IS 'WarningSystemStatus - System status tracking for warning initialization';

-- PositionInterviewer comments
COMMENT ON TABLE "PositionInterviewer" IS 'PositionInterviewer - Interviewers assigned to positions';

-- ExpertiseGroup comments
COMMENT ON TABLE "ExpertiseGroup" IS 'ExpertiseGroup - Groups of related expertise skills for evaluation';

-- ExpertiseSkill comments
COMMENT ON TABLE "ExpertiseSkill" IS 'ExpertiseSkill - Individual expertise skills for applicant evaluation';

-- PersonalityGroup comments
COMMENT ON TABLE "PersonalityGroup" IS 'PersonalityGroup - Groups of related personality traits for evaluation';
