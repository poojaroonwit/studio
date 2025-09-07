/*
  Warnings:

  - You are about to drop the column `modulePermissions` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "modulePermissions";

CREATE TABLE IF NOT EXISTS "UserTeam" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#3B82F6',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "User_UserTeam" (
    "userId" UUID NOT NULL,
    "teamId" UUID NOT NULL,

    CONSTRAINT "User_UserTeam_pkey" PRIMARY KEY ("userId","teamId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserTeam_name_key" ON "UserTeam"("name");

CREATE INDEX IF NOT EXISTS "UserTeam_is_active_idx" ON "UserTeam"("is_active");

CREATE INDEX IF NOT EXISTS "User_UserTeam_userId_idx" ON "User_UserTeam"("userId");

CREATE INDEX IF NOT EXISTS "User_UserTeam_teamId_idx" ON "User_UserTeam"("teamId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public' AND tc.table_name = 'User_UserTeam' AND tc.constraint_name = 'User_UserTeam_teamId_fkey'
  ) THEN
    ALTER TABLE "User_UserTeam" ADD CONSTRAINT "User_UserTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "UserTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public' AND tc.table_name = 'User_UserTeam' AND tc.constraint_name = 'User_UserTeam_userId_fkey'
  ) THEN
    ALTER TABLE "User_UserTeam" ADD CONSTRAINT "User_UserTeam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
