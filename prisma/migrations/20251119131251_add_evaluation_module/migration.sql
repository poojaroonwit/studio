-- CreateTable CandidateEvaluation
CREATE TABLE "CandidateEvaluation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidateId" UUID NOT NULL,
    "positionId" UUID,
    "evaluatorId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "overall_score" DOUBLE PRECISION,
    "comments" TEXT,
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateEvaluation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CandidateEvaluation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CandidateEvaluation_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON UPDATE CASCADE,
    CONSTRAINT "CandidateEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable CandidateExpertiseScore
CREATE TABLE "CandidateExpertiseScore" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluationId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateExpertiseScore_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CandidateExpertiseScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "CandidateEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CandidateExpertiseScore_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "ExpertiseSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable CandidatePersonalityScore
CREATE TABLE "CandidatePersonalityScore" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "evaluationId" UUID NOT NULL,
    "traitId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidatePersonalityScore_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CandidatePersonalityScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "CandidateEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CandidatePersonalityScore_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "PersonalityTrait"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndexes for CandidateEvaluation
CREATE INDEX "CandidateEvaluation_candidateId_idx" ON "CandidateEvaluation"("candidateId");
CREATE INDEX "CandidateEvaluation_positionId_idx" ON "CandidateEvaluation"("positionId");
CREATE INDEX "CandidateEvaluation_evaluatorId_idx" ON "CandidateEvaluation"("evaluatorId");
CREATE INDEX "CandidateEvaluation_status_idx" ON "CandidateEvaluation"("status");
CREATE INDEX "CandidateEvaluation_createdAt_idx" ON "CandidateEvaluation"("createdAt");

-- CreateIndexes for CandidateExpertiseScore
CREATE UNIQUE INDEX "CandidateExpertiseScore_evaluationId_skillId_key" ON "CandidateExpertiseScore"("evaluationId", "skillId");
CREATE INDEX "CandidateExpertiseScore_evaluationId_idx" ON "CandidateExpertiseScore"("evaluationId");
CREATE INDEX "CandidateExpertiseScore_skillId_idx" ON "CandidateExpertiseScore"("skillId");

-- CreateIndexes for CandidatePersonalityScore
CREATE UNIQUE INDEX "CandidatePersonalityScore_evaluationId_traitId_key" ON "CandidatePersonalityScore"("evaluationId", "traitId");
CREATE INDEX "CandidatePersonalityScore_evaluationId_idx" ON "CandidatePersonalityScore"("evaluationId");
CREATE INDEX "CandidatePersonalityScore_traitId_idx" ON "CandidatePersonalityScore"("traitId");

-- Trigger to update updatedAt for CandidateEvaluation
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_candidate_evaluation ON "CandidateEvaluation";
CREATE TRIGGER set_timestamp_on_candidate_evaluation
BEFORE UPDATE ON "CandidateEvaluation"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- Trigger to update updatedAt for CandidateExpertiseScore
DROP TRIGGER IF EXISTS set_timestamp_on_candidate_expertise_score ON "CandidateExpertiseScore";
CREATE TRIGGER set_timestamp_on_candidate_expertise_score
BEFORE UPDATE ON "CandidateExpertiseScore"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- Trigger to update updatedAt for CandidatePersonalityScore
DROP TRIGGER IF EXISTS set_timestamp_on_candidate_personality_score ON "CandidatePersonalityScore";
CREATE TRIGGER set_timestamp_on_candidate_personality_score
BEFORE UPDATE ON "CandidatePersonalityScore"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

