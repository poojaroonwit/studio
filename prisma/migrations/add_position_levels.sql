-- Create PositionLevel table
CREATE TABLE IF NOT EXISTS "PositionLevel" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#6B7280',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionLevel_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on name
CREATE UNIQUE INDEX IF NOT EXISTS "PositionLevel_name_key" ON "PositionLevel"("name");

-- Indexes
CREATE INDEX IF NOT EXISTS "PositionLevel_is_active_idx" ON "PositionLevel"("is_active");
CREATE INDEX IF NOT EXISTS "PositionLevel_sort_order_idx" ON "PositionLevel"("sort_order");

-- Seed default position levels if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "PositionLevel") THEN
        INSERT INTO "PositionLevel" ("id", "name", "description", "color", "sort_order", "updatedAt") VALUES
            (gen_random_uuid(), 'entry level', 'Entry-level position', '#10B981', 1, CURRENT_TIMESTAMP),
            (gen_random_uuid(), 'mid level', 'Mid-level position', '#3B82F6', 2, CURRENT_TIMESTAMP),
            (gen_random_uuid(), 'senior level', 'Senior-level position', '#8B5CF6', 3, CURRENT_TIMESTAMP),
            (gen_random_uuid(), 'lead', 'Lead position', '#F59E0B', 4, CURRENT_TIMESTAMP),
            (gen_random_uuid(), 'manager', 'Manager position', '#EF4444', 5, CURRENT_TIMESTAMP),
            (gen_random_uuid(), 'executive', 'Executive position', '#6B7280', 6, CURRENT_TIMESTAMP),
            (gen_random_uuid(), 'officer', 'Officer position', '#0EA5E9', 7, CURRENT_TIMESTAMP),
            (gen_random_uuid(), 'leader', 'Leader position', '#84CC16', 8, CURRENT_TIMESTAMP);
    END IF;
END $$;


