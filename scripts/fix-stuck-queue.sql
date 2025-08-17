-- Fix Stuck Queue - SQL Script
-- Run this script directly in your PostgreSQL database

-- 1. Check current queue status
SELECT 
  status,
  COUNT(*) as count
FROM upload_queue 
GROUP BY status 
ORDER BY status;

-- 2. Check stuck jobs
SELECT 
  id,
  file_name,
  status,
  upload_date,
  process_date,
  EXTRACT(EPOCH FROM (NOW() - process_date))/3600 as hours_stuck,
  error,
  error_details
FROM upload_queue 
WHERE status = 'inprocess'
ORDER BY process_date ASC;

-- 3. Check system settings
SELECT key, value 
FROM "SystemSetting" 
WHERE key IN ('maxConcurrentProcessors', 'resumeProcessingWebhookUrl', 'resumeProcessingWebhookTimeout')
ORDER BY key;

-- 4. RESET ALL IN-PROCESS JOBS TO QUEUED STATUS
-- Uncomment the line below to execute this fix:
-- UPDATE upload_queue 
-- SET 
--   status = 'queued',
--   process_date = NULL,
--   updated_at = NOW(),
--   error = 'Reset due to queue stuck - will retry',
--   error_details = 'All jobs were reset due to queue processing issue'
-- WHERE status = 'inprocess';

-- 5. REDUCE MAX CONCURRENT PROCESSORS TO 1
-- Uncomment the lines below to execute this fix:
-- INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
-- VALUES ('maxConcurrentProcessors', '1', NOW(), NOW())
-- ON CONFLICT (key) DO UPDATE SET
--   value = '1',
--   "updatedAt" = NOW();

-- 6. Verify the fix (run after executing the updates above)
-- SELECT 
--   status,
--   COUNT(*) as count
-- FROM upload_queue 
-- GROUP BY status 
-- ORDER BY status;
