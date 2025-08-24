-- Fix Process Queue Configuration
-- This script updates the system settings to allow multiple concurrent job processing

-- 1. Check current settings
SELECT 
  key, 
  value 
FROM "SystemSetting" 
WHERE key IN ('maxConcurrentProcessors', 'resumeProcessingWebhookUrl', 'resumeProcessingWebhookTimeout')
ORDER BY key;

-- 2. Update max concurrent processors to allow multiple jobs
INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
VALUES ('maxConcurrentProcessors', '5', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  value = '5',
  "updatedAt" = NOW();

-- 3. Ensure webhook timeout is reasonable (30 minutes)
INSERT INTO "SystemSetting" (key, value, "createdAt", "updatedAt")
VALUES ('resumeProcessingWebhookTimeout', '1800', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  value = '1800',
  "updatedAt" = NOW();

-- 4. Reset any stuck jobs to queued status
UPDATE upload_queue 
SET 
  status = 'queued',
  process_date = NULL,
  updated_at = NOW(),
  error = 'Reset due to configuration update',
  error_details = 'Jobs reset to allow proper concurrent processing'
WHERE status = 'inprocess';

-- 5. Verify the changes
SELECT 
  key, 
  value 
FROM "SystemSetting" 
WHERE key IN ('maxConcurrentProcessors', 'resumeProcessingWebhookUrl', 'resumeProcessingWebhookTimeout')
ORDER BY key;

-- 6. Check queue status after reset
SELECT 
  status,
  COUNT(*) as count
FROM upload_queue 
GROUP BY status 
ORDER BY status;
