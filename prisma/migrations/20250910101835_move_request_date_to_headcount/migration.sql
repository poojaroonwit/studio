-- Add requestDate column to Headcount table
ALTER TABLE "Headcount" ADD COLUMN "requestDate" TIMESTAMP(3);

-- Copy requestDate from Position to Headcount for existing records
-- This will copy the position's requestDate to all its headcounts
UPDATE "Headcount" 
SET "requestDate" = "Position"."requestDate"
FROM "Position" 
WHERE "Headcount"."positionId" = "Position"."id" 
AND "Position"."requestDate" IS NOT NULL;

-- Create index on requestDate for better query performance
CREATE INDEX "Headcount_requestDate_idx" ON "Headcount"("requestDate");

-- Remove requestDate column from Position table
ALTER TABLE "Position" DROP COLUMN "requestDate";
