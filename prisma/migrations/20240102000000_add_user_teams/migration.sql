/*
  Warnings:

  - You are about to drop the column `modulePermissions` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "modulePermissions";

-- CreateTable
CREATE TABLE "UserTeam" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#3B82F6',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User_UserTeam" (
    "userId" UUID NOT NULL,
    "teamId" UUID NOT NULL,

    CONSTRAINT "User_UserTeam_pkey" PRIMARY KEY ("userId","teamId")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTeam_name_key" ON "UserTeam"("name");

-- CreateIndex
CREATE INDEX "UserTeam_is_active_idx" ON "UserTeam"("is_active");

-- CreateIndex
CREATE INDEX "User_UserTeam_userId_idx" ON "User_UserTeam"("userId");

-- CreateIndex
CREATE INDEX "User_UserTeam_teamId_idx" ON "User_UserTeam"("teamId");

-- AddForeignKey
ALTER TABLE "User_UserTeam" ADD CONSTRAINT "User_UserTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "UserTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User_UserTeam" ADD CONSTRAINT "User_UserTeam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
