-- Performance optimization indexes for candidate detail page
-- Run this script to improve database query performance

-- Index for candidate lookup by ID (already exists as primary key)
-- CREATE INDEX IF NOT EXISTS idx_candidate_id ON "Candidate"(id);

-- Indexes for candidate-related foreign key lookups
CREATE INDEX IF NOT EXISTS idx_candidate_position_id ON "Candidate"("positionId");
CREATE INDEX IF NOT EXISTS idx_candidate_recruiter_id ON "Candidate"("recruiterId");
CREATE INDEX IF NOT EXISTS idx_candidate_source_id ON "Candidate"("sourceId");

-- Indexes for job matches
CREATE INDEX IF NOT EXISTS idx_job_match_candidate_id ON "JobMatch"("candidateId");
CREATE INDEX IF NOT EXISTS idx_job_match_candidate_fit_score ON "JobMatch"("candidateId", "fitScore" DESC);

-- Indexes for attachments
CREATE INDEX IF NOT EXISTS idx_attachment_candidate_id ON "Attachment"("candidateId");
CREATE INDEX IF NOT EXISTS idx_attachment_candidate_uploaded_at ON "Attachment"("candidateId", "uploadedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_attachment_candidate_primary ON "Attachment"("candidateId", "isPrimary");

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_candidate_comment_candidate_id ON "CandidateComment"("candidateId");
CREATE INDEX IF NOT EXISTS idx_candidate_comment_candidate_created_at ON "CandidateComment"("candidateId", "createdAt" DESC);

-- Indexes for transitions (if used)
CREATE INDEX IF NOT EXISTS idx_transition_record_candidate_id ON "TransitionRecord"("candidateId");
CREATE INDEX IF NOT EXISTS idx_transition_record_candidate_date ON "TransitionRecord"("candidateId", "date" DESC);

-- Composite indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_candidate_status_updated_at ON "Candidate"(status, "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_position_status ON "Candidate"("positionId", status);

-- Index for user lookups (recruiters, comment authors, etc.)
CREATE INDEX IF NOT EXISTS idx_user_module_permissions ON "User"(("modulePermissions"));

-- Analyze tables after creating indexes
ANALYZE "Candidate";
ANALYZE "JobMatch";
ANALYZE "Attachment";
ANALYZE "CandidateComment";
ANALYZE "TransitionRecord";
ANALYZE "User";
ANALYZE "Position";
ANALYZE "CandidateSource";
