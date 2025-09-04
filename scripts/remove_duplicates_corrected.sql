-- Corrected script to remove duplicate candidates with same email and position
-- Based on actual Prisma schema: table name is "Candidate" (with quotes and capital C)

-- Step 1: Create backup table
CREATE TABLE IF NOT EXISTS candidates_backup AS 
SELECT * FROM "Candidate";

-- Step 2: Show current duplicate count
SELECT 
  'Current duplicate candidates:' as status,
  COUNT(*) as duplicate_count
FROM (
  SELECT email, "positionId", COUNT(*) as cnt
  FROM "Candidate" 
  WHERE "positionId" IS NOT NULL
  GROUP BY email, "positionId" 
  HAVING COUNT(*) > 1
) duplicates;

-- Step 3: Show detailed preview of what will be deleted
WITH duplicate_groups AS (
  SELECT 
    email, 
    "positionId",
    COUNT(*) as duplicate_count
  FROM "Candidate" 
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
  FROM "Candidate" c
  INNER JOIN duplicate_groups dg 
    ON c.email = dg.email 
    AND c."positionId" = dg."positionId"
  ORDER BY c.email, c."positionId", c."createdAt" ASC, c.id ASC
),
duplicates_to_delete AS (
  SELECT c.id as duplicate_id
  FROM "Candidate" c
  INNER JOIN duplicate_groups dg 
    ON c.email = dg.email 
    AND c."positionId" = dg."positionId"
  INNER JOIN keepers k 
    ON c.email = k.email 
    AND c."positionId" = k."positionId"
  WHERE c.id != k.keeper_id
)
SELECT 
  'Will delete ' || COUNT(*) || ' duplicate candidates' as preview
FROM duplicates_to_delete;

-- Step 4: Delete duplicates
WITH duplicate_groups AS (
  SELECT 
    email, 
    "positionId",
    COUNT(*) as duplicate_count
  FROM "Candidate" 
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
  FROM "Candidate" c
  INNER JOIN duplicate_groups dg 
    ON c.email = dg.email 
    AND c."positionId" = dg."positionId"
  ORDER BY c.email, c."positionId", c."createdAt" ASC, c.id ASC
),
duplicates_to_delete AS (
  SELECT c.id as duplicate_id
  FROM "Candidate" c
  INNER JOIN duplicate_groups dg 
    ON c.email = dg.email 
    AND c."positionId" = dg."positionId"
  INNER JOIN keepers k 
    ON c.email = k.email 
    AND c."positionId" = k."positionId"
  WHERE c.id != k.keeper_id
)
DELETE FROM "Candidate" 
WHERE id IN (SELECT duplicate_id FROM duplicates_to_delete);

-- Step 5: Verify results
SELECT 
  'Remaining duplicate candidates:' as status,
  COUNT(*) as remaining_count
FROM (
  SELECT email, "positionId", COUNT(*) as cnt
  FROM "Candidate" 
  WHERE "positionId" IS NOT NULL
  GROUP BY email, "positionId" 
  HAVING COUNT(*) > 1
) remaining_duplicates;

-- Step 6: Show final status
SELECT 
  'SUCCESS: Duplicate removal completed' as status,
  (SELECT COUNT(*) FROM "Candidate") as total_candidates,
  (SELECT COUNT(*) FROM candidates_backup) as backup_count;
