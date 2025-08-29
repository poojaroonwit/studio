-- Optimize fit score queries with better indexes
-- This script adds indexes to improve performance of fit score count queries

-- Add composite index for fit score filtering
CREATE INDEX IF NOT EXISTS idx_candidate_fitscore_status 
ON "Candidate" ("fitScore", status) 
WHERE "fitScore" IS NOT NULL;

-- Add composite index for fit score with position
CREATE INDEX IF NOT EXISTS idx_candidate_fitscore_position 
ON "Candidate" ("fitScore", "positionId") 
WHERE "fitScore" IS NOT NULL;

-- Add composite index for fit score with recruiter
CREATE INDEX IF NOT EXISTS idx_candidate_fitscore_recruiter 
ON "Candidate" ("fitScore", "recruiterId") 
WHERE "fitScore" IS NOT NULL;

-- Add composite index for fit score with application date
CREATE INDEX IF NOT EXISTS idx_candidate_fitscore_application_date 
ON "Candidate" ("fitScore", "applicationDate") 
WHERE "fitScore" IS NOT NULL;

-- Add index for JobMatch fit scores
CREATE INDEX IF NOT EXISTS idx_jobmatch_candidate_fitscore 
ON "JobMatch" ("candidateId", "fitScore") 
WHERE "fitScore" IS NOT NULL;

-- Add partial index for non-zero fit scores
CREATE INDEX IF NOT EXISTS idx_candidate_fitscore_nonzero 
ON "Candidate" ("fitScore") 
WHERE "fitScore" > 0;

-- Add index for parsed data location searches
CREATE INDEX IF NOT EXISTS idx_candidate_parseddata_location 
ON "Candidate" USING GIN (("parsedData"->>'location'));

-- Add index for parsed data skills searches
CREATE INDEX IF NOT EXISTS idx_candidate_parseddata_skills 
ON "Candidate" USING GIN (("parsedData"->>'skills'));

-- Add index for parsed data experience searches
CREATE INDEX IF NOT EXISTS idx_candidate_parseddata_experience 
ON "Candidate" USING GIN (("parsedData"->>'totalExperienceYears'));

-- Add index for parsed data education searches
CREATE INDEX IF NOT EXISTS idx_candidate_parseddata_education 
ON "Candidate" USING GIN (("parsedData"->>'education'));

-- Analyze tables to update statistics
ANALYZE "Candidate";
ANALYZE "JobMatch";

-- Show index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('Candidate', 'JobMatch')
ORDER BY idx_scan DESC;
