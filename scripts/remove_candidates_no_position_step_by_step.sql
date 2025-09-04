-- Step-by-step script to remove duplicate candidates with same email but NO position
-- Run each section separately to avoid transaction issues

-- STEP 1: Create backup
CREATE TABLE IF NOT EXISTS candidates_backup AS SELECT * FROM "Candidate";

-- STEP 2: Check for duplicates with no position
SELECT email, COUNT(*) as count, 
       MIN("createdAt") as earliest_created,
       MAX("createdAt") as latest_created
FROM "Candidate" 
WHERE "positionId" IS NULL
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- STEP 3: Show what will be kept vs deleted
WITH email_only_duplicates AS (
  SELECT email, COUNT(*) as cnt
  FROM "Candidate" 
  WHERE "positionId" IS NULL
  GROUP BY email 
  HAVING COUNT(*) > 1
),
keepers AS (
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
  END as action
FROM "Candidate" c
INNER JOIN email_only_duplicates ed 
  ON c.email = ed.email
INNER JOIN keepers k 
  ON c.email = k.email
WHERE c."positionId" IS NULL
ORDER BY c.email, c."createdAt" ASC;

-- STEP 4: Delete duplicates (run this only after checking step 3)
DELETE FROM "Candidate" 
WHERE id NOT IN (
  SELECT DISTINCT ON (email) id
  FROM "Candidate" 
  WHERE "positionId" IS NULL
  ORDER BY email, "createdAt" ASC, id ASC
)
AND "positionId" IS NULL
AND email IN (
  SELECT email 
  FROM "Candidate" 
  WHERE "positionId" IS NULL
  GROUP BY email 
  HAVING COUNT(*) > 1
);

-- STEP 5: Verify no duplicates remain
SELECT email, COUNT(*) as count 
FROM "Candidate" 
WHERE "positionId" IS NULL
GROUP BY email 
HAVING COUNT(*) > 1;
