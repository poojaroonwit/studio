/*
  Warnings:

  - You are about to drop the `NotificationChannel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotificationEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotificationSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebhookFieldMapping` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "NotificationSetting" DROP CONSTRAINT "NotificationSetting_channel_id_fkey";

-- DropForeignKey
ALTER TABLE "NotificationSetting" DROP CONSTRAINT "NotificationSetting_event_id_fkey";

-- DropTable
DROP TABLE "NotificationChannel";

-- DropTable
DROP TABLE "NotificationEvent";

-- DropTable
DROP TABLE "NotificationSetting";

-- DropTable
DROP TABLE "WebhookFieldMapping";
