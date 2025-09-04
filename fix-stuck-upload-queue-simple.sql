-- Simple Fix for Stuck Upload Queue
-- Run this script to quickly fix the most common stuck queue issues

-- 1. Reset jobs stuck in 'inprocess' status for more than 30 minutes
UPDATE upload_queue 
SET 
    status = 'queued',
    process_date = NULL,
    updated_at = NOW(),
    error = 'Reset due to long processing time'
WHERE status = 'inprocess' 
AND process_date < NOW() - INTERVAL '30 minutes';

-- 2. Auto-retry failed jobs that haven't exceeded retry limit
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

-- 3. Reset jobs with inconsistent state (inprocess with completed_date)
UPDATE upload_queue 
SET 
    status = 'queued',
    process_date = NULL,
    updated_at = NOW(),
    error = 'Reset due to inconsistent state'
WHERE status = 'inprocess' 
AND completed_date IS NOT NULL;

-- 4. Show results
SELECT 
    status,
    COUNT(*) as count
FROM upload_queue 
GROUP BY status 
ORDER BY status;

