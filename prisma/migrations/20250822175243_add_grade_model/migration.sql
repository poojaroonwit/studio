-- DropForeignKey
ALTER TABLE "Warning" DROP CONSTRAINT "Warning_configuration_id_fkey";

-- DropIndex
DROP INDEX "Warning_configuration_id_entity_type_entity_id_key";

-- DropIndex
DROP INDEX "Warning_configuration_id_idx";

-- DropIndex
DROP INDEX "Warning_created_at_idx";

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "companyId" UUID;

-- AlterTable
ALTER TABLE "JobMatch" ADD COLUMN     "companyId" UUID;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "companyId" UUID,
ADD COLUMN     "gradeId" UUID,
ADD COLUMN     "hiringDate" TIMESTAMP(3),
ADD COLUMN     "positionAttribute" TEXT;

-- CreateTable
CREATE TABLE "Grade" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "min_level" INTEGER NOT NULL,
    "max_level" INTEGER NOT NULL,
    "sla_days" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grade_name_key" ON "Grade"("name");

-- CreateIndex
CREATE INDEX "Grade_min_level_idx" ON "Grade"("min_level");

-- CreateIndex
CREATE INDEX "Grade_max_level_idx" ON "Grade"("max_level");

-- CreateIndex
CREATE INDEX "Grade_is_active_idx" ON "Grade"("is_active");

-- CreateIndex
CREATE INDEX "Grade_sort_order_idx" ON "Grade"("sort_order");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
