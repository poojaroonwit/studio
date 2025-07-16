-- Fix the updatedAt column by adding a default value
ALTER TABLE "Candidate" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Update any existing rows that have null updatedAt
UPDATE "Candidate" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL; 