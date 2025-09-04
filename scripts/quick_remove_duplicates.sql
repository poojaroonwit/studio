-- Quick script to remove duplicate candidates with same email and position
-- Run this directly in your database

BEGIN;

-- Delete duplicates, keeping the earliest created candidate
WITH duplicate_groups AS (
  SELECT 
    email, 
    "positionId"
  FROM candidates 
  WHERE "positionId" IS NOT NULL
  GROUP BY email, "positionId" 
  HAVING COUNT(*) > 1
),
keepers AS (
  SELECT DISTINCT ON (c.email, c."positionId")
    c.id as keeper_id
  FROM candidates c
  INNER JOIN duplicate_groups dg 
    ON c.email = dg.email 
    AND c."positionId" = dg."positionId"
  ORDER BY c.email, c."positionId", c."createdAt" ASC, c.id ASC
)
DELETE FROM candidates 
WHERE id NOT IN (SELECT keeper_id FROM keepers)
  AND "positionId" IS NOT NULL
  AND (email, "positionId") IN (
    SELECT email, "positionId" 
    FROM candidates 
    WHERE "positionId" IS NOT NULL
    GROUP BY email, "positionId" 
    HAVING COUNT(*) > 1
  );

COMMIT;
