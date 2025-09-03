-- Remove duplicate candidates by (email, positionId), keeping the earliest created
-- This script works with the current schema where candidates have a direct positionId field
-- 
-- Behavior:
--   1) For each (email, positionId) group, keep the candidate with the earliest created_at (ties by lowest id)
--   2) Delete duplicate candidates, keeping only the earliest one per email+position combination
--   3) Handle related data appropriately (comments, attachments, etc.)
--
-- Safety:
--   - All operations are within a single transaction
--   - This script aims to be idempotent
--   - Creates a backup of candidates before deletion

BEGIN;

-- Create a backup table of candidates before making changes
CREATE TABLE IF NOT EXISTS candidates_backup AS 
SELECT * FROM candidates;

-- Optional: View the duplicate groups before processing
-- SELECT email, "positionId", COUNT(*) as duplicate_count
-- FROM candidates 
-- WHERE "positionId" IS NOT NULL
-- GROUP BY email, "positionId" 
-- HAVING COUNT(*) > 1
-- ORDER BY email, "positionId";

-- 1) Identify the keeper candidate per (email, positionId) - keep the earliest created
WITH duplicate_groups AS (
  SELECT 
    email, 
    "positionId",
    COUNT(*) as duplicate_count
  FROM candidates 
  WHERE "positionId" IS NOT NULL
  GROUP BY email, "positionId" 
  HAVING COUNT(*) > 1
),
keepers AS (
  SELECT DISTINCT ON (c.email, c."positionId")
    c.id as keeper_id,
    c.email,
    c."positionId",
    c."createdAt"
  FROM candidates c
  INNER JOIN duplicate_groups dg 
    ON c.email = dg.email 
    AND c."positionId" = dg."positionId"
  ORDER BY c.email, c."positionId", c."createdAt" ASC, c.id ASC
),
duplicates_to_delete AS (
  SELECT c.id as duplicate_id
  FROM candidates c
  INNER JOIN duplicate_groups dg 
    ON c.email = dg.email 
    AND c."positionId" = dg."positionId"
  INNER JOIN keepers k 
    ON c.email = k.email 
    AND c."positionId" = k."positionId"
  WHERE c.id != k.keeper_id
)

-- 2) Delete duplicate candidates (this will cascade to related records)
DELETE FROM candidates 
WHERE id IN (SELECT duplicate_id FROM duplicates_to_delete);

-- 3) Clean up candidates with NULL positionId that might be duplicates by email only
-- (Optional: uncomment if you want to also dedupe candidates without position)
/*
WITH email_only_duplicates AS (
  SELECT 
    email,
    COUNT(*) as duplicate_count
  FROM candidates 
  WHERE "positionId" IS NULL
  GROUP BY email 
  HAVING COUNT(*) > 1
),
email_keepers AS (
  SELECT DISTINCT ON (c.email)
    c.id as keeper_id,
    c.email,
    c."createdAt"
  FROM candidates c
  INNER JOIN email_only_duplicates ed 
    ON c.email = ed.email
  WHERE c."positionId" IS NULL
  ORDER BY c.email, c."createdAt" ASC, c.id ASC
),
email_duplicates_to_delete AS (
  SELECT c.id as duplicate_id
  FROM candidates c
  INNER JOIN email_only_duplicates ed 
    ON c.email = ed.email
  INNER JOIN email_keepers ek 
    ON c.email = ek.email
  WHERE c.id != ek.keeper_id 
    AND c."positionId" IS NULL
)

DELETE FROM candidates 
WHERE id IN (SELECT duplicate_id FROM email_duplicates_to_delete);
*/

-- 4) Verify the results
-- SELECT 
--   email, 
--   "positionId", 
--   COUNT(*) as remaining_count
-- FROM candidates 
-- GROUP BY email, "positionId" 
-- HAVING COUNT(*) > 1
-- ORDER BY email, "positionId";

COMMIT;

-- To run this script:
--   psql "$DATABASE_URL" -f scripts/remove_duplicate_candidates.sql
-- or
--   psql -h <host> -U <user> -d <db> -f scripts/remove_duplicate_candidates.sql
--
-- To restore from backup if needed:
--   INSERT INTO candidates SELECT * FROM candidates_backup;
--   DROP TABLE candidates_backup;
