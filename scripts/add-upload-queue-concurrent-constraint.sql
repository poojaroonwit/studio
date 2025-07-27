-- Add constraint to prevent more than max concurrent jobs from being in 'inprocess' status
-- This is a safety measure to ensure the concurrent limit is never exceeded

-- First, create a function to check the constraint
CREATE OR REPLACE FUNCTION check_inprocess_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_concurrent INTEGER;
BEGIN
    -- Get the current max concurrent setting
    SELECT COALESCE(CAST(value AS INTEGER), 5) INTO max_concurrent
    FROM system_settings 
    WHERE key = 'maxConcurrentProcessors' 
    LIMIT 1;
    
    -- Count current inprocess jobs
    SELECT COUNT(*) INTO current_count
    FROM upload_queue 
    WHERE status = 'inprocess';
    
    -- If we're trying to set status to 'inprocess', check the limit
    IF NEW.status = 'inprocess' AND OLD.status != 'inprocess' THEN
        IF current_count >= max_concurrent THEN
            RAISE EXCEPTION 'Cannot set job to inprocess: max concurrent limit reached (%/% jobs)', current_count, max_concurrent;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS enforce_inprocess_limit ON upload_queue;
CREATE TRIGGER enforce_inprocess_limit
    BEFORE UPDATE ON upload_queue
    FOR EACH ROW
    EXECUTE FUNCTION check_inprocess_limit();

-- Add a comment to document this constraint
COMMENT ON FUNCTION check_inprocess_limit() IS 'Enforces the maximum concurrent inprocess jobs limit based on system setting maxConcurrentProcessors'; 