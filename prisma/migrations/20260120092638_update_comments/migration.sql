-- Prisma Database Comments Generator v1.4.0

-- CustomFieldDefinition comments
COMMENT ON COLUMN "CustomFieldDefinition"."id" IS 'Unique identifier';
COMMENT ON COLUMN "CustomFieldDefinition"."model_name" IS 'Target model name (applicant, Position, etc.)';
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
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_applicant_detail" IS 'Show in applicant detail view';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_filter" IS 'Show in filter options';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_full_applicant_detail" IS 'Show in full applicant detail';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_headcount_detail" IS 'Show in headcount detail view';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_position_settings" IS 'Show in position settings';
COMMENT ON COLUMN "CustomFieldDefinition"."show_in_task_board_filter" IS 'Show in task board filter';
COMMENT ON COLUMN "CustomFieldDefinition"."applicant_detail_section" IS 'applicant detail section';
COMMENT ON COLUMN "CustomFieldDefinition"."position_detail_section" IS 'Position detail section';
COMMENT ON COLUMN "CustomFieldDefinition"."view_roles" IS 'Roles allowed to view';

-- CustomFieldOption comments
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
COMMENT ON COLUMN "JobMatch"."id" IS 'Unique identifier';
COMMENT ON COLUMN "JobMatch"."applicantId" IS 'Reference to applicant';
COMMENT ON COLUMN "JobMatch"."jobId" IS 'Reference to matched job';
COMMENT ON COLUMN "JobMatch"."jobTitle" IS 'Matched job title';
COMMENT ON COLUMN "JobMatch"."fitScore" IS 'AI-calculated fit score (0-100)';
COMMENT ON COLUMN "JobMatch"."matchReasons" IS 'Reasons for the match';
COMMENT ON COLUMN "JobMatch"."job_description_summary" IS 'Summary of job description';
COMMENT ON COLUMN "JobMatch"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "JobMatch"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "JobMatch"."companyId" IS 'Company identifier';

-- upload_queue comments
COMMENT ON COLUMN "upload_queue"."id" IS 'Unique identifier';
COMMENT ON COLUMN "upload_queue"."file_name" IS 'Original file name';
COMMENT ON COLUMN "upload_queue"."file_size" IS 'File size in bytes';
COMMENT ON COLUMN "upload_queue"."status" IS 'Processing status (pending, processing, completed, failed)';
COMMENT ON COLUMN "upload_queue"."error" IS 'Error message if failed';
COMMENT ON COLUMN "upload_queue"."error_details" IS 'Detailed error information';
COMMENT ON COLUMN "upload_queue"."source" IS 'Source name';
COMMENT ON COLUMN "upload_queue"."source_id" IS 'Reference to applicant source';
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
COMMENT ON COLUMN "UserUIDisplayPreference"."id" IS 'Unique identifier';
COMMENT ON COLUMN "UserUIDisplayPreference"."userId" IS 'Reference to user';
COMMENT ON COLUMN "UserUIDisplayPreference"."model_type" IS 'Model type for preference';
COMMENT ON COLUMN "UserUIDisplayPreference"."attribute_key" IS 'Attribute key';
COMMENT ON COLUMN "UserUIDisplayPreference"."ui_preference" IS 'UI preference value';
COMMENT ON COLUMN "UserUIDisplayPreference"."custom_note" IS 'Custom note';
COMMENT ON COLUMN "UserUIDisplayPreference"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "UserUIDisplayPreference"."updatedAt" IS 'Last update timestamp';

-- Account comments
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
COMMENT ON COLUMN "SystemPreference"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SystemPreference"."userId" IS 'Reference to user';
COMMENT ON COLUMN "SystemPreference"."key" IS 'Preference key';
COMMENT ON COLUMN "SystemPreference"."value" IS 'Preference value';
COMMENT ON COLUMN "SystemPreference"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SystemPreference"."updatedAt" IS 'Last update timestamp';

-- applicantComment comments
COMMENT ON COLUMN "applicantComment"."id" IS 'Unique identifier';
COMMENT ON COLUMN "applicantComment"."applicantId" IS 'Reference to applicant';
COMMENT ON COLUMN "applicantComment"."authorId" IS 'Comment author reference';
COMMENT ON COLUMN "applicantComment"."content" IS 'Comment content';
COMMENT ON COLUMN "applicantComment"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "applicantComment"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "applicantComment"."attachmentIds" IS 'Referenced attachment IDs';

-- Attachment comments
COMMENT ON COLUMN "Attachment"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Attachment"."applicantId" IS 'Reference to applicant';
COMMENT ON COLUMN "Attachment"."uploadedById" IS 'User who uploaded the file';
COMMENT ON COLUMN "Attachment"."filePath" IS 'File storage path';
COMMENT ON COLUMN "Attachment"."fileName" IS 'Original file name';
COMMENT ON COLUMN "Attachment"."label" IS 'File label/category';
COMMENT ON COLUMN "Attachment"."isPrimary" IS 'Whether this is the primary attachment';
COMMENT ON COLUMN "Attachment"."uploadedAt" IS 'Upload timestamp';
COMMENT ON COLUMN "Attachment"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "Attachment"."headcountId" IS 'Reference to headcount';

-- Webhook comments
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
COMMENT ON COLUMN "WebhookBodyConfig"."id" IS 'Unique identifier';
COMMENT ON COLUMN "WebhookBodyConfig"."webhook_id" IS 'Reference to webhook';
COMMENT ON COLUMN "WebhookBodyConfig"."event_type" IS 'Event type for this config';
COMMENT ON COLUMN "WebhookBodyConfig"."body_template" IS 'Body template content';
COMMENT ON COLUMN "WebhookBodyConfig"."field_mappings" IS 'Field mappings (JSON)';
COMMENT ON COLUMN "WebhookBodyConfig"."is_active" IS 'Whether config is active';
COMMENT ON COLUMN "WebhookBodyConfig"."created_at" IS 'Record creation timestamp';
COMMENT ON COLUMN "WebhookBodyConfig"."updated_at" IS 'Last update timestamp';

-- DashboardShare comments
COMMENT ON COLUMN "DashboardShare"."id" IS 'Unique identifier';
COMMENT ON COLUMN "DashboardShare"."dashboardId" IS 'Reference to dashboard';
COMMENT ON COLUMN "DashboardShare"."userId" IS 'Reference to user';
COMMENT ON COLUMN "DashboardShare"."permission" IS 'Permission level (view, edit)';
COMMENT ON COLUMN "DashboardShare"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "DashboardShare"."updatedAt" IS 'Last update timestamp';

-- DashboardWidget comments
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
COMMENT ON COLUMN "SystemPromptCategory"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SystemPromptCategory"."name" IS 'Category name';
COMMENT ON COLUMN "SystemPromptCategory"."description" IS 'Category description';
COMMENT ON COLUMN "SystemPromptCategory"."color" IS 'Display color';
COMMENT ON COLUMN "SystemPromptCategory"."is_active" IS 'Whether category is active';
COMMENT ON COLUMN "SystemPromptCategory"."created_at" IS 'Record creation timestamp';
COMMENT ON COLUMN "SystemPromptCategory"."updated_at" IS 'Last update timestamp';

-- SystemPrompt comments
COMMENT ON COLUMN "SystemPrompt"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SystemPrompt"."name" IS 'Prompt name';
COMMENT ON COLUMN "SystemPrompt"."description" IS 'Prompt description';
COMMENT ON COLUMN "SystemPrompt"."content" IS 'Prompt content';
COMMENT ON COLUMN "SystemPrompt"."categoryId" IS 'Reference to category';
COMMENT ON COLUMN "SystemPrompt"."is_active" IS 'Whether prompt is active';
COMMENT ON COLUMN "SystemPrompt"."created_at" IS 'Record creation timestamp';
COMMENT ON COLUMN "SystemPrompt"."updated_at" IS 'Last update timestamp';

-- WarningConfiguration comments
COMMENT ON COLUMN "WarningConfiguration"."id" IS 'Unique identifier';
COMMENT ON COLUMN "WarningConfiguration"."name" IS 'Configuration name';
COMMENT ON COLUMN "WarningConfiguration"."description" IS 'Configuration description';
COMMENT ON COLUMN "WarningConfiguration"."entity_type" IS 'Target entity type (applicant, Position)';
COMMENT ON COLUMN "WarningConfiguration"."field" IS 'Field to monitor';
COMMENT ON COLUMN "WarningConfiguration"."condition" IS 'Condition to check';
COMMENT ON COLUMN "WarningConfiguration"."operator" IS 'Comparison operator';
COMMENT ON COLUMN "WarningConfiguration"."value" IS 'Threshold value';
COMMENT ON COLUMN "WarningConfiguration"."threshold" IS 'Numeric threshold';
COMMENT ON COLUMN "WarningConfiguration"."severity" IS 'Severity level (info, warning, critical)';
COMMENT ON COLUMN "WarningConfiguration"."is_active" IS 'Whether configuration is active';
COMMENT ON COLUMN "WarningConfiguration"."is_public" IS 'Whether configuration is public';
COMMENT ON COLUMN "WarningConfiguration"."created_by" IS 'User who created configuration';
COMMENT ON COLUMN "WarningConfiguration"."created_at" IS 'Record creation timestamp';
COMMENT ON COLUMN "WarningConfiguration"."updated_at" IS 'Last update timestamp';
COMMENT ON COLUMN "WarningConfiguration"."conditions" IS 'Conditions array (JSON)';
COMMENT ON COLUMN "WarningConfiguration"."logical_operator" IS 'Logical operator (AND, OR)';
COMMENT ON COLUMN "WarningConfiguration"."cross_entity_conditions" IS 'Cross-entity conditions (JSON)';
COMMENT ON COLUMN "WarningConfiguration"."condition_groups" IS 'Condition groups (JSON)';

-- Warning comments
COMMENT ON COLUMN "Warning"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Warning"."configuration_id" IS 'Reference to warning configuration';
COMMENT ON COLUMN "Warning"."entity_type" IS 'Entity type (applicant, Position)';
COMMENT ON COLUMN "Warning"."entity_id" IS 'Entity ID that triggered warning';
COMMENT ON COLUMN "Warning"."field" IS 'Field that triggered warning';
COMMENT ON COLUMN "Warning"."current_value" IS 'Current value of the field';
COMMENT ON COLUMN "Warning"."expected_value" IS 'Expected value for the field';
COMMENT ON COLUMN "Warning"."message" IS 'Warning message';
COMMENT ON COLUMN "Warning"."severity" IS 'Severity level';
COMMENT ON COLUMN "Warning"."created_at" IS 'Record creation timestamp';
COMMENT ON COLUMN "Warning"."updated_at" IS 'Last update timestamp';

-- PositionInterviewer comments
COMMENT ON COLUMN "PositionInterviewer"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PositionInterviewer"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "PositionInterviewer"."userId" IS 'Reference to user';
COMMENT ON COLUMN "PositionInterviewer"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PositionInterviewer"."createdBy" IS 'User who assigned interviewer';

-- PersonalityTrait comments
COMMENT ON TABLE "PersonalityTrait" IS 'PersonalityTrait - Individual personality traits for applicant evaluation';
COMMENT ON COLUMN "PersonalityTrait"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PersonalityTrait"."name" IS 'Trait name';
COMMENT ON COLUMN "PersonalityTrait"."description" IS 'Trait description';
COMMENT ON COLUMN "PersonalityTrait"."short_description" IS 'Short description for display';
COMMENT ON COLUMN "PersonalityTrait"."is_active" IS 'Whether trait is active';
COMMENT ON COLUMN "PersonalityTrait"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "PersonalityTrait"."groupId" IS 'Reference to personality group';
COMMENT ON COLUMN "PersonalityTrait"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PersonalityTrait"."updatedAt" IS 'Last update timestamp';
