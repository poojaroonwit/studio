-- Migration: Add transitionNotes column to Candidate table
-- This fixes the "column c.transitionNotes does not exist" error

-- Check if the column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Candidate' 
        AND column_name = 'transitionNotes'
    ) THEN
        -- Add the transitionNotes column
        ALTER TABLE "Candidate" 
        ADD COLUMN "transitionNotes" TEXT;
        
        RAISE NOTICE 'Added transitionNotes column to Candidate table';
    ELSE
        RAISE NOTICE 'transitionNotes column already exists in Candidate table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Candidate' 
AND column_name = 'transitionNotes';
