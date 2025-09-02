-- Migration: Fix Stage Mismatches Between UI and Database (idempotent)
-- This script standardizes candidate status values when the column was TEXT.
-- If the schema already uses UUIDs referencing RecruitmentStage(id), the script will no-op.

DO $$
DECLARE
  status_data_type text;
BEGIN
  SELECT data_type INTO status_data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'Candidate' AND column_name = 'status';

  -- When status is TEXT, perform normalization against raw values
  IF status_data_type = 'text' THEN
    -- First, let's see what statuses currently exist in the database
    RAISE NOTICE 'Normalizing Candidate.status TEXT values…';
    -- Create a temporary table to map old statuses to new standardized ones
    CREATE TEMP TABLE status_mapping (
        old_status TEXT,
        new_status TEXT,
        reason TEXT
    ) ON COMMIT DROP;

    -- Insert the mapping based on common patterns
    INSERT INTO status_mapping (old_status, new_status, reason) VALUES
    ('applied', 'Applied', 'Standardize to title case'),
    ('APPLIED', 'Applied', 'Standardize to title case'),
    ('screening', 'Screening', 'Standardize to title case'),
    ('SCREENING', 'Screening', 'Standardize to title case'),
    ('shortlisted', 'Shortlisted', 'Standardize to title case'),
    ('SHORTLISTED', 'Shortlisted', 'Standardize to title case'),
    ('interview scheduled', 'Interview Scheduled', 'Standardize to title case'),
    ('interview_scheduled', 'Interview Scheduled', 'Standardize to title case'),
    ('interviewing', 'Interviewing', 'Standardize to title case'),
    ('INTERVIEWING', 'Interviewing', 'Standardize to title case'),
    ('offer sent', 'Offer Sent', 'Standardize to title case'),
    ('offer_sent', 'Offer Sent', 'Standardize to title case'),
    ('offer accepted', 'Offer Accepted', 'Standardize to title case'),
    ('offer_accepted', 'Offer Accepted', 'Standardize to title case'),
    ('hired', 'Hired', 'Standardize to title case'),
    ('HIRED', 'Hired', 'Standardize to title case'),
    ('rejected', 'Rejected', 'Standardize to title case'),
    ('REJECTED', 'Rejected', 'Standardize to title case'),
    ('withdrawn', 'Withdrawn', 'Standardize to title case'),
    ('WITHDRAWN', 'Withdrawn', 'Standardize to title case'),
    ('pending', 'Pending', 'Standardize to title case'),
    ('PENDING', 'Pending', 'Standardize to title case'),
    ('new', 'New', 'Standardize to title case'),
    ('NEW', 'New', 'Standardize to title case'),
    ('active', 'Active', 'Standardize to title case'),
    ('ACTIVE', 'Active', 'Standardize to title case');

    -- Update the candidate statuses to standardized values
    UPDATE "Candidate" 
    SET status = sm.new_status
    FROM status_mapping sm
    WHERE LOWER("Candidate".status) = LOWER(sm.old_status)
    AND ("Candidate".status IS DISTINCT FROM sm.new_status);

    -- Ensure recruitment stages exist for any standardized statuses
    INSERT INTO "RecruitmentStage" (id, name, description, "sort_order", color_complete, color_badge)
    SELECT 
      gen_random_uuid(),
      status,
      'Stage for ' || status,
      ROW_NUMBER() OVER (ORDER BY status),
      NULL,
      NULL
    FROM (
      SELECT DISTINCT status FROM "Candidate" WHERE status IS NOT NULL AND status <> ''
    ) s
    WHERE NOT EXISTS (
      SELECT 1 FROM "RecruitmentStage" rs WHERE rs.name = s.status
    )
    ON CONFLICT (name) DO NOTHING;

    RAISE NOTICE 'Candidate.status normalization complete.';
  ELSE
    -- When status is UUID, this migration is not needed
    RAISE NOTICE 'Candidate.status is UUID; skipping status text normalization.';
  END IF;
END$$;

-- End guarded block
