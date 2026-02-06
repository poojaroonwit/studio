-- CreateTable applicantEvaluation
CREATE TABLE "applicantEvaluation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicantId" UUID NOT NULL,
    "positionId" UUID,
    "evaluatorId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "overall_score" DOUBLE PRECISION,
    "comments" TEXT,
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applicantEvaluation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "applicantEvaluation_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "applicantEvaluation_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON UPDATE CASCADE,
    CONSTRAINT "applicantEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable applicantExpertiseScore
CREATE TABLE "applicantExpertiseScore" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluationId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applicantExpertiseScore_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "applicantExpertiseScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "applicantEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "applicantExpertiseScore_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "ExpertiseSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable applicantPersonalityScore
CREATE TABLE "applicantPersonalityScore" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluationId" UUID NOT NULL,
    "traitId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applicantPersonalityScore_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "applicantPersonalityScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "applicantEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "applicantPersonalityScore_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "PersonalityTrait"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndexes for applicantEvaluation
CREATE INDEX "applicantEvaluation_applicantId_idx" ON "applicantEvaluation"("applicantId");
CREATE INDEX "applicantEvaluation_positionId_idx" ON "applicantEvaluation"("positionId");
CREATE INDEX "applicantEvaluation_evaluatorId_idx" ON "applicantEvaluation"("evaluatorId");
CREATE INDEX "applicantEvaluation_status_idx" ON "applicantEvaluation"("status");
CREATE INDEX "applicantEvaluation_createdAt_idx" ON "applicantEvaluation"("createdAt");

-- CreateIndexes for applicantExpertiseScore
CREATE UNIQUE INDEX "applicantExpertiseScore_evaluationId_skillId_key" ON "applicantExpertiseScore"("evaluationId", "skillId");
CREATE INDEX "applicantExpertiseScore_evaluationId_idx" ON "applicantExpertiseScore"("evaluationId");
CREATE INDEX "applicantExpertiseScore_skillId_idx" ON "applicantExpertiseScore"("skillId");

-- CreateIndexes for applicantPersonalityScore
CREATE UNIQUE INDEX "applicantPersonalityScore_evaluationId_traitId_key" ON "applicantPersonalityScore"("evaluationId", "traitId");
CREATE INDEX "applicantPersonalityScore_evaluationId_idx" ON "applicantPersonalityScore"("evaluationId");
CREATE INDEX "applicantPersonalityScore_traitId_idx" ON "applicantPersonalityScore"("traitId");

-- Trigger to update updatedAt for applicantEvaluation
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_applicant_evaluation ON "applicantEvaluation";
CREATE TRIGGER set_timestamp_on_applicant_evaluation
BEFORE UPDATE ON "applicantEvaluation"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- Trigger to update updatedAt for applicantExpertiseScore
DROP TRIGGER IF EXISTS set_timestamp_on_applicant_expertise_score ON "applicantExpertiseScore";
CREATE TRIGGER set_timestamp_on_applicant_expertise_score
BEFORE UPDATE ON "applicantExpertiseScore"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- Trigger to update updatedAt for applicantPersonalityScore
DROP TRIGGER IF EXISTS set_timestamp_on_applicant_personality_score ON "applicantPersonalityScore";
CREATE TRIGGER set_timestamp_on_applicant_personality_score
BEFORE UPDATE ON "applicantPersonalityScore"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

