-- Prisma Database Comments Generator v1.4.0

-- applicant_reminders comments
COMMENT ON TABLE "applicant_reminders" IS 'ApplicantReminder - Reminders set by users for specific applicants';
COMMENT ON COLUMN "applicant_reminders"."id" IS 'Unique identifier';
COMMENT ON COLUMN "applicant_reminders"."applicant_id" IS 'Reference to applicant';
COMMENT ON COLUMN "applicant_reminders"."user_id" IS 'Reference to user who set the reminder';
COMMENT ON COLUMN "applicant_reminders"."title" IS 'Reminder title';
COMMENT ON COLUMN "applicant_reminders"."content" IS 'Additional reminder details';
COMMENT ON COLUMN "applicant_reminders"."reminder_date" IS 'When the reminder should trigger';
COMMENT ON COLUMN "applicant_reminders"."is_completed" IS 'Whether the reminder has been completed';
COMMENT ON COLUMN "applicant_reminders"."created_at" IS 'Record creation timestamp';
COMMENT ON COLUMN "applicant_reminders"."updated_at" IS 'Last update timestamp';

-- TransitionRecord comments
COMMENT ON COLUMN "TransitionRecord"."positionId" IS 'Reference to applicant';

-- JobMatch comments
COMMENT ON COLUMN "JobMatch"."jobId" IS 'Reference to applicant';
