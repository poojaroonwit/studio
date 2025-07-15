-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "body_template" TEXT,
ADD COLUMN     "custom_payload" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "field_mappings" JSONB,
ADD COLUMN     "include_metadata" BOOLEAN NOT NULL DEFAULT true;

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

-- CreateIndex
CREATE INDEX "WebhookBodyConfig_webhook_id_idx" ON "WebhookBodyConfig"("webhook_id");

-- CreateIndex
CREATE INDEX "WebhookBodyConfig_event_type_idx" ON "WebhookBodyConfig"("event_type");

-- CreateIndex
CREATE INDEX "WebhookBodyConfig_is_active_idx" ON "WebhookBodyConfig"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookBodyConfig_webhook_id_event_type_key" ON "WebhookBodyConfig"("webhook_id", "event_type");

-- AddForeignKey
ALTER TABLE "WebhookBodyConfig" ADD CONSTRAINT "WebhookBodyConfig_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
