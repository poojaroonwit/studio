-- Create n8n database if it doesn't exist
-- This script runs when the PostgreSQL container initializes

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n') THEN
        CREATE DATABASE n8n;
        RAISE NOTICE 'n8n database created successfully';
    ELSE
        RAISE NOTICE 'n8n database already exists';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating n8n database: %', SQLERRM;
END $$;

-- Grant privileges to the postgres user (or the user specified in POSTGRES_USER)
GRANT ALL PRIVILEGES ON DATABASE n8n TO postgres; 