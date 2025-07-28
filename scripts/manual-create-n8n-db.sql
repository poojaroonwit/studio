-- Manual n8n database creation script
-- Run this script manually if automatic database creation fails

-- Connect to the default postgres database first
\c postgres;

-- Create the n8n database if it doesn't exist
SELECT 'CREATE DATABASE n8n'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec

-- Grant privileges to the postgres user
GRANT ALL PRIVILEGES ON DATABASE n8n TO postgres;

-- Verify the database was created
SELECT datname FROM pg_database WHERE datname = 'n8n';

-- Log success
DO $$
BEGIN
    RAISE NOTICE 'n8n database created successfully or already exists';
END $$; 