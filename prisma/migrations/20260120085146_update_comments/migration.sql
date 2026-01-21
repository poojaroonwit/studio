-- Prisma Database Comments Generator v1.4.0

-- UserActivityLog comments
COMMENT ON COLUMN "UserActivityLog"."id" IS 'Unique identifier';
COMMENT ON COLUMN "UserActivityLog"."user_id" IS 'Reference to the user';
COMMENT ON COLUMN "UserActivityLog"."action" IS 'Action type (SIGN_IN, SIGN_OUT, PASSWORD_CHANGE, etc.)';
COMMENT ON COLUMN "UserActivityLog"."details" IS 'Additional context for the action (JSON)';
COMMENT ON COLUMN "UserActivityLog"."ip_address" IS 'IP address of the request';
COMMENT ON COLUMN "UserActivityLog"."user_agent" IS 'Browser user agent string';
COMMENT ON COLUMN "UserActivityLog"."performed_by" IS 'Who performed the action (for admin actions)';
COMMENT ON COLUMN "UserActivityLog"."created_at" IS 'Timestamp of the action';

-- Position comments
COMMENT ON COLUMN "Position"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Position"."title" IS 'Job title';
COMMENT ON COLUMN "Position"."department" IS 'Department name';
COMMENT ON COLUMN "Position"."description" IS 'Job description';
COMMENT ON COLUMN "Position"."matchCriteria" IS 'Criteria for candidate matching';
COMMENT ON COLUMN "Position"."isOpen" IS 'Whether position is open for applications';
COMMENT ON COLUMN "Position"."positionLevel" IS 'Seniority level (Entry, Mid, Senior, etc.)';
COMMENT ON COLUMN "Position"."recruiterId" IS 'Assigned recruiter';
COMMENT ON COLUMN "Position"."customAttributes" IS 'Custom attributes (JSON)';
COMMENT ON COLUMN "Position"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "Position"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "Position"."companyId" IS 'Company identifier';
COMMENT ON COLUMN "Position"."gradeId" IS 'Reference to grade level';
COMMENT ON COLUMN "Position"."positionAttribute" IS 'Additional position attributes';

-- Grade comments
COMMENT ON COLUMN "Grade"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Grade"."name" IS 'Grade name (e.g., G1, G2)';
COMMENT ON COLUMN "Grade"."label" IS 'Display label';
COMMENT ON COLUMN "Grade"."description" IS 'Grade description';
COMMENT ON COLUMN "Grade"."min_level" IS 'Minimum level number';
COMMENT ON COLUMN "Grade"."max_level" IS 'Maximum level number';
COMMENT ON COLUMN "Grade"."sla_days" IS 'SLA days for this grade';
COMMENT ON COLUMN "Grade"."color" IS 'Display color';
COMMENT ON COLUMN "Grade"."is_active" IS 'Whether grade is active';
COMMENT ON COLUMN "Grade"."sort_order" IS 'Sort order for display';

-- PositionLevel comments
COMMENT ON COLUMN "PositionLevel"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PositionLevel"."name" IS 'Level name (e.g., Entry, Junior, Mid, Senior)';
COMMENT ON COLUMN "PositionLevel"."description" IS 'Level description';
COMMENT ON COLUMN "PositionLevel"."color" IS 'Display color';
COMMENT ON COLUMN "PositionLevel"."is_active" IS 'Whether level is active';
COMMENT ON COLUMN "PositionLevel"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "PositionLevel"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PositionLevel"."updatedAt" IS 'Last update timestamp';

-- Candidate comments
COMMENT ON COLUMN "Candidate"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Candidate"."name" IS 'Candidate full name';
COMMENT ON COLUMN "Candidate"."email" IS 'Email address';
COMMENT ON COLUMN "Candidate"."phone" IS 'Phone number';
COMMENT ON COLUMN "Candidate"."positionId" IS 'Applied position reference';
COMMENT ON COLUMN "Candidate"."recruiterId" IS 'Assigned recruiter reference';
COMMENT ON COLUMN "Candidate"."fitScore" IS 'AI-calculated fit score (0-100)';
COMMENT ON COLUMN "Candidate"."applicationDate" IS 'Application submission date';
COMMENT ON COLUMN "Candidate"."parsedData" IS 'Parsed resume data (JSON)';
COMMENT ON COLUMN "Candidate"."customAttributes" IS 'Custom attributes (JSON)';
COMMENT ON COLUMN "Candidate"."resumePath" IS 'Path to uploaded resume file';
COMMENT ON COLUMN "Candidate"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "Candidate"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "Candidate"."avatarUrl" IS 'Avatar image URL';
COMMENT ON COLUMN "Candidate"."dataAiHint" IS 'AI hint for processing';
COMMENT ON COLUMN "Candidate"."assignmentJustification" IS 'Justification for position assignment';
COMMENT ON COLUMN "Candidate"."educationData" IS 'Education history (JSON array)';
COMMENT ON COLUMN "Candidate"."experienceData" IS 'Work experience history (JSON array)';
COMMENT ON COLUMN "Candidate"."companyId" IS 'Company identifier';
COMMENT ON COLUMN "Candidate"."sourceId" IS 'Candidate source reference';
COMMENT ON COLUMN "Candidate"."subSource" IS 'Sub-source detail';
COMMENT ON COLUMN "Candidate"."statusId" IS 'Current recruitment status';
COMMENT ON COLUMN "Candidate"."is_blacklisted" IS 'Whether candidate is blacklisted';
COMMENT ON COLUMN "Candidate"."isPinned" IS 'Whether candidate is pinned';
COMMENT ON COLUMN "Candidate"."pinnedAt" IS 'Pin timestamp';
COMMENT ON COLUMN "Candidate"."emailDate" IS 'Email received date';
COMMENT ON COLUMN "Candidate"."emailSubject" IS 'Email subject line';
COMMENT ON COLUMN "Candidate"."emailId" IS 'Email message ID';
COMMENT ON COLUMN "Candidate"."emailMetadata" IS 'Email metadata (JSON)';
COMMENT ON COLUMN "Candidate"."expected_salary" IS 'Expected salary amount';

-- RecruitmentStage comments
COMMENT ON COLUMN "RecruitmentStage"."id" IS 'Unique identifier';
COMMENT ON COLUMN "RecruitmentStage"."name" IS 'Stage name';
COMMENT ON COLUMN "RecruitmentStage"."description" IS 'Stage description';
COMMENT ON COLUMN "RecruitmentStage"."is_system" IS 'Whether this is a system-defined stage';
COMMENT ON COLUMN "RecruitmentStage"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "RecruitmentStage"."color_complete" IS 'Color when stage is complete';
COMMENT ON COLUMN "RecruitmentStage"."color_badge" IS 'Badge color';

-- TransitionRecord comments
COMMENT ON COLUMN "TransitionRecord"."id" IS 'Unique identifier';
COMMENT ON COLUMN "TransitionRecord"."candidateId" IS 'Reference to candidate';
COMMENT ON COLUMN "TransitionRecord"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "TransitionRecord"."date" IS 'Transition date';
COMMENT ON COLUMN "TransitionRecord"."stage" IS 'Stage name at transition';
COMMENT ON COLUMN "TransitionRecord"."notes" IS 'Transition notes';
COMMENT ON COLUMN "TransitionRecord"."actingUserId" IS 'User who performed the transition';
COMMENT ON COLUMN "TransitionRecord"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "TransitionRecord"."updatedAt" IS 'Last update timestamp';
