-- Create n8n database if it doesn't exist
-- This script runs when the PostgreSQL container initializes

-- Create the n8n database if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n') THEN
        CREATE DATABASE n8n;
        RAISE NOTICE 'n8n database created successfully';
    ELSE
        RAISE NOTICE 'n8n database already exists';
    END IF;
END $$;

-- Grant privileges to the postgres user (or the user specified in POSTGRES_USER)
GRANT ALL PRIVILEGES ON DATABASE n8n TO postgres;

-- Connect to the n8n database and set up any additional configurations
\c n8n;

-- Create any additional extensions or configurations needed for n8n
-- (n8n will handle its own schema creation when it connects)

-- Log the database creation
DO $$
BEGIN
    RAISE NOTICE 'n8n database setup completed successfully';
END $$; 