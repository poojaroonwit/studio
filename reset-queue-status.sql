-- Reset Upload Queue Status - When No Jobs Are Processing
-- This script resets all stuck and problematic jobs in the upload queue

-- =====================================================
-- 1. DIAGNOSTIC - Check current queue status first
-- =====================================================

-- Check overall queue status
SELECT 
    status,
    COUNT(*) as count,
    MIN(upload_date) as oldest_job,
    MAX(upload_date) as newest_job
FROM upload_queue 
GROUP BY status 
ORDER BY status;

-- Check for any inprocess jobs (should be 0 if queue is stuck)
SELECT 
    id,
    file_name,
    status,
    process_date,
    upload_date,
    EXTRACT(EPOCH FROM (NOW() - process_date))/60 as minutes_stuck,
    error
FROM upload_queue 
WHERE status = 'inprocess'
ORDER BY process_date ASC;

-- =====================================================
-- 2. RESET ALL STUCK JOBS
-- =====================================================

-- Reset jobs stuck in 'inprocess' status (any duration)
UPDATE upload_queue 
SET 
    status = 'queued',
    process_date = NULL,
    updated_at = NOW(),
    error = 'Reset due to stuck processing'
WHERE status = 'inprocess';

-- Get count of jobs reset from inprocess
SELECT 'Jobs reset from inprocess' as action, COUNT(*) as count
FROM upload_queue 
WHERE error = 'Reset due to stuck processing'
AND updated_at > NOW() - INTERVAL '1 minute';

-- =====================================================
-- 3. RESET FAILED JOBS (Auto-retry)
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
);

-- Get count of failed jobs auto-retried
SELECT 'Failed jobs auto-retried' as action, COUNT(*) as count
FROM upload_queue 
WHERE status = 'queued'
AND error IS NULL
AND updated_at > NOW() - INTERVAL '1 minute';

-- =====================================================
-- 4. RESET INCONSISTENT STATE JOBS
-- =====================================================

-- Reset jobs with inconsistent state (inprocess with completed_date)
UPDATE upload_queue 
SET 
    status = 'queued',
    process_date = NULL,
    updated_at = NOW(),
    error = 'Reset due to inconsistent state'
WHERE status = 'inprocess' 
AND completed_date IS NOT NULL;

-- Get count of inconsistent jobs reset
SELECT 'Inconsistent jobs reset' as action, COUNT(*) as count
FROM upload_queue 
WHERE error = 'Reset due to inconsistent state'
AND updated_at > NOW() - INTERVAL '1 minute';

-- =====================================================
-- 5. FINAL STATUS CHECK
-- =====================================================

-- Show final queue status after reset
SELECT 
    status,
    COUNT(*) as count,
    MIN(upload_date) as oldest_job,
    MAX(upload_date) as newest_job
FROM upload_queue 
GROUP BY status 
ORDER BY status;

-- Show summary of reset actions
SELECT 
    'SUMMARY' as info,
    (SELECT COUNT(*) FROM upload_queue WHERE status = 'queued') as queued_jobs,
    (SELECT COUNT(*) FROM upload_queue WHERE status = 'inprocess') as inprocess_jobs,
    (SELECT COUNT(*) FROM upload_queue WHERE status = 'failed') as failed_jobs,
    (SELECT COUNT(*) FROM upload_queue WHERE status = 'success') as success_jobs;
