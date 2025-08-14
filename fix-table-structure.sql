-- Fix SystemPromptCategory table structure
-- Add missing constraints, indexes, and triggers

-- 1. Add unique constraint on name if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SystemPromptCategory_name_key') THEN
        ALTER TABLE "SystemPromptCategory" ADD CONSTRAINT "SystemPromptCategory_name_key" UNIQUE ("name");
    END IF;
END $$;

-- 2. Add missing index on created_at
CREATE INDEX IF NOT EXISTS "SystemPromptCategory_created_at_idx" ON "SystemPromptCategory"("created_at");

-- 3. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_system_prompt_category_updated_at ON "SystemPromptCategory";
CREATE TRIGGER update_system_prompt_category_updated_at 
    BEFORE UPDATE ON "SystemPromptCategory" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Insert a default category if none exist
INSERT INTO "SystemPromptCategory" (id, name, description, color, is_active, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'General',
    'General system prompts for various use cases',
    '#3B82F6',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SystemPromptCategory" LIMIT 1);

-- 6. Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'SystemPromptCategory' 
ORDER BY ordinal_position;

-- 7. Show all constraints
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'SystemPromptCategory';

-- 8. Show all indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'SystemPromptCategory';
