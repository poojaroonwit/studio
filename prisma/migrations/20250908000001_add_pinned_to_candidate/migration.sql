-- Add pin fields to applicant and supporting indexes
ALTER TABLE "applicant"
  ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "pinnedAt" TIMESTAMP NULL;

-- Indexes for pin-related queries
CREATE INDEX IF NOT EXISTS "applicant_isPinned_idx" ON "applicant" ("isPinned");
CREATE INDEX IF NOT EXISTS "applicant_pinnedAt_idx" ON "applicant" ("pinnedAt");

