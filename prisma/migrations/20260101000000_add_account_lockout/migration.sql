-- Add account lockout columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "last_failed_login" TIMESTAMP(3);

-- Create index for efficient lockout queries
CREATE INDEX IF NOT EXISTS "User_locked_until_idx" ON "User"("locked_until");

-- Add comment for documentation
COMMENT ON COLUMN "User"."failed_login_attempts" IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN "User"."locked_until" IS 'Account is locked until this timestamp (null = not locked)';
COMMENT ON COLUMN "User"."last_failed_login" IS 'Timestamp of the last failed login attempt';
