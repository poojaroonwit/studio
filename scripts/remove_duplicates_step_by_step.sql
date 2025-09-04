-- Step-by-step script to remove duplicate candidates
-- Run each section separately to avoid transaction issues

-- STEP 1: Create backup
CREATE TABLE IF NOT EXISTS candidates_backup AS SELECT * FROM candidates;

-- STEP 2: Check for duplicates
SELECT email, "positionId", COUNT(*) as count 
FROM candidates 
WHERE "positionId" IS NOT NULL
GROUP BY email, "positionId" 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- STEP 3: Delete duplicates (run this only after checking step 2)
DELETE FROM candidates 
WHERE id NOT IN (
  SELECT DISTINCT ON (email, "positionId") id
  FROM candidates 
  WHERE "positionId" IS NOT NULL
  ORDER BY email, "positionId", "createdAt" ASC, id ASC
)
AND "positionId" IS NOT NULL
AND (email, "positionId") IN (
  SELECT email, "positionId" 
  FROM candidates 
  WHERE "positionId" IS NOT NULL
  GROUP BY email, "positionId" 
  HAVING COUNT(*) > 1
);

-- STEP 4: Verify no duplicates remain
SELECT email, "positionId", COUNT(*) as count 
FROM candidates 
WHERE "positionId" IS NOT NULL
GROUP BY email, "positionId" 
HAVING COUNT(*) > 1;
