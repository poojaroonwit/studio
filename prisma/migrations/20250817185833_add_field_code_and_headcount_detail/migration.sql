-- Make migration idempotent and safe for existing data
-- Add columns if missing
ALTER TABLE "CustomFieldDefinition" 
  ADD COLUMN IF NOT EXISTS "field_code" TEXT,
  ADD COLUMN IF NOT EXISTS "show_in_headcount_detail" BOOLEAN DEFAULT false;

-- Backfill field_code from field_key when null
UPDATE "CustomFieldDefinition"
SET "field_code" = "field_key"
WHERE "field_code" IS NULL;

-- Enforce NOT NULL if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'CustomFieldDefinition' AND column_name = 'field_code'
  ) THEN
    ALTER TABLE "CustomFieldDefinition" ALTER COLUMN "field_code" SET NOT NULL;
  END IF;
END$$;

-- Create unique index if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'CustomFieldDefinition_model_name_field_code_key' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX "CustomFieldDefinition_model_name_field_code_key" ON "CustomFieldDefinition"("model_name", "field_code");
  END IF;
END$$;
