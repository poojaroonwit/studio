-- Prisma Database Comments Generator v1.4.0

-- Applicant comments
COMMENT ON TABLE "Applicant" IS 'Applicant - Job applicants and their application data';
COMMENT ON COLUMN "Applicant"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Applicant"."name" IS 'Applicant full name';
COMMENT ON COLUMN "Applicant"."email" IS 'Email address';
COMMENT ON COLUMN "Applicant"."phone" IS 'Phone number';
COMMENT ON COLUMN "Applicant"."positionId" IS 'Applied position reference';
COMMENT ON COLUMN "Applicant"."recruiterId" IS 'Assigned recruiter reference';
COMMENT ON COLUMN "Applicant"."fitScore" IS 'AI-calculated fit score (0-100)';
COMMENT ON COLUMN "Applicant"."applicationDate" IS 'Application submission date';
COMMENT ON COLUMN "Applicant"."parsedData" IS 'Parsed resume data (JSON)';
COMMENT ON COLUMN "Applicant"."customAttributes" IS 'Custom attributes (JSON)';
COMMENT ON COLUMN "Applicant"."resumePath" IS 'Path to uploaded resume file';
COMMENT ON COLUMN "Applicant"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "Applicant"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "Applicant"."avatarUrl" IS 'Avatar image URL';
COMMENT ON COLUMN "Applicant"."dataAiHint" IS 'AI hint for processing';
COMMENT ON COLUMN "Applicant"."assignmentJustification" IS 'Justification for position assignment';
COMMENT ON COLUMN "Applicant"."educationData" IS 'Education history (JSON array)';
COMMENT ON COLUMN "Applicant"."experienceData" IS 'Work experience history (JSON array)';
COMMENT ON COLUMN "Applicant"."companyId" IS 'Company identifier';
COMMENT ON COLUMN "Applicant"."sourceId" IS 'Applicant source reference';
COMMENT ON COLUMN "Applicant"."subSource" IS 'Sub-source detail';
COMMENT ON COLUMN "Applicant"."statusId" IS 'Current recruitment status';
COMMENT ON COLUMN "Applicant"."isBlacklisted" IS 'Whether applicant is blacklisted';
COMMENT ON COLUMN "Applicant"."isPinned" IS 'Whether applicant is pinned';
COMMENT ON COLUMN "Applicant"."pinnedAt" IS 'Pin timestamp';
COMMENT ON COLUMN "Applicant"."emailDate" IS 'Email received date';
COMMENT ON COLUMN "Applicant"."emailSubject" IS 'Email subject line';
COMMENT ON COLUMN "Applicant"."emailId" IS 'Email message ID';
COMMENT ON COLUMN "Applicant"."emailMetadata" IS 'Email metadata (JSON)';
COMMENT ON COLUMN "Applicant"."expected_salary" IS 'Expected salary amount';

-- applicant_read_status comments
COMMENT ON TABLE "applicant_read_status" IS 'ApplicantReadStatus - Tracks read/unread status per user per applicant';

-- CustomFieldDefinition comments
COMMENT ON COLUMN "CustomFieldDefinition"."model_name" IS 'Target model name (Applicant, Position, etc.)';
COMMENT ON COLUMN "CustomFieldDefinition"."applicant_detail_section" IS 'Applicant detail section';

-- ApplicantComment comments
COMMENT ON TABLE "ApplicantComment" IS 'ApplicantComment - Comments and notes on applicant profiles';
COMMENT ON COLUMN "ApplicantComment"."id" IS 'Unique identifier';
COMMENT ON COLUMN "ApplicantComment"."applicantId" IS 'Reference to applicant';
COMMENT ON COLUMN "ApplicantComment"."authorId" IS 'Comment author reference';
COMMENT ON COLUMN "ApplicantComment"."content" IS 'Comment content';
COMMENT ON COLUMN "ApplicantComment"."type" IS 'Comment type (comment, remark)';
COMMENT ON COLUMN "ApplicantComment"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "ApplicantComment"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "ApplicantComment"."attachmentIds" IS 'Referenced attachment IDs';

-- ApplicantSource comments
COMMENT ON TABLE "ApplicantSource" IS 'ApplicantSource - Applicant sourcing channels (job portals, referrals, etc.)';
COMMENT ON COLUMN "ApplicantSource"."id" IS 'Unique identifier';
COMMENT ON COLUMN "ApplicantSource"."name" IS 'Source name (e.g., LinkedIn, JobsDB)';
COMMENT ON COLUMN "ApplicantSource"."description" IS 'Source description';
COMMENT ON COLUMN "ApplicantSource"."allow_sub_source" IS 'Whether sub-sources are allowed';
COMMENT ON COLUMN "ApplicantSource"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "ApplicantSource"."is_active" IS 'Whether source is active';
COMMENT ON COLUMN "ApplicantSource"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "ApplicantSource"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "ApplicantSource"."logo" IS 'Logo URL or path';
COMMENT ON COLUMN "ApplicantSource"."email" IS 'Contact email for this source';

-- ApplicantEvaluation comments
COMMENT ON TABLE "ApplicantEvaluation" IS 'ApplicantEvaluation - Evaluation records for applicant assessments';
COMMENT ON COLUMN "ApplicantEvaluation"."id" IS 'Unique identifier';
COMMENT ON COLUMN "ApplicantEvaluation"."applicantId" IS 'Reference to applicant';
COMMENT ON COLUMN "ApplicantEvaluation"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "ApplicantEvaluation"."evaluatorId" IS 'Reference to evaluator';
COMMENT ON COLUMN "ApplicantEvaluation"."status" IS 'Evaluation status (in_progress, completed)';
COMMENT ON COLUMN "ApplicantEvaluation"."overall_score" IS 'Overall evaluation score';
COMMENT ON COLUMN "ApplicantEvaluation"."comments" IS 'Evaluator comments';
COMMENT ON COLUMN "ApplicantEvaluation"."completed_at" IS 'Completion timestamp';
COMMENT ON COLUMN "ApplicantEvaluation"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "ApplicantEvaluation"."updatedAt" IS 'Last update timestamp';

-- ApplicantEvaluationLink comments
COMMENT ON TABLE "ApplicantEvaluationLink" IS 'ApplicantEvaluationLink - Secure links for external applicant evaluation';
COMMENT ON COLUMN "ApplicantEvaluationLink"."id" IS 'Unique identifier';
COMMENT ON COLUMN "ApplicantEvaluationLink"."applicantId" IS 'Reference to applicant';
COMMENT ON COLUMN "ApplicantEvaluationLink"."token" IS 'Secure access token';
COMMENT ON COLUMN "ApplicantEvaluationLink"."expiresAt" IS 'Token expiration timestamp';
COMMENT ON COLUMN "ApplicantEvaluationLink"."createdById" IS 'User who created the link';
COMMENT ON COLUMN "ApplicantEvaluationLink"."requireLogin" IS 'Whether login is required to access';
COMMENT ON COLUMN "ApplicantEvaluationLink"."revokedAt" IS 'Link revocation timestamp';
COMMENT ON COLUMN "ApplicantEvaluationLink"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "ApplicantEvaluationLink"."updatedAt" IS 'Last update timestamp';

-- ApplicantExpertiseScore comments
COMMENT ON TABLE "ApplicantExpertiseScore" IS 'ApplicantExpertiseScore - Recorded scores for expertise skills';
COMMENT ON COLUMN "ApplicantExpertiseScore"."id" IS 'Unique identifier';
COMMENT ON COLUMN "ApplicantExpertiseScore"."evaluationId" IS 'Reference to evaluation';
COMMENT ON COLUMN "ApplicantExpertiseScore"."skillId" IS 'Reference to skill';
COMMENT ON COLUMN "ApplicantExpertiseScore"."score" IS 'Score value';
COMMENT ON COLUMN "ApplicantExpertiseScore"."notes" IS 'Optional notes on score';
COMMENT ON COLUMN "ApplicantExpertiseScore"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "ApplicantExpertiseScore"."updatedAt" IS 'Last update timestamp';

-- ApplicantPersonalityScore comments
COMMENT ON TABLE "ApplicantPersonalityScore" IS 'ApplicantPersonalityScore - Recorded scores for personality traits';
COMMENT ON COLUMN "ApplicantPersonalityScore"."id" IS 'Unique identifier';
COMMENT ON COLUMN "ApplicantPersonalityScore"."evaluationId" IS 'Reference to evaluation';
COMMENT ON COLUMN "ApplicantPersonalityScore"."traitId" IS 'Reference to personality trait';
COMMENT ON COLUMN "ApplicantPersonalityScore"."score" IS 'Score value';
COMMENT ON COLUMN "ApplicantPersonalityScore"."notes" IS 'Optional notes on score';
COMMENT ON COLUMN "ApplicantPersonalityScore"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "ApplicantPersonalityScore"."updatedAt" IS 'Last update timestamp';
