-- AlterTable
ALTER TABLE "User" ADD COLUMN "authentication_methods" TEXT[] DEFAULT ARRAY['basic']::TEXT[];

-- Migrate data: Basic
UPDATE "User"
SET "authentication_methods" = ARRAY['basic']
WHERE "authenticationMethod" = 'basic' OR "authenticationMethod" IS NULL;

-- Migrate data: Azure
UPDATE "User"
SET "authentication_methods" = ARRAY['azure_ad']
WHERE "authenticationMethod" = 'azure';

-- DropColumn
ALTER TABLE "User" DROP COLUMN "authenticationMethod";

-- CreateIndex
CREATE INDEX "User_authentication_methods_idx" ON "User" USING GIN ("authentication_methods");
