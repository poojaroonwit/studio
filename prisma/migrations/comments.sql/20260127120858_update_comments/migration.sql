-- Prisma Database Comments Generator v1.4.0

-- applicant comments
COMMENT ON COLUMN "applicant"."isBlacklisted" IS 'Whether applicant is blacklisted';

-- applicantComment comments
COMMENT ON COLUMN "applicantComment"."type" IS 'Comment type (comment, remark)';
