-- CreateTable CandidateEvaluationLink
CREATE TABLE "CandidateEvaluationLink" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidateId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdById" UUID NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "CandidateEvaluationLink_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CandidateEvaluationLink_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CandidateEvaluationLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique token
CREATE UNIQUE INDEX "CandidateEvaluationLink_token_key" ON "CandidateEvaluationLink"("token");

-- Indexes
CREATE INDEX "CandidateEvaluationLink_candidateId_idx" ON "CandidateEvaluationLink"("candidateId");
CREATE INDEX "CandidateEvaluationLink_expiresAt_idx" ON "CandidateEvaluationLink"("expiresAt");

-- Trigger to update updatedAt
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_cand_eval_link ON "CandidateEvaluationLink";
CREATE TRIGGER set_timestamp_on_cand_eval_link
BEFORE UPDATE ON "CandidateEvaluationLink"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();


