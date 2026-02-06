-- Add indexes for fit score count queries performance
-- This migration adds indexes to improve the performance of fit score count queries

-- Index on fitScore column for applied fit score queries
CREATE INDEX IF NOT EXISTS "applicant_fitScore_idx" ON "applicant" ("fitScore");

-- Index on recruiterId for filtering by recruiter
CREATE INDEX IF NOT EXISTS "applicant_recruiterId_idx" ON "applicant" ("recruiterId");

-- Index on positionId for filtering by position
CREATE INDEX IF NOT EXISTS "applicant_positionId_idx" ON "applicant" ("positionId");

-- Index on status for filtering by status
CREATE INDEX IF NOT EXISTS "applicant_status_idx" ON "applicant" ("status");

-- Index on applicationDate for date range filtering
CREATE INDEX IF NOT EXISTS "applicant_applicationDate_idx" ON "applicant" ("applicationDate");

-- Index on sourceId for filtering by source
CREATE INDEX IF NOT EXISTS "applicant_sourceId_idx" ON "applicant" ("sourceId");

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS "applicant_fitScore_status_idx" ON "applicant" ("fitScore", "status");

-- Index on JobMatch table for matching fit score queries
CREATE INDEX IF NOT EXISTS "JobMatch_applicantId_fitScore_idx" ON "JobMatch" ("applicantId", "fitScore");

-- Index on JobMatch fitScore for performance
CREATE INDEX IF NOT EXISTS "JobMatch_fitScore_idx" ON "JobMatch" ("fitScore");

-- GIN index on parsedData for JSON queries (if using PostgreSQL)
-- This helps with queries on parsedData->>'location', parsedData->>'skills', etc.
CREATE INDEX IF NOT EXISTS "applicant_parsedData_gin_idx" ON "applicant" USING GIN ("parsedData");

-- Partial index for applicants with fit scores (excludes null values)
CREATE INDEX IF NOT EXISTS "applicant_fitScore_not_null_idx" ON "applicant" ("fitScore") WHERE "fitScore" IS NOT NULL;

-- Partial index for applicants without fit scores
CREATE INDEX IF NOT EXISTS "applicant_fitScore_null_idx" ON "applicant" ("id") WHERE "fitScore" IS NULL OR "fitScore" = 0;
