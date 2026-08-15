-- Prisma schema baselining cannot represent PostgreSQL trigger functions.
-- Restore the updatedAt triggers that existed in the historical migrations so
-- fresh databases and upgraded databases retain the same raw-SQL behavior.

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_cand_eval_link ON "CandidateEvaluationLink";
CREATE TRIGGER set_timestamp_on_cand_eval_link
BEFORE UPDATE ON "CandidateEvaluationLink"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_on_candidate_evaluation ON "CandidateEvaluation";
CREATE TRIGGER set_timestamp_on_candidate_evaluation
BEFORE UPDATE ON "CandidateEvaluation"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_on_candidate_expertise_score ON "CandidateExpertiseScore";
CREATE TRIGGER set_timestamp_on_candidate_expertise_score
BEFORE UPDATE ON "CandidateExpertiseScore"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_on_candidate_personality_score ON "CandidatePersonalityScore";
CREATE TRIGGER set_timestamp_on_candidate_personality_score
BEFORE UPDATE ON "CandidatePersonalityScore"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
