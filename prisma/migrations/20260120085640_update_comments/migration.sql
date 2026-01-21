-- Prisma Database Comments Generator v1.4.0

-- LogEntry comments
COMMENT ON COLUMN "LogEntry"."id" IS 'Unique identifier';
COMMENT ON COLUMN "LogEntry"."timestamp" IS 'Log timestamp';
COMMENT ON COLUMN "LogEntry"."level" IS 'Log level (INFO, WARN, ERROR, DEBUG)';
COMMENT ON COLUMN "LogEntry"."message" IS 'Log message content';
COMMENT ON COLUMN "LogEntry"."source" IS 'Log source/component';
COMMENT ON COLUMN "LogEntry"."actingUserId" IS 'User who triggered the log';
COMMENT ON COLUMN "LogEntry"."details" IS 'Additional log details (JSON)';
COMMENT ON COLUMN "LogEntry"."createdAt" IS 'Record creation timestamp';

-- AuditLog comments
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
COMMENT ON COLUMN "UserGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "UserGroup"."name" IS 'Group name';
COMMENT ON COLUMN "UserGroup"."description" IS 'Group description';
COMMENT ON COLUMN "UserGroup"."permissions" IS 'Array of permission strings';
COMMENT ON COLUMN "UserGroup"."is_default" IS 'Whether this is the default group';
COMMENT ON COLUMN "UserGroup"."is_system_role" IS 'Whether this is a system-defined role';
COMMENT ON COLUMN "UserGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "UserGroup"."updatedAt" IS 'Last update timestamp';

-- UserTeam comments
COMMENT ON COLUMN "UserTeam"."id" IS 'Unique identifier';
COMMENT ON COLUMN "UserTeam"."name" IS 'Team name';
COMMENT ON COLUMN "UserTeam"."description" IS 'Team description';
COMMENT ON COLUMN "UserTeam"."color" IS 'Display color';
COMMENT ON COLUMN "UserTeam"."is_active" IS 'Whether team is active';
COMMENT ON COLUMN "UserTeam"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "UserTeam"."updatedAt" IS 'Last update timestamp';

-- SystemSetting comments
COMMENT ON COLUMN "SystemSetting"."key" IS 'Setting key (primary key)';
COMMENT ON COLUMN "SystemSetting"."value" IS 'Setting value';
COMMENT ON COLUMN "SystemSetting"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SystemSetting"."updatedAt" IS 'Last update timestamp';

-- WebhookLog comments
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
COMMENT ON COLUMN "Dashboard"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Dashboard"."name" IS 'Dashboard name';
COMMENT ON COLUMN "Dashboard"."description" IS 'Dashboard description';
COMMENT ON COLUMN "Dashboard"."userId" IS 'Owner user reference';
COMMENT ON COLUMN "Dashboard"."layout" IS 'Layout type (grid, list)';
COMMENT ON COLUMN "Dashboard"."theme" IS 'Visual theme';
COMMENT ON COLUMN "Dashboard"."isPublic" IS 'Whether dashboard is publicly visible';
COMMENT ON COLUMN "Dashboard"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "Dashboard"."updatedAt" IS 'Last update timestamp';
