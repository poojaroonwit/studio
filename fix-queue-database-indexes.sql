-- Database Indexes to Fix Process Queue Performance Issues
-- Run these SQL commands to improve queue processing performance

-- 1. Index for status and upload_date (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_upload_queue_status_upload_date 
ON upload_queue (status, upload_date) 
WHERE status IN ('queued', 'inprocess');

-- 2. Index for file_path and status (duplicate prevention)
CREATE INDEX IF NOT EXISTS idx_upload_queue_file_path_status 
ON upload_queue (file_path, status) 
WHERE file_path IS NOT NULL AND file_path != '';

-- 3. Index for process_date (stuck job detection)
CREATE INDEX IF NOT EXISTS idx_upload_queue_process_date 
ON upload_queue (process_date) 
WHERE status = 'inprocess';

-- 4. Index for completed_date (recent processing prevention)
CREATE INDEX IF NOT EXISTS idx_upload_queue_completed_date 
ON upload_queue (completed_date) 
WHERE completed_date IS NOT NULL;

-- 5. Index for source field (reprocess jobs)
CREATE INDEX IF NOT EXISTS idx_upload_queue_source 
ON upload_queue (source) 
WHERE source IS NOT NULL;

-- 6. Composite index for webhook_payload queries
CREATE INDEX IF NOT EXISTS idx_upload_queue_webhook_source 
ON upload_queue USING GIN ((webhook_payload->>'source')) 
WHERE webhook_payload IS NOT NULL;

-- 7. Index for webhook_payload processed flag
CREATE INDEX IF NOT EXISTS idx_upload_queue_webhook_processed 
ON upload_queue USING GIN ((webhook_payload->>'processed_by_external_webhook')) 
WHERE webhook_payload IS NOT NULL;

-- 8. Index for error field (for debugging)
CREATE INDEX IF NOT EXISTS idx_upload_queue_error 
ON upload_queue (error) 
WHERE error IS NOT NULL;

-- Show index usage statistics (run after creating indexes)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'upload_queue'
ORDER BY idx_scan DESC;
