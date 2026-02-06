-- Prisma Database Comments Generator v1.4.0

-- applicant_read_status comments
COMMENT ON TABLE "applicant_read_status" IS 'applicantReadStatus - Tracks read/unread status per user per applicant';
COMMENT ON COLUMN "applicant_read_status"."id" IS 'Unique identifier';
COMMENT ON COLUMN "applicant_read_status"."applicant_id" IS 'Reference to applicant';
COMMENT ON COLUMN "applicant_read_status"."user_id" IS 'Reference to user';
COMMENT ON COLUMN "applicant_read_status"."is_read" IS 'Whether the applicant has been read by this user';
COMMENT ON COLUMN "applicant_read_status"."read_at" IS 'Timestamp when applicant was marked as read';
COMMENT ON COLUMN "applicant_read_status"."created_at" IS 'Record creation timestamp';
COMMENT ON COLUMN "applicant_read_status"."updated_at" IS 'Last update timestamp';
