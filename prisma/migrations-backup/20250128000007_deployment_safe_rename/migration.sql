-- Migration: Deployment-Safe Rename Status to StatusId
-- This migration runs BEFORE Prisma generate to ensure schema matches database

-- Check if the column needs to be renamed
DO $$
DECLARE
  v_column_exists boolean;
  v_statusId_exists boolean;
BEGIN
  -- Check if statusId column already exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'Candidate' 
      AND column_name = 'statusId'
  ) INTO v_statusId_exists;
  
  -- Check if status column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'Candidate' 
      AND column_name = 'status'
  ) INTO v_column_exists;
  
  -- Only rename if status exists and statusId doesn't
  IF v_column_exists AND NOT v_statusId_exists THEN
    -- Rename the column
    ALTER TABLE "Candidate" RENAME COLUMN "status" TO "statusId";
    RAISE NOTICE 'Renamed status column to statusId';
    
    -- Drop any existing constraints
    DO $$
    DECLARE
      v_constraint_name text;
    BEGIN
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
    
    RAISE NOTICE 'Successfully renamed status to statusId with proper constraints';
  ELSE
    RAISE NOTICE 'Column rename not needed - statusId already exists or status does not exist';
  END IF;
END
$$;
