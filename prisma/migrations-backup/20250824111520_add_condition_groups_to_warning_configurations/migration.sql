-- AlterTable
ALTER TABLE "WarningConfiguration" ADD COLUMN     "condition_groups" JSONB DEFAULT '[]',
ALTER COLUMN "entity_type" DROP NOT NULL,
ALTER COLUMN "field" DROP NOT NULL,
ALTER COLUMN "condition" DROP NOT NULL,
ALTER COLUMN "operator" DROP NOT NULL;
