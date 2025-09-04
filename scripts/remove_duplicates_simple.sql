-- Simple script to remove duplicate candidates with same email and position
-- Keeps the earliest created candidate for each (email, positionId) combination
-- 
-- Usage: psql "$DATABASE_URL" -f scripts/remove_duplicates_simple.sql

BEGIN;

-- Create backup table
CREATE TABLE IF NOT EXISTS candidates_backup AS 
SELECT * FROM candidates;

-- Show what will be deleted (preview)
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
SELECT 
  'PREVIEW: Will delete ' || COUNT(*) || ' duplicate candidates' as message
FROM duplicates_to_delete;

-- Delete duplicate candidates
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
DELETE FROM candidates 
WHERE id IN (SELECT duplicate_id FROM duplicates_to_delete);

-- Show results
SELECT 
  'SUCCESS: Removed duplicate candidates. Remaining candidates with same email+position:' as message;

-- Verify no duplicates remain
SELECT 
  email, 
  "positionId", 
  COUNT(*) as remaining_count
FROM candidates 
WHERE "positionId" IS NOT NULL
GROUP BY email, "positionId" 
HAVING COUNT(*) > 1
ORDER BY email, "positionId";

COMMIT;

-- To restore from backup if needed:
-- INSERT INTO candidates SELECT * FROM candidates_backup;
-- DROP TABLE candidates_backup;
