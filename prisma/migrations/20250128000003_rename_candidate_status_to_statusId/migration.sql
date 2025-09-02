-- Migration: Rename Candidate Status Column to statusId
-- This migration renames the status column to statusId for better consistency with the migration design

DO $$
DECLARE
  v_column_exists boolean;
  v_constraint_exists boolean;
BEGIN
  -- Check if statusId column already exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'Candidate' 
      AND column_name = 'statusId'
  ) INTO v_column_exists;

  -- Check if status column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'Candidate' 
      AND column_name = 'status'
  ) INTO v_constraint_exists;

  -- If statusId doesn't exist and status does, rename the column
  IF NOT v_column_exists AND v_constraint_exists THEN
    -- Drop any existing foreign key constraints on status
    DO $$
    DECLARE
      v_constraint_name text;
    BEGIN
      SELECT constraint_name INTO v_constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema='public' 
        AND table_name='Candidate' 
        AND constraint_type='FOREIGN KEY'
        AND constraint_name LIKE '%status%';
      
      IF v_constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE "Candidate" DROP CONSTRAINT "' || v_constraint_name || '"';
        RAISE NOTICE 'Dropped constraint: %', v_constraint_name;
      END IF;
    END
    $$;

    -- Rename the column
    ALTER TABLE "Candidate" RENAME COLUMN "status" TO "statusId";
    RAISE NOTICE 'Renamed status column to statusId';

    -- Create the correct foreign key constraint
    ALTER TABLE "Candidate"
      ADD CONSTRAINT "Candidate_statusId_fkey"
      FOREIGN KEY ("statusId") REFERENCES "RecruitmentStage"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION;
    RAISE NOTICE 'Created constraint Candidate_statusId_fkey';

    -- Ensure proper indexing
    DROP INDEX IF EXISTS "Candidate_status_idx";
    CREATE INDEX "Candidate_statusId_idx" ON "Candidate"("statusId");
    RAISE NOTICE 'Updated index to Candidate_statusId_idx';

  ELSE
    RAISE NOTICE 'Column statusId already exists or status column does not exist; skipping rename.';
  END IF;

END
$$;
