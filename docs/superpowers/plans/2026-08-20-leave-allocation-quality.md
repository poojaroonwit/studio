# Leave Allocation Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Leave Allocation resumable across devices and make the visible Effective date authoritative instead of client-only decoration.

**Architecture:** Reuse the existing `LeaveAllocationRun` persistence model for non-executing `draft` records, using a draft-only idempotency namespace tied to the acting user. Store resumable configuration/step/decision metadata in `input`/`summary`, never reuse a draft idempotency key for execution, and delete the creator's draft when an allocation run completes. Preserve existing execution history and balance-ledger semantics while making `effectiveDate` flow through preview, execution, and ledger posting.

**Tech Stack:** Next.js 15, React 18, TypeScript, Zod, Prisma/PostgreSQL, Vitest, Playwright.

## Global Constraints

- No database migration: use the existing `LeaveAllocationRun` model and its `draft` status.
- Draft records are visible/resumable only to the creator.
- Draft idempotency keys must never collide with allocation-run execution keys.
- Existing completed/processing allocation-run history must remain unchanged.
- `effectiveDate` must be validated to belong to the selected allocation year.
- Existing clients that omit `effectiveDate` remain compatible by falling back to January 1 of the selected year.
- Do not persist a stale employee preview as source-of-truth; regenerate preview when resuming a draft.

---

### Task 1: Characterize effective-date and draft metadata behavior

**Files:**
- Create: `src/lib/hr/leave-allocation-draft.test.ts`
- Create: `src/lib/hr/leave-allocation-draft.ts`

- [ ] Write failing tests for default effective date, year validation, draft idempotency namespace, and safe draft input parsing.
- [ ] Observe RED before implementation.
- [ ] Add minimal pure helpers and verify GREEN.

### Task 2: Add server draft actions

**Files:**
- Modify: `src/lib/hr/leave-workspace-service.ts`
- Modify: `src/app/api/hr/leaves/route.ts`

- [ ] Add `allocation_draft_save` and `allocation_draft_delete` actions.
- [ ] Save/update one draft per acting user using `status='draft'` and a draft-only idempotency key.
- [ ] Store form/step/acknowledgement/exception decisions in `input`; store compact counts in `summary`.
- [ ] Return only the acting user's draft alongside non-draft run history.
- [ ] Delete the acting user's draft transactionally after a real allocation completes.

### Task 3: Make Effective date authoritative

**Files:**
- Modify: `src/lib/hr/leave-workspace-service.ts`

- [ ] Accept optional `effectiveDate` on allocation preview/run for backward compatibility.
- [ ] Resolve omitted values to January 1 of the selected year.
- [ ] Reject dates outside the selected year.
- [ ] Evaluate policy assignment eligibility on the effective date.
- [ ] Use the effective date for allocation ledger entries.

### Task 4: Replace browser-local draft persistence

**Files:**
- Modify: `src/components/leaves/LeaveAllocationGuidedFlow.tsx`

- [ ] Remove `window.localStorage` draft reads/writes/removal.
- [ ] Restore the acting user's server draft from `data.allocationRuns`.
- [ ] Save draft through `allocation_draft_save` and return to plans only after success.
- [ ] Resume at a safe pre-preview step and regenerate impact review rather than trusting stale preview data.
- [ ] Send `effectiveDate` to preview and execution.
- [ ] Replace hard-coded August 15 default with January 1 of the selected year.

### Task 5: Verification

- [ ] Add unauthenticated Leaves API smoke coverage if not already present.
- [ ] Require architecture, TypeScript, lint, full Vitest, production build, browser smoke, schema/migration validation, Docker, and aggregate production gate.
- [ ] Review final diff for accidental workflow/schema/permission changes.
