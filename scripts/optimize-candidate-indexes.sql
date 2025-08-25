-- Performance optimization indexes for candidate data loading
-- Run this script to improve database query performance for large datasets

-- Primary indexes (should already exist)
-- CREATE INDEX IF NOT EXISTS idx_candidate_id ON "Candidate"(id);

-- Core candidate indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_candidate_updated_at ON "Candidate"("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_application_date ON "Candidate"("applicationDate" DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_fit_score ON "Candidate"("fitScore" DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_candidate_status ON "Candidate"(status);
CREATE INDEX IF NOT EXISTS idx_candidate_name ON "Candidate"(name);
CREATE INDEX IF NOT EXISTS idx_candidate_email ON "Candidate"(email);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_candidate_status_updated_at ON "Candidate"(status, "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_position_status ON "Candidate"("positionId", status);
CREATE INDEX IF NOT EXISTS idx_candidate_recruiter_status ON "Candidate"("recruiterId", status);
CREATE INDEX IF NOT EXISTS idx_candidate_source_status ON "Candidate"("sourceId", status);
CREATE INDEX IF NOT EXISTS idx_candidate_fit_score_status ON "Candidate"("fitScore" DESC NULLS LAST, status);

-- Foreign key indexes for joins
CREATE INDEX IF NOT EXISTS idx_candidate_position_id ON "Candidate"("positionId");
CREATE INDEX IF NOT EXISTS idx_candidate_recruiter_id ON "Candidate"("recruiterId");
CREATE INDEX IF NOT EXISTS idx_candidate_source_id ON "Candidate"("sourceId");

-- Text search indexes for ILIKE queries
CREATE INDEX IF NOT EXISTS idx_candidate_name_gin ON "Candidate" USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_candidate_email_gin ON "Candidate" USING gin(email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_candidate_phone_gin ON "Candidate" USING gin(phone gin_trgm_ops);

-- JSONB indexes for parsed data queries
CREATE INDEX IF NOT EXISTS idx_candidate_parsed_data_skills ON "Candidate" USING gin(("parsedData"->>'skills') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_candidate_parsed_data_location ON "Candidate" USING gin(("parsedData"->>'location') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_candidate_parsed_data_experience ON "Candidate" USING gin("parsedData" jsonb_path_ops);

-- Date range indexes
CREATE INDEX IF NOT EXISTS idx_candidate_application_date_range ON "Candidate"("applicationDate" DESC) WHERE "applicationDate" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidate_created_at ON "Candidate"("createdAt" DESC);

-- JobMatch indexes for fit score filtering
CREATE INDEX IF NOT EXISTS idx_job_match_candidate_id ON "JobMatch"("candidateId");
CREATE INDEX IF NOT EXISTS idx_job_match_candidate_fit_score ON "JobMatch"("candidateId", "fitScore" DESC);
CREATE INDEX IF NOT EXISTS idx_job_match_fit_score ON "JobMatch"("fitScore" DESC);

-- Attachment indexes
CREATE INDEX IF NOT EXISTS idx_attachment_candidate_id ON "Attachment"("candidateId");
CREATE INDEX IF NOT EXISTS idx_attachment_candidate_uploaded_at ON "Attachment"("candidateId", "uploadedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_attachment_candidate_primary ON "Attachment"("candidateId", "isPrimary");

-- Comment indexes
CREATE INDEX IF NOT EXISTS idx_candidate_comment_candidate_id ON "CandidateComment"("candidateId");
CREATE INDEX IF NOT EXISTS idx_candidate_comment_candidate_created_at ON "CandidateComment"("candidateId", "createdAt" DESC);

-- Transition indexes
CREATE INDEX IF NOT EXISTS idx_transition_record_candidate_id ON "TransitionRecord"("candidateId");
CREATE INDEX IF NOT EXISTS idx_transition_record_candidate_date ON "TransitionRecord"("candidateId", "date" DESC);

-- Position indexes for joins
CREATE INDEX IF NOT EXISTS idx_position_title ON "Position"(title);
CREATE INDEX IF NOT EXISTS idx_position_department ON "Position"(department);
CREATE INDEX IF NOT EXISTS idx_position_is_open ON "Position"("isOpen");

-- User indexes for recruiter joins
CREATE INDEX IF NOT EXISTS idx_user_role ON "User"(role);
CREATE INDEX IF NOT EXISTS idx_user_module_permissions ON "User" USING gin("modulePermissions");

-- CandidateSource indexes
CREATE INDEX IF NOT EXISTS idx_candidate_source_name ON "CandidateSource"(name);

-- Partial indexes for common filter conditions
CREATE INDEX IF NOT EXISTS idx_candidate_active ON "Candidate"("updatedAt" DESC) WHERE status != 'Deleted';
CREATE INDEX IF NOT EXISTS idx_candidate_with_fit_score ON "Candidate"("fitScore" DESC) WHERE "fitScore" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidate_without_fit_score ON "Candidate"("updatedAt" DESC) WHERE "fitScore" IS NULL;

-- Performance optimization: Update table statistics
ANALYZE "Candidate";
ANALYZE "JobMatch";
ANALYZE "Attachment";
ANALYZE "CandidateComment";
ANALYZE "TransitionRecord";
ANALYZE "User";
ANALYZE "Position";
ANALYZE "CandidateSource";

-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Performance monitoring views
CREATE OR REPLACE VIEW candidate_performance_stats AS
SELECT 
    COUNT(*) as total_candidates,
    COUNT(CASE WHEN "fitScore" IS NOT NULL THEN 1 END) as candidates_with_fit_score,
    COUNT(CASE WHEN "fitScore" IS NULL THEN 1 END) as candidates_without_fit_score,
    AVG("fitScore") as avg_fit_score,
    MIN("applicationDate") as earliest_application,
    MAX("applicationDate") as latest_application,
    COUNT(DISTINCT status) as unique_statuses,
    COUNT(DISTINCT "positionId") as unique_positions,
    COUNT(DISTINCT "recruiterId") as unique_recruiters
FROM "Candidate";

-- Create a function to monitor query performance
CREATE OR REPLACE FUNCTION get_candidate_query_stats()
RETURNS TABLE(
    query_type text,
    avg_time_ms numeric,
    total_calls bigint,
    slow_queries bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'candidate_list'::text as query_type,
        ROUND(AVG(mean_time * 1000), 2) as avg_time_ms,
        SUM(calls) as total_calls,
        SUM(CASE WHEN mean_time > 1.0 THEN calls ELSE 0 END) as slow_queries
    FROM pg_stat_statements 
    WHERE query LIKE '%FROM "Candidate"%'
    AND query NOT LIKE '%pg_stat_statements%';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON candidate_performance_stats TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_candidate_query_stats() TO PUBLIC;

-- Performance recommendations
COMMENT ON INDEX idx_candidate_status_updated_at IS 'Optimizes status + date filtering queries';
COMMENT ON INDEX idx_candidate_fit_score_status IS 'Optimizes fit score filtering with status';
COMMENT ON INDEX idx_candidate_name_gin IS 'Optimizes text search on candidate names';
COMMENT ON INDEX idx_candidate_parsed_data_skills IS 'Optimizes skills-based filtering';
COMMENT ON INDEX idx_candidate_active IS 'Optimizes queries for active candidates only';
