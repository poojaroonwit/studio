-- CreateTable applicantEvaluationLink
CREATE TABLE "applicantEvaluationLink" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicantId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdById" UUID NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "applicantEvaluationLink_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "applicantEvaluationLink_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "applicantEvaluationLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique token
CREATE UNIQUE INDEX "applicantEvaluationLink_token_key" ON "applicantEvaluationLink"("token");

-- Indexes
CREATE INDEX "applicantEvaluationLink_applicantId_idx" ON "applicantEvaluationLink"("applicantId");
CREATE INDEX "applicantEvaluationLink_expiresAt_idx" ON "applicantEvaluationLink"("expiresAt");

-- Trigger to update updatedAt
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_cand_eval_link ON "applicantEvaluationLink";
CREATE TRIGGER set_timestamp_on_cand_eval_link
BEFORE UPDATE ON "applicantEvaluationLink"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();


