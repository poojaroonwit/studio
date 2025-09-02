-- Migration: Fix Stage Mismatches Between UI and Database
-- This script standardizes candidate status values to match the expected stage names
-- Run this script to fix any case sensitivity or naming mismatches

-- First, let's see what statuses currently exist in the database
SELECT DISTINCT status, COUNT(*) as count 
FROM "Candidate" 
WHERE status IS NOT NULL AND status != '' 
GROUP BY status 
ORDER BY count DESC;

-- Check what stages are defined in the recruitment stages
SELECT * FROM "RecruitmentStage" ORDER BY "sortOrder";

-- Create a temporary table to map old statuses to new standardized ones
CREATE TEMP TABLE status_mapping (
    old_status TEXT,
    new_status TEXT,
    reason TEXT
);

-- Insert the mapping based on common patterns
-- Adjust these mappings based on your actual data
INSERT INTO status_mapping (old_status, new_status, reason) VALUES
-- Common case variations
('applied', 'Applied', 'Standardize to title case'),
('APPLIED', 'Applied', 'Standardize to title case'),
('screening', 'Screening', 'Standardize to title case'),
('SCREENING', 'Screening', 'Standardize to title case'),
('shortlisted', 'Shortlisted', 'Standardize to title case'),
('SHORTLISTED', 'Shortlisted', 'Standardize to title case'),
('interview scheduled', 'Interview Scheduled', 'Standardize to title case'),
('interview_scheduled', 'Interview Scheduled', 'Standardize to title case'),
('interviewing', 'Interviewing', 'Standardize to title case'),
('INTERVIEWING', 'Interviewing', 'Standardize to title case'),
('offer sent', 'Offer Sent', 'Standardize to title case'),
('offer_sent', 'Offer Sent', 'Standardize to title case'),
('offer accepted', 'Offer Accepted', 'Standardize to title case'),
('offer_accepted', 'Offer Accepted', 'Standardize to title case'),
('hired', 'Hired', 'Standardize to title case'),
('HIRED', 'Hired', 'Standardize to title case'),
('rejected', 'Rejected', 'Standardize to title case'),
('REJECTED', 'Rejected', 'Standardize to title case'),
('withdrawn', 'Withdrawn', 'Standardize to title case'),
('WITHDRAWN', 'Withdrawn', 'Standardize to title case'),
('pending', 'Pending', 'Standardize to title case'),
('PENDING', 'Pending', 'Standardize to title case'),
('new', 'New', 'Standardize to title case'),
('NEW', 'New', 'Standardize to title case'),
('active', 'Active', 'Standardize to title case'),
('ACTIVE', 'Active', 'Standardize to title case');

-- Show what will be updated
SELECT 
    c.status as current_status,
    sm.new_status as proposed_status,
    sm.reason,
    COUNT(*) as candidate_count
FROM "Candidate" c
JOIN status_mapping sm ON LOWER(c.status) = LOWER(sm.old_status)
WHERE c.status IS NOT NULL AND c.status != ''
GROUP BY c.status, sm.new_status, sm.reason
ORDER BY candidate_count DESC;

-- Update the candidate statuses to standardized values
UPDATE "Candidate" 
SET status = sm.new_status
FROM status_mapping sm
WHERE LOWER("Candidate".status) = LOWER(sm.old_status)
AND "Candidate".status != sm.new_status;

-- Show the results after update
SELECT 
    'After Update' as phase,
    status,
    COUNT(*) as count
FROM "Candidate" 
WHERE status IS NOT NULL AND status != ''
GROUP BY status
ORDER BY count DESC;

-- Clean up
DROP TABLE status_mapping;

-- Final verification - show all current statuses
SELECT 
    'Final Statuses' as phase,
    status,
    COUNT(*) as count
FROM "Candidate" 
WHERE status IS NOT NULL AND status != ''
GROUP BY status
ORDER BY count DESC;

-- Optional: Update any recruitment stages that might be missing
-- This ensures the UI stages match the database statuses
INSERT INTO "RecruitmentStage" (id, name, description, "sortOrder", color, "createdAt", "updatedAt")
SELECT 
    gen_random_uuid() as id,
    status as name,
    'Stage for ' || status || ' candidates' as description,
    ROW_NUMBER() OVER (ORDER BY status) as "sortOrder",
    CASE 
        WHEN status = 'Applied' THEN '#3b82f6'
        WHEN status = 'Screening' THEN '#f59e0b'
        WHEN status = 'Shortlisted' THEN '#8b5cf6'
        WHEN status = 'Interview Scheduled' THEN '#ec4899'
        WHEN status = 'Interviewing' THEN '#f97316'
        WHEN status = 'Offer Sent' THEN '#10b981'
        WHEN status = 'Offer Accepted' THEN '#059669'
        WHEN status = 'Hired' THEN '#16a34a'
        WHEN status = 'Rejected' THEN '#ef4444'
        WHEN status = 'Withdrawn' THEN '#6b7280'
        ELSE '#6b7280'
    END as color,
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM (
    SELECT DISTINCT status 
    FROM "Candidate" 
    WHERE status IS NOT NULL AND status != ''
) candidate_statuses
WHERE NOT EXISTS (
    SELECT 1 FROM "RecruitmentStage" rs WHERE rs.name = candidate_statuses.status
)
ON CONFLICT (name) DO NOTHING;

-- Show final recruitment stages
SELECT * FROM "RecruitmentStage" ORDER BY "sortOrder";
