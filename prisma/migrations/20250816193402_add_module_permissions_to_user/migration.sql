-- AlterTable
ALTER TABLE "User" ADD COLUMN     "module_permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "UserTeam" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
