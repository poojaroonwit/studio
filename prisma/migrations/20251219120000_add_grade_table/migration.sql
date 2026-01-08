-- CreateTable for Grade
CREATE TABLE IF NOT EXISTS "Grade" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Grade_name_key" ON "Grade"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Grade_min_level_idx" ON "Grade"("min_level");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Grade_max_level_idx" ON "Grade"("max_level");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Grade_is_active_idx" ON "Grade"("is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Grade_sort_order_idx" ON "Grade"("sort_order");

-- Add foreign key from Position to Grade if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Position_gradeId_fkey'
    ) THEN
        ALTER TABLE "Position" ADD CONSTRAINT "Position_gradeId_fkey" 
        FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Create index for gradeId on Position if not exists
CREATE INDEX IF NOT EXISTS "Position_gradeId_idx" ON "Position"("gradeId");
