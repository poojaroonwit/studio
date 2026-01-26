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
COMMENT ON COLUMN "User"."authentication_methods" IS 'Authentication methods (basic, azure_ad) - supports multiple methods';
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
COMMENT ON COLUMN "User"."employee_id" IS 'Azure AD Employee ID';
COMMENT ON COLUMN "User"."company_name" IS 'Company name associated with user';
COMMENT ON COLUMN "User"."employee_type" IS 'Employee type (Full-time, Contractor, etc.)';
COMMENT ON COLUMN "User"."hire_date" IS 'Date of hire';
COMMENT ON COLUMN "User"."manager" IS 'Manager''s display name';
COMMENT ON COLUMN "User"."manager_email" IS 'Manager''s email address';
COMMENT ON COLUMN "User"."sam_account_name" IS 'SAM Account Name (legacy)';
COMMENT ON COLUMN "User"."contact_info" IS 'Detailed contact info (JSON)';
COMMENT ON COLUMN "User"."deleted_from_ad" IS 'Whether user is deleted from Azure AD';
COMMENT ON COLUMN "User"."failed_login_attempts" IS 'Number of failed login attempts';
COMMENT ON COLUMN "User"."locked_until" IS 'Timestamp until which account is locked';
COMMENT ON COLUMN "User"."last_failed_login" IS 'Timestamp of last failed login';
COMMENT ON COLUMN "User"."two_factor_enabled" IS 'Whether 2FA is enabled';
COMMENT ON COLUMN "User"."two_factor_method" IS '2FA method (totp, email)';
COMMENT ON COLUMN "User"."two_factor_secret" IS 'Encrypted 2FA secret';
COMMENT ON COLUMN "User"."two_factor_backup_codes" IS 'Encrypted backup codes';
COMMENT ON COLUMN "User"."two_factor_verified_at" IS 'Timestamp of 2FA verification';

-- UserActivityLog comments
COMMENT ON TABLE "UserActivityLog" IS 'UserActivityLog - Tracks all user-related actions for audit and security';
COMMENT ON COLUMN "UserActivityLog"."id" IS 'Unique identifier';
COMMENT ON COLUMN "UserActivityLog"."user_id" IS 'Reference to the user';
COMMENT ON COLUMN "UserActivityLog"."action" IS 'Action type (SIGN_IN, SIGN_OUT, PASSWORD_CHANGE, etc.)';
COMMENT ON COLUMN "UserActivityLog"."details" IS 'Additional context for the action (JSON)';
COMMENT ON COLUMN "UserActivityLog"."ip_address" IS 'IP address of the request';
COMMENT ON COLUMN "UserActivityLog"."user_agent" IS 'Browser user agent string';
COMMENT ON COLUMN "UserActivityLog"."performed_by" IS 'Who performed the action (for admin actions)';
COMMENT ON COLUMN "UserActivityLog"."created_at" IS 'Timestamp of the action';

-- Position comments
COMMENT ON TABLE "Position" IS 'Position - Job positions available for recruitment';
COMMENT ON COLUMN "Position"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Position"."title" IS 'Job title';
COMMENT ON COLUMN "Position"."department" IS 'Department name';
COMMENT ON COLUMN "Position"."description" IS 'Job description';
COMMENT ON COLUMN "Position"."matchCriteria" IS 'Criteria for candidate matching';
COMMENT ON COLUMN "Position"."isOpen" IS 'Whether position is open for applications';
COMMENT ON COLUMN "Position"."positionLevel" IS 'Seniority level (Entry, Mid, Senior, etc.)';
COMMENT ON COLUMN "Position"."recruiterId" IS 'Assigned recruiter';
COMMENT ON COLUMN "Position"."customAttributes" IS 'Custom attributes (JSON)';
COMMENT ON COLUMN "Position"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "Position"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "Position"."companyId" IS 'Company identifier';
COMMENT ON COLUMN "Position"."gradeId" IS 'Reference to grade level';
COMMENT ON COLUMN "Position"."positionAttribute" IS 'Additional position attributes';

-- Grade comments
COMMENT ON TABLE "Grade" IS 'Grade - Job grade levels with SLA and level configurations';
COMMENT ON COLUMN "Grade"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Grade"."name" IS 'Grade name (e.g., G1, G2)';
COMMENT ON COLUMN "Grade"."label" IS 'Display label';
COMMENT ON COLUMN "Grade"."description" IS 'Grade description';
COMMENT ON COLUMN "Grade"."min_level" IS 'Minimum level number';
COMMENT ON COLUMN "Grade"."max_level" IS 'Maximum level number';
COMMENT ON COLUMN "Grade"."sla_days" IS 'SLA days for this grade';
COMMENT ON COLUMN "Grade"."color" IS 'Display color';
COMMENT ON COLUMN "Grade"."is_active" IS 'Whether grade is active';
COMMENT ON COLUMN "Grade"."sort_order" IS 'Sort order for display';

-- PositionLevel comments
COMMENT ON TABLE "PositionLevel" IS 'PositionLevel - Position seniority levels (Entry, Junior, Mid, Senior, etc.)';
COMMENT ON COLUMN "PositionLevel"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PositionLevel"."name" IS 'Level name (e.g., Entry, Junior, Mid, Senior)';
COMMENT ON COLUMN "PositionLevel"."description" IS 'Level description';
COMMENT ON COLUMN "PositionLevel"."color" IS 'Display color';
COMMENT ON COLUMN "PositionLevel"."is_active" IS 'Whether level is active';
COMMENT ON COLUMN "PositionLevel"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "PositionLevel"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PositionLevel"."updatedAt" IS 'Last update timestamp';

-- Candidate comments
COMMENT ON TABLE "Candidate" IS 'Candidate - Job applicants and their application data';
COMMENT ON COLUMN "Candidate"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Candidate"."name" IS 'Candidate full name';
COMMENT ON COLUMN "Candidate"."email" IS 'Email address';
COMMENT ON COLUMN "Candidate"."phone" IS 'Phone number';
COMMENT ON COLUMN "Candidate"."positionId" IS 'Applied position reference';
COMMENT ON COLUMN "Candidate"."recruiterId" IS 'Assigned recruiter reference';
COMMENT ON COLUMN "Candidate"."fitScore" IS 'AI-calculated fit score (0-100)';
COMMENT ON COLUMN "Candidate"."applicationDate" IS 'Application submission date';
COMMENT ON COLUMN "Candidate"."parsedData" IS 'Parsed resume data (JSON)';
COMMENT ON COLUMN "Candidate"."customAttributes" IS 'Custom attributes (JSON)';
COMMENT ON COLUMN "Candidate"."resumePath" IS 'Path to uploaded resume file';
COMMENT ON COLUMN "Candidate"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "Candidate"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "Candidate"."avatarUrl" IS 'Avatar image URL';
COMMENT ON COLUMN "Candidate"."dataAiHint" IS 'AI hint for processing';
COMMENT ON COLUMN "Candidate"."assignmentJustification" IS 'Justification for position assignment';
COMMENT ON COLUMN "Candidate"."educationData" IS 'Education history (JSON array)';
COMMENT ON COLUMN "Candidate"."experienceData" IS 'Work experience history (JSON array)';
COMMENT ON COLUMN "Candidate"."companyId" IS 'Company identifier';
COMMENT ON COLUMN "Candidate"."sourceId" IS 'Candidate source reference';
COMMENT ON COLUMN "Candidate"."subSource" IS 'Sub-source detail';
COMMENT ON COLUMN "Candidate"."statusId" IS 'Current recruitment status';
COMMENT ON COLUMN "Candidate"."isBlacklisted" IS 'Whether candidate is blacklisted';
COMMENT ON COLUMN "Candidate"."isPinned" IS 'Whether candidate is pinned';
COMMENT ON COLUMN "Candidate"."pinnedAt" IS 'Pin timestamp';
COMMENT ON COLUMN "Candidate"."emailDate" IS 'Email received date';
COMMENT ON COLUMN "Candidate"."emailSubject" IS 'Email subject line';
COMMENT ON COLUMN "Candidate"."emailId" IS 'Email message ID';
COMMENT ON COLUMN "Candidate"."emailMetadata" IS 'Email metadata (JSON)';
COMMENT ON COLUMN "Candidate"."expected_salary" IS 'Expected salary amount';

-- RecruitmentStage comments
COMMENT ON TABLE "RecruitmentStage" IS 'RecruitmentStage - Pipeline stages for candidate recruitment workflow';
COMMENT ON COLUMN "RecruitmentStage"."id" IS 'Unique identifier';
COMMENT ON COLUMN "RecruitmentStage"."name" IS 'Stage name';
COMMENT ON COLUMN "RecruitmentStage"."description" IS 'Stage description';
COMMENT ON COLUMN "RecruitmentStage"."is_system" IS 'Whether this is a system-defined stage';
COMMENT ON COLUMN "RecruitmentStage"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "RecruitmentStage"."color_complete" IS 'Color when stage is complete';
COMMENT ON COLUMN "RecruitmentStage"."color_badge" IS 'Badge color';

-- TransitionRecord comments
COMMENT ON TABLE "TransitionRecord" IS 'TransitionRecord - History of candidate stage transitions';
COMMENT ON COLUMN "TransitionRecord"."id" IS 'Unique identifier';
COMMENT ON COLUMN "TransitionRecord"."candidateId" IS 'Reference to candidate';
COMMENT ON COLUMN "TransitionRecord"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "TransitionRecord"."date" IS 'Transition date';
COMMENT ON COLUMN "TransitionRecord"."stage" IS 'Stage name at transition';
COMMENT ON COLUMN "TransitionRecord"."notes" IS 'Transition notes';
COMMENT ON COLUMN "TransitionRecord"."actingUserId" IS 'User who performed the transition';
COMMENT ON COLUMN "TransitionRecord"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "TransitionRecord"."updatedAt" IS 'Last update timestamp';

-- LogEntry comments
COMMENT ON TABLE "LogEntry" IS 'LogEntry - General system and application logging';
COMMENT ON COLUMN "LogEntry"."id" IS 'Unique identifier';
COMMENT ON COLUMN "LogEntry"."timestamp" IS 'Log timestamp';
COMMENT ON COLUMN "LogEntry"."level" IS 'Log level (INFO, WARN, ERROR, DEBUG)';
COMMENT ON COLUMN "LogEntry"."message" IS 'Log message content';
COMMENT ON COLUMN "LogEntry"."source" IS 'Log source/component';
COMMENT ON COLUMN "LogEntry"."actingUserId" IS 'User who triggered the log';
COMMENT ON COLUMN "LogEntry"."details" IS 'Additional log details (JSON)';
COMMENT ON COLUMN "LogEntry"."createdAt" IS 'Record creation timestamp';

-- AuditLog comments
COMMENT ON TABLE "AuditLog" IS 'AuditLog - Security and compliance audit trail';
COMMENT ON COLUMN "AuditLog"."id" IS 'Unique identifier';
COMMENT ON COLUMN "AuditLog"."level" IS 'Log level (INFO, WARN, ERROR)';
COMMENT ON COLUMN "AuditLog"."message" IS 'Audit message';
COMMENT ON COLUMN "AuditLog"."source" IS 'Event source/component';
COMMENT ON COLUMN "AuditLog"."actingUserId" IS 'User who triggered the action';
COMMENT ON COLUMN "AuditLog"."details" IS 'Additional details (JSON)';
COMMENT ON COLUMN "AuditLog"."timestamp" IS 'Event timestamp';
COMMENT ON COLUMN "AuditLog"."user_id" IS 'Target user ID (for user-related actions)';
COMMENT ON COLUMN "AuditLog"."action" IS 'Action type performed';
COMMENT ON COLUMN "AuditLog"."entity" IS 'Entity type affected';
COMMENT ON COLUMN "AuditLog"."entity_id" IS 'Entity ID affected';

-- UserGroup comments
COMMENT ON TABLE "UserGroup" IS 'UserGroup - User permission groups for role-based access control';
COMMENT ON COLUMN "UserGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "UserGroup"."name" IS 'Group name';
COMMENT ON COLUMN "UserGroup"."description" IS 'Group description';
COMMENT ON COLUMN "UserGroup"."permissions" IS 'Array of permission strings';
COMMENT ON COLUMN "UserGroup"."is_default" IS 'Whether this is the default group';
COMMENT ON COLUMN "UserGroup"."is_system_role" IS 'Whether this is a system-defined role';
COMMENT ON COLUMN "UserGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "UserGroup"."updatedAt" IS 'Last update timestamp';

-- UserTeam comments
COMMENT ON TABLE "UserTeam" IS 'UserTeam - Teams for organizing users within the organization';
COMMENT ON COLUMN "UserTeam"."id" IS 'Unique identifier';
COMMENT ON COLUMN "UserTeam"."name" IS 'Team name';
COMMENT ON COLUMN "UserTeam"."description" IS 'Team description';
COMMENT ON COLUMN "UserTeam"."color" IS 'Display color';
COMMENT ON COLUMN "UserTeam"."is_active" IS 'Whether team is active';
COMMENT ON COLUMN "UserTeam"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "UserTeam"."updatedAt" IS 'Last update timestamp';

-- SystemSetting comments
COMMENT ON TABLE "SystemSetting" IS 'SystemSetting - Global application configuration settings';
COMMENT ON COLUMN "SystemSetting"."key" IS 'Setting key (primary key)';
COMMENT ON COLUMN "SystemSetting"."value" IS 'Setting value';
COMMENT ON COLUMN "SystemSetting"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SystemSetting"."updatedAt" IS 'Last update timestamp';

-- CustomFieldDefinition comments
COMMENT ON TABLE "CustomFieldDefinition" IS 'CustomFieldDefinition - Custom field schema definitions for extensible data models';
COMMENT ON COLUMN "CustomFieldDefinition"."id" IS 'Unique identifier';
COMMENT ON COLUMN "CustomFieldDefinition"."model_name" IS 'Target model name (Candidate, Position, etc.)';
COMMENT ON COLUMN "CustomFieldDefinition"."field_key" IS 'Field key for API access';
COMMENT ON COLUMN "CustomFieldDefinition"."label" IS 'Display label';
COMMENT ON COLUMN "CustomFieldDefinition"."field_type" IS 'Field type (text, number, select, etc.)';
COMMENT ON COLUMN "CustomFieldDefinition"."options" IS 'Field options (JSON)';
COMMENT ON COLUMN "CustomFieldDefinition"."is_required" IS 'Whether field is required';
COMMENT ON COLUMN "CustomFieldDefinition"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "CustomFieldDefinition"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "CustomFieldDefinition"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "CustomFieldDefinition"."allow_custom_options" IS 'Allow custom user options';
COMMENT ON COLUMN "CustomFieldDefinition"."attribute_code" IS 'Attribute code for mapping';
COMMENT ON COLUMN "CustomFieldDefinition"."attribute_label" IS 'Attribute label for display';
COMMENT ON COLUMN "CustomFieldDefinition"."edit_roles" IS 'Roles allowed to edit';
COMMENT ON COLUMN "CustomFieldDefinition"."field_code" IS 'Field code identifier';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_candidate_detail" IS 'Show in candidate detail view';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_filter" IS 'Show in filter options';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_full_candidate_detail" IS 'Show in full candidate detail';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_headcount_detail" IS 'Show in headcount detail view';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_position_settings" IS 'Show in position settings';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_task_board_filter" IS 'Show in task board filter';
COMMENT ON COLUMN "CustomFieldDefinition"."candidate_detail_section" IS 'Candidate detail section';
COMMENT ON COLUMN "CustomFieldDefinition"."position_detail_section" IS 'Position detail section';
COMMENT ON COLUMN "CustomFieldDefinition"."view_roles" IS 'Roles allowed to view';

-- CustomFieldOption comments
COMMENT ON TABLE "CustomFieldOption" IS 'CustomFieldOption - Predefined options for custom dropdown/select fields';
COMMENT ON COLUMN "CustomFieldOption"."id" IS 'Unique identifier';
COMMENT ON COLUMN "CustomFieldOption"."custom_field_definition_id" IS 'Reference to field definition';
COMMENT ON COLUMN "CustomFieldOption"."value" IS 'Option value';
COMMENT ON COLUMN "CustomFieldOption"."label" IS 'Display label';
COMMENT ON COLUMN "CustomFieldOption"."color" IS 'Display color';
COMMENT ON COLUMN "CustomFieldOption"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "CustomFieldOption"."is_active" IS 'Whether option is active';
COMMENT ON COLUMN "CustomFieldOption"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "CustomFieldOption"."updatedAt" IS 'Last update timestamp';

-- JobMatch comments
COMMENT ON TABLE "JobMatch" IS 'JobMatch - AI-generated job matching results for candidates';
COMMENT ON COLUMN "JobMatch"."id" IS 'Unique identifier';
COMMENT ON COLUMN "JobMatch"."candidateId" IS 'Reference to candidate';
COMMENT ON COLUMN "JobMatch"."jobId" IS 'Reference to matched job';
COMMENT ON COLUMN "JobMatch"."jobTitle" IS 'Matched job title';
COMMENT ON COLUMN "JobMatch"."fitScore" IS 'AI-calculated fit score (0-100)';
COMMENT ON COLUMN "JobMatch"."matchReasons" IS 'Reasons for the match';
COMMENT ON COLUMN "JobMatch"."job_description_summary" IS 'Summary of job description';
COMMENT ON COLUMN "JobMatch"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "JobMatch"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "JobMatch"."companyId" IS 'Company identifier';

-- upload_queue comments
COMMENT ON TABLE "upload_queue" IS 'UploadQueue - Queue for processing uploaded resume files';
COMMENT ON COLUMN "upload_queue"."id" IS 'Unique identifier';
COMMENT ON COLUMN "upload_queue"."file_name" IS 'Original file name';
COMMENT ON COLUMN "upload_queue"."file_size" IS 'File size in bytes';
COMMENT ON COLUMN "upload_queue"."status" IS 'Processing status (pending, processing, completed, failed)';
COMMENT ON COLUMN "upload_queue"."error" IS 'Error message if failed';
COMMENT ON COLUMN "upload_queue"."error_details" IS 'Detailed error information';
COMMENT ON COLUMN "upload_queue"."source" IS 'Source name';
COMMENT ON COLUMN "upload_queue"."source_id" IS 'Reference to candidate source';
COMMENT ON COLUMN "upload_queue"."sub_source" IS 'Sub-source detail';
COMMENT ON COLUMN "upload_queue"."upload_date" IS 'Upload timestamp';
COMMENT ON COLUMN "upload_queue"."completed_date" IS 'Processing completion timestamp';
COMMENT ON COLUMN "upload_queue"."upload_id" IS 'Upload batch ID';
COMMENT ON COLUMN "upload_queue"."created_by" IS 'User who created the upload';
COMMENT ON COLUMN "upload_queue"."updated_at" IS 'Last update timestamp';
COMMENT ON COLUMN "upload_queue"."file_path" IS 'File storage path';
COMMENT ON COLUMN "upload_queue"."webhook_payload" IS 'Webhook response payload';
COMMENT ON COLUMN "upload_queue"."retry_count" IS 'Number of retry attempts';
COMMENT ON COLUMN "upload_queue"."position_id" IS 'Target position reference';
COMMENT ON COLUMN "upload_queue"."process_date" IS 'Processing date';
COMMENT ON COLUMN "upload_queue"."email_date" IS 'Email received date';
COMMENT ON COLUMN "upload_queue"."email_subject" IS 'Email subject line';
COMMENT ON COLUMN "upload_queue"."email_id" IS 'Email message ID';
COMMENT ON COLUMN "upload_queue"."email_metadata" IS 'Email metadata (JSON)';

-- UserUIDisplayPreference comments
COMMENT ON TABLE "UserUIDisplayPreference" IS 'UserUIDisplayPreference - User-specific UI display preferences';
COMMENT ON COLUMN "UserUIDisplayPreference"."id" IS 'Unique identifier';
COMMENT ON COLUMN "UserUIDisplayPreference"."userId" IS 'Reference to user';
COMMENT ON COLUMN "UserUIDisplayPreference"."model_type" IS 'Model type for preference';
COMMENT ON COLUMN "UserUIDisplayPreference"."attribute_key" IS 'Attribute key';
COMMENT ON COLUMN "UserUIDisplayPreference"."ui_preference" IS 'UI preference value';
COMMENT ON COLUMN "UserUIDisplayPreference"."custom_note" IS 'Custom note';
COMMENT ON COLUMN "UserUIDisplayPreference"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "UserUIDisplayPreference"."updatedAt" IS 'Last update timestamp';

-- Account comments
COMMENT ON TABLE "Account" IS 'Account - OAuth/external authentication provider accounts';
COMMENT ON COLUMN "Account"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Account"."userId" IS 'Reference to user';
COMMENT ON COLUMN "Account"."type" IS 'Account type';
COMMENT ON COLUMN "Account"."provider" IS 'OAuth provider name';
COMMENT ON COLUMN "Account"."providerAccountId" IS 'Provider account ID';
COMMENT ON COLUMN "Account"."refresh_token" IS 'OAuth refresh token';
COMMENT ON COLUMN "Account"."access_token" IS 'OAuth access token';
COMMENT ON COLUMN "Account"."expires_at" IS 'Token expiration timestamp';
COMMENT ON COLUMN "Account"."token_type" IS 'OAuth token type';
COMMENT ON COLUMN "Account"."scope" IS 'OAuth scope';
COMMENT ON COLUMN "Account"."id_token" IS 'OAuth ID token';
COMMENT ON COLUMN "Account"."session_state" IS 'OAuth session state';

-- SystemPreference comments
COMMENT ON TABLE "SystemPreference" IS 'SystemPreference - User-specific system preferences';
COMMENT ON COLUMN "SystemPreference"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SystemPreference"."userId" IS 'Reference to user';
COMMENT ON COLUMN "SystemPreference"."key" IS 'Preference key';
COMMENT ON COLUMN "SystemPreference"."value" IS 'Preference value';
COMMENT ON COLUMN "SystemPreference"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SystemPreference"."updatedAt" IS 'Last update timestamp';

-- CandidateComment comments
COMMENT ON TABLE "CandidateComment" IS 'CandidateComment - Comments and notes on candidate profiles';
COMMENT ON COLUMN "CandidateComment"."id" IS 'Unique identifier';
COMMENT ON COLUMN "CandidateComment"."candidateId" IS 'Reference to candidate';
COMMENT ON COLUMN "CandidateComment"."authorId" IS 'Comment author reference';
COMMENT ON COLUMN "CandidateComment"."content" IS 'Comment content';
COMMENT ON COLUMN "CandidateComment"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "CandidateComment"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "CandidateComment"."attachmentIds" IS 'Referenced attachment IDs';

-- Attachment comments
COMMENT ON TABLE "Attachment" IS 'Attachment - File attachments for candidates and headcounts';
COMMENT ON COLUMN "Attachment"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Attachment"."candidateId" IS 'Reference to candidate';
COMMENT ON COLUMN "Attachment"."uploadedById" IS 'User who uploaded the file';
COMMENT ON COLUMN "Attachment"."filePath" IS 'File storage path';
COMMENT ON COLUMN "Attachment"."fileName" IS 'Original file name';
COMMENT ON COLUMN "Attachment"."label" IS 'File label/category';
COMMENT ON COLUMN "Attachment"."isPrimary" IS 'Whether this is the primary attachment';
COMMENT ON COLUMN "Attachment"."uploadedAt" IS 'Upload timestamp';
COMMENT ON COLUMN "Attachment"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "Attachment"."headcountId" IS 'Reference to headcount';

-- Webhook comments
COMMENT ON TABLE "Webhook" IS 'Webhook - Outbound webhook configurations for event notifications';
COMMENT ON COLUMN "Webhook"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Webhook"."name" IS 'Webhook name';
COMMENT ON COLUMN "Webhook"."url" IS 'Target URL';
COMMENT ON COLUMN "Webhook"."method" IS 'HTTP method (POST, PUT, etc.)';
COMMENT ON COLUMN "Webhook"."headers" IS 'Custom headers (JSON)';
COMMENT ON COLUMN "Webhook"."auth_header_name" IS 'Custom auth header name';
COMMENT ON COLUMN "Webhook"."auth_header_value" IS 'Custom auth header value';
COMMENT ON COLUMN "Webhook"."auth_password" IS 'Basic auth password';
COMMENT ON COLUMN "Webhook"."auth_token" IS 'Bearer token';
COMMENT ON COLUMN "Webhook"."auth_type" IS 'Auth type (none, basic, bearer, header)';
COMMENT ON COLUMN "Webhook"."auth_username" IS 'Basic auth username';
COMMENT ON COLUMN "Webhook"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "Webhook"."events" IS 'Event types to trigger on';
COMMENT ON COLUMN "Webhook"."is_active" IS 'Whether webhook is active';
COMMENT ON COLUMN "Webhook"."retry_count" IS 'Number of retry attempts';
COMMENT ON COLUMN "Webhook"."timeout" IS 'Request timeout in seconds';
COMMENT ON COLUMN "Webhook"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "Webhook"."body_template" IS 'Default body template';
COMMENT ON COLUMN "Webhook"."field_mappings" IS 'Field mappings configuration';
COMMENT ON COLUMN "Webhook"."include_metadata" IS 'Include metadata in payload';
COMMENT ON COLUMN "Webhook"."custom_payload" IS 'Use custom payload format';

-- WebhookBodyConfig comments
COMMENT ON TABLE "WebhookBodyConfig" IS 'WebhookBodyConfig - Custom body templates for webhook events';
COMMENT ON COLUMN "WebhookBodyConfig"."id" IS 'Unique identifier';
COMMENT ON COLUMN "WebhookBodyConfig"."webhook_id" IS 'Reference to webhook';
COMMENT ON COLUMN "WebhookBodyConfig"."event_type" IS 'Event type for this config';
COMMENT ON COLUMN "WebhookBodyConfig"."body_template" IS 'Body template content';
COMMENT ON COLUMN "WebhookBodyConfig"."field_mappings" IS 'Field mappings (JSON)';
COMMENT ON COLUMN "WebhookBodyConfig"."is_active" IS 'Whether config is active';
COMMENT ON COLUMN "WebhookBodyConfig"."created_at" IS 'Record creation timestamp';
COMMENT ON COLUMN "WebhookBodyConfig"."updated_at" IS 'Last update timestamp';

-- WebhookLog comments
COMMENT ON TABLE "WebhookLog" IS 'WebhookLog - Execution logs for webhook deliveries';
COMMENT ON COLUMN "WebhookLog"."id" IS 'Unique identifier';
COMMENT ON COLUMN "WebhookLog"."webhook_id" IS 'Reference to webhook';
COMMENT ON COLUMN "WebhookLog"."event_type" IS 'Event type triggered';
COMMENT ON COLUMN "WebhookLog"."payload" IS 'Request payload (JSON)';
COMMENT ON COLUMN "WebhookLog"."response_status" IS 'HTTP response status code';
COMMENT ON COLUMN "WebhookLog"."response_body" IS 'Response body content';
COMMENT ON COLUMN "WebhookLog"."success" IS 'Whether delivery was successful';
COMMENT ON COLUMN "WebhookLog"."error_message" IS 'Error message if failed';
COMMENT ON COLUMN "WebhookLog"."duration_ms" IS 'Request duration in milliseconds';
COMMENT ON COLUMN "WebhookLog"."createdAt" IS 'Log creation timestamp';

-- Dashboard comments
COMMENT ON TABLE "Dashboard" IS 'Dashboard - Custom dashboard configurations for analytics';
COMMENT ON COLUMN "Dashboard"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Dashboard"."name" IS 'Dashboard name';
COMMENT ON COLUMN "Dashboard"."description" IS 'Dashboard description';
COMMENT ON COLUMN "Dashboard"."userId" IS 'Owner user reference';
COMMENT ON COLUMN "Dashboard"."layout" IS 'Layout type (grid, list)';
COMMENT ON COLUMN "Dashboard"."theme" IS 'Visual theme';
COMMENT ON COLUMN "Dashboard"."isPublic" IS 'Whether dashboard is publicly visible';
COMMENT ON COLUMN "Dashboard"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "Dashboard"."updatedAt" IS 'Last update timestamp';

-- DashboardShare comments
COMMENT ON TABLE "DashboardShare" IS 'DashboardShare - Dashboard sharing permissions between users';
COMMENT ON COLUMN "DashboardShare"."id" IS 'Unique identifier';
COMMENT ON COLUMN "DashboardShare"."dashboardId" IS 'Reference to dashboard';
COMMENT ON COLUMN "DashboardShare"."userId" IS 'Reference to user';
COMMENT ON COLUMN "DashboardShare"."permission" IS 'Permission level (view, edit)';
COMMENT ON COLUMN "DashboardShare"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "DashboardShare"."updatedAt" IS 'Last update timestamp';

-- DashboardWidget comments
COMMENT ON TABLE "DashboardWidget" IS 'DashboardWidget - Individual widgets within a dashboard';
COMMENT ON COLUMN "DashboardWidget"."id" IS 'Unique identifier';
COMMENT ON COLUMN "DashboardWidget"."dashboardId" IS 'Reference to dashboard';
COMMENT ON COLUMN "DashboardWidget"."type" IS 'Widget type';
COMMENT ON COLUMN "DashboardWidget"."title" IS 'Widget title';
COMMENT ON COLUMN "DashboardWidget"."config" IS 'Widget configuration (JSON)';
COMMENT ON COLUMN "DashboardWidget"."position" IS 'Position on dashboard (JSON)';
COMMENT ON COLUMN "DashboardWidget"."dataSource" IS 'Data source identifier';
COMMENT ON COLUMN "DashboardWidget"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "DashboardWidget"."updatedAt" IS 'Last update timestamp';

-- SystemPromptCategory comments
COMMENT ON TABLE "SystemPromptCategory" IS 'SystemPromptCategory - Categories for organizing AI system prompts';
COMMENT ON COLUMN "SystemPromptCategory"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SystemPromptCategory"."name" IS 'Category name';
COMMENT ON COLUMN "SystemPromptCategory"."description" IS 'Category description';
COMMENT ON COLUMN "SystemPromptCategory"."color" IS 'Display color';
COMMENT ON COLUMN "SystemPromptCategory"."is_active" IS 'Whether category is active';
COMMENT ON COLUMN "SystemPromptCategory"."created_at" IS 'Record creation timestamp';
COMMENT ON COLUMN "SystemPromptCategory"."updated_at" IS 'Last update timestamp';

-- SystemPrompt comments
COMMENT ON TABLE "SystemPrompt" IS 'SystemPrompt - AI system prompts for various recruitment tasks';
COMMENT ON COLUMN "SystemPrompt"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SystemPrompt"."name" IS 'Prompt name';
COMMENT ON COLUMN "SystemPrompt"."description" IS 'Prompt description';
COMMENT ON COLUMN "SystemPrompt"."content" IS 'Prompt content';
COMMENT ON COLUMN "SystemPrompt"."categoryId" IS 'Reference to category';
COMMENT ON COLUMN "SystemPrompt"."is_active" IS 'Whether prompt is active';
COMMENT ON COLUMN "SystemPrompt"."created_at" IS 'Record creation timestamp';
COMMENT ON COLUMN "SystemPrompt"."updated_at" IS 'Last update timestamp';

-- CandidateSource comments
COMMENT ON TABLE "CandidateSource" IS 'CandidateSource - Candidate sourcing channels (job portals, referrals, etc.)';
COMMENT ON COLUMN "CandidateSource"."id" IS 'Unique identifier';
COMMENT ON COLUMN "CandidateSource"."name" IS 'Source name (e.g., LinkedIn, JobsDB)';
COMMENT ON COLUMN "CandidateSource"."description" IS 'Source description';
COMMENT ON COLUMN "CandidateSource"."allow_sub_source" IS 'Whether sub-sources are allowed';
COMMENT ON COLUMN "CandidateSource"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "CandidateSource"."is_active" IS 'Whether source is active';
COMMENT ON COLUMN "CandidateSource"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "CandidateSource"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "CandidateSource"."logo" IS 'Logo URL or path';
COMMENT ON COLUMN "CandidateSource"."email" IS 'Contact email for this source';

-- Notification comments
COMMENT ON TABLE "Notification" IS 'Notification - User notification messages';
COMMENT ON COLUMN "Notification"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Notification"."userId" IS 'Target user reference';
COMMENT ON COLUMN "Notification"."type" IS 'Notification type';
COMMENT ON COLUMN "Notification"."title" IS 'Notification title';
COMMENT ON COLUMN "Notification"."message" IS 'Notification message body';
COMMENT ON COLUMN "Notification"."data" IS 'Additional data (JSON)';
COMMENT ON COLUMN "Notification"."isRead" IS 'Whether notification has been read';
COMMENT ON COLUMN "Notification"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "Notification"."updatedAt" IS 'Last update timestamp';

-- Headcount comments
COMMENT ON TABLE "Headcount" IS 'Headcount - Position headcount tracking for workforce planning';
COMMENT ON COLUMN "Headcount"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Headcount"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "Headcount"."type" IS 'Headcount type (new, replacement, expansion)';
COMMENT ON COLUMN "Headcount"."status" IS 'Current status (vacant, filled, pending)';
COMMENT ON COLUMN "Headcount"."candidateId" IS 'Assigned candidate reference';
COMMENT ON COLUMN "Headcount"."onboardingDate" IS 'Expected onboarding date';
COMMENT ON COLUMN "Headcount"."requestDate" IS 'Request submission date';
COMMENT ON COLUMN "Headcount"."notes" IS 'Additional notes';
COMMENT ON COLUMN "Headcount"."memo_id" IS 'Reference memo ID';
COMMENT ON COLUMN "Headcount"."custom_fields" IS 'Custom fields (JSON)';
COMMENT ON COLUMN "Headcount"."employee_id" IS 'Employee ID once filled';
COMMENT ON COLUMN "Headcount"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "Headcount"."updatedAt" IS 'Last update timestamp';

-- PositionInterviewer comments
COMMENT ON TABLE "PositionInterviewer" IS 'PositionInterviewer - Interviewers assigned to positions';
COMMENT ON COLUMN "PositionInterviewer"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PositionInterviewer"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "PositionInterviewer"."userId" IS 'Reference to user';
COMMENT ON COLUMN "PositionInterviewer"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PositionInterviewer"."createdBy" IS 'User who assigned interviewer';

-- ExpertiseGroup comments
COMMENT ON TABLE "ExpertiseGroup" IS 'ExpertiseGroup - Groups of related expertise skills for evaluation';
COMMENT ON COLUMN "ExpertiseGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "ExpertiseGroup"."name" IS 'Group name';
COMMENT ON COLUMN "ExpertiseGroup"."description" IS 'Group description';
COMMENT ON COLUMN "ExpertiseGroup"."color" IS 'Display color';
COMMENT ON COLUMN "ExpertiseGroup"."is_active" IS 'Whether group is active';
COMMENT ON COLUMN "ExpertiseGroup"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "ExpertiseGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "ExpertiseGroup"."updatedAt" IS 'Last update timestamp';

-- ExpertiseSkill comments
COMMENT ON TABLE "ExpertiseSkill" IS 'ExpertiseSkill - Individual expertise skills for candidate evaluation';
COMMENT ON COLUMN "ExpertiseSkill"."id" IS 'Unique identifier';
COMMENT ON COLUMN "ExpertiseSkill"."name" IS 'Skill name';
COMMENT ON COLUMN "ExpertiseSkill"."description" IS 'Skill description';
COMMENT ON COLUMN "ExpertiseSkill"."max_score" IS 'Maximum score for this skill';
COMMENT ON COLUMN "ExpertiseSkill"."skill_type" IS 'Skill type (hard_skill, soft_skill)';
COMMENT ON COLUMN "ExpertiseSkill"."is_active" IS 'Whether skill is active';
COMMENT ON COLUMN "ExpertiseSkill"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "ExpertiseSkill"."groupId" IS 'Reference to expertise group';
COMMENT ON COLUMN "ExpertiseSkill"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "ExpertiseSkill"."updatedAt" IS 'Last update timestamp';

-- PersonalityGroup comments
COMMENT ON TABLE "PersonalityGroup" IS 'PersonalityGroup - Groups of related personality traits for evaluation';
COMMENT ON COLUMN "PersonalityGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PersonalityGroup"."name" IS 'Group name';
COMMENT ON COLUMN "PersonalityGroup"."description" IS 'Group description';
COMMENT ON COLUMN "PersonalityGroup"."color" IS 'Display color';
COMMENT ON COLUMN "PersonalityGroup"."is_active" IS 'Whether group is active';
COMMENT ON COLUMN "PersonalityGroup"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "PersonalityGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PersonalityGroup"."updatedAt" IS 'Last update timestamp';

-- PersonalityTrait comments
COMMENT ON TABLE "PersonalityTrait" IS 'PersonalityTrait - Individual personality traits for candidate evaluation';
COMMENT ON COLUMN "PersonalityTrait"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PersonalityTrait"."name" IS 'Trait name';
COMMENT ON COLUMN "PersonalityTrait"."description" IS 'Trait description';
COMMENT ON COLUMN "PersonalityTrait"."short_description" IS 'Short description for display';
COMMENT ON COLUMN "PersonalityTrait"."is_active" IS 'Whether trait is active';
COMMENT ON COLUMN "PersonalityTrait"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "PersonalityTrait"."groupId" IS 'Reference to personality group';
COMMENT ON COLUMN "PersonalityTrait"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PersonalityTrait"."updatedAt" IS 'Last update timestamp';

-- SkillTemplate comments
COMMENT ON TABLE "SkillTemplate" IS 'SkillTemplate - Reusable templates for skill and personality configurations';
COMMENT ON COLUMN "SkillTemplate"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SkillTemplate"."name" IS 'Template name';
COMMENT ON COLUMN "SkillTemplate"."description" IS 'Template description';
COMMENT ON COLUMN "SkillTemplate"."is_active" IS 'Whether template is active';
COMMENT ON COLUMN "SkillTemplate"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SkillTemplate"."updatedAt" IS 'Last update timestamp';

-- SkillTemplateGroup comments
COMMENT ON TABLE "SkillTemplateGroup" IS 'SkillTemplateGroup - Expertise group assignments in skill templates';
COMMENT ON COLUMN "SkillTemplateGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SkillTemplateGroup"."templateId" IS 'Reference to template';
COMMENT ON COLUMN "SkillTemplateGroup"."groupId" IS 'Reference to expertise group';
COMMENT ON COLUMN "SkillTemplateGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SkillTemplateGroup"."updatedAt" IS 'Last update timestamp';

-- SkillTemplateSkill comments
COMMENT ON TABLE "SkillTemplateSkill" IS 'SkillTemplateSkill - Expertise skill assignments in skill templates';
COMMENT ON COLUMN "SkillTemplateSkill"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SkillTemplateSkill"."templateId" IS 'Reference to template';
COMMENT ON COLUMN "SkillTemplateSkill"."skillId" IS 'Reference to expertise skill';
COMMENT ON COLUMN "SkillTemplateSkill"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SkillTemplateSkill"."updatedAt" IS 'Last update timestamp';

-- SkillTemplatePersonalityGroup comments
COMMENT ON TABLE "SkillTemplatePersonalityGroup" IS 'SkillTemplatePersonalityGroup - Personality group assignments in skill templates';
COMMENT ON COLUMN "SkillTemplatePersonalityGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SkillTemplatePersonalityGroup"."templateId" IS 'Reference to template';
COMMENT ON COLUMN "SkillTemplatePersonalityGroup"."groupId" IS 'Reference to personality group';
COMMENT ON COLUMN "SkillTemplatePersonalityGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SkillTemplatePersonalityGroup"."updatedAt" IS 'Last update timestamp';

-- SkillTemplatePersonalityTrait comments
COMMENT ON TABLE "SkillTemplatePersonalityTrait" IS 'SkillTemplatePersonalityTrait - Personality trait assignments in skill templates';
COMMENT ON COLUMN "SkillTemplatePersonalityTrait"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SkillTemplatePersonalityTrait"."templateId" IS 'Reference to template';
COMMENT ON COLUMN "SkillTemplatePersonalityTrait"."traitId" IS 'Reference to personality trait';
COMMENT ON COLUMN "SkillTemplatePersonalityTrait"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SkillTemplatePersonalityTrait"."updatedAt" IS 'Last update timestamp';

-- PositionExpertiseGroup comments
COMMENT ON TABLE "PositionExpertiseGroup" IS 'PositionExpertiseGroup - Expertise group requirements for positions';
COMMENT ON COLUMN "PositionExpertiseGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PositionExpertiseGroup"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "PositionExpertiseGroup"."groupId" IS 'Reference to expertise group';
COMMENT ON COLUMN "PositionExpertiseGroup"."is_required" IS 'Whether this group is required';
COMMENT ON COLUMN "PositionExpertiseGroup"."weight" IS 'Weight for scoring';
COMMENT ON COLUMN "PositionExpertiseGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PositionExpertiseGroup"."updatedAt" IS 'Last update timestamp';

-- PositionExpertiseSkill comments
COMMENT ON TABLE "PositionExpertiseSkill" IS 'PositionExpertiseSkill - Expertise skill requirements for positions';
COMMENT ON COLUMN "PositionExpertiseSkill"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PositionExpertiseSkill"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "PositionExpertiseSkill"."skillId" IS 'Reference to expertise skill';
COMMENT ON COLUMN "PositionExpertiseSkill"."is_required" IS 'Whether this skill is required';
COMMENT ON COLUMN "PositionExpertiseSkill"."weight" IS 'Weight for scoring';
COMMENT ON COLUMN "PositionExpertiseSkill"."min_score" IS 'Minimum required score';
COMMENT ON COLUMN "PositionExpertiseSkill"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PositionExpertiseSkill"."updatedAt" IS 'Last update timestamp';

-- PositionPersonalityGroup comments
COMMENT ON TABLE "PositionPersonalityGroup" IS 'PositionPersonalityGroup - Personality group requirements for positions';
COMMENT ON COLUMN "PositionPersonalityGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PositionPersonalityGroup"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "PositionPersonalityGroup"."groupId" IS 'Reference to personality group';
COMMENT ON COLUMN "PositionPersonalityGroup"."is_required" IS 'Whether this group is required';
COMMENT ON COLUMN "PositionPersonalityGroup"."weight" IS 'Weight for scoring';
COMMENT ON COLUMN "PositionPersonalityGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PositionPersonalityGroup"."updatedAt" IS 'Last update timestamp';

-- PositionPersonalityTrait comments
COMMENT ON TABLE "PositionPersonalityTrait" IS 'PositionPersonalityTrait - Personality trait requirements for positions';
COMMENT ON COLUMN "PositionPersonalityTrait"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PositionPersonalityTrait"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "PositionPersonalityTrait"."traitId" IS 'Reference to personality trait';
COMMENT ON COLUMN "PositionPersonalityTrait"."is_required" IS 'Whether this trait is required';
COMMENT ON COLUMN "PositionPersonalityTrait"."weight" IS 'Weight for scoring';
COMMENT ON COLUMN "PositionPersonalityTrait"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PositionPersonalityTrait"."updatedAt" IS 'Last update timestamp';

-- CandidateEvaluation comments
COMMENT ON TABLE "CandidateEvaluation" IS 'CandidateEvaluation - Evaluation records for candidate assessments';
COMMENT ON COLUMN "CandidateEvaluation"."id" IS 'Unique identifier';
COMMENT ON COLUMN "CandidateEvaluation"."candidateId" IS 'Reference to candidate';
COMMENT ON COLUMN "CandidateEvaluation"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "CandidateEvaluation"."evaluatorId" IS 'Reference to evaluator';
COMMENT ON COLUMN "CandidateEvaluation"."status" IS 'Evaluation status (in_progress, completed)';
COMMENT ON COLUMN "CandidateEvaluation"."overall_score" IS 'Overall evaluation score';
COMMENT ON COLUMN "CandidateEvaluation"."comments" IS 'Evaluator comments';
COMMENT ON COLUMN "CandidateEvaluation"."completed_at" IS 'Completion timestamp';
COMMENT ON COLUMN "CandidateEvaluation"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "CandidateEvaluation"."updatedAt" IS 'Last update timestamp';

-- CandidateEvaluationLink comments
COMMENT ON TABLE "CandidateEvaluationLink" IS 'CandidateEvaluationLink - Secure links for external candidate evaluation';
COMMENT ON COLUMN "CandidateEvaluationLink"."id" IS 'Unique identifier';
COMMENT ON COLUMN "CandidateEvaluationLink"."candidateId" IS 'Reference to candidate';
COMMENT ON COLUMN "CandidateEvaluationLink"."token" IS 'Secure access token';
COMMENT ON COLUMN "CandidateEvaluationLink"."expiresAt" IS 'Token expiration timestamp';
COMMENT ON COLUMN "CandidateEvaluationLink"."createdById" IS 'User who created the link';
COMMENT ON COLUMN "CandidateEvaluationLink"."requireLogin" IS 'Whether login is required to access';
COMMENT ON COLUMN "CandidateEvaluationLink"."revokedAt" IS 'Link revocation timestamp';
COMMENT ON COLUMN "CandidateEvaluationLink"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "CandidateEvaluationLink"."updatedAt" IS 'Last update timestamp';

-- CandidateExpertiseScore comments
COMMENT ON TABLE "CandidateExpertiseScore" IS 'CandidateExpertiseScore - Recorded scores for expertise skills';
COMMENT ON COLUMN "CandidateExpertiseScore"."id" IS 'Unique identifier';
COMMENT ON COLUMN "CandidateExpertiseScore"."evaluationId" IS 'Reference to evaluation';
COMMENT ON COLUMN "CandidateExpertiseScore"."skillId" IS 'Reference to skill';
COMMENT ON COLUMN "CandidateExpertiseScore"."score" IS 'Score value';
COMMENT ON COLUMN "CandidateExpertiseScore"."notes" IS 'Optional notes on score';
COMMENT ON COLUMN "CandidateExpertiseScore"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "CandidateExpertiseScore"."updatedAt" IS 'Last update timestamp';

-- CandidatePersonalityScore comments
COMMENT ON TABLE "CandidatePersonalityScore" IS 'CandidatePersonalityScore - Recorded scores for personality traits';
COMMENT ON COLUMN "CandidatePersonalityScore"."id" IS 'Unique identifier';
COMMENT ON COLUMN "CandidatePersonalityScore"."evaluationId" IS 'Reference to evaluation';
COMMENT ON COLUMN "CandidatePersonalityScore"."traitId" IS 'Reference to personality trait';
COMMENT ON COLUMN "CandidatePersonalityScore"."score" IS 'Score value';
COMMENT ON COLUMN "CandidatePersonalityScore"."notes" IS 'Optional notes on score';
COMMENT ON COLUMN "CandidatePersonalityScore"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "CandidatePersonalityScore"."updatedAt" IS 'Last update timestamp';

-- UserSession comments
COMMENT ON TABLE "UserSession" IS 'User Session - tracks active sessions for single-device login enforcement';
COMMENT ON COLUMN "UserSession"."id" IS 'Unique identifier';
COMMENT ON COLUMN "UserSession"."user_id" IS 'Reference to user';
COMMENT ON COLUMN "UserSession"."session_token" IS 'Unique session token';
COMMENT ON COLUMN "UserSession"."device_info" IS 'Device information string';
COMMENT ON COLUMN "UserSession"."ip_address" IS 'Client IP address';
COMMENT ON COLUMN "UserSession"."user_agent" IS 'Client user agent';
COMMENT ON COLUMN "UserSession"."is_active" IS 'Whether session is active';
COMMENT ON COLUMN "UserSession"."created_at" IS 'Session creation timestamp';
COMMENT ON COLUMN "UserSession"."expires_at" IS 'Session expiration timestamp';
COMMENT ON COLUMN "UserSession"."last_activity_at" IS 'Last activity timestamp';

-- SystemApiKey comments
COMMENT ON TABLE "SystemApiKey" IS 'SystemApiKey - API keys for external system/service authentication (v2 API)';
COMMENT ON COLUMN "SystemApiKey"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SystemApiKey"."name" IS 'Display name for the API key';
COMMENT ON COLUMN "SystemApiKey"."description" IS 'Optional description of the key''s purpose';
COMMENT ON COLUMN "SystemApiKey"."key_prefix" IS 'First 12 characters of the key for identification (e.g., "sk_live_abc1")';
COMMENT ON COLUMN "SystemApiKey"."key_hash" IS 'SHA-256 hash of the full API key';
COMMENT ON COLUMN "SystemApiKey"."permissions" IS 'Array of permission strings (empty = full access based on role)';
COMMENT ON COLUMN "SystemApiKey"."role" IS 'Role assigned to this API key (determines base permissions)';
COMMENT ON COLUMN "SystemApiKey"."is_active" IS 'Whether the API key is active';
COMMENT ON COLUMN "SystemApiKey"."expires_at" IS 'Optional expiration timestamp (null = never expires)';
COMMENT ON COLUMN "SystemApiKey"."last_used_at" IS 'Last time this key was used';
COMMENT ON COLUMN "SystemApiKey"."last_used_ip" IS 'IP address of last request using this key';
COMMENT ON COLUMN "SystemApiKey"."usage_count" IS 'Number of times this key has been used';
COMMENT ON COLUMN "SystemApiKey"."created_by_id" IS 'User who created this API key';
COMMENT ON COLUMN "SystemApiKey"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SystemApiKey"."updatedAt" IS 'Last update timestamp';
