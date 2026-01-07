-- AlterTable
ALTER TABLE "upload_queue" ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0;
