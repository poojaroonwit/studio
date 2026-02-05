-- Prisma Database Comments Generator v1.4.0

-- candidate_read_status comments
COMMENT ON TABLE "candidate_read_status" IS 'CandidateReadStatus - Tracks read/unread status per user per candidate';
COMMENT ON COLUMN "candidate_read_status"."id" IS 'Unique identifier';
COMMENT ON COLUMN "candidate_read_status"."candidate_id" IS 'Reference to candidate';
COMMENT ON COLUMN "candidate_read_status"."user_id" IS 'Reference to user';
COMMENT ON COLUMN "candidate_read_status"."is_read" IS 'Whether the candidate has been read by this user';
COMMENT ON COLUMN "candidate_read_status"."read_at" IS 'Timestamp when candidate was marked as read';
COMMENT ON COLUMN "candidate_read_status"."created_at" IS 'Record creation timestamp';
COMMENT ON COLUMN "candidate_read_status"."updated_at" IS 'Last update timestamp';
