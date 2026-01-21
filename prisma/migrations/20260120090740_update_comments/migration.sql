-- Prisma Database Comments Generator v1.4.0

-- CandidateSource comments
COMMENT ON COLUMN "CandidateSource"."id" IS 'Unique identifier';
COMMENT ON COLUMN "CandidateSource"."name" IS 'Source name (e.g., LinkedIn, JobsDB)';
COMMENT ON COLUMN "CandidateSource"."description" IS 'Source description';
COMMENT ON COLUMN "CandidateSource"."allow_sub_source" IS 'Whether sub-sources are allowed';
COMMENT ON COLUMN "CandidateSource"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "CandidateSource"."is_active" IS 'Whether source is active';
COMMENT ON COLUMN "CandidateSource"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "CandidateSource"."updatedAt" IS 'Last update timestamp';
COMMENT ON COLUMN "CandidateSource"."logo" IS 'Logo URL or path';
COMMENT ON COLUMN "CandidateSource"."email" IS 'Contact email for this source';

-- Notification comments
COMMENT ON COLUMN "Notification"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Notification"."userId" IS 'Target user reference';
COMMENT ON COLUMN "Notification"."type" IS 'Notification type';
COMMENT ON COLUMN "Notification"."title" IS 'Notification title';
COMMENT ON COLUMN "Notification"."message" IS 'Notification message body';
COMMENT ON COLUMN "Notification"."data" IS 'Additional data (JSON)';
COMMENT ON COLUMN "Notification"."isRead" IS 'Whether notification has been read';
COMMENT ON COLUMN "Notification"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "Notification"."updatedAt" IS 'Last update timestamp';

-- Headcount comments
COMMENT ON COLUMN "Headcount"."id" IS 'Unique identifier';
COMMENT ON COLUMN "Headcount"."positionId" IS 'Reference to position';
COMMENT ON COLUMN "Headcount"."type" IS 'Headcount type (new, replacement, expansion)';
COMMENT ON COLUMN "Headcount"."status" IS 'Current status (vacant, filled, pending)';
COMMENT ON COLUMN "Headcount"."candidateId" IS 'Assigned candidate reference';
COMMENT ON COLUMN "Headcount"."onboardingDate" IS 'Expected onboarding date';
COMMENT ON COLUMN "Headcount"."requestDate" IS 'Request submission date';
COMMENT ON COLUMN "Headcount"."notes" IS 'Additional notes';
COMMENT ON COLUMN "Headcount"."memo_id" IS 'Reference memo ID';
COMMENT ON COLUMN "Headcount"."custom_fields" IS 'Custom fields (JSON)';
COMMENT ON COLUMN "Headcount"."employee_id" IS 'Employee ID once filled';
COMMENT ON COLUMN "Headcount"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "Headcount"."updatedAt" IS 'Last update timestamp';

-- WarningSystemStatus comments
COMMENT ON COLUMN "WarningSystemStatus"."id" IS 'Status ID';
COMMENT ON COLUMN "WarningSystemStatus"."initialized" IS 'Whether system is initialized';
COMMENT ON COLUMN "WarningSystemStatus"."initializedAt" IS 'Initialization timestamp';
COMMENT ON COLUMN "WarningSystemStatus"."lastCheckAt" IS 'Last check timestamp';
COMMENT ON COLUMN "WarningSystemStatus"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "WarningSystemStatus"."updatedAt" IS 'Last update timestamp';

-- ExpertiseGroup comments
COMMENT ON COLUMN "ExpertiseGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "ExpertiseGroup"."name" IS 'Group name';
COMMENT ON COLUMN "ExpertiseGroup"."description" IS 'Group description';
COMMENT ON COLUMN "ExpertiseGroup"."color" IS 'Display color';
COMMENT ON COLUMN "ExpertiseGroup"."is_active" IS 'Whether group is active';
COMMENT ON COLUMN "ExpertiseGroup"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "ExpertiseGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "ExpertiseGroup"."updatedAt" IS 'Last update timestamp';

-- ExpertiseSkill comments
COMMENT ON COLUMN "ExpertiseSkill"."id" IS 'Unique identifier';
COMMENT ON COLUMN "ExpertiseSkill"."name" IS 'Skill name';
COMMENT ON COLUMN "ExpertiseSkill"."description" IS 'Skill description';
COMMENT ON COLUMN "ExpertiseSkill"."max_score" IS 'Maximum score for this skill';
COMMENT ON COLUMN "ExpertiseSkill"."skill_type" IS 'Skill type (hard_skill, soft_skill)';
COMMENT ON COLUMN "ExpertiseSkill"."is_active" IS 'Whether skill is active';
COMMENT ON COLUMN "ExpertiseSkill"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "ExpertiseSkill"."groupId" IS 'Reference to expertise group';
COMMENT ON COLUMN "ExpertiseSkill"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "ExpertiseSkill"."updatedAt" IS 'Last update timestamp';

-- PersonalityGroup comments
COMMENT ON COLUMN "PersonalityGroup"."id" IS 'Unique identifier';
COMMENT ON COLUMN "PersonalityGroup"."name" IS 'Group name';
COMMENT ON COLUMN "PersonalityGroup"."description" IS 'Group description';
COMMENT ON COLUMN "PersonalityGroup"."color" IS 'Display color';
COMMENT ON COLUMN "PersonalityGroup"."is_active" IS 'Whether group is active';
COMMENT ON COLUMN "PersonalityGroup"."sort_order" IS 'Sort order for display';
COMMENT ON COLUMN "PersonalityGroup"."createdAt" IS 'Record creation timestamp';
COMMENT ON COLUMN "PersonalityGroup"."updatedAt" IS 'Last update timestamp';
