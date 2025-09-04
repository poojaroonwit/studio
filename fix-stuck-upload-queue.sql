-- Fix Stuck Upload Queue Script
-- This script addresses various stuck queue scenarios and resets them for reprocessing

-- =====================================================
-- 1. DIAGNOSTIC QUERIES - Check current queue status
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

-- Check stuck jobs in 'inprocess' status for too long (more than 30 minutes)
SELECT 
    id,
    file_name,
    status,
    process_date,
    upload_date,
    EXTRACT(EPOCH FROM (NOW() - process_date))/60 as minutes_stuck,
    error,
    webhook_payload->>'retry_count' as retry_count
FROM upload_queue 
WHERE status = 'inprocess' 
AND process_date < NOW() - INTERVAL '30 minutes'
ORDER BY process_date ASC;

-- Check failed jobs that can be retried
SELECT 
    id,
    file_name,
    status,
    error,
    webhook_payload->>'retry_count' as retry_count,
    completed_date,
    upload_date
FROM upload_queue 
WHERE status = 'failed' 
AND (
    webhook_payload->>'retry_count' IS NULL 
    OR (webhook_payload->>'retry_count')::int < 3
)
ORDER BY upload_date ASC;

-- =====================================================
-- 2. FIX STUCK JOBS - Reset jobs that are stuck
-- =====================================================

-- Fix 1: Reset jobs stuck in 'inprocess' status for more than 30 minutes
UPDATE upload_queue 
SET 
    status = 'queued',
    process_date = NULL,
    updated_at = NOW(),
    error = 'Reset due to long processing time (stuck for >30 minutes)',
    error_details = CONCAT('Original error: ', COALESCE(error, 'None'), ' | Reset at: ', NOW())
WHERE status = 'inprocess' 
AND process_date < NOW() - INTERVAL '30 minutes';

-- Get count of jobs reset due to long processing
SELECT 'Jobs reset due to long processing' as action, COUNT(*) as count
FROM upload_queue 
WHERE error LIKE '%Reset due to long processing time%'
AND updated_at > NOW() - INTERVAL '1 minute';

-- Fix 2: Reset jobs that have been in 'inprocess' but have completed_date (inconsistent state)
UPDATE upload_queue 
SET 
    status = 'queued',
    process_date = NULL,
    updated_at = NOW(),
    error = 'Reset due to inconsistent state (inprocess with completed_date)',
    error_details = CONCAT('Original error: ', COALESCE(error, 'None'), ' | Reset at: ', NOW())
WHERE status = 'inprocess' 
AND completed_date IS NOT NULL;

-- Get count of jobs reset due to inconsistent state
SELECT 'Jobs reset due to inconsistent state' as action, COUNT(*) as count
FROM upload_queue 
WHERE error LIKE '%Reset due to inconsistent state%'
AND updated_at > NOW() - INTERVAL '1 minute';

-- Fix 3: Auto-retry failed jobs that haven't exceeded retry limit
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
AND (
    completed_date IS NULL
    OR completed_date < NOW() - INTERVAL '5 minutes'
);

-- Get count of failed jobs auto-retried
SELECT 'Failed jobs auto-retried' as action, COUNT(*) as count
FROM upload_queue 
WHERE status = 'queued'
AND error IS NULL
AND updated_at > NOW() - INTERVAL '1 minute';

-- Fix 4: Reset jobs with invalid file paths that are stuck
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

-- Fix 5: Clean up duplicate jobs with same file_path and status
-- Keep the oldest job and mark others as failed
WITH duplicates AS (
    SELECT 
        id,
        file_path,
        status,
        upload_date,
        ROW_NUMBER() OVER (PARTITION BY file_path, status ORDER BY upload_date ASC) as rn
    FROM upload_queue 
    WHERE file_path IS NOT NULL 
    AND file_path != ''
    AND status IN ('queued', 'inprocess')
)
UPDATE upload_queue 
SET 
    status = 'failed',
    error = 'Duplicate job - keeping oldest version',
    error_details = 'This job was marked as failed because a duplicate with the same file path exists',
    completed_date = NOW(),
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Get count of duplicate jobs cleaned up
SELECT 'Duplicate jobs cleaned up' as action, COUNT(*) as count
FROM upload_queue 
WHERE error = 'Duplicate job - keeping oldest version'
AND updated_at > NOW() - INTERVAL '1 minute';

-- =====================================================
-- 3. VERIFICATION QUERIES - Check results after fixes
-- =====================================================

-- Check queue status after fixes
SELECT 
    status,
    COUNT(*) as count,
    MIN(upload_date) as oldest_job,
    MAX(upload_date) as newest_job
FROM upload_queue 
GROUP BY status 
ORDER BY status;

-- Check for any remaining stuck jobs
SELECT 
    id,
    file_name,
    status,
    process_date,
    EXTRACT(EPOCH FROM (NOW() - process_date))/60 as minutes_stuck,
    error
FROM upload_queue 
WHERE status = 'inprocess' 
AND process_date < NOW() - INTERVAL '10 minutes'
ORDER BY process_date ASC;

-- Check jobs ready for processing
SELECT 
    COUNT(*) as queued_jobs,
    MIN(upload_date) as oldest_queued_job,
    MAX(upload_date) as newest_queued_job
FROM upload_queue 
WHERE status = 'queued';

-- =====================================================
-- 4. OPTIONAL: AGGRESSIVE CLEANUP (Use with caution)
-- =====================================================

-- Uncomment these sections if you need more aggressive cleanup:

-- Clean up very old failed jobs (older than 7 days)
-- DELETE FROM upload_queue 
-- WHERE status = 'failed' 
-- AND upload_date < NOW() - INTERVAL '7 days'
-- AND (webhook_payload->>'retry_count')::int >= 3;

-- Clean up very old successful jobs (older than 30 days)
-- DELETE FROM upload_queue 
-- WHERE status = 'success' 
-- AND completed_date < NOW() - INTERVAL '30 days';

-- =====================================================
-- 5. SUMMARY REPORT
-- =====================================================

-- Final summary
SELECT 
    'SUMMARY' as report_type,
    (SELECT COUNT(*) FROM upload_queue WHERE status = 'queued') as queued_jobs,
    (SELECT COUNT(*) FROM upload_queue WHERE status = 'inprocess') as inprocess_jobs,
    (SELECT COUNT(*) FROM upload_queue WHERE status = 'failed') as failed_jobs,
    (SELECT COUNT(*) FROM upload_queue WHERE status = 'success') as success_jobs,
    (SELECT COUNT(*) FROM upload_queue WHERE status = 'inprocess' AND process_date < NOW() - INTERVAL '10 minutes') as potentially_stuck_jobs;

-- Show recent activity (last 10 minutes)
SELECT 
    'RECENT_ACTIVITY' as report_type,
    COUNT(*) as total_updated,
    SUM(CASE WHEN error LIKE '%Reset due to long processing time%' THEN 1 ELSE 0 END) as reset_long_processing,
    SUM(CASE WHEN error LIKE '%Reset due to inconsistent state%' THEN 1 ELSE 0 END) as reset_inconsistent,
    SUM(CASE WHEN status = 'queued' AND error IS NULL AND updated_at > NOW() - INTERVAL '1 minute' THEN 1 ELSE 0 END) as auto_retried,
    SUM(CASE WHEN error = 'Invalid file path - cannot process' THEN 1 ELSE 0 END) as invalid_file_paths,
    SUM(CASE WHEN error = 'Duplicate job - keeping oldest version' THEN 1 ELSE 0 END) as duplicates_cleaned
FROM upload_queue 
WHERE updated_at > NOW() - INTERVAL '10 minutes';

