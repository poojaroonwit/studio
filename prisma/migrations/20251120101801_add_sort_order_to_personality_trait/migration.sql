-- Add sort_order column to PersonalityTrait if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'PersonalityTrait' 
        AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE "PersonalityTrait" 
        ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
        
        -- Create index on sort_order
        CREATE INDEX IF NOT EXISTS "PersonalityTrait_sort_order_idx" ON "PersonalityTrait"("sort_order");
    END IF;
END $$;

