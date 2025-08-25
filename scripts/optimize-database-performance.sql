-- Database Performance Optimization Script
-- This script adds indexes to improve query performance for positions page and upload queue

-- 1. Optimize Position queries
CREATE INDEX IF NOT EXISTS idx_position_created_at ON "Position" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_position_is_open ON "Position" ("isOpen");
CREATE INDEX IF NOT EXISTS idx_position_department ON "Position" (department);
CREATE INDEX IF NOT EXISTS idx_position_recruiter_id ON "Position" ("recruiterId");
CREATE INDEX IF NOT EXISTS idx_position_title_gin ON "Position" USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_position_department_recruiter ON "Position" (department, "recruiterId");

-- 2. Optimize Headcount queries
CREATE INDEX IF NOT EXISTS idx_headcount_position_id ON "Headcount" ("positionId");
CREATE INDEX IF NOT EXISTS idx_headcount_status ON "Headcount" (status);
CREATE INDEX IF NOT EXISTS idx_headcount_position_status ON "Headcount" ("positionId", status);

-- 3. Optimize Upload Queue queries
CREATE INDEX IF NOT EXISTS idx_upload_queue_status ON upload_queue (status);
CREATE INDEX IF NOT EXISTS idx_upload_queue_upload_date ON upload_queue (upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_upload_queue_file_path ON upload_queue (file_path);
CREATE INDEX IF NOT EXISTS idx_upload_queue_position_id ON upload_queue (position_id);
CREATE INDEX IF NOT EXISTS idx_upload_queue_status_date ON upload_queue (status, upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_upload_queue_process_date ON upload_queue (process_date);

-- 4. Optimize Candidate queries for statistics
CREATE INDEX IF NOT EXISTS idx_candidate_position_id ON "Candidate" ("positionId");
CREATE INDEX IF NOT EXISTS idx_job_match_job_id ON "JobMatch" ("jobId");

-- 5. Optimize User queries for recruiter stats
CREATE INDEX IF NOT EXISTS idx_user_role ON "User" (role);

-- 6. Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_position_open_department ON "Position" ("isOpen", department);
CREATE INDEX IF NOT EXISTS idx_position_open_recruiter ON "Position" ("isOpen", "recruiterId");

-- 7. Partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_position_open_only ON "Position" ("createdAt" DESC) WHERE "isOpen" = true;
CREATE INDEX IF NOT EXISTS idx_position_closed_only ON "Position" ("createdAt" DESC) WHERE "isOpen" = false;
CREATE INDEX IF NOT EXISTS idx_upload_queue_queued_only ON upload_queue (upload_date ASC) WHERE status = 'queued';

-- 8. Optimize Grade queries
CREATE INDEX IF NOT EXISTS idx_grade_id ON "Grade" (id);

-- 9. Add covering indexes for frequently accessed columns
CREATE INDEX IF NOT EXISTS idx_position_covering ON "Position" (id, title, department, "isOpen", "recruiterId", "createdAt");

-- 10. Optimize webhook payload queries
CREATE INDEX IF NOT EXISTS idx_upload_queue_webhook_payload_gin ON upload_queue USING gin(webhook_payload);

-- Analyze tables to update statistics
ANALYZE "Position";
ANALYZE "Headcount";
ANALYZE upload_queue;
ANALYZE "Candidate";
ANALYZE "JobMatch";
ANALYZE "User";
ANALYZE "Grade";

-- Show index usage statistics (for monitoring)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
