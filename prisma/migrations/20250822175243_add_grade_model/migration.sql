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

CREATE TABLE IF NOT EXISTS "Grade" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Grade_name_key" ON "Grade"("name");

CREATE INDEX IF NOT EXISTS "Grade_min_level_idx" ON "Grade"("min_level");

CREATE INDEX IF NOT EXISTS "Grade_max_level_idx" ON "Grade"("max_level");

CREATE INDEX IF NOT EXISTS "Grade_is_active_idx" ON "Grade"("is_active");

CREATE INDEX IF NOT EXISTS "Grade_sort_order_idx" ON "Grade"("sort_order");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public' AND tc.table_name = 'Position' AND tc.constraint_name = 'Position_gradeId_fkey'
  ) THEN
    ALTER TABLE "Position" ADD CONSTRAINT "Position_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
