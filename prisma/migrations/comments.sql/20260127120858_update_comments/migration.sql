-- Prisma Database Comments Generator v1.4.0

-- Candidate comments
COMMENT ON COLUMN "Candidate"."isBlacklisted" IS 'Whether candidate is blacklisted';

-- CandidateComment comments
COMMENT ON COLUMN "CandidateComment"."type" IS 'Comment type (comment, remark)';
