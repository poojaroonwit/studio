-- Preview duplicate candidates by (email, positionId) without deleting anything
-- This script shows you exactly what would be removed before running the main deduplication script
-- 
-- Run this first to see what duplicates exist and what would be kept/deleted

-- 1) Show duplicate groups with counts
SELECT 
  email, 
  "positionId",
  COUNT(*) as duplicate_count,
  MIN("createdAt") as earliest_created,
  MAX("createdAt") as latest_created
FROM candidates 
WHERE "positionId" IS NOT NULL
GROUP BY email, "positionId" 
HAVING COUNT(*) > 1
ORDER BY email, "positionId";

-- 2) Show detailed view of what would be kept vs deleted for each duplicate group
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
    c."createdAt",
    c.name
  FROM candidates c
  INNER JOIN duplicate_groups dg 
    ON c.email = dg.email 
    AND c."positionId" = dg."positionId"
  ORDER BY c.email, c."positionId", c."createdAt" ASC, c.id ASC
),
duplicates AS (
  SELECT 
    c.id,
    c.email,
    c."positionId",
    c."createdAt",
    c.name,
    k.keeper_id,
    k."createdAt" as keeper_created_at,
    k.name as keeper_name,
    CASE 
      WHEN c.id = k.keeper_id THEN 'KEEP'
      ELSE 'DELETE'
    END as action
  FROM candidates c
  INNER JOIN duplicate_groups dg 
    ON c.email = dg.email 
    AND c."positionId" = dg."positionId"
  INNER JOIN keepers k 
    ON c.email = k.email 
    AND c."positionId" = k."positionId"
  ORDER BY c.email, c."positionId", c."createdAt" ASC, c.id ASC
)
SELECT 
  email,
  "positionId",
  id,
  name,
  "createdAt",
  action,
  keeper_id,
  keeper_name,
  keeper_created_at
FROM duplicates
ORDER BY email, "positionId", "createdAt" ASC, id ASC;

-- 3) Summary of what would be deleted
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
    c."positionId"
  FROM candidates c
  INNER JOIN duplicate_groups dg 
    ON c.email = dg.email 
    AND c."positionId" = dg."positionId"
  ORDER BY c.email, c."positionId", c."createdAt" ASC, c.id ASC
),
duplicates_to_delete AS (
  SELECT c.id
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
  COUNT(*) as total_duplicates_to_delete,
  COUNT(DISTINCT email) as unique_emails_affected,
  COUNT(DISTINCT "positionId") as unique_positions_affected
FROM duplicates_to_delete;

-- 4) Check for candidates with NULL positionId that might also be duplicates
SELECT 
  email,
  COUNT(*) as duplicate_count,
  MIN("createdAt") as earliest_created,
  MAX("createdAt") as latest_created
FROM candidates 
WHERE "positionId" IS NULL
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY email;
