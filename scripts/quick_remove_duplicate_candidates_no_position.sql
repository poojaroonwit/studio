-- Quick script to remove duplicate candidates with same email but NO position assigned
-- Keeps the earliest created candidate for each email (where positionId IS NULL)

-- Simple one-liner to remove duplicates with no position
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

-- Verify no duplicates remain
SELECT email, COUNT(*) as count 
FROM "Candidate" 
WHERE "positionId" IS NULL
GROUP BY email 
HAVING COUNT(*) > 1;
