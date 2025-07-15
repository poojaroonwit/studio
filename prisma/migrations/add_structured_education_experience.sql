-- Migration: Add structured education and experience fields
-- This migration adds new JSON fields for structured education and experience data
-- while maintaining backward compatibility with the existing parsedData field

-- Add new structured fields
ALTER TABLE "Candidate" 
ADD COLUMN "educationData" JSONB DEFAULT '[]'::jsonb,
ADD COLUMN "experienceData" JSONB DEFAULT '[]'::jsonb;

-- Create indexes for better query performance
CREATE INDEX "Candidate_educationData_idx" ON "Candidate" USING GIN ("educationData");
CREATE INDEX "Candidate_experienceData_idx" ON "Candidate" USING GIN ("experienceData");

-- Add comments for documentation
COMMENT ON COLUMN "Candidate"."educationData" IS 'Structured education data with start/end dates, replacing period strings';
COMMENT ON COLUMN "Candidate"."experienceData" IS 'Structured experience data with start/end dates, replacing period strings'; 