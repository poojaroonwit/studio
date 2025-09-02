-- De-duplicate candidates by (email, position_id), keeping the earliest created
-- Assumptions:
--   - Table candidates(id PK, email TEXT/VARCHAR, created_at TIMESTAMP/TIMESTAMPTZ)
--   - Table applications(id PK, candidate_id FK -> candidates.id, position_id, created_at TIMESTAMP/TIMESTAMPTZ)
-- Behavior:
--   1) For each (email, position_id) group, keep the candidate with the earliest created_at (ties by lowest id)
--   2) Reassign applications of duplicate candidates for that position to the keeper candidate
--   3) Remove exact duplicate application rows created by reassignment (keep earliest by created_at then id)
--   4) Delete candidate rows that have no remaining applications
--
-- Safety:
--   - All operations are within a single transaction
--   - This script aims to be idempotent

BEGIN;

-- Optional: quick visibility into affected groups
-- SELECT email, position_id, COUNT(DISTINCT candidate_id) AS candidate_count
-- FROM (
--   SELECT c.id AS candidate_id, c.email, a.position_id
--   FROM candidates c
--   JOIN applications a ON a.candidate_id = c.id
-- ) s
-- GROUP BY email, position_id
-- HAVING COUNT(DISTINCT candidate_id) > 1
-- ORDER BY email, position_id;

-- 1) Identify the keeper candidate per (email, position_id)
WITH candidate_apps AS (
  SELECT
    c.id AS candidate_id,
    c.email,
    a.position_id,
    COALESCE(c.created_at, a.created_at) AS basis_created_at
  FROM candidates c
  JOIN applications a ON a.candidate_id = c.id
),
keepers AS (
  SELECT DISTINCT ON (email, position_id)
    email,
    position_id,
    candidate_id AS keeper_candidate_id
  FROM candidate_apps
  ORDER BY email, position_id, basis_created_at ASC, candidate_id ASC
),
dupes AS (
  SELECT
    ca.candidate_id,
    ca.email,
    ca.position_id,
    k.keeper_candidate_id
  FROM candidate_apps ca
  JOIN keepers k USING (email, position_id)
  WHERE ca.candidate_id <> k.keeper_candidate_id
),
-- 2) Reassign applications on duplicated candidates to the keeper for that same position
updated_apps AS (
  UPDATE applications a
  SET candidate_id = d.keeper_candidate_id
  FROM dupes d
  WHERE a.candidate_id = d.candidate_id
    AND a.position_id = d.position_id
  RETURNING a.id
),
-- 3) Remove exact duplicate application rows that may now exist per (candidate_id, position_id)
app_dupes AS (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY candidate_id, position_id
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM applications
  ) t
  WHERE t.rn > 1
),
deleted_app_dupes AS (
  DELETE FROM applications a
  USING app_dupes d
  WHERE a.id = d.id
  RETURNING a.id
),
-- 4) Delete candidate rows that have no remaining applications
candidates_without_apps AS (
  SELECT c.id AS candidate_id
  FROM candidates c
  LEFT JOIN applications a ON a.candidate_id = c.id
  WHERE a.id IS NULL
)
DELETE FROM candidates c
USING candidates_without_apps z
WHERE c.id = z.candidate_id;

COMMIT;

-- To run:
--   psql "$DATABASE_URL" -f scripts/dedupe_candidates_by_email_position.sql
-- or
--   psql -h <host> -U <user> -d <db> -f scripts/dedupe_candidates_by_email_position.sql


