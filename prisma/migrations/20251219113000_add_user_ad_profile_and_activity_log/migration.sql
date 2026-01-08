-- CreateTable: UserActivityLog
CREATE TABLE "UserActivityLog" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "performed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivityLog_pkey" PRIMARY KEY ("id")
);

-- AddColumns to User table for Azure AD Profile
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "employee_id" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "company_name" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "employee_type" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hire_date" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "manager" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sam_account_name" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "contact_info" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deleted_from_ad" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndexes for UserActivityLog
CREATE INDEX "UserActivityLog_user_id_idx" ON "UserActivityLog"("user_id");
CREATE INDEX "UserActivityLog_action_idx" ON "UserActivityLog"("action");
CREATE INDEX "UserActivityLog_created_at_idx" ON "UserActivityLog"("created_at");
CREATE INDEX "UserActivityLog_performed_by_idx" ON "UserActivityLog"("performed_by");

-- CreateIndexes for User table (new fields)
CREATE INDEX IF NOT EXISTS "User_employee_id_idx" ON "User"("employee_id");
CREATE INDEX IF NOT EXISTS "User_deleted_from_ad_idx" ON "User"("deleted_from_ad");

-- AddForeignKey
ALTER TABLE "UserActivityLog" ADD CONSTRAINT "UserActivityLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
