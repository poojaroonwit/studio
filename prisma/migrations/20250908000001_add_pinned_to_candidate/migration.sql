-- Add pin fields to Candidate and supporting indexes
ALTER TABLE "Candidate"
  ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP NULL;

-- Indexes for pin-related queries
CREATE INDEX IF NOT EXISTS "Candidate_isPinned_idx" ON "Candidate" ("isPinned");
CREATE INDEX IF NOT EXISTS "Candidate_pinnedAt_idx" ON "Candidate" ("pinnedAt");

