CREATE TABLE IF NOT EXISTS "Grade" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "min_level" INTEGER NOT NULL,
    "max_level" INTEGER NOT NULL,
    "sla_days" INTEGER NOT NULL,
    "color" TEXT DEFAULT '#3B82F6',
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

ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "gradeId" UUID;
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "hiringDate" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Position_gradeId_idx" ON "Position"("gradeId");
CREATE INDEX IF NOT EXISTS "Position_hiringDate_idx" ON "Position"("hiringDate");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public' AND tc.table_name = 'Position' AND tc.constraint_name = 'Position_gradeId_fkey'
  ) THEN
    ALTER TABLE "Position" ADD CONSTRAINT "Position_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

INSERT INTO "Grade" ("id", "name", "label", "description", "min_level", "max_level", "sla_days", "color", "sort_order", "updatedAt")
SELECT gen_random_uuid(), 'Grade 8+', NULL, 'ระดับเกรด 8 ขึ้นไป', 8, 999, 60, '#EF4444', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Grade" WHERE "name" = 'Grade 8+');

INSERT INTO "Grade" ("id", "name", "label", "description", "min_level", "max_level", "sla_days", "color", "sort_order", "updatedAt")
SELECT gen_random_uuid(), 'Grade 6-7', NULL, 'ระดับเกรด 6-7', 6, 7, 45, '#F59E0B', 2, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Grade" WHERE "name" = 'Grade 6-7');

INSERT INTO "Grade" ("id", "name", "label", "description", "min_level", "max_level", "sla_days", "color", "sort_order", "updatedAt")
SELECT gen_random_uuid(), 'Grade 3-5', NULL, 'ระดับเกรด 3-5', 3, 5, 30, '#10B981', 3, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Grade" WHERE "name" = 'Grade 3-5');

INSERT INTO "Grade" ("id", "name", "label", "description", "min_level", "max_level", "sla_days", "color", "sort_order", "updatedAt")
SELECT gen_random_uuid(), 'Grade 1-2 & Contract', NULL, 'ระดับเกรด 1-2 และพนักงานสัญญาจ้าง/รายวัน', 1, 2, 15, '#3B82F6', 4, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Grade" WHERE "name" = 'Grade 1-2 & Contract');


