-- Migration: Fix Candidate Status Foreign Key Constraint
-- This migration removes the incorrect constraint mapping and ensures proper foreign key relationship

DO $$
DECLARE
  v_fk_exists boolean;
  v_constraint_name text;
BEGIN
  -- Check if the incorrect constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='Candidate' AND constraint_name='Candidate_statusId_fkey'
  ) INTO v_fk_exists;

  -- Drop the incorrect constraint if it exists
  IF v_fk_exists THEN
    ALTER TABLE "Candidate" DROP CONSTRAINT "Candidate_statusId_fkey";
    RAISE NOTICE 'Dropped incorrect constraint Candidate_statusId_fkey';
  END IF;

  -- Check if the correct constraint exists
  SELECT constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints
  WHERE table_schema='public' AND table_name='Candidate' 
    AND constraint_type='FOREIGN KEY'
    AND constraint_name LIKE '%status%';

  -- If no constraint exists, create the correct one
  IF v_constraint_name IS NULL THEN
    ALTER TABLE "Candidate"
      ADD CONSTRAINT "Candidate_status_fkey"
      FOREIGN KEY (status) REFERENCES "RecruitmentStage"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    RAISE NOTICE 'Created correct constraint Candidate_status_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists: %', v_constraint_name;
  END IF;

  -- Ensure the status column is properly indexed
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'Candidate' AND indexname = 'Candidate_status_idx'
  ) THEN
    CREATE INDEX "Candidate_status_idx" ON "Candidate"("status");
    RAISE NOTICE 'Created status index';
  END IF;

END
$$;
