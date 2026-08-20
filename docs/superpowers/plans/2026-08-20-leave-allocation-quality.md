# Leave Allocation Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Leave Allocation drafts server-backed and creator-scoped, and make the visible Effective date authoritative throughout preview and execution.

**Architecture:** Reuse the existing `LeaveAllocationRun` model for non-executing `draft` records rather than adding a migration. Keep the existing Leave allocation service as the single calculation/execution engine. Add a dedicated manager-only draft API/controller and ensure resumed drafts regenerate employee impact from current data.

**Tech Stack:** Next.js 15, React 18, TypeScript, Prisma, Vitest, Playwright.

## Constraints

- No database migration.
- Preserve existing completed allocation history and execution idempotency.
- Draft records use a separate creator-scoped idempotency namespace.
- Generic Leave workspace must not expose draft rows.
- Do not persist employee impact previews; regenerate them on resume.
- Effective date must be valid and inside the selected allocation year.
- A completed allocation must not be reported as failed if draft cleanup fails afterward.

## Verification

- TDD RED: the draft/effective-date contract test failed before `leave-allocation-draft.ts` existed.
- TDD GREEN: pure helper tests passed before service/API/UI wiring.
- Final gate must pass architecture, TypeScript, lint, full Vitest, Next production build, browser smoke, Prisma validation/migrations/schema drift, Docker build, and aggregate production gate.
