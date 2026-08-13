# Full app journey and workflow audit — 2026-08-13

## Verdict

The product has unusually broad route and API coverage (177 page entries, 430 API routes, 473 test files), but it is not release-ready as one coherent HRIS. Core recruiting, people, payroll, learning, and administration screens exist and load data. The biggest gaps are cross-module journey integrity, incomplete public/employee experiences, persistent loading states, inconsistent navigation contracts, and insufficient end-to-end coverage.

## Evidence and method

- Audited the running local app at `http://localhost:8021` as the seeded Admin user.
- Captured settled desktop states after five seconds for eight representative journey entry points.
- Compared visible behavior with the page/API inventory, SRS, rollout notes, automated tests, architecture check, TypeScript, and lint.
- No production mutations or destructive workflow submissions were performed.

## Journey results

| Step | Journey | Health | Evidence |
|---|---|---|---|
| 1 | Admin dashboard / onboarding entry | Blocked | `01-dashboard-settled.png` remains on “Loading onboarding progress” after five seconds, despite showing “Up to date.” |
| 2 | Recruiting / applicant list | Partial | `02-applicants-settled.png` loads three applicants, but the footer simultaneously says “No applicants found” and “No pages.” |
| 3 | People / employee administration | Partial | `03-people-settled.png` loads 14 employees, but visible records have “No account” and “Not Started” onboarding, breaking employee-to-ESS continuity. |
| 4 | Employee self-service entry | Blocked | `/ess` redirects to `/employee-portal`; `04-employee-self-service-settled.png` remains a blank skeleton after five seconds. |
| 5 | Payroll command center | Partial | `05-payroll-settled.png` exposes readiness blockers, but seeded period data is contradictory: pay date 31 Aug 2026, cutoff 16 Sep 2026, period name `sdsdsdsd`, and 28 blockers for 14 employees. |
| 6 | Learning home | Partial | `06-learning-settled.png` is visually complete and actionable, but the active course is named `sdf`, signaling demo/test content in the primary journey. |
| 7 | Admin Center / HR setup | Blocked | `07-admin-center-settled.png` has strong information architecture, but the selected Designation configuration remains a skeleton/iframe loading state after five seconds. |
| 8 | Public careers / apply entry | Broken | `08-public-apply-settled.png` shows the authenticated internal global navigation, Admin identity, search, and “Talk with HR” on a supposedly public candidate surface. It also has zero roles, so submission cannot be tested. |

## Highest-priority gaps

### P0 — journey blockers

1. **Public candidate isolation is not implemented correctly.** `/apply` is rendered inside the authenticated employee/admin shell. This leaks internal navigation and creates a confusing, potentially sensitive public experience. Public job discovery also has no seeded/published role, so the apply workflow cannot complete.
2. **Employee self-service cannot reach a usable home state.** `/ess` redirects to `/employee-portal`, which remains an empty skeleton. Most seeded employees have no system account, so the core employee lifecycle (hire → account → onboarding → ESS) is not demonstrably complete.
3. **Dashboard and Admin Center have persistent loading states.** The onboarding module and selected HR configuration never resolve or disclose an error/retry state.

### P1 — workflow integrity

4. **Applicant list state contradicts itself.** Rows are visible while pagination announces no applicants/no pages. This undermines trust and can break bulk or paging decisions.
5. **Hire-to-employee handoff is only partially wired.** Recruiting has Hired applicants, while People records visibly lack accounts and onboarding progress. The implementation contains account/onboarding services, but the seeded runnable journey does not prove the handoff.
6. **Payroll sequencing and data quality are unsafe.** Cutoff occurs after pay date, readiness is only 10%, most source categories are 0%, and test strings appear in business-critical fields. Payroll should hard-block calculation/approval with a clear dependency checklist and validated period chronology.
7. **Navigation contracts are drifting.** Six unit tests fail, including main-menu order, Learning entry order, People submenu composition, permission catalog size, and label expectations. These are not isolated styling failures; they indicate the product map and tests disagree.
8. **“Holiday List” still points to a Coming Soon route.** `src/lib/admin-platform-setup.ts` references `/settings/coming-soon/holiday-list`, while a Holidays workspace exists elsewhere. The setup journey should route to the implemented surface or explicitly explain scope.

### P2 — usability, accessibility, and polish

9. **Global navigation is over-capacity at desktop width.** “Admin Center” wraps, `more` is inconsistently lowercase, and several domains compete in two dense navigation rows.
10. **Loading behavior lacks recovery.** Skeletons remain indefinitely with no timeout, explanation, retry, or support path. Add bounded loading, actionable errors, and stale-data states.
11. **Visible data tables have accessibility risks.** Several icon-only controls do not expose a visible label, the People action column is clipped at the audited viewport, and dense tables rely heavily on color/status pills. Keyboard, focus order, screen-reader names, zoom/reflow, and contrast require hands-on verification.
12. **Demo content reduces trust.** Names such as `sdf` and `sdsdsdsd` appear in headline learning/payroll contexts. Seed data needs release-quality fixtures and automated forbidden-placeholder checks.

## Feature/workflow implementation matrix

| Domain | Implemented surface | Missing or unproven workflow |
|---|---|---|
| Authentication & identity | Credential/SSO/2FA routes and tests exist | Role-by-role browser journeys, account provisioning from hire, password setup, lockout/recovery, and guest evaluation were not covered end-to-end |
| Recruiting | Headcount, positions, applicants, calendar, offers, queue, job portal routes exist | Public discovery → apply → duplicate handling → screening → interview → offer → hire is not demonstrably complete; public shell is wrong |
| Core HR | Employees, org chart, onboarding, probation, offboarding, contracts, assets exist | Hire-to-account-to-onboarding continuity is broken in seeded data; employee portal is blocked |
| Time & leave | Attendance, corrections, overtime, shifts, holidays, leave control/allocation/encashment exist | Only four E2E smoke tests exist for the entire app; approval, correction, balance, calendar, and payroll handoffs remain unproven |
| Payroll & expenses | Payroll dashboard/runs/payslips/compensation/benefits/reports and expense workspaces exist | Period chronology, readiness gating, approval, file generation, payment, statutory export, reversal/amendment, and employee payslip receipt remain unproven |
| Performance & engagement | Performance, appraisal, surveys, feedback-related services exist | Full goal/check-in/review/calibration/sign-off and survey author/respond/analyze workflows remain unproven |
| Learning | Home, courses, paths, achievements, career explorer, certificates exist | Enrollment → lesson completion → assessment → certificate and manager assignment/reporting remain unproven; demo content is visible |
| Admin & governance | Extensive settings, roles, teams, integrations, audit, privacy, data operations exist | Some configurations never settle; Holiday List route is still Coming Soon; cross-setting dependency validation is unproven |
| Service desk & communications | Service desk, broadcast, email/SMS, notifications, webhooks exist | Request → assignment → SLA → resolution, outbound delivery failure/retry, and user-visible confirmation remain unproven |
| Integrations & platform | 430 API routes, AppKit/Azure/MinIO/n8n/AI hooks, PWA assets exist | MinIO provider bucket-policy behavior is explicitly not implemented; production integration health and failure recovery need environment-backed tests |

## Engineering quality gates

- **Lint:** passes.
- **TypeScript:** fails because `src/app/settings/users/page.ts` exports `ManageUsersPageContent`, which violates the Next.js page-module contract.
- **Unit/component tests:** 2,142 pass; 6 fail across 5 files. Failures cover navigation, permissions catalog, localization label expectations, and SSE dark-mode class expectations.
- **Architecture check:** fails because `src/components/ess/LeaveRequestView.tsx` is 1,145 lines, exceeding its 1,095-line budget.
- **E2E coverage:** one spec with four smoke checks; it does not exercise a complete business journey.

## Recommended sequence

1. Separate all public routes from the authenticated app shell and seed one publishable job; add a public apply E2E test.
2. Fix employee account provisioning and the `/ess`/`/employee-portal` entry; add hire → account → onboarding → ESS coverage.
3. Replace indefinite skeletons with timeout/error/retry states and resolve Dashboard/Admin Center data dependencies.
4. Repair applicant pagination state and navigation/permission contract drift; make TypeScript and all tests green.
5. Add payroll chronology/readiness validation and a golden-path payroll E2E test through payslip availability.
6. Add domain E2E suites for leave, attendance, performance, learning, service desk, settings, and role/permission boundaries.

## Evidence limits

This is a broad coverage audit, not certification that every one of 177 pages and 430 API routes works. Destructive actions, external email/SMS delivery, payment/statutory submission, uploads, Azure/MinIO/n8n integrations, mobile breakpoints, keyboard-only operation, screen readers, and multi-user real-time behavior were not executed. Those need dedicated environment-backed and assistive-technology testing.
