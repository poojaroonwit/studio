-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "image" TEXT,
    "dataAiHint" TEXT,
    "modulePermissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authentication_method" TEXT DEFAULT 'basic',
    "force_password_change" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apiKey" TEXT,
    "azure_oid" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "description" TEXT,
    "matchCriteria" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "positionLevel" TEXT,
    "customAttributes" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "positionId" UUID,
    "recruiterId" UUID,
    "fitScore" DOUBLE PRECISION DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Applied',
    "applicationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsedData" JSONB,
    "customAttributes" JSONB DEFAULT '{}',
    "resumePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avatarUrl" TEXT,
    "dataAiHint" TEXT,
    "assignmentJustification" TEXT,
    "educationData" JSONB DEFAULT '[]',
    "experienceData" JSONB DEFAULT '[]',

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentStage" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "color_complete" TEXT,
    "color_badge" TEXT,

    CONSTRAINT "RecruitmentStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransitionRecord" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "positionId" UUID,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stage" TEXT NOT NULL,
    "notes" TEXT,
    "actingUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransitionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" UUID NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT,
    "actingUserId" UUID,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT,
    "actingUserId" UUID,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "action" TEXT,
    "entity" TEXT,
    "entity_id" UUID,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_system_role" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User_UserGroup" (
    "userId" UUID NOT NULL,
    "groupId" UUID NOT NULL,

    CONSTRAINT "User_UserGroup_pkey" PRIMARY KEY ("userId","groupId")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" UUID NOT NULL,
    "model_name" TEXT NOT NULL,
    "field_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "field_type" TEXT NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobMatch" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "jobId" UUID,
    "jobTitle" TEXT,
    "fitScore" DOUBLE PRECISION,
    "matchReasons" TEXT[],
    "job_description_summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_queue" (
    "id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "error_details" TEXT,
    "source" TEXT,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_date" TIMESTAMP(3),
    "upload_id" TEXT,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_path" TEXT NOT NULL,
    "webhook_payload" JSONB,
    "position_id" UUID,
    "process_date" TIMESTAMP(3),

    CONSTRAINT "upload_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserUIDisplayPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "model_type" TEXT NOT NULL,
    "attribute_key" TEXT NOT NULL,
    "ui_preference" TEXT NOT NULL,
    "custom_note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserUIDisplayPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataModel" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateComment" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attachmentIds" TEXT[],

    CONSTRAINT "CandidateComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "headers" JSONB,
    "auth_header_name" TEXT,
    "auth_header_value" TEXT,
    "auth_password" TEXT,
    "auth_token" TEXT,
    "auth_type" TEXT NOT NULL DEFAULT 'none',
    "auth_username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "events" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "retry_count" INTEGER NOT NULL DEFAULT 3,
    "timeout" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "body_template" TEXT,
    "field_mappings" JSONB,
    "include_metadata" BOOLEAN NOT NULL DEFAULT true,
    "custom_payload" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookBodyConfig" (
    "id" UUID NOT NULL,
    "webhook_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "body_template" TEXT NOT NULL,
    "field_mappings" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookBodyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" UUID NOT NULL,
    "webhook_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response_status" INTEGER,
    "response_body" TEXT,
    "success" BOOLEAN NOT NULL,
    "error_message" TEXT,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dashboard" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" UUID NOT NULL,
    "layout" TEXT NOT NULL DEFAULT 'grid',
    "theme" TEXT NOT NULL DEFAULT 'default',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardShare" (
    "id" UUID NOT NULL,
    "dashboardId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'view',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardWidget" (
    "id" UUID NOT NULL,
    "dashboardId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "config" JSONB,
    "position" JSONB,
    "dataSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardWidget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKey_key" ON "User"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_azure_oid_key" ON "User"("azure_oid");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_authentication_method_idx" ON "User"("authentication_method");

-- CreateIndex
CREATE INDEX "Position_title_idx" ON "Position"("title");

-- CreateIndex
CREATE INDEX "Position_department_idx" ON "Position"("department");

-- CreateIndex
CREATE INDEX "Position_isOpen_idx" ON "Position"("isOpen");

-- CreateIndex
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_status_idx" ON "Candidate"("status");

-- CreateIndex
CREATE INDEX "Candidate_positionId_idx" ON "Candidate"("positionId");

-- CreateIndex
CREATE INDEX "Candidate_recruiterId_idx" ON "Candidate"("recruiterId");

-- CreateIndex
CREATE INDEX "Candidate_applicationDate_idx" ON "Candidate"("applicationDate");

-- CreateIndex
CREATE INDEX "Candidate_fitScore_idx" ON "Candidate"("fitScore");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentStage_name_key" ON "RecruitmentStage"("name");

-- CreateIndex
CREATE INDEX "RecruitmentStage_sort_order_idx" ON "RecruitmentStage"("sort_order");

-- CreateIndex
CREATE INDEX "RecruitmentStage_is_system_idx" ON "RecruitmentStage"("is_system");

-- CreateIndex
CREATE INDEX "TransitionRecord_candidateId_idx" ON "TransitionRecord"("candidateId");

-- CreateIndex
CREATE INDEX "TransitionRecord_actingUserId_idx" ON "TransitionRecord"("actingUserId");

-- CreateIndex
CREATE INDEX "TransitionRecord_date_idx" ON "TransitionRecord"("date");

-- CreateIndex
CREATE INDEX "TransitionRecord_stage_idx" ON "TransitionRecord"("stage");

-- CreateIndex
CREATE INDEX "TransitionRecord_positionId_idx" ON "TransitionRecord"("positionId");

-- CreateIndex
CREATE INDEX "LogEntry_timestamp_idx" ON "LogEntry"("timestamp");

-- CreateIndex
CREATE INDEX "LogEntry_level_idx" ON "LogEntry"("level");

-- CreateIndex
CREATE INDEX "LogEntry_source_idx" ON "LogEntry"("source");

-- CreateIndex
CREATE INDEX "LogEntry_actingUserId_idx" ON "LogEntry"("actingUserId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_level_idx" ON "AuditLog"("level");

-- CreateIndex
CREATE INDEX "AuditLog_source_idx" ON "AuditLog"("source");

-- CreateIndex
CREATE INDEX "AuditLog_actingUserId_idx" ON "AuditLog"("actingUserId");

-- CreateIndex
CREATE INDEX "AuditLog_user_id_idx" ON "AuditLog"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroup_name_key" ON "UserGroup"("name");

-- CreateIndex
CREATE INDEX "UserGroup_is_default_idx" ON "UserGroup"("is_default");

-- CreateIndex
CREATE INDEX "UserGroup_is_system_role_idx" ON "UserGroup"("is_system_role");

-- CreateIndex
CREATE INDEX "User_UserGroup_userId_idx" ON "User_UserGroup"("userId");

-- CreateIndex
CREATE INDEX "User_UserGroup_groupId_idx" ON "User_UserGroup"("groupId");

-- CreateIndex
CREATE INDEX "SystemSetting_updatedAt_idx" ON "SystemSetting"("updatedAt");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_model_name_idx" ON "CustomFieldDefinition"("model_name");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_sort_order_idx" ON "CustomFieldDefinition"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_model_name_field_key_key" ON "CustomFieldDefinition"("model_name", "field_key");

-- CreateIndex
CREATE INDEX "JobMatch_candidateId_idx" ON "JobMatch"("candidateId");

-- CreateIndex
CREATE INDEX "JobMatch_jobId_idx" ON "JobMatch"("jobId");

-- CreateIndex
CREATE INDEX "JobMatch_fitScore_idx" ON "JobMatch"("fitScore");

-- CreateIndex
CREATE INDEX "upload_queue_status_idx" ON "upload_queue"("status");

-- CreateIndex
CREATE INDEX "upload_queue_upload_date_idx" ON "upload_queue"("upload_date");

-- CreateIndex
CREATE INDEX "upload_queue_completed_date_idx" ON "upload_queue"("completed_date");

-- CreateIndex
CREATE INDEX "upload_queue_process_date_idx" ON "upload_queue"("process_date");

-- CreateIndex
CREATE INDEX "upload_queue_created_by_idx" ON "upload_queue"("created_by");

-- CreateIndex
CREATE INDEX "upload_queue_source_idx" ON "upload_queue"("source");

-- CreateIndex
CREATE INDEX "UserUIDisplayPreference_userId_idx" ON "UserUIDisplayPreference"("userId");

-- CreateIndex
CREATE INDEX "UserUIDisplayPreference_model_type_idx" ON "UserUIDisplayPreference"("model_type");

-- CreateIndex
CREATE INDEX "UserUIDisplayPreference_attribute_key_idx" ON "UserUIDisplayPreference"("attribute_key");

-- CreateIndex
CREATE UNIQUE INDEX "UserUIDisplayPreference_userId_model_type_attribute_key_key" ON "UserUIDisplayPreference"("userId", "model_type", "attribute_key");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "CandidateComment_candidateId_idx" ON "CandidateComment"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateComment_authorId_idx" ON "CandidateComment"("authorId");

-- CreateIndex
CREATE INDEX "Attachment_candidateId_idx" ON "Attachment"("candidateId");

-- CreateIndex
CREATE INDEX "Attachment_uploadedById_idx" ON "Attachment"("uploadedById");

-- CreateIndex
CREATE INDEX "Attachment_label_idx" ON "Attachment"("label");

-- CreateIndex
CREATE INDEX "Attachment_isPrimary_idx" ON "Attachment"("isPrimary");

-- CreateIndex
CREATE INDEX "Webhook_is_active_idx" ON "Webhook"("is_active");

-- CreateIndex
CREATE INDEX "Webhook_events_idx" ON "Webhook"("events");

-- CreateIndex
CREATE INDEX "Webhook_createdAt_idx" ON "Webhook"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookBodyConfig_webhook_id_idx" ON "WebhookBodyConfig"("webhook_id");

-- CreateIndex
CREATE INDEX "WebhookBodyConfig_event_type_idx" ON "WebhookBodyConfig"("event_type");

-- CreateIndex
CREATE INDEX "WebhookBodyConfig_is_active_idx" ON "WebhookBodyConfig"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookBodyConfig_webhook_id_event_type_key" ON "WebhookBodyConfig"("webhook_id", "event_type");

-- CreateIndex
CREATE INDEX "WebhookLog_webhook_id_idx" ON "WebhookLog"("webhook_id");

-- CreateIndex
CREATE INDEX "WebhookLog_event_type_idx" ON "WebhookLog"("event_type");

-- CreateIndex
CREATE INDEX "WebhookLog_success_idx" ON "WebhookLog"("success");

-- CreateIndex
CREATE INDEX "WebhookLog_createdAt_idx" ON "WebhookLog"("createdAt");

-- CreateIndex
CREATE INDEX "Dashboard_createdAt_idx" ON "Dashboard"("createdAt");

-- CreateIndex
CREATE INDEX "Dashboard_isPublic_idx" ON "Dashboard"("isPublic");

-- CreateIndex
CREATE INDEX "Dashboard_updatedAt_idx" ON "Dashboard"("updatedAt");

-- CreateIndex
CREATE INDEX "Dashboard_userId_idx" ON "Dashboard"("userId");

-- CreateIndex
CREATE INDEX "DashboardShare_dashboardId_idx" ON "DashboardShare"("dashboardId");

-- CreateIndex
CREATE INDEX "DashboardShare_permission_idx" ON "DashboardShare"("permission");

-- CreateIndex
CREATE INDEX "DashboardShare_userId_idx" ON "DashboardShare"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardShare_dashboardId_userId_key" ON "DashboardShare"("dashboardId", "userId");

-- CreateIndex
CREATE INDEX "DashboardWidget_createdAt_idx" ON "DashboardWidget"("createdAt");

-- CreateIndex
CREATE INDEX "DashboardWidget_dashboardId_idx" ON "DashboardWidget"("dashboardId");

-- CreateIndex
CREATE INDEX "DashboardWidget_type_idx" ON "DashboardWidget"("type");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitionRecord" ADD CONSTRAINT "TransitionRecord_actingUserId_fkey" FOREIGN KEY ("actingUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransitionRecord" ADD CONSTRAINT "TransitionRecord_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_actingUserId_fkey" FOREIGN KEY ("actingUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User_UserGroup" ADD CONSTRAINT "User_UserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "UserGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User_UserGroup" ADD CONSTRAINT "User_UserGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_queue" ADD CONSTRAINT "upload_queue_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUIDisplayPreference" ADD CONSTRAINT "UserUIDisplayPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateComment" ADD CONSTRAINT "CandidateComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateComment" ADD CONSTRAINT "CandidateComment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookBodyConfig" ADD CONSTRAINT "WebhookBodyConfig_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dashboard" ADD CONSTRAINT "Dashboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardShare" ADD CONSTRAINT "DashboardShare_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardShare" ADD CONSTRAINT "DashboardShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardWidget" ADD CONSTRAINT "DashboardWidget_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
