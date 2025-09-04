-- Step-by-step script to remove duplicate upload queue entries
-- Run each section separately to avoid transaction issues

-- STEP 1: Create backup
CREATE TABLE IF NOT EXISTS upload_queue_backup AS SELECT * FROM upload_queue;

-- STEP 2: Check for duplicates
SELECT file_name, position_id, COUNT(*) as count, 
       MIN(upload_date) as earliest_upload,
       MAX(upload_date) as latest_upload
FROM upload_queue 
WHERE position_id IS NOT NULL
GROUP BY file_name, position_id 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- STEP 3: Show what will be kept vs deleted
WITH duplicate_groups AS (
  SELECT file_name, position_id, COUNT(*) as cnt
  FROM upload_queue 
  WHERE position_id IS NOT NULL
  GROUP BY file_name, position_id 
  HAVING COUNT(*) > 1
),
keepers AS (
  SELECT DISTINCT ON (uq.file_name, uq.position_id)
    uq.id as keeper_id,
    uq.file_name,
    uq.position_id,
    uq.upload_date,
    uq.status
  FROM upload_queue uq
  INNER JOIN duplicate_groups dg 
    ON uq.file_name = dg.file_name 
    AND uq.position_id = dg.position_id
  ORDER BY uq.file_name, uq.position_id, uq.upload_date ASC, uq.id ASC
)
SELECT 
  uq.id,
  uq.file_name,
  uq.position_id,
  uq.upload_date,
  uq.status,
  CASE 
    WHEN uq.id = k.keeper_id THEN 'KEEP'
    ELSE 'DELETE'
  END as action
FROM upload_queue uq
INNER JOIN duplicate_groups dg 
  ON uq.file_name = dg.file_name 
  AND uq.position_id = dg.position_id
INNER JOIN keepers k 
  ON uq.file_name = k.file_name 
  AND uq.position_id = k.position_id
ORDER BY uq.file_name, uq.position_id, uq.upload_date ASC;

-- STEP 4: Delete duplicates (run this only after checking step 3)
DELETE FROM upload_queue 
WHERE id NOT IN (
  SELECT DISTINCT ON (file_name, position_id) id
  FROM upload_queue 
  WHERE position_id IS NOT NULL
  ORDER BY file_name, position_id, upload_date ASC, id ASC
)
AND position_id IS NOT NULL
AND (file_name, position_id) IN (
  SELECT file_name, position_id 
  FROM upload_queue 
  WHERE position_id IS NOT NULL
  GROUP BY file_name, position_id 
  HAVING COUNT(*) > 1
);

-- STEP 5: Verify no duplicates remain
SELECT file_name, position_id, COUNT(*) as count 
FROM upload_queue 
WHERE position_id IS NOT NULL
GROUP BY file_name, position_id 
HAVING COUNT(*) > 1;
