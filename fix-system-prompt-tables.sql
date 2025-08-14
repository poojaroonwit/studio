-- Fix SystemPromptCategory and SystemPrompt tables
-- This script ensures the tables exist with the correct structure

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create SystemPromptCategory table if it doesn't exist
CREATE TABLE IF NOT EXISTS "SystemPromptCategory" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#3B82F6',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemPromptCategory_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on name if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SystemPromptCategory_name_key') THEN
        ALTER TABLE "SystemPromptCategory" ADD CONSTRAINT "SystemPromptCategory_name_key" UNIQUE ("name");
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "SystemPromptCategory_name_idx" ON "SystemPromptCategory"("name");
CREATE INDEX IF NOT EXISTS "SystemPromptCategory_is_active_idx" ON "SystemPromptCategory"("is_active");
CREATE INDEX IF NOT EXISTS "SystemPromptCategory_created_at_idx" ON "SystemPromptCategory"("created_at");

-- Create SystemPrompt table if it doesn't exist
CREATE TABLE IF NOT EXISTS "SystemPrompt" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemPrompt_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SystemPrompt_categoryId_fkey') THEN
        ALTER TABLE "SystemPrompt" ADD CONSTRAINT "SystemPrompt_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "SystemPromptCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "SystemPrompt_name_idx" ON "SystemPrompt"("name");
CREATE INDEX IF NOT EXISTS "SystemPrompt_categoryId_idx" ON "SystemPrompt"("categoryId");
CREATE INDEX IF NOT EXISTS "SystemPrompt_is_active_idx" ON "SystemPrompt"("is_active");
CREATE INDEX IF NOT EXISTS "SystemPrompt_created_at_idx" ON "SystemPrompt"("created_at");

-- Update the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at if they don't exist
DROP TRIGGER IF EXISTS update_system_prompt_category_updated_at ON "SystemPromptCategory";
CREATE TRIGGER update_system_prompt_category_updated_at 
    BEFORE UPDATE ON "SystemPromptCategory" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_prompt_updated_at ON "SystemPrompt";
CREATE TRIGGER update_system_prompt_updated_at 
    BEFORE UPDATE ON "SystemPrompt" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert a default category if none exist
INSERT INTO "SystemPromptCategory" (id, name, description, color, is_active, created_at, updated_at)
SELECT 
    uuid_generate_v4(),
    'General',
    'General system prompts for various use cases',
    '#3B82F6',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SystemPromptCategory" LIMIT 1);
