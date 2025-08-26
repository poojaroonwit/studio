-- Add missing columns to CustomFieldDefinition table
ALTER TABLE "CustomFieldDefinition" 
ADD COLUMN IF NOT EXISTS "field_code" TEXT,
ADD COLUMN IF NOT EXISTS "show_in_headcount_detail" BOOLEAN DEFAULT false;

-- Update existing records to set field_code = field_key if field_code is null
UPDATE "CustomFieldDefinition" 
SET "field_code" = "field_key" 
WHERE "field_code" IS NULL;

-- Make field_code NOT NULL after setting values
ALTER TABLE "CustomFieldDefinition" 
ALTER COLUMN "field_code" SET NOT NULL;

-- Add unique constraint on model_name and field_code
ALTER TABLE "CustomFieldDefinition" 
ADD CONSTRAINT "CustomFieldDefinition_model_name_field_code_key" 
UNIQUE ("model_name", "field_code");


