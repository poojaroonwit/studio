-- Migration: Fix column name mismatch for applicantId -> applicant_id
-- The rename_candidate_to_applicant migration renamed candidateId to applicantId (camelCase),
-- but the Prisma schema uses @map("applicant_id") for TransitionRecord and JobMatch.
-- This migration aligns the DB column names with the Prisma schema.

-- Step 1: Rename column in TransitionRecord
ALTER TABLE "TransitionRecord" RENAME COLUMN "applicantId" TO "applicant_id";

-- Step 2: Rename column in JobMatch
ALTER TABLE "JobMatch" RENAME COLUMN "applicantId" TO "applicant_id";
