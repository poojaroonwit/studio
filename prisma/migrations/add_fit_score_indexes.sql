-- Add indexes for fit score count queries performance
-- This migration adds indexes to improve the performance of fit score count queries

-- Index on fitScore column for applied fit score queries
CREATE INDEX IF NOT EXISTS "Candidate_fitScore_idx" ON "Candidate" ("fitScore");

-- Index on recruiterId for filtering by recruiter
CREATE INDEX IF NOT EXISTS "Candidate_recruiterId_idx" ON "Candidate" ("recruiterId");

-- Index on positionId for filtering by position
CREATE INDEX IF NOT EXISTS "Candidate_positionId_idx" ON "Candidate" ("positionId");

-- Index on status for filtering by status
CREATE INDEX IF NOT EXISTS "Candidate_status_idx" ON "Candidate" ("status");

-- Index on applicationDate for date range filtering
CREATE INDEX IF NOT EXISTS "Candidate_applicationDate_idx" ON "Candidate" ("applicationDate");

-- Index on sourceId for filtering by source
CREATE INDEX IF NOT EXISTS "Candidate_sourceId_idx" ON "Candidate" ("sourceId");

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS "Candidate_fitScore_status_idx" ON "Candidate" ("fitScore", "status");

-- Index on JobMatch table for matching fit score queries
CREATE INDEX IF NOT EXISTS "JobMatch_candidateId_fitScore_idx" ON "JobMatch" ("candidateId", "fitScore");

-- Index on JobMatch fitScore for performance
CREATE INDEX IF NOT EXISTS "JobMatch_fitScore_idx" ON "JobMatch" ("fitScore");

-- GIN index on parsedData for JSON queries (if using PostgreSQL)
-- This helps with queries on parsedData->>'location', parsedData->>'skills', etc.
CREATE INDEX IF NOT EXISTS "Candidate_parsedData_gin_idx" ON "Candidate" USING GIN ("parsedData");

-- Partial index for candidates with fit scores (excludes null values)
CREATE INDEX IF NOT EXISTS "Candidate_fitScore_not_null_idx" ON "Candidate" ("fitScore") WHERE "fitScore" IS NOT NULL;

-- Partial index for candidates without fit scores
CREATE INDEX IF NOT EXISTS "Candidate_fitScore_null_idx" ON "Candidate" ("id") WHERE "fitScore" IS NULL OR "fitScore" = 0;
