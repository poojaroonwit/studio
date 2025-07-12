/*
  Warnings:

  - You are about to drop the column `authData` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `authType` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `event` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Webhook` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `Webhook` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "authData",
DROP COLUMN "authType",
DROP COLUMN "createdAt",
DROP COLUMN "event",
DROP COLUMN "isActive",
DROP COLUMN "updatedAt",
ADD COLUMN     "auth_header_name" TEXT,
ADD COLUMN     "auth_header_value" TEXT,
ADD COLUMN     "auth_password" TEXT,
ADD COLUMN     "auth_token" TEXT,
ADD COLUMN     "auth_type" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "auth_username" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "events" TEXT[],
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "timeout" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookLog_webhook_id_idx" ON "WebhookLog"("webhook_id");

-- CreateIndex
CREATE INDEX "WebhookLog_event_type_idx" ON "WebhookLog"("event_type");

-- CreateIndex
CREATE INDEX "WebhookLog_success_idx" ON "WebhookLog"("success");

-- CreateIndex
CREATE INDEX "WebhookLog_created_at_idx" ON "WebhookLog"("created_at");

-- CreateIndex
CREATE INDEX "Webhook_is_active_idx" ON "Webhook"("is_active");

-- CreateIndex
CREATE INDEX "Webhook_events_idx" ON "Webhook"("events");

-- CreateIndex
CREATE INDEX "Webhook_created_at_idx" ON "Webhook"("created_at");

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
