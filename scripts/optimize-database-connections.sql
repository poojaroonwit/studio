
-- Database Connection Pool Optimization
-- Run this in your database to improve performance

-- Increase max connections for high load
ALTER SYSTEM SET max_connections = 100;

-- Optimize connection pool settings
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Restart database to apply changes
-- sudo systemctl restart postgresql

-- Monitor connections
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_connections,
  count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity;
