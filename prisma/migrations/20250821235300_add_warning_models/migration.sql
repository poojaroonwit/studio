-- CreateTable
CREATE TABLE "WarningConfiguration" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entity_type" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT,
    "threshold" INTEGER,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarningConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarningConfigurationShare" (
    "id" UUID NOT NULL,
    "configuration_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarningConfigurationShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warning" (
    "id" UUID NOT NULL,
    "configuration_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "current_value" TEXT,
    "expected_value" TEXT,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WarningConfiguration_entity_type_idx" ON "WarningConfiguration"("entity_type");

-- CreateIndex
CREATE INDEX "WarningConfiguration_field_idx" ON "WarningConfiguration"("field");

-- CreateIndex
CREATE INDEX "WarningConfiguration_is_active_idx" ON "WarningConfiguration"("is_active");

-- CreateIndex
CREATE INDEX "WarningConfiguration_created_by_idx" ON "WarningConfiguration"("created_by");

-- CreateIndex
CREATE INDEX "WarningConfiguration_created_at_idx" ON "WarningConfiguration"("created_at");

-- CreateIndex
CREATE INDEX "WarningConfigurationShare_configuration_id_idx" ON "WarningConfigurationShare"("configuration_id");

-- CreateIndex
CREATE INDEX "WarningConfigurationShare_user_id_idx" ON "WarningConfigurationShare"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "WarningConfigurationShare_configuration_id_user_id_key" ON "WarningConfigurationShare"("configuration_id", "user_id");

-- CreateIndex
CREATE INDEX "Warning_configuration_id_idx" ON "Warning"("configuration_id");

-- CreateIndex
CREATE INDEX "Warning_entity_type_idx" ON "Warning"("entity_type");

-- CreateIndex
CREATE INDEX "Warning_entity_id_idx" ON "Warning"("entity_id");

-- CreateIndex
CREATE INDEX "Warning_severity_idx" ON "Warning"("severity");

-- CreateIndex
CREATE INDEX "Warning_created_at_idx" ON "Warning"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Warning_configuration_id_entity_type_entity_id_key" ON "Warning"("configuration_id", "entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "WarningConfiguration" ADD CONSTRAINT "WarningConfiguration_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarningConfigurationShare" ADD CONSTRAINT "WarningConfigurationShare_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "WarningConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarningConfigurationShare" ADD CONSTRAINT "WarningConfigurationShare_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warning" ADD CONSTRAINT "Warning_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "WarningConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
