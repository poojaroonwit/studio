-- Migration: Update candidate status to reference recruitmentstage.id (idempotent)
-- This migration safely converts TEXT status to UUID FK if needed; otherwise it skips.

-- Step 1: Add the new statusId column
DO $$
DECLARE
  v_status_type text;
  v_has_fk boolean;
BEGIN
  SELECT data_type INTO v_status_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Candidate' AND column_name = 'status';

  -- If already UUID, skip entire migration
  IF v_status_type = 'uuid' THEN
    RAISE NOTICE 'Candidate.status already UUID; skipping.';
    RETURN;
  END IF;

  -- Add statusId if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Candidate' AND column_name = 'statusId'
  ) THEN
    ALTER TABLE "Candidate" ADD COLUMN "statusId" UUID;
  END IF;

-- Step 2: Create a temporary mapping table for existing status values
CREATE TEMP TABLE status_mapping AS
SELECT DISTINCT status, 
       CASE 
         WHEN LOWER(status) = 'applied' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'applied' LIMIT 1)
         WHEN LOWER(status) = 'screening' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'screening' LIMIT 1)
         WHEN LOWER(status) = 'shortlisted' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'shortlisted' LIMIT 1)
         WHEN LOWER(status) = 'interview scheduled' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'interview scheduled' LIMIT 1)
         WHEN LOWER(status) = 'interviewing' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'interviewing' LIMIT 1)
         WHEN LOWER(status) = 'offer extended' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'offer extended' LIMIT 1)
         WHEN LOWER(status) = 'hired' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'hired' LIMIT 1)
         WHEN LOWER(status) = 'on hold' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'on hold' LIMIT 1)
         WHEN LOWER(status) = 'rejected' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'rejected' LIMIT 1)
         ELSE (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'applied' LIMIT 1)
       END as stage_id
FROM "Candidate" 
WHERE status IS NOT NULL;

-- Step 3: Update the statusId column based on the mapping
UPDATE "Candidate" 
SET "statusId" = sm.stage_id
FROM status_mapping sm
WHERE "Candidate".status = sm.status;

-- Step 4: Set default statusId for candidates without a status
UPDATE "Candidate" 
SET "statusId" = (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'applied' LIMIT 1)
WHERE "statusId" IS NULL;

-- Step 5: Make statusId NOT NULL
ALTER TABLE "Candidate" ALTER COLUMN "statusId" SET NOT NULL;

-- Step 6: Add foreign key constraint
-- Add FK if missing
SELECT EXISTS (
  SELECT 1 FROM information_schema.table_constraints tc
  WHERE tc.table_schema = 'public' AND tc.table_name = 'Candidate' AND tc.constraint_name = 'Candidate_statusId_fkey'
) INTO v_has_fk;
IF NOT v_has_fk THEN
  ALTER TABLE "Candidate" 
  ADD CONSTRAINT "Candidate_statusId_fkey" 
  FOREIGN KEY ("statusId") REFERENCES "RecruitmentStage"("id") ON DELETE SET NULL;
END IF;

-- Step 7: Drop the old status column
-- Drop old status text column if still present
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Candidate' AND column_name = 'status' AND data_type = 'text'
) THEN
  ALTER TABLE "Candidate" DROP COLUMN status;
END IF;

-- Step 8: Rename statusId to status for backward compatibility
-- Rename column if not already renamed
IF EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Candidate' AND column_name = 'statusId'
) THEN
  ALTER TABLE "Candidate" RENAME COLUMN "statusId" TO "status";
END IF;

-- Step 9: Update indexes
DROP INDEX IF EXISTS "Candidate_status_idx";
CREATE INDEX IF NOT EXISTS "Candidate_status_idx" ON "Candidate"("status");

-- Step 10: Clean up temporary table
DROP TABLE IF EXISTS status_mapping;
END$$;
