-- Migration: Rename Candidate Status Column to statusId
-- This migration renames the status column to statusId for better consistency

-- Rename the column
ALTER TABLE "Candidate" RENAME COLUMN "status" TO "statusId";

-- Drop any existing constraints that reference the old column name
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  -- Find and drop any foreign key constraints
  SELECT constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints
  WHERE table_schema = 'public' 
    AND table_name = 'Candidate' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%status%';
  
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "Candidate" DROP CONSTRAINT "' || v_constraint_name || '"';
    RAISE NOTICE 'Dropped constraint: %', v_constraint_name;
  END IF;
END
$$;

-- Create the correct foreign key constraint
ALTER TABLE "Candidate"
ADD CONSTRAINT "Candidate_statusId_fkey"
FOREIGN KEY ("statusId") REFERENCES "RecruitmentStage"("id") 
ON DELETE SET NULL ON UPDATE NO ACTION;

-- Ensure the index exists with the new name
CREATE INDEX IF NOT EXISTS "Candidate_statusId_idx" ON "Candidate"("statusId");

-- Drop the old index if it exists
DROP INDEX IF EXISTS "Candidate_status_idx";
