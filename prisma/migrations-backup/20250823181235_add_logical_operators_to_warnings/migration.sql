-- AlterTable
ALTER TABLE "WarningConfiguration" ADD COLUMN     "conditions" JSONB DEFAULT '[]',
ADD COLUMN     "logical_operator" TEXT;
