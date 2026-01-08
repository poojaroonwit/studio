-- Add short_description column to PersonalityTrait if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'PersonalityTrait' 
        AND column_name = 'short_description'
    ) THEN
        ALTER TABLE "PersonalityTrait" 
        ADD COLUMN short_description TEXT;
    END IF;
END $$;

