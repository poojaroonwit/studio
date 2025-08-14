-- Clean up the old category column since we're now using categoryId
-- This migration only removes the old column, no initial data is inserted

-- Drop the old category column since we're now using categoryId
ALTER TABLE "SystemPrompt" DROP COLUMN IF EXISTS "category";
