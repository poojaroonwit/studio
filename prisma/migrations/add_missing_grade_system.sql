-- Create Grade table
CREATE TABLE "Grade" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "min_level" INTEGER NOT NULL,
    "max_level" INTEGER NOT NULL,
    "sla_days" INTEGER NOT NULL,
    "color" TEXT DEFAULT '#3B82F6',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on name
CREATE UNIQUE INDEX "Grade_name_key" ON "Grade"("name");

-- Create indexes
CREATE INDEX "Grade_min_level_idx" ON "Grade"("min_level");
CREATE INDEX "Grade_max_level_idx" ON "Grade"("max_level");
CREATE INDEX "Grade_is_active_idx" ON "Grade"("is_active");
CREATE INDEX "Grade_sort_order_idx" ON "Grade"("sort_order");

-- Add gradeId and hiringDate columns to Position table
ALTER TABLE "Position" ADD COLUMN "gradeId" UUID;
ALTER TABLE "Position" ADD COLUMN "hiringDate" TIMESTAMP(3);

-- Create indexes for new columns
CREATE INDEX "Position_gradeId_idx" ON "Position"("gradeId");
CREATE INDEX "Position_hiringDate_idx" ON "Position"("hiringDate");

-- Add foreign key constraint
ALTER TABLE "Position" ADD CONSTRAINT "Position_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default grades based on the KPI requirements
INSERT INTO "Grade" ("id", "name", "description", "min_level", "max_level", "sla_days", "color", "sort_order") VALUES
    (gen_random_uuid(), 'Grade 8+', 'ระดับเกรด 8 ขึ้นไป', 8, 999, 60, '#EF4444', 1),
    (gen_random_uuid(), 'Grade 6-7', 'ระดับเกรด 6-7', 6, 7, 45, '#F59E0B', 2),
    (gen_random_uuid(), 'Grade 3-5', 'ระดับเกรด 3-5', 3, 5, 30, '#10B981', 3),
    (gen_random_uuid(), 'Grade 1-2 & Contract', 'ระดับเกรด 1-2 และพนักงานสัญญาจ้าง/รายวัน', 1, 2, 15, '#3B82F6', 4);
