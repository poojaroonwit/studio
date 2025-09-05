-- Fix Queue When No Jobs Are Processing
-- This happens when processor service is not running or not picking up jobs

-- =====================================================
-- 1. DIAGNOSTIC QUERIES
-- =====================================================

-- Check current queue status
SELECT 
    status,
    COUNT(*) as count,
    MIN(upload_date) as oldest_job,
    MAX(upload_date) as newest_job
FROM upload_queue 
GROUP BY status 
ORDER BY status;

-- Check for queued jobs that should be processing
SELECT 
    id,
    file_name,
    upload_date,
    error,
    webhook_payload->>'retry_count' as retry_count
FROM upload_queue 
WHERE status = 'queued'
ORDER BY upload_date ASC
LIMIT 10;

-- Check for failed jobs that can be retried
SELECT 
    id,
    file_name,
    error,
    upload_date,
    webhook_payload->>'retry_count' as retry_count
FROM upload_queue 
WHERE status = 'failed'
AND (
    webhook_payload->>'retry_count' IS NULL 
    OR (webhook_payload->>'retry_count')::int < 3
)
ORDER BY upload_date DESC
LIMIT 10;

-- =====================================================
-- 2. FIX INVALID FILE PATH JOBS
-- =====================================================

-- Mark jobs with invalid file paths as failed
UPDATE upload_queue 
SET 
    status = 'failed',
    error = 'Invalid file path - cannot process',
    error_details = 'File path is null, empty, or invalid',
    completed_date = NOW(),
    updated_at = NOW()
WHERE status IN ('queued', 'inprocess')
AND (file_path IS NULL OR file_path = '' OR file_path = 'null');

-- Get count of jobs marked as failed due to invalid file paths
SELECT 'Jobs marked as failed due to invalid file paths' as action, COUNT(*) as count
FROM upload_queue 
WHERE error = 'Invalid file path - cannot process'
AND updated_at > NOW() - INTERVAL '1 minute';

-- =====================================================
-- 3. RESET FAILED JOBS FOR RETRY
-- =====================================================

-- Auto-retry failed jobs that haven't exceeded retry limit
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
)
AND file_path IS NOT NULL 
AND file_path != '' 
AND file_path != 'null';

-- Get count of failed jobs auto-retried
SELECT 'Failed jobs auto-retried' as action, COUNT(*) as count
FROM upload_queue 
WHERE status = 'queued'
AND error IS NULL
AND updated_at > NOW() - INTERVAL '1 minute';

-- =====================================================
-- 4. FINAL STATUS CHECK
-- =====================================================

-- Show final queue status
SELECT 
    status,
    COUNT(*) as count,
    MIN(upload_date) as oldest_job,
    MAX(upload_date) as newest_job
FROM upload_queue 
GROUP BY status 
ORDER BY status;

-- Show summary
SELECT 
    'SUMMARY' as info,
    (SELECT COUNT(*) FROM upload_queue WHERE status = 'queued') as queued_jobs,
    (SELECT COUNT(*) FROM upload_queue WHERE status = 'inprocess') as inprocess_jobs,
    (SELECT COUNT(*) FROM upload_queue WHERE status = 'failed') as failed_jobs,
    (SELECT COUNT(*) FROM upload_queue WHERE status = 'success') as success_jobs;
