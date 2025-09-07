-- Add section selection fields to CustomFieldDefinition
ALTER TABLE "CustomFieldDefinition" ADD COLUMN "candidate_detail_section" TEXT;
ALTER TABLE "CustomFieldDefinition" ADD COLUMN "position_detail_section" TEXT;
