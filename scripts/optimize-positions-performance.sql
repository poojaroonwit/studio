-- Optimize positions queries for better performance
-- These indexes will help with the /api/positions/all endpoint

-- Index on isOpen for filtering open/closed positions
CREATE INDEX IF NOT EXISTS idx_position_is_open ON "Position" ("isOpen");

-- Index on createdAt for ordering
CREATE INDEX IF NOT EXISTS idx_position_created_at ON "Position" ("createdAt" DESC);

-- Index on title for search filtering
CREATE INDEX IF NOT EXISTS idx_position_title ON "Position" USING gin(to_tsvector('english', title));

-- Index on department for filtering
CREATE INDEX IF NOT EXISTS idx_position_department ON "Position" ("department");

-- Index on positionLevel for filtering
CREATE INDEX IF NOT EXISTS idx_position_level ON "Position" ("positionLevel");

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_position_open_created ON "Position" ("isOpen", "createdAt" DESC);

-- Index on gradeId for the JOIN with Grade table
CREATE INDEX IF NOT EXISTS idx_position_grade_id ON "Position" ("gradeId");

-- Update table statistics
ANALYZE "Position";
ANALYZE "Grade";
