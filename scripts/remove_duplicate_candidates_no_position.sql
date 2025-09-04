-- Script to remove duplicate candidates with same email but NO position assigned
-- Keeps the earliest created candidate for each email (where positionId IS NULL)
-- 
-- Usage: psql "$DATABASE_URL" -f scripts/remove_duplicate_candidates_no_position.sql

BEGIN;

-- Step 1: Create backup table
CREATE TABLE IF NOT EXISTS candidates_backup AS 
SELECT * FROM "Candidate";

-- Step 2: Show current duplicate count for candidates with no position
SELECT 
  'Current duplicate candidates with no position (same email):' as status,
  COUNT(*) as duplicate_count
FROM (
  SELECT email, COUNT(*) as cnt
  FROM "Candidate" 
  WHERE "positionId" IS NULL
  GROUP BY email 
  HAVING COUNT(*) > 1
) duplicates;

-- Step 3: Show detailed preview of what will be deleted
WITH email_only_duplicates AS (
  SELECT 
    email,
    COUNT(*) as duplicate_count
  FROM "Candidate" 
  WHERE "positionId" IS NULL
  GROUP BY email 
  HAVING COUNT(*) > 1
),
email_keepers AS (
  SELECT DISTINCT ON (c.email)
    c.id as keeper_id,
    c.email,
    c."createdAt",
    c.name
  FROM "Candidate" c
  INNER JOIN email_only_duplicates ed 
    ON c.email = ed.email
  WHERE c."positionId" IS NULL
  ORDER BY c.email, c."createdAt" ASC, c.id ASC
),
duplicates_to_delete AS (
  SELECT c.id as duplicate_id
  FROM "Candidate" c
  INNER JOIN email_only_duplicates ed 
    ON c.email = ed.email
  INNER JOIN email_keepers ek 
    ON c.email = ek.email
  WHERE c.id != ek.keeper_id 
    AND c."positionId" IS NULL
)
SELECT 
  'Will delete ' || COUNT(*) || ' duplicate candidates with no position' as preview
FROM duplicates_to_delete;

-- Step 4: Show detailed view of what will be kept vs deleted
WITH email_only_duplicates AS (
  SELECT 
    email,
    COUNT(*) as duplicate_count
  FROM "Candidate" 
  WHERE "positionId" IS NULL
  GROUP BY email 
  HAVING COUNT(*) > 1
),
email_keepers AS (
  SELECT DISTINCT ON (c.email)
    c.id as keeper_id,
    c.email,
    c."createdAt",
    c.name
  FROM "Candidate" c
  INNER JOIN email_only_duplicates ed 
    ON c.email = ed.email
  WHERE c."positionId" IS NULL
  ORDER BY c.email, c."createdAt" ASC, c.id ASC
)
SELECT 
  c.id,
  c.email,
  c.name,
  c."createdAt",
  CASE 
    WHEN c.id = k.keeper_id THEN 'KEEP'
    ELSE 'DELETE'
  END as action,
  k.keeper_id,
  k.name as keeper_name,
  k."createdAt" as keeper_created_at
FROM "Candidate" c
INNER JOIN email_only_duplicates ed 
  ON c.email = ed.email
INNER JOIN email_keepers k 
  ON c.email = k.email
WHERE c."positionId" IS NULL
ORDER BY c.email, c."createdAt" ASC, c.id ASC;

-- Step 5: Delete duplicates (candidates with no position only)
WITH email_only_duplicates AS (
  SELECT 
    email,
    COUNT(*) as duplicate_count
  FROM "Candidate" 
  WHERE "positionId" IS NULL
  GROUP BY email 
  HAVING COUNT(*) > 1
),
email_keepers AS (
  SELECT DISTINCT ON (c.email)
    c.id as keeper_id,
    c.email,
    c."createdAt"
  FROM "Candidate" c
  INNER JOIN email_only_duplicates ed 
    ON c.email = ed.email
  WHERE c."positionId" IS NULL
  ORDER BY c.email, c."createdAt" ASC, c.id ASC
),
duplicates_to_delete AS (
  SELECT c.id as duplicate_id
  FROM "Candidate" c
  INNER JOIN email_only_duplicates ed 
    ON c.email = ed.email
  INNER JOIN email_keepers ek 
    ON c.email = ek.email
  WHERE c.id != ek.keeper_id 
    AND c."positionId" IS NULL
)
DELETE FROM "Candidate" 
WHERE id IN (SELECT duplicate_id FROM duplicates_to_delete);

-- Step 6: Verify results
SELECT 
  'Remaining duplicate candidates with no position:' as status,
  COUNT(*) as remaining_count
FROM (
  SELECT email, COUNT(*) as cnt
  FROM "Candidate" 
  WHERE "positionId" IS NULL
  GROUP BY email 
  HAVING COUNT(*) > 1
) remaining_duplicates;

-- Step 7: Show final status
SELECT 
  'SUCCESS: Duplicate candidates with no position removal completed' as status,
  (SELECT COUNT(*) FROM "Candidate") as total_candidates,
  (SELECT COUNT(*) FROM "Candidate" WHERE "positionId" IS NULL) as candidates_with_no_position,
  (SELECT COUNT(*) FROM candidates_backup) as backup_count;

COMMIT;

-- To restore from backup if needed:
-- INSERT INTO "Candidate" SELECT * FROM candidates_backup;
-- DROP TABLE candidates_backup;
