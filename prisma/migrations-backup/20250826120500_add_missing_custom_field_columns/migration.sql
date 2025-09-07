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
DO $$
DECLARE
  v_constraint_exists boolean;
  v_index_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'CustomFieldDefinition_model_name_field_code_key'
      AND n.nspname = 'public' AND t.relname = 'CustomFieldDefinition'
  ) INTO v_constraint_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'CustomFieldDefinition_model_name_field_code_key' AND n.nspname = 'public'
  ) INTO v_index_exists;

  IF NOT v_constraint_exists THEN
    IF v_index_exists THEN
      -- Attach constraint to existing unique index
      ALTER TABLE "CustomFieldDefinition"
      ADD CONSTRAINT "CustomFieldDefinition_model_name_field_code_key"
      UNIQUE USING INDEX "CustomFieldDefinition_model_name_field_code_key";
    ELSE
      -- Create constraint (will create backing index automatically)
      ALTER TABLE "CustomFieldDefinition" 
      ADD CONSTRAINT "CustomFieldDefinition_model_name_field_code_key" 
      UNIQUE ("model_name", "field_code");
    END IF;
  END IF;
END$$;


