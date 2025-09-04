-- Force Sync Recruitment Assignments
-- This script synchronizes candidate recruiter assignments with their position's recruiter
-- 
-- Logic:
--   1) For candidates with a positionId, update their recruiterId to match the position's recruiterId
--   2) Handle cases where position has no recruiter (set candidate recruiterId to NULL)
--   3) Log all changes for audit purposes
--   4) Provide summary statistics
--
-- Safety:
--   - All operations are within a single transaction
--   - Creates audit log entries for all changes
--   - Provides detailed before/after comparison
--   - Can be run multiple times safely (idempotent)

BEGIN;

-- Create a temporary table to track changes for audit purposes
CREATE TEMP TABLE recruitment_sync_audit (
    candidate_id UUID,
    candidate_name TEXT,
    candidate_email TEXT,
    position_id UUID,
    position_title TEXT,
    old_recruiter_id UUID,
    old_recruiter_name TEXT,
    new_recruiter_id UUID,
    new_recruiter_name TEXT,
    change_type TEXT,
    change_timestamp TIMESTAMP DEFAULT NOW()
);

-- Step 1: Identify candidates that need recruiter assignment updates
-- and log the current state
INSERT INTO recruitment_sync_audit (
    candidate_id, candidate_name, candidate_email, position_id, position_title,
    old_recruiter_id, old_recruiter_name, new_recruiter_id, new_recruiter_name, change_type
)
SELECT 
    c.id as candidate_id,
    c.name as candidate_name,
    c.email as candidate_email,
    c."positionId" as position_id,
    p.title as position_title,
    c."recruiterId" as old_recruiter_id,
    old_recruiter.name as old_recruiter_name,
    p."recruiterId" as new_recruiter_id,
    new_recruiter.name as new_recruiter_name,
    CASE 
        WHEN c."recruiterId" IS NULL AND p."recruiterId" IS NOT NULL THEN 'ASSIGNED'
        WHEN c."recruiterId" IS NOT NULL AND p."recruiterId" IS NULL THEN 'UNASSIGNED'
        WHEN c."recruiterId" != p."recruiterId" THEN 'CHANGED'
        ELSE 'NO_CHANGE'
    END as change_type
FROM "Candidate" c
LEFT JOIN "Position" p ON c."positionId" = p.id
LEFT JOIN "User" old_recruiter ON c."recruiterId" = old_recruiter.id
LEFT JOIN "User" new_recruiter ON p."recruiterId" = new_recruiter.id
WHERE c."positionId" IS NOT NULL
  AND (
    -- Cases that need updating:
    c."recruiterId" IS NULL AND p."recruiterId" IS NOT NULL OR  -- Assign recruiter
    c."recruiterId" IS NOT NULL AND p."recruiterId" IS NULL OR  -- Remove recruiter
    c."recruiterId" != p."recruiterId"                          -- Change recruiter
  );

-- Step 2: Update candidates to match their position's recruiter assignment
UPDATE "Candidate" 
SET 
    "recruiterId" = p."recruiterId",
    "updatedAt" = NOW()
FROM "Position" p
WHERE "Candidate"."positionId" = p.id
  AND "Candidate"."positionId" IS NOT NULL
  AND (
    -- Update cases:
    "Candidate"."recruiterId" IS NULL AND p."recruiterId" IS NOT NULL OR  -- Assign recruiter
    "Candidate"."recruiterId" IS NOT NULL AND p."recruiterId" IS NULL OR  -- Remove recruiter
    "Candidate"."recruiterId" != p."recruiterId"                          -- Change recruiter
  );

-- Step 3: Log all changes to the audit log table
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
        'old_recruiter_id', old_recruiter_id,
        'old_recruiter_name', old_recruiter_name,
        'new_recruiter_id', new_recruiter_id,
        'new_recruiter_name', new_recruiter_name,
        'change_type', change_type
    ) as details,
    change_timestamp
FROM recruitment_sync_audit
WHERE change_type != 'NO_CHANGE';

-- Step 4: Provide summary statistics
DO $$
DECLARE
    total_candidates INTEGER;
    candidates_with_positions INTEGER;
    candidates_updated INTEGER;
    assignments_made INTEGER;
    assignments_removed INTEGER;
    assignments_changed INTEGER;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO total_candidates FROM "Candidate";
    SELECT COUNT(*) INTO candidates_with_positions FROM "Candidate" WHERE "positionId" IS NOT NULL;
    SELECT COUNT(*) INTO candidates_updated FROM recruitment_sync_audit WHERE change_type != 'NO_CHANGE';
    SELECT COUNT(*) INTO assignments_made FROM recruitment_sync_audit WHERE change_type = 'ASSIGNED';
    SELECT COUNT(*) INTO assignments_removed FROM recruitment_sync_audit WHERE change_type = 'UNASSIGNED';
    SELECT COUNT(*) INTO assignments_changed FROM recruitment_sync_audit WHERE change_type = 'CHANGED';
    
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
            'assignments_made', assignments_made,
            'assignments_removed', assignments_removed,
            'assignments_changed', assignments_changed
        ),
        NOW()
    );
    
    -- Output summary (this will be visible in the transaction log)
    RAISE NOTICE 'Recruitment Assignment Sync Summary:';
    RAISE NOTICE '  Total candidates: %', total_candidates;
    RAISE NOTICE '  Candidates with positions: %', candidates_with_positions;
    RAISE NOTICE '  Candidates updated: %', candidates_updated;
    RAISE NOTICE '  Assignments made: %', assignments_made;
    RAISE NOTICE '  Assignments removed: %', assignments_removed;
    RAISE NOTICE '  Assignments changed: %', assignments_changed;
END $$;

-- Step 5: Verification queries (commented out by default, uncomment to run)
-- These can be used to verify the sync worked correctly

/*
-- Verify no candidates have mismatched recruiter assignments
SELECT 
    c.id,
    c.name,
    c.email,
    c."recruiterId" as candidate_recruiter_id,
    p."recruiterId" as position_recruiter_id,
    CASE 
        WHEN c."recruiterId" = p."recruiterId" THEN 'SYNCED'
        ELSE 'MISMATCH'
    END as sync_status
FROM "Candidate" c
LEFT JOIN "Position" p ON c."positionId" = p.id
WHERE c."positionId" IS NOT NULL
  AND c."recruiterId" != p."recruiterId"
ORDER BY c.name;

-- Show candidates without positions (these are not affected by the sync)
SELECT 
    COUNT(*) as candidates_without_positions
FROM "Candidate" 
WHERE "positionId" IS NULL;

-- Show positions without recruiters
SELECT 
    p.id,
    p.title,
    p.department,
    COUNT(c.id) as candidate_count
FROM "Position" p
LEFT JOIN "Candidate" c ON p.id = c."positionId"
WHERE p."recruiterId" IS NULL
GROUP BY p.id, p.title, p.department
ORDER BY candidate_count DESC;
*/

COMMIT;

-- Final summary query (runs after transaction commits)
SELECT 
    'Recruitment Assignment Sync Complete' as status,
    COUNT(*) as total_changes,
    COUNT(CASE WHEN change_type = 'ASSIGNED' THEN 1 END) as assignments_made,
    COUNT(CASE WHEN change_type = 'UNASSIGNED' THEN 1 END) as assignments_removed,
    COUNT(CASE WHEN change_type = 'CHANGED' THEN 1 END) as assignments_changed
FROM recruitment_sync_audit
WHERE change_type != 'NO_CHANGE';
