-- Create n8n database if it doesn't exist
-- This script runs when the PostgreSQL container initializes

-- Create the n8n database if it doesn't exist
SELECT 'CREATE DATABASE n8n'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec

-- Grant privileges to the postgres user (or the user specified in POSTGRES_USER)
GRANT ALL PRIVILEGES ON DATABASE n8n TO postgres;

-- Log the database creation
DO $$
BEGIN
    RAISE NOTICE 'n8n database created successfully or already exists';
END $$; 