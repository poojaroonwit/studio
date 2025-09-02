-- Migration: Update candidate status to reference recruitmentstage.id (idempotent)
-- This migration safely converts TEXT status to UUID FK if needed; otherwise it skips.

DO $$
DECLARE
  v_status_type text;
  v_fk_exists boolean;
  v_applied_id uuid;
BEGIN
  SELECT data_type INTO v_status_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Candidate' AND column_name = 'status';

  -- If already UUID, skip
  IF v_status_type = 'uuid' THEN
    RAISE NOTICE 'Candidate.status already UUID; skipping.';
    RETURN;
  END IF;

  -- Ensure RecruitmentStage table exists with proper UUID structure
  CREATE TABLE IF NOT EXISTS "RecruitmentStage" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "color_complete" TEXT,
    "color_badge" TEXT,
    CONSTRAINT "RecruitmentStage_pkey" PRIMARY KEY ("id")
  );

  -- Create unique index on name if it doesn't exist
  CREATE UNIQUE INDEX IF NOT EXISTS "RecruitmentStage_name_key" ON "RecruitmentStage"("name");

  -- New staging column
  ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "statusId" uuid;

  -- Ensure default stage exists and capture id (using correct column names)
  INSERT INTO "RecruitmentStage"(id, name, description, "sort_order")
  SELECT gen_random_uuid(), 'Applied', 'Default stage', 0
  WHERE NOT EXISTS (SELECT 1 FROM "RecruitmentStage" WHERE LOWER(name)='applied');

  SELECT id INTO v_applied_id FROM "RecruitmentStage" WHERE LOWER(name)='applied' LIMIT 1;

  -- Backfill from names
  UPDATE "Candidate" c
  SET "statusId" = rs.id
  FROM "RecruitmentStage" rs
  WHERE c."statusId" IS NULL
    AND c.status IS NOT NULL AND c.status <> ''
    AND LOWER(rs.name) = LOWER(c.status);

  -- Fill remaining with default
  UPDATE "Candidate"
  SET "statusId" = v_applied_id
  WHERE "statusId" IS NULL;

  -- Enforce not null and FK
  ALTER TABLE "Candidate" ALTER COLUMN "statusId" SET NOT NULL;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='Candidate' AND constraint_name='Candidate_statusId_fkey'
  ) INTO v_fk_exists;

  IF NOT v_fk_exists THEN
    ALTER TABLE "Candidate"
      ADD CONSTRAINT "Candidate_statusId_fkey"
      FOREIGN KEY ("statusId") REFERENCES "RecruitmentStage"("id") ON DELETE SET NULL;
  END IF;

  -- Drop old text column if present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Candidate' AND column_name='status' AND data_type='text'
  ) THEN
    ALTER TABLE "Candidate" DROP COLUMN "status";
  END IF;

  -- Swap
  ALTER TABLE "Candidate" RENAME COLUMN "statusId" TO "status";

  -- Index
  DROP INDEX IF EXISTS "Candidate_status_idx";
  CREATE INDEX IF NOT EXISTS "Candidate_status_idx" ON "Candidate"("status");
END
$$;
