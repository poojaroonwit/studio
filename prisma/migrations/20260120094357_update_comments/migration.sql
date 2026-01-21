-- Prisma Database Comments Generator v1.4.0

-- WarningConfigurationShare comments
COMMENT ON COLUMN "WarningConfigurationShare"."id" IS 'Unique identifier';
COMMENT ON COLUMN "WarningConfigurationShare"."configuration_id" IS 'Reference to configuration';
COMMENT ON COLUMN "WarningConfigurationShare"."user_id" IS 'Reference to user';
COMMENT ON COLUMN "WarningConfigurationShare"."created_at" IS 'Record creation timestamp';

-- UserSession comments
COMMENT ON TABLE "UserSession" IS 'User Session - tracks active sessions for single-device login enforcement';
