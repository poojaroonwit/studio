-- Migration: Update candidate status to reference recruitmentstage.id
-- This migration changes the status field from a string to a foreign key reference

-- Step 1: Add the new statusId column
ALTER TABLE "Candidate" ADD COLUMN "statusId" UUID;

-- Step 2: Create a temporary mapping table for existing status values
CREATE TEMP TABLE status_mapping AS
SELECT DISTINCT status, 
       CASE 
         WHEN LOWER(status) = 'applied' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'applied' LIMIT 1)
         WHEN LOWER(status) = 'screening' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'screening' LIMIT 1)
         WHEN LOWER(status) = 'shortlisted' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'shortlisted' LIMIT 1)
         WHEN LOWER(status) = 'interview scheduled' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'interview scheduled' LIMIT 1)
         WHEN LOWER(status) = 'interviewing' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'interviewing' LIMIT 1)
         WHEN LOWER(status) = 'offer extended' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'offer extended' LIMIT 1)
         WHEN LOWER(status) = 'hired' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'hired' LIMIT 1)
         WHEN LOWER(status) = 'on hold' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'on hold' LIMIT 1)
         WHEN LOWER(status) = 'rejected' THEN (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'rejected' LIMIT 1)
         ELSE (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'applied' LIMIT 1)
       END as stage_id
FROM "Candidate" 
WHERE status IS NOT NULL;

-- Step 3: Update the statusId column based on the mapping
UPDATE "Candidate" 
SET "statusId" = sm.stage_id
FROM status_mapping sm
WHERE "Candidate".status = sm.status;

-- Step 4: Set default statusId for candidates without a status
UPDATE "Candidate" 
SET "statusId" = (SELECT id FROM "RecruitmentStage" WHERE LOWER(name) = 'applied' LIMIT 1)
WHERE "statusId" IS NULL;

-- Step 5: Make statusId NOT NULL
ALTER TABLE "Candidate" ALTER COLUMN "statusId" SET NOT NULL;

-- Step 6: Add foreign key constraint
ALTER TABLE "Candidate" 
ADD CONSTRAINT "Candidate_statusId_fkey" 
FOREIGN KEY ("statusId") REFERENCES "RecruitmentStage"("id") ON DELETE SET NULL;

-- Step 7: Drop the old status column
ALTER TABLE "Candidate" DROP COLUMN status;

-- Step 8: Rename statusId to status for backward compatibility
ALTER TABLE "Candidate" RENAME COLUMN "statusId" TO "status";

-- Step 9: Update indexes
DROP INDEX IF EXISTS "Candidate_status_idx";
CREATE INDEX "Candidate_status_idx" ON "Candidate"("status");

-- Step 10: Clean up temporary table
DROP TABLE status_mapping;
