-- Fix inconsistent stage values in TransitionRecord
-- Update records where stage matches a RecruitmentStage name (case-insensitive) but is not a UUID

UPDATE "TransitionRecord"
SET stage = rs.id::text
FROM "RecruitmentStage" rs
WHERE lower("TransitionRecord".stage) = lower(rs.name)
  AND "TransitionRecord".stage !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Fallback for 'Applied' specific check if simple join missed it
UPDATE "TransitionRecord"
SET stage = (SELECT id::text FROM "RecruitmentStage" WHERE name ILIKE 'Applied' LIMIT 1)
WHERE stage ILIKE 'Applied'
  AND stage !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
