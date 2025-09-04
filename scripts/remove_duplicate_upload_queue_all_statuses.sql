-- Script to remove duplicate upload queue entries with same file name and position
-- Processes ALL statuses: queued, inprocess, success, failed
-- Keeps the earliest uploaded entry for each (file_name, position_id) combination
-- 
-- Usage: psql "$DATABASE_URL" -f scripts/remove_duplicate_upload_queue_all_statuses.sql

BEGIN;

-- Step 1: Create backup table
CREATE TABLE IF NOT EXISTS upload_queue_backup AS 
SELECT * FROM upload_queue;

-- Step 2: Show current duplicate count by status
SELECT 
  status,
  COUNT(*) as duplicate_count
FROM (
  SELECT file_name, position_id, status, COUNT(*) as cnt
  FROM upload_queue 
  WHERE position_id IS NOT NULL
  GROUP BY file_name, position_id, status
  HAVING COUNT(*) > 1
) duplicates
GROUP BY status
ORDER BY status;

-- Step 3: Show detailed preview of what will be deleted
WITH duplicate_groups AS (
  SELECT 
    file_name, 
    position_id,
    COUNT(*) as duplicate_count
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
),
duplicates_to_delete AS (
  SELECT uq.id as duplicate_id
  FROM upload_queue uq
  INNER JOIN duplicate_groups dg 
    ON uq.file_name = dg.file_name 
    AND uq.position_id = dg.position_id
  INNER JOIN keepers k 
    ON uq.file_name = k.file_name 
    AND uq.position_id = k.position_id
  WHERE uq.id != k.keeper_id
)
SELECT 
  'Will delete ' || COUNT(*) || ' duplicate upload queue entries' as preview
FROM duplicates_to_delete;

-- Step 4: Delete duplicates
WITH duplicate_groups AS (
  SELECT 
    file_name, 
    position_id,
    COUNT(*) as duplicate_count
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
    uq.upload_date
  FROM upload_queue uq
  INNER JOIN duplicate_groups dg 
    ON uq.file_name = dg.file_name 
    AND uq.position_id = dg.position_id
  ORDER BY uq.file_name, uq.position_id, uq.upload_date ASC, uq.id ASC
),
duplicates_to_delete AS (
  SELECT uq.id as duplicate_id
  FROM upload_queue uq
  INNER JOIN duplicate_groups dg 
    ON uq.file_name = dg.file_name 
    AND uq.position_id = dg.position_id
  INNER JOIN keepers k 
    ON uq.file_name = k.file_name 
    AND uq.position_id = k.position_id
  WHERE uq.id != k.keeper_id
)
DELETE FROM upload_queue 
WHERE id IN (SELECT duplicate_id FROM duplicates_to_delete);

-- Step 5: Verify results
SELECT 
  'Remaining duplicate upload queue entries:' as status,
  COUNT(*) as remaining_count
FROM (
  SELECT file_name, position_id, COUNT(*) as cnt
  FROM upload_queue 
  WHERE position_id IS NOT NULL
  GROUP BY file_name, position_id 
  HAVING COUNT(*) > 1
) remaining_duplicates;

-- Step 6: Show final status
SELECT 
  'SUCCESS: Duplicate upload queue removal completed' as status,
  (SELECT COUNT(*) FROM upload_queue) as total_entries,
  (SELECT COUNT(*) FROM upload_queue_backup) as backup_count;

COMMIT;
