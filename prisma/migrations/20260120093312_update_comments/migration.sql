-- Prisma Database Comments Generator v1.4.0

-- SkillTemplate comments
COMMENT ON TABLE "SkillTemplate" IS 'SkillTemplate - Reusable templates for skill and personality configurations';
COMMENT ON COLUMN "SkillTemplate"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SkillTemplate"."name" IS 'Template name';
COMMENT ON COLUMN "SkillTemplate"."description" IS 'Template description';
COMMENT ON COLUMN "SkillTemplate"."is_active" IS 'Whether template is active';
COMMENT ON COLUMN "SkillTemplate"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SkillTemplate"."updatedAt" IS 'Last update timestamp';

-- SkillTemplateGroup comments
COMMENT ON TABLE "SkillTemplateGroup" IS 'SkillTemplateGroup - Expertise group assignments in skill templates';
COMMENT ON COLUMN "SkillTemplateGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SkillTemplateGroup"."templateId" IS 'Reference to template';
COMMENT ON COLUMN "SkillTemplateGroup"."groupId" IS 'Reference to expertise group';
COMMENT ON COLUMN "SkillTemplateGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SkillTemplateGroup"."updatedAt" IS 'Last update timestamp';

-- SkillTemplateSkill comments
COMMENT ON TABLE "SkillTemplateSkill" IS 'SkillTemplateSkill - Expertise skill assignments in skill templates';
COMMENT ON COLUMN "SkillTemplateSkill"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SkillTemplateSkill"."templateId" IS 'Reference to template';
COMMENT ON COLUMN "SkillTemplateSkill"."skillId" IS 'Reference to expertise skill';
COMMENT ON COLUMN "SkillTemplateSkill"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SkillTemplateSkill"."updatedAt" IS 'Last update timestamp';

-- SkillTemplatePersonalityGroup comments
COMMENT ON TABLE "SkillTemplatePersonalityGroup" IS 'SkillTemplatePersonalityGroup - Personality group assignments in skill templates';
COMMENT ON COLUMN "SkillTemplatePersonalityGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SkillTemplatePersonalityGroup"."templateId" IS 'Reference to template';
COMMENT ON COLUMN "SkillTemplatePersonalityGroup"."groupId" IS 'Reference to personality group';
COMMENT ON COLUMN "SkillTemplatePersonalityGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SkillTemplatePersonalityGroup"."updatedAt" IS 'Last update timestamp';

-- SkillTemplatePersonalityTrait comments
COMMENT ON TABLE "SkillTemplatePersonalityTrait" IS 'SkillTemplatePersonalityTrait - Personality trait assignments in skill templates';
COMMENT ON COLUMN "SkillTemplatePersonalityTrait"."id" IS 'Unique identifier';
COMMENT ON COLUMN "SkillTemplatePersonalityTrait"."templateId" IS 'Reference to template';
COMMENT ON COLUMN "SkillTemplatePersonalityTrait"."traitId" IS 'Reference to personality trait';
COMMENT ON COLUMN "SkillTemplatePersonalityTrait"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "SkillTemplatePersonalityTrait"."updatedAt" IS 'Last update timestamp';

-- PositionExpertiseGroup comments
COMMENT ON TABLE "PositionExpertiseGroup" IS 'PositionExpertiseGroup - Expertise group requirements for positions';
COMMENT ON COLUMN "PositionExpertiseGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PositionExpertiseGroup"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "PositionExpertiseGroup"."groupId" IS 'Reference to expertise group';
COMMENT ON COLUMN "PositionExpertiseGroup"."is_required" IS 'Whether this group is required';
COMMENT ON COLUMN "PositionExpertiseGroup"."weight" IS 'Weight for scoring';
COMMENT ON COLUMN "PositionExpertiseGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PositionExpertiseGroup"."updatedAt" IS 'Last update timestamp';

-- PositionExpertiseSkill comments
COMMENT ON TABLE "PositionExpertiseSkill" IS 'PositionExpertiseSkill - Expertise skill requirements for positions';
COMMENT ON COLUMN "PositionExpertiseSkill"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PositionExpertiseSkill"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "PositionExpertiseSkill"."skillId" IS 'Reference to expertise skill';
COMMENT ON COLUMN "PositionExpertiseSkill"."is_required" IS 'Whether this skill is required';
COMMENT ON COLUMN "PositionExpertiseSkill"."weight" IS 'Weight for scoring';
COMMENT ON COLUMN "PositionExpertiseSkill"."min_score" IS 'Minimum required score';
COMMENT ON COLUMN "PositionExpertiseSkill"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PositionExpertiseSkill"."updatedAt" IS 'Last update timestamp';

-- PositionPersonalityGroup comments
COMMENT ON TABLE "PositionPersonalityGroup" IS 'PositionPersonalityGroup - Personality group requirements for positions';
COMMENT ON COLUMN "PositionPersonalityGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PositionPersonalityGroup"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "PositionPersonalityGroup"."groupId" IS 'Reference to personality group';
COMMENT ON COLUMN "PositionPersonalityGroup"."is_required" IS 'Whether this group is required';
COMMENT ON COLUMN "PositionPersonalityGroup"."weight" IS 'Weight for scoring';
COMMENT ON COLUMN "PositionPersonalityGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PositionPersonalityGroup"."updatedAt" IS 'Last update timestamp';

-- PositionPersonalityTrait comments
COMMENT ON TABLE "PositionPersonalityTrait" IS 'PositionPersonalityTrait - Personality trait requirements for positions';
COMMENT ON COLUMN "PositionPersonalityTrait"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PositionPersonalityTrait"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "PositionPersonalityTrait"."traitId" IS 'Reference to personality trait';
COMMENT ON COLUMN "PositionPersonalityTrait"."is_required" IS 'Whether this trait is required';
COMMENT ON COLUMN "PositionPersonalityTrait"."weight" IS 'Weight for scoring';
COMMENT ON COLUMN "PositionPersonalityTrait"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PositionPersonalityTrait"."updatedAt" IS 'Last update timestamp';

-- applicantEvaluation comments
COMMENT ON TABLE "applicantEvaluation" IS 'applicantEvaluation - Evaluation records for applicant assessments';
COMMENT ON COLUMN "applicantEvaluation"."id" IS 'Unique identifier';
COMMENT ON COLUMN "applicantEvaluation"."applicantId" IS 'Reference to applicant';
COMMENT ON COLUMN "applicantEvaluation"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "applicantEvaluation"."evaluatorId" IS 'Reference to evaluator';
COMMENT ON COLUMN "applicantEvaluation"."status" IS 'Evaluation status (in_progress, completed)';
COMMENT ON COLUMN "applicantEvaluation"."overall_score" IS 'Overall evaluation score';
COMMENT ON COLUMN "applicantEvaluation"."comments" IS 'Evaluator comments';
COMMENT ON COLUMN "applicantEvaluation"."completed_at" IS 'Completion timestamp';
COMMENT ON COLUMN "applicantEvaluation"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "applicantEvaluation"."updatedAt" IS 'Last update timestamp';

-- applicantEvaluationLink comments
COMMENT ON TABLE "applicantEvaluationLink" IS 'applicantEvaluationLink - Secure links for external applicant evaluation';
COMMENT ON COLUMN "applicantEvaluationLink"."id" IS 'Unique identifier';
COMMENT ON COLUMN "applicantEvaluationLink"."applicantId" IS 'Reference to applicant';
COMMENT ON COLUMN "applicantEvaluationLink"."token" IS 'Secure access token';
COMMENT ON COLUMN "applicantEvaluationLink"."expiresAt" IS 'Token expiration timestamp';
COMMENT ON COLUMN "applicantEvaluationLink"."createdById" IS 'User who created the link';
COMMENT ON COLUMN "applicantEvaluationLink"."requireLogin" IS 'Whether login is required to access';
COMMENT ON COLUMN "applicantEvaluationLink"."revokedAt" IS 'Link revocation timestamp';
COMMENT ON COLUMN "applicantEvaluationLink"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "applicantEvaluationLink"."updatedAt" IS 'Last update timestamp';

-- applicantExpertiseScore comments
COMMENT ON TABLE "applicantExpertiseScore" IS 'applicantExpertiseScore - Recorded scores for expertise skills';
COMMENT ON COLUMN "applicantExpertiseScore"."id" IS 'Unique identifier';
COMMENT ON COLUMN "applicantExpertiseScore"."evaluationId" IS 'Reference to evaluation';
COMMENT ON COLUMN "applicantExpertiseScore"."skillId" IS 'Reference to skill';
COMMENT ON COLUMN "applicantExpertiseScore"."score" IS 'Score value';
COMMENT ON COLUMN "applicantExpertiseScore"."notes" IS 'Optional notes on score';
COMMENT ON COLUMN "applicantExpertiseScore"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "applicantExpertiseScore"."updatedAt" IS 'Last update timestamp';

-- applicantPersonalityScore comments
COMMENT ON TABLE "applicantPersonalityScore" IS 'applicantPersonalityScore - Recorded scores for personality traits';
COMMENT ON COLUMN "applicantPersonalityScore"."id" IS 'Unique identifier';
COMMENT ON COLUMN "applicantPersonalityScore"."evaluationId" IS 'Reference to evaluation';
COMMENT ON COLUMN "applicantPersonalityScore"."traitId" IS 'Reference to personality trait';
COMMENT ON COLUMN "applicantPersonalityScore"."score" IS 'Score value';
COMMENT ON COLUMN "applicantPersonalityScore"."notes" IS 'Optional notes on score';
COMMENT ON COLUMN "applicantPersonalityScore"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "applicantPersonalityScore"."updatedAt" IS 'Last update timestamp';

-- UserSession comments
COMMENT ON COLUMN "UserSession"."id" IS 'Unique identifier';
COMMENT ON COLUMN "UserSession"."user_id" IS 'Reference to user';
COMMENT ON COLUMN "UserSession"."session_token" IS 'Unique session token';
COMMENT ON COLUMN "UserSession"."device_info" IS 'Device information string';
COMMENT ON COLUMN "UserSession"."ip_address" IS 'Client IP address';
COMMENT ON COLUMN "UserSession"."user_agent" IS 'Client user agent';
COMMENT ON COLUMN "UserSession"."is_active" IS 'Whether session is active';
COMMENT ON COLUMN "UserSession"."created_at" IS 'Session creation timestamp';
COMMENT ON COLUMN "UserSession"."expires_at" IS 'Session expiration timestamp';
COMMENT ON COLUMN "UserSession"."last_activity_at" IS 'Last activity timestamp';
