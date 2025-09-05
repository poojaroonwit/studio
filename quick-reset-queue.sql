-- Quick Reset Upload Queue - Simple Version
-- Use this when you know there are no inprocess jobs working

-- 1. Reset ALL inprocess jobs to queued (force reset)
UPDATE upload_queue 
SET 
    status = 'queued',
    process_date = NULL,
    updated_at = NOW(),
    error = 'Force reset - no jobs processing'
WHERE status = 'inprocess';

-- 2. Auto-retry failed jobs (up to 3 retries)
UPDATE upload_queue 
SET 
    status = 'queued',
    process_date = NULL,
    updated_at = NOW(),
    error = NULL,
    error_details = NULL,
    completed_date = NULL
WHERE status = 'failed' 
AND (
    webhook_payload->>'retry_count' IS NULL 
    OR (webhook_payload->>'retry_count')::int < 3
);

-- 3. Show results
SELECT 
    status,
    COUNT(*) as count
FROM upload_queue 
GROUP BY status 
ORDER BY status;
