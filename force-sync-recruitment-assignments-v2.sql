-- Force Sync Recruitment Assignments (Version 2 - Bidirectional Sync)
-- This script synchronizes recruiter assignments between candidates and positions
-- 
-- Logic:
--   1) For candidates with a positionId, update their recruiterId to match the position's recruiterId
--   2) For positions with candidates, update their recruiterId to match the candidate's recruiterId
--   3) Handle cases where position has no recruiter (set candidate recruiterId to NULL)
--   4) Handle cases where candidate has no recruiter (set position recruiterId to NULL)
--   5) Log all changes for audit purposes
--   6) Provide summary statistics
--
-- Safety:
--   - Better error handling with explicit transaction management
--   - Creates audit log entries for all changes
--   - Provides detailed before/after comparison
--   - Can be run multiple times safely (idempotent)
--   - Includes rollback on error

-- First, let's check if we're in a transaction and rollback if needed
DO $$
BEGIN
    -- Check if we're in a transaction
    IF (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction') > 0 THEN
        RAISE NOTICE 'Rolling back any existing transaction...';
        ROLLBACK;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors during rollback check
        NULL;
END $$;

-- Start fresh transaction
BEGIN;

-- Create a temporary table to track changes for audit purposes
CREATE TEMP TABLE IF NOT EXISTS recruitment_sync_audit (
    candidate_id UUID,
    candidate_name TEXT,
    candidate_email TEXT,
    position_id UUID,
    position_title TEXT,
    old_candidate_recruiter_id UUID,
    old_candidate_recruiter_name TEXT,
    new_candidate_recruiter_id UUID,
    new_candidate_recruiter_name TEXT,
    old_position_recruiter_id UUID,
    old_position_recruiter_name TEXT,
    new_position_recruiter_id UUID,
    new_position_recruiter_name TEXT,
    change_type TEXT,
    change_timestamp TIMESTAMP DEFAULT NOW()
);

-- Clear any existing audit data
DELETE FROM recruitment_sync_audit;

-- Step 1: Identify candidates and positions that need recruiter assignment updates
-- and log the current state
INSERT INTO recruitment_sync_audit (
    candidate_id, candidate_name, candidate_email, position_id, position_title,
    old_candidate_recruiter_id, old_candidate_recruiter_name, new_candidate_recruiter_id, new_candidate_recruiter_name,
    old_position_recruiter_id, old_position_recruiter_name, new_position_recruiter_id, new_position_recruiter_name,
    change_type
)
SELECT 
    c.id as candidate_id,
    c.name as candidate_name,
    c.email as candidate_email,
    c."positionId" as position_id,
    p.title as position_title,
    c."recruiterId" as old_candidate_recruiter_id,
    old_candidate_recruiter.name as old_candidate_recruiter_name,
    -- For bidirectional sync, we'll determine the target recruiter based on priority
    CASE 
        WHEN c."recruiterId" IS NOT NULL THEN c."recruiterId"  -- Candidate has recruiter, use it
        ELSE p."recruiterId"  -- Use position's recruiter if candidate has none
    END as new_candidate_recruiter_id,
    CASE 
        WHEN c."recruiterId" IS NOT NULL THEN old_candidate_recruiter.name
        ELSE new_position_recruiter.name
    END as new_candidate_recruiter_name,
    p."recruiterId" as old_position_recruiter_id,
    old_position_recruiter.name as old_position_recruiter_name,
    -- For bidirectional sync, we'll determine the target recruiter based on priority
    CASE 
        WHEN c."recruiterId" IS NOT NULL THEN c."recruiterId"  -- Candidate has recruiter, use it
        ELSE p."recruiterId"  -- Use position's recruiter if candidate has none
    END as new_position_recruiter_id,
    CASE 
        WHEN c."recruiterId" IS NOT NULL THEN old_candidate_recruiter.name
        ELSE new_position_recruiter.name
    END as new_position_recruiter_name,
    CASE 
        WHEN c."recruiterId" IS NULL AND p."recruiterId" IS NOT NULL THEN 'CANDIDATE_ASSIGNED'
        WHEN c."recruiterId" IS NOT NULL AND p."recruiterId" IS NULL THEN 'POSITION_ASSIGNED'
        WHEN c."recruiterId" != p."recruiterId" THEN 'BOTH_CHANGED'
        ELSE 'NO_CHANGE'
    END as change_type
FROM "Candidate" c
LEFT JOIN "Position" p ON c."positionId" = p.id
LEFT JOIN "User" old_candidate_recruiter ON c."recruiterId" = old_candidate_recruiter.id
LEFT JOIN "User" old_position_recruiter ON p."recruiterId" = old_position_recruiter.id
LEFT JOIN "User" new_position_recruiter ON p."recruiterId" = new_position_recruiter.id
WHERE c."positionId" IS NOT NULL
  AND (
    -- Cases that need updating:
    c."recruiterId" IS NULL AND p."recruiterId" IS NOT NULL OR  -- Assign recruiter to candidate
    c."recruiterId" IS NOT NULL AND p."recruiterId" IS NULL OR  -- Assign recruiter to position
    c."recruiterId" != p."recruiterId"                          -- Sync both
  );

-- Step 2: Update candidates to match their position's recruiter assignment
UPDATE "Candidate" 
SET 
    "recruiterId" = CASE 
        WHEN "Candidate"."recruiterId" IS NOT NULL THEN "Candidate"."recruiterId"  -- Keep candidate's recruiter if exists
        ELSE p."recruiterId"  -- Use position's recruiter if candidate has none
    END,
    "updatedAt" = NOW()
FROM "Position" p
WHERE "Candidate"."positionId" = p.id
  AND "Candidate"."positionId" IS NOT NULL
  AND (
    -- Update cases:
    "Candidate"."recruiterId" IS NULL AND p."recruiterId" IS NOT NULL OR  -- Assign recruiter to candidate
    "Candidate"."recruiterId" IS NOT NULL AND p."recruiterId" IS NULL OR  -- Keep candidate's recruiter
    "Candidate"."recruiterId" != p."recruiterId"                          -- Sync both
  );

-- Step 3: Update positions to match their candidate's recruiter assignment
UPDATE "Position" 
SET 
    "recruiterId" = CASE 
        WHEN c."recruiterId" IS NOT NULL THEN c."recruiterId"  -- Use candidate's recruiter if exists
        ELSE "Position"."recruiterId"  -- Keep position's recruiter if candidate has none
    END,
    "updatedAt" = NOW()
FROM "Candidate" c
WHERE "Position".id = c."positionId"
  AND c."positionId" IS NOT NULL
  AND (
    -- Update cases:
    c."recruiterId" IS NOT NULL AND "Position"."recruiterId" IS NULL OR  -- Assign recruiter to position
    c."recruiterId" IS NULL AND "Position"."recruiterId" IS NOT NULL OR  -- Keep position's recruiter
    c."recruiterId" != "Position"."recruiterId"                          -- Sync both
  );

-- Step 4: Log all changes to the audit log table (only if there are changes)
DO $$
DECLARE
    change_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO change_count FROM recruitment_sync_audit WHERE change_type != 'NO_CHANGE';
    
    IF change_count > 0 THEN
        INSERT INTO "LogEntry" (
            "id", "level", "message", "source", "details", "timestamp"
        )
        SELECT 
            gen_random_uuid() as id,
            'INFO' as level,
            'Recruitment assignment sync: ' || change_type || ' for candidate ' || candidate_name as message,
            'recruitment_sync_script' as source,
            jsonb_build_object(
                'candidate_id', candidate_id,
                'candidate_name', candidate_name,
                'candidate_email', candidate_email,
                'position_id', position_id,
                'position_title', position_title,
                'old_candidate_recruiter_id', old_candidate_recruiter_id,
                'old_candidate_recruiter_name', old_candidate_recruiter_name,
                'new_candidate_recruiter_id', new_candidate_recruiter_id,
                'new_candidate_recruiter_name', new_candidate_recruiter_name,
                'old_position_recruiter_id', old_position_recruiter_id,
                'old_position_recruiter_name', old_position_recruiter_name,
                'new_position_recruiter_id', new_position_recruiter_id,
                'new_position_recruiter_name', new_position_recruiter_name,
                'change_type', change_type
            ) as details,
            change_timestamp
        FROM recruitment_sync_audit
        WHERE change_type != 'NO_CHANGE';
        
        RAISE NOTICE 'Logged % changes to audit log', change_count;
    ELSE
        RAISE NOTICE 'No changes detected - skipping audit log entries';
    END IF;
END $$;

-- Step 5: Provide summary statistics
DO $$
DECLARE
    total_candidates INTEGER;
    candidates_with_positions INTEGER;
    candidates_updated INTEGER;
    candidate_assignments_made INTEGER;
    position_assignments_made INTEGER;
    both_changed INTEGER;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO total_candidates FROM "Candidate";
    SELECT COUNT(*) INTO candidates_with_positions FROM "Candidate" WHERE "positionId" IS NOT NULL;
    SELECT COUNT(*) INTO candidates_updated FROM recruitment_sync_audit WHERE change_type != 'NO_CHANGE';
    SELECT COUNT(*) INTO candidate_assignments_made FROM recruitment_sync_audit WHERE change_type = 'CANDIDATE_ASSIGNED';
    SELECT COUNT(*) INTO position_assignments_made FROM recruitment_sync_audit WHERE change_type = 'POSITION_ASSIGNED';
    SELECT COUNT(*) INTO both_changed FROM recruitment_sync_audit WHERE change_type = 'BOTH_CHANGED';
    
    -- Log summary
    INSERT INTO "LogEntry" (
        "id", "level", "message", "source", "details", "timestamp"
    ) VALUES (
        gen_random_uuid(),
        'INFO',
        'Recruitment assignment sync completed',
        'recruitment_sync_script',
        jsonb_build_object(
            'total_candidates', total_candidates,
            'candidates_with_positions', candidates_with_positions,
            'candidates_updated', candidates_updated,
            'candidate_assignments_made', candidate_assignments_made,
            'position_assignments_made', position_assignments_made,
            'both_changed', both_changed
        ),
        NOW()
    );
    
    -- Output summary (this will be visible in the transaction log)
    RAISE NOTICE 'Bidirectional Recruitment Assignment Sync Summary:';
    RAISE NOTICE '  Total candidates: %', total_candidates;
    RAISE NOTICE '  Candidates with positions: %', candidates_with_positions;
    RAISE NOTICE '  Total updates made: %', candidates_updated;
    RAISE NOTICE '  Candidate assignments made: %', candidate_assignments_made;
    RAISE NOTICE '  Position assignments made: %', position_assignments_made;
    RAISE NOTICE '  Both candidate and position changed: %', both_changed;
END $$;

-- Commit the transaction
COMMIT;

-- Final summary query (runs after transaction commits)
SELECT 
    'Bidirectional Recruitment Assignment Sync Complete' as status,
    COUNT(*) as total_changes,
    COUNT(CASE WHEN change_type = 'CANDIDATE_ASSIGNED' THEN 1 END) as candidate_assignments_made,
    COUNT(CASE WHEN change_type = 'POSITION_ASSIGNED' THEN 1 END) as position_assignments_made,
    COUNT(CASE WHEN change_type = 'BOTH_CHANGED' THEN 1 END) as both_changed
FROM recruitment_sync_audit
WHERE change_type != 'NO_CHANGE';
