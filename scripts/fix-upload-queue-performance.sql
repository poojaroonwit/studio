-- Fix Upload Queue Performance Issues
-- This script adds necessary indexes to improve query performance and prevent 504 timeouts

-- 1. Check current table size and performance
SELECT 
  schemaname,
  tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
AND tablename = 'upload_queue';

-- 2. Create performance indexes for upload_queue table
-- Index for upload_date (most common filter and sort)
CREATE INDEX IF NOT EXISTS idx_upload_queue_upload_date 
ON upload_queue (upload_date DESC);

-- Index for status (common filter)
CREATE INDEX IF NOT EXISTS idx_upload_queue_status 
ON upload_queue (status);

-- Index for position_id (common filter)
CREATE INDEX IF NOT EXISTS idx_upload_queue_position_id 
ON upload_queue (position_id);

-- Index for file_name (for search functionality)
CREATE INDEX IF NOT EXISTS idx_upload_queue_file_name 
ON upload_queue USING gin (to_tsvector('english', file_name));

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_upload_queue_status_upload_date 
ON upload_queue (status, upload_date DESC);

-- Index for process_date (for stuck job detection)
CREATE INDEX IF NOT EXISTS idx_upload_queue_process_date 
ON upload_queue (process_date);

-- Index for created_by (for user-specific queries)
CREATE INDEX IF NOT EXISTS idx_upload_queue_created_by 
ON upload_queue (created_by);

-- 3. Analyze the table to update statistics
ANALYZE upload_queue;

-- 4. Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
AND tablename = 'upload_queue'
ORDER BY idx_scan DESC;

-- 5. Check current table statistics after optimization
SELECT 
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE status = 'queued') as queued,
  COUNT(*) FILTER (WHERE status = 'inprocess') as inprocess,
  COUNT(*) FILTER (WHERE status = 'success') as success,
  COUNT(*) FILTER (WHERE status IN ('error', 'fail')) as failed,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
FROM upload_queue;

-- 6. Show table size information
SELECT 
  pg_size_pretty(pg_total_relation_size('upload_queue')) as total_size,
  pg_size_pretty(pg_relation_size('upload_queue')) as table_size,
  pg_size_pretty(pg_total_relation_size('upload_queue') - pg_relation_size('upload_queue')) as index_size;
