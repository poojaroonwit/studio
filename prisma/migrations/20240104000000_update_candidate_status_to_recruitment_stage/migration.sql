-- Migration: Update candidate status to reference recruitmentstage.id (idempotent)
-- This migration safely converts TEXT status to UUID FK if needed; otherwise it skips.
-- Added comprehensive safety checks to prevent conflicts

-- STEP 1: Add statusId as nullable, populate it, but don't make it required yet

DO $$
DECLARE
  v_status_type text;
  v_fk_exists boolean;
  v_applied_id uuid;
  v_statusId_exists boolean;
  v_recruitment_stage_exists boolean;
BEGIN
  -- Check if statusId column already exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Candidate' AND column_name = 'statusId'
  ) INTO v_statusId_exists;
  
  -- Check if RecruitmentStage table already exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'RecruitmentStage'
  ) INTO v_recruitment_stage_exists;
  
  -- If statusId already exists, skip this migration
  IF v_statusId_exists THEN
    RAISE NOTICE 'Candidate.statusId column already exists; skipping this migration.';
    RETURN;
  END IF;
  
  -- Check current status column type
  SELECT data_type INTO v_status_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Candidate' AND column_name = 'status';

  -- If status column doesn't exist, skip
  IF v_status_type IS NULL THEN
    RAISE NOTICE 'Candidate.status column not found; skipping this migration.';
    RETURN;
  END IF;

  -- If already UUID, skip
  IF v_status_type = 'uuid' THEN
    RAISE NOTICE 'Candidate.status already UUID; skipping.';
    RETURN;
  END IF;

  RAISE NOTICE 'Starting migration: converting TEXT status to UUID FK...';

  -- Ensure RecruitmentStage table exists with proper UUID structure
  IF NOT v_recruitment_stage_exists THEN
    CREATE TABLE "RecruitmentStage" (
      "id" UUID NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "is_system" BOOLEAN NOT NULL DEFAULT false,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "color_complete" TEXT,
      "color_badge" TEXT,
      CONSTRAINT "RecruitmentStage_pkey" PRIMARY KEY ("id")
    );
    RAISE NOTICE 'Created RecruitmentStage table';
  ELSE
    RAISE NOTICE 'RecruitmentStage table already exists';
  END IF;

  -- Create unique index on name if it doesn't exist
  CREATE UNIQUE INDEX IF NOT EXISTS "RecruitmentStage_name_key" ON "RecruitmentStage"("name");

  -- New staging column - ADD AS NULLABLE FIRST
  ALTER TABLE "Candidate" ADD COLUMN "statusId" uuid;
  RAISE NOTICE 'Added statusId column to Candidate table';

  -- Ensure default stage exists and capture id (using correct column names)
  INSERT INTO "RecruitmentStage"(id, name, description, "sort_order")
  SELECT gen_random_uuid(), 'Applied', 'Default stage', 0
  WHERE NOT EXISTS (SELECT 1 FROM "RecruitmentStage" WHERE LOWER(name)='applied');

  SELECT id INTO v_applied_id FROM "RecruitmentStage" WHERE LOWER(name)='applied' LIMIT 1;
  RAISE NOTICE 'Default stage ID: %', v_applied_id;

  -- Backfill from names (only if status column has data)
  IF EXISTS (SELECT 1 FROM "Candidate" WHERE status IS NOT NULL AND status <> '') THEN
    UPDATE "Candidate" c
    SET "statusId" = rs.id
    FROM "RecruitmentStage" rs
    WHERE c."statusId" IS NULL
      AND c.status IS NOT NULL AND c.status <> ''
      AND LOWER(rs.name) = LOWER(c.status);
    RAISE NOTICE 'Backfilled statusId from existing status values';
  END IF;

  -- Fill remaining with default
  UPDATE "Candidate"
  SET "statusId" = v_applied_id
  WHERE "statusId" IS NULL;
  RAISE NOTICE 'Set default statusId for remaining candidates';

  -- Check if foreign key constraint already exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='Candidate' AND constraint_name='Candidate_statusId_fkey'
  ) INTO v_fk_exists;

  IF NOT v_fk_exists THEN
    ALTER TABLE "Candidate"
      ADD CONSTRAINT "Candidate_statusId_fkey"
      FOREIGN KEY ("statusId") REFERENCES "RecruitmentStage"("id") ON DELETE SET NULL;
    RAISE NOTICE 'Added foreign key constraint';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists';
  END IF;

  -- Create index on the new statusId column
  CREATE INDEX IF NOT EXISTS "Candidate_statusId_idx" ON "Candidate"("statusId");
  
  RAISE NOTICE 'Migration completed successfully: statusId column added and populated. statusId is still nullable.';
  RAISE NOTICE 'Next step: Run a separate migration to make statusId NOT NULL and handle the old status column.';
END
$$;
