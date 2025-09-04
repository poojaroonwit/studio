-- Quick script to remove duplicate upload queue entries with same file name and position
-- Keeps the earliest uploaded entry

-- Simple one-liner to remove duplicates
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

-- Verify no duplicates remain
SELECT file_name, position_id, COUNT(*) as count 
FROM upload_queue 
WHERE position_id IS NOT NULL
GROUP BY file_name, position_id 
HAVING COUNT(*) > 1;
