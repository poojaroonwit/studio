-- Migration: Rename Candidate Status Column to statusId
-- This migration renames the status column to statusId for better consistency
-- Added safety checks to prevent errors if column already exists or has been renamed

-- Check if the status column exists and hasn't been renamed yet
DO $$
DECLARE
  column_exists BOOLEAN;
  column_already_renamed BOOLEAN;
BEGIN
  -- Check if status column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'Candidate' 
      AND column_name = 'status'
  ) INTO column_exists;
  
  -- Check if statusId column already exists (meaning rename was already done)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'Candidate' 
      AND column_name = 'statusId'
  ) INTO column_already_renamed;
  
  -- Only proceed if status column exists and statusId doesn't exist
  IF column_exists AND NOT column_already_renamed THEN
    RAISE NOTICE 'Renaming status column to statusId...';
    
    -- Rename the column
    ALTER TABLE "Candidate" RENAME COLUMN "status" TO "statusId";
    
    -- Drop any existing constraints that reference the old column name
    DO $$
    DECLARE
      v_constraint_name text;
    BEGIN
      -- Find and drop any existing foreign key constraints
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
    
    -- Create the correct foreign key constraint for statusId
    ALTER TABLE "Candidate"
    ADD CONSTRAINT "Candidate_statusId_fkey"
    FOREIGN KEY ("statusId") REFERENCES "RecruitmentStage"("id") 
    ON DELETE SET NULL ON UPDATE NO ACTION;
    
    -- Ensure the index exists for statusId
    CREATE INDEX IF NOT EXISTS "Candidate_statusId_idx" ON "Candidate"("statusId");
    
    -- Drop the old index if it exists
    DROP INDEX IF EXISTS "Candidate_status_idx";
    
    RAISE NOTICE 'Successfully renamed status column to statusId';
  ELSIF column_already_renamed THEN
    RAISE NOTICE 'Column statusId already exists - skipping rename operation';
  ELSE
    RAISE NOTICE 'Status column not found - skipping rename operation';
  END IF;
END
$$;
