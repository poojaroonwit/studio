-- Restore performance indexes that historically lived outside Prisma's
-- datamodel. IF NOT EXISTS keeps this migration safe for databases where the
-- indexes were created manually before migration history was baselined.

CREATE INDEX IF NOT EXISTS "Candidate_fitScore_idx"
  ON "Candidate" ("fitScore");
CREATE INDEX IF NOT EXISTS "Candidate_recruiterId_idx"
  ON "Candidate" ("recruiterId");
CREATE INDEX IF NOT EXISTS "Candidate_positionId_idx"
  ON "Candidate" ("positionId");
CREATE INDEX IF NOT EXISTS "Candidate_status_idx"
  ON "Candidate" ("status");
CREATE INDEX IF NOT EXISTS "Candidate_applicationDate_idx"
  ON "Candidate" ("applicationDate");
CREATE INDEX IF NOT EXISTS "Candidate_sourceId_idx"
  ON "Candidate" ("sourceId");
CREATE INDEX IF NOT EXISTS "Candidate_fitScore_status_idx"
  ON "Candidate" ("fitScore", "status");
CREATE INDEX IF NOT EXISTS "JobMatch_candidateId_fitScore_idx"
  ON "JobMatch" ("candidateId", "fitScore");
CREATE INDEX IF NOT EXISTS "JobMatch_fitScore_idx"
  ON "JobMatch" ("fitScore");

-- JSON and partial indexes cannot be expressed completely in the Prisma
-- schema, but are used by candidate search/count workloads.
CREATE INDEX IF NOT EXISTS "Candidate_parsedData_gin_idx"
  ON "Candidate" USING GIN ("parsedData");
CREATE INDEX IF NOT EXISTS "Candidate_fitScore_not_null_idx"
  ON "Candidate" ("fitScore")
  WHERE "fitScore" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Candidate_fitScore_null_idx"
  ON "Candidate" ("id")
  WHERE "fitScore" IS NULL OR "fitScore" = 0;
