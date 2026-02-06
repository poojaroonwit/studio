-- Migration: Rename Candidate to Applicant
-- This migration renames all candidate-related tables and columns to applicant

-- Step 1: Rename main tables
ALTER TABLE "Candidate" RENAME TO "Applicant";
ALTER TABLE "CandidateComment" RENAME TO "ApplicantComment";
ALTER TABLE "CandidateEvaluation" RENAME TO "ApplicantEvaluation";
ALTER TABLE "CandidateEvaluationLink" RENAME TO "ApplicantEvaluationLink";
-- Note: CandidateReadStatus uses mapped table name "candidate_read_status"
ALTER TABLE "candidate_read_status" RENAME TO "applicant_read_status";
ALTER TABLE "CandidateSource" RENAME TO "ApplicantSource";
ALTER TABLE "CandidateExpertiseScore" RENAME TO "ApplicantExpertiseScore";
ALTER TABLE "CandidatePersonalityScore" RENAME TO "ApplicantPersonalityScore";

-- Step 2: Rename constraints (PostgreSQL may auto-rename some, but we handle mapped table constraints explicitly)
-- Note: When tables are renamed, PostgreSQL automatically renames primary key constraints
-- However, for mapped tables, we may need to rename constraints manually
DO $$
BEGIN
  -- Rename primary key constraint if it exists (for mapped table candidate_read_status)
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'candidate_read_status_pkey') THEN
    ALTER TABLE "applicant_read_status" RENAME CONSTRAINT "candidate_read_status_pkey" TO "applicant_read_status_pkey";
  END IF;
END $$;

-- Step 3: Rename foreign key columns in all related tables
-- JobMatch
ALTER TABLE "JobMatch" RENAME COLUMN "candidateId" TO "applicantId";

-- TransitionRecord
ALTER TABLE "TransitionRecord" RENAME COLUMN "candidateId" TO "applicantId";

-- Attachment
ALTER TABLE "Attachment" RENAME COLUMN "candidateId" TO "applicantId";

-- Headcount
ALTER TABLE "Headcount" RENAME COLUMN "candidateId" TO "applicantId";

-- ApplicantComment (formerly CandidateComment)
ALTER TABLE "ApplicantComment" RENAME COLUMN "candidateId" TO "applicantId";

-- ApplicantEvaluation (formerly CandidateEvaluation)
ALTER TABLE "ApplicantEvaluation" RENAME COLUMN "candidateId" TO "applicantId";

-- ApplicantEvaluationLink (formerly CandidateEvaluationLink)
ALTER TABLE "ApplicantEvaluationLink" RENAME COLUMN "candidateId" TO "applicantId";

-- ApplicantReadStatus (formerly CandidateReadStatus) - uses mapped table and column name
ALTER TABLE "applicant_read_status" RENAME COLUMN "candidate_id" TO "applicant_id";

-- Step 4: Rename foreign key constraints
-- Note: PostgreSQL automatically renames FK constraints when columns are renamed,
-- but we may need to update constraint names explicitly for clarity

-- Step 5: Rename indexes that reference candidateId
-- These will be automatically updated when columns are renamed, but we list them for reference:
-- JobMatch: index on candidateId -> applicantId
-- TransitionRecord: index on candidateId -> applicantId  
-- Attachment: index on candidateId -> applicantId
-- Headcount: index on candidateId -> applicantId
-- ApplicantComment: index on candidateId -> applicantId
-- ApplicantEvaluation: index on candidateId -> applicantId
-- ApplicantEvaluationLink: index on candidateId -> applicantId
-- ApplicantReadStatus: index on candidate_id -> applicant_id

-- Step 6: Update relation names in foreign key constraints
-- Note: Relation names are Prisma-specific and don't affect database schema,
-- but we need to update them in schema.prisma

-- Step 7: Update unique constraints
-- ApplicantReadStatus unique constraint on (candidateId, userId) -> (applicantId, userId)
-- This will be automatically updated when the column is renamed

-- Step 8: Update comments (optional, for database documentation)
COMMENT ON TABLE "Applicant" IS 'Job applicants and their application data';
COMMENT ON TABLE "ApplicantComment" IS 'Comments and notes on applicant profiles';
COMMENT ON TABLE "ApplicantEvaluation" IS 'Evaluation records for applicant assessments';
COMMENT ON TABLE "ApplicantEvaluationLink" IS 'Secure links for external applicant evaluation';
COMMENT ON TABLE "applicant_read_status" IS 'Tracks read/unread status per user per applicant';
COMMENT ON TABLE "ApplicantSource" IS 'Applicant sourcing channels (job portals, referrals, etc.)';
COMMENT ON TABLE "ApplicantExpertiseScore" IS 'Recorded scores for expertise skills';
COMMENT ON TABLE "ApplicantPersonalityScore" IS 'Recorded scores for personality traits';
