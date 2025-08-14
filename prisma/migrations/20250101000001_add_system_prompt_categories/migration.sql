-- CreateTable
CREATE TABLE "SystemPromptCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemPromptCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemPromptCategory_name_idx" ON "SystemPromptCategory"("name");
CREATE INDEX "SystemPromptCategory_is_active_idx" ON "SystemPromptCategory"("is_active");

-- Add categoryId column to SystemPrompt table
ALTER TABLE "SystemPrompt" ADD COLUMN "categoryId" UUID;

-- Create foreign key constraint
ALTER TABLE "SystemPrompt" ADD CONSTRAINT "SystemPrompt_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SystemPromptCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index on categoryId
CREATE INDEX "SystemPrompt_categoryId_idx" ON "SystemPrompt"("categoryId");

-- -- Insert default categories
-- INSERT INTO "SystemPromptCategory" ("id", "name", "description", "color", "is_active", "created_at", "updated_at") VALUES
--     (gen_random_uuid(), 'Job Description Generation', 'Prompts for generating job descriptions and requirements', '#3B82F6', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
--     (gen_random_uuid(), 'Candidate Analysis', 'Prompts for analyzing candidate profiles and qualifications', '#10B981', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
--     (gen_random_uuid(), 'Email Templates', 'Prompts for generating email templates and communications', '#F59E0B', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
--     (gen_random_uuid(), 'Report Generation', 'Prompts for generating reports and summaries', '#8B5CF6', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
--     (gen_random_uuid(), 'General', 'General purpose prompts for various tasks', '#6B7280', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- -- Update existing SystemPrompt records to use the General category
-- UPDATE "SystemPrompt" 
-- SET "categoryId" = (SELECT id FROM "SystemPromptCategory" WHERE name = 'General' LIMIT 1)
-- WHERE "categoryId" IS NULL;

-- Make categoryId NOT NULL after setting default values
ALTER TABLE "SystemPrompt" ALTER COLUMN "categoryId" SET NOT NULL;

-- Drop the old category column (optional - you can keep it for backward compatibility)
-- ALTER TABLE "SystemPrompt" DROP COLUMN "category";
