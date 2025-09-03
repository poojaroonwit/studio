-- Migration: Fix Candidate Status Foreign Key Relation
-- This migration adds the proper foreign key constraint for the status field

-- Drop any existing constraints that might conflict
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  -- Find and drop any existing foreign key constraints on the status column
  SELECT constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints
  WHERE table_schema = 'public' 
    AND table_name = 'Candidate' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%status%';
  
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "Candidate" DROP CONSTRAINT "' || v_constraint_name || '"';
    RAISE NOTICE 'Dropped existing constraint: %', v_constraint_name;
  END IF;
END
$$;

-- Create the correct foreign key constraint
ALTER TABLE "Candidate"
ADD CONSTRAINT "Candidate_status_fkey"
FOREIGN KEY (status) REFERENCES "RecruitmentStage"("id") 
ON DELETE SET NULL ON UPDATE NO ACTION;

-- Ensure the index exists
CREATE INDEX IF NOT EXISTS "Candidate_status_idx" ON "Candidate"(status);
