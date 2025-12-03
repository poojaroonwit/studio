-- Add email-related fields to Candidate table
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "emailDate" TIMESTAMP(3);
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "emailSubject" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "emailId" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "emailMetadata" JSONB;

-- Add email-related fields to UploadQueue table (using snake_case for consistency)
ALTER TABLE "upload_queue" ADD COLUMN IF NOT EXISTS "email_date" TIMESTAMP(3);
ALTER TABLE "upload_queue" ADD COLUMN IF NOT EXISTS "email_subject" TEXT;
ALTER TABLE "upload_queue" ADD COLUMN IF NOT EXISTS "email_id" TEXT;
ALTER TABLE "upload_queue" ADD COLUMN IF NOT EXISTS "email_metadata" JSONB;

-- Add indexes for email fields if needed for queries
CREATE INDEX IF NOT EXISTS "Candidate_emailDate_idx" ON "Candidate"("emailDate");
CREATE INDEX IF NOT EXISTS "Candidate_emailId_idx" ON "Candidate"("emailId");
CREATE INDEX IF NOT EXISTS "upload_queue_email_date_idx" ON "upload_queue"("email_date");
CREATE INDEX IF NOT EXISTS "upload_queue_email_id_idx" ON "upload_queue"("email_id");
