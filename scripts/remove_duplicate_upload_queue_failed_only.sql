-- Script to remove duplicate upload queue entries with same file name and position
-- Processes ONLY FAILED status entries
-- Keeps the earliest uploaded entry for each (file_name, position_id) combination
-- 
-- Usage: psql "$DATABASE_URL" -f scripts/remove_duplicate_upload_queue_failed_only.sql

BEGIN;

-- Step 1: Create backup table
CREATE TABLE IF NOT EXISTS upload_queue_backup AS 
SELECT * FROM upload_queue;

-- Step 2: Show current duplicate count for FAILED status only
SELECT 
  'Current duplicate FAILED upload queue entries:' as status,
  COUNT(*) as duplicate_count
FROM (
  SELECT file_name, position_id, COUNT(*) as cnt
  FROM upload_queue 
  WHERE position_id IS NOT NULL 
    AND status = 'failed'
  GROUP BY file_name, position_id 
  HAVING COUNT(*) > 1
) duplicates;

-- Step 3: Show detailed preview of what will be deleted
WITH duplicate_groups AS (
  SELECT 
    file_name, 
    position_id,
    COUNT(*) as duplicate_count
  FROM upload_queue 
  WHERE position_id IS NOT NULL 
    AND status = 'failed'
  GROUP BY file_name, position_id 
  HAVING COUNT(*) > 1
),
keepers AS (
  SELECT DISTINCT ON (uq.file_name, uq.position_id)
    uq.id as keeper_id,
    uq.file_name,
    uq.position_id,
    uq.upload_date,
    uq.status,
    uq.error
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
  'Will delete ' || COUNT(*) || ' duplicate FAILED upload queue entries' as preview
FROM duplicates_to_delete;

-- Step 4: Delete duplicates (FAILED status only)
WITH duplicate_groups AS (
  SELECT 
    file_name, 
    position_id,
    COUNT(*) as duplicate_count
  FROM upload_queue 
  WHERE position_id IS NOT NULL 
    AND status = 'failed'
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
  'Remaining duplicate FAILED upload queue entries:' as status,
  COUNT(*) as remaining_count
FROM (
  SELECT file_name, position_id, COUNT(*) as cnt
  FROM upload_queue 
  WHERE position_id IS NOT NULL 
    AND status = 'failed'
  GROUP BY file_name, position_id 
  HAVING COUNT(*) > 1
) remaining_duplicates;

-- Step 6: Show final status
SELECT 
  'SUCCESS: Duplicate FAILED upload queue removal completed' as status,
  (SELECT COUNT(*) FROM upload_queue WHERE status = 'failed') as failed_entries,
  (SELECT COUNT(*) FROM upload_queue_backup WHERE status = 'failed') as backup_failed_count;

COMMIT;
