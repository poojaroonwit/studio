# People page and employee-lifecycle audit

Audit date: 2026-08-13  
Scope: People directory, employee creation/import, profile, account provisioning, onboarding, organization, probation, contracts, offboarding, assets, service desk, permissions, configuration, and automated coverage.  
Method: authenticated desktop walkthrough at `http://localhost:8021`, current-run screenshots, source/API/config inspection, and test inventory. No records were created or changed.

## Executive result

Overall journey health: **58/100 — partially implemented, not release-ready as a complete employee lifecycle.**

The underlying domain is broad and substantially implemented: employee records, profile sections, account provisioning, onboarding, organization structure, probation decisions, contract monitoring, offboarding checklists, equipment custody, service tickets, and configuration APIs all exist. The largest problem is not a lack of code; it is broken discoverability, incomplete operational configuration/data, inconsistent lifecycle state, slow loading, and insufficient end-to-end protection.

There are no confirmed P0 blockers. There are **4 P1**, **7 P2**, and **6 P3** findings.

## Journey map

1. **Find and manage employees — Poor.** The directory loads and paginates 14 employees, but its title, search, filters, New Employee, import/export, contract summary, retry state, and empty state are all inside a permanently hidden container. Users only receive a dense table and pagination.
2. **Create or import an employee — Blocked from the page.** Direct creation, applicant conversion, Excel/CSV import, and Azure AD sync are implemented, but the only directory entry points are hidden. The creation wizard validates employment type, dates, client, department, manager, position, and company.
3. **Review and maintain an employee profile — Fair.** The profile is comprehensive and links employee information to organization, recruitment, documents, equipment, onboarding, probation, cases, operations, leave, attendance, learning, performance, payroll, and personal data. Several edit fields expose raw UUID-oriented inputs and the two-level horizontal tab model is difficult to scan.
4. **Provision employee access — Poor operational health.** The system-account workflow exists and applies the least-privilege Employee role, but every visible active employee in the directory showed “No account / No matching user.” Account provisioning is therefore implemented but not operationally completed for the seeded workforce.
5. **Run onboarding — Fair, slow.** Templates, tasks, owners, progress, stage completion, ESS visibility, and start-onboarding controls exist. The tested page took about 15 seconds to leave its skeleton state; two journeys were 0% and overdue, while directory rows reported onboarding “Not Started.”
6. **Place people in the organization — Fair.** Org chart, department filtering, position/employee views, add-person, manager reassignment, drag-manager-line, division/department/section hierarchy, import, allocation, and archiving exist. The current dataset is effectively flat: visible people were top-level with zero direct reports.
7. **Complete probation — Poor operational health.** Decision logic and configuration exist, and an employee profile showed a probation deadline 101 days overdue. The Probation workspace nevertheless showed zero records, indicating projection/configuration/data inconsistency.
8. **Monitor contracts — Fair.** Monitoring, timeline, workflow, alerts, export, notice-period, expiry, and missing-end-date states are implemented. The current dataset contained zero contract employees, so renewal and alert journeys could not be exercised.
9. **Offboard an employee — Broken for an active record.** Case creation, register/board views, departments, checklist stages, resignation, assets, access revocation, final payroll, and status tracking exist. The active offboarding row rendered `Invalid Date` and `NaN days`.
10. **Manage equipment — Fair but undiscoverable.** Asset creation, assignment, return, inventory states, and custody records work, but Assets is absent from the People secondary navigation. It is only reachable by a direct URL or employee profile.
11. **Resolve employee support requests — Good baseline.** Ticket inbox, filtering, history, status, replies, categories, owners, knowledge base, SLAs, escalation, and visibility configuration exist. The tested ticket loaded correctly.
12. **Configure and govern People — Broad but fragmented.** Organization, lifecycle policies, journeys, onboarding templates, document templates, service desk, fields, roles, users, and email/sign-in settings exist. Duplicate and overlapping settings entries make setup order and ownership unclear.

## Prioritized findings

### P1 — fix before release

1. **Directory management controls are permanently hidden.** `HrModulePage.tsx` wraps the directory heading, search, filter, New Employee, Import/Export, contract summary, error/retry state, active filter chips, and empty-state context in `<div className="hidden">`. This blocks the primary acquisition and management journey despite the implementation existing underneath.
   - Fix: remove the permanent hide; restore a responsive toolbar; keep search and New Employee visible; move lower-frequency actions into a menu on small screens.
   - Acceptance: an authorized HR manager can create, import, export, search, filter, reset filters, and see API errors from `/people` using keyboard and pointer.

2. **Offboarding displays invalid lifecycle dates.** The active case for John Cooper rendered `Invalid Date` and `NaN days` while showing 5/5 checklist progress.
   - Fix: normalize API date fields, reject missing/invalid last-working dates at creation and update, and render a safe “Date required” state for legacy data.
   - Acceptance: every register/board item has a valid localized date and integer day count; malformed records show a recoverable validation state, never `NaN`.

3. **Lifecycle projections disagree.** Active employees show onboarding “Not Started”; the onboarding workspace has overdue journeys; an employee profile shows probation 101 days overdue; the Probation list shows zero records.
   - Fix: define one lifecycle projection contract per employee, backfill existing records, and add reconciliation checks for directory/profile/workspace counts.
   - Acceptance: status and counts agree across directory, employee profile, onboarding, probation, dashboards, and APIs for the same employee.

4. **No end-to-end protection for the People lifecycle.** Tests cover utility/domain contracts, but the inventory found no People journey E2E coverage.
   - Add role-based E2E paths for create/import → account → onboarding → probation; contract renewal; resignation/offboarding → asset return/access revocation; permission denial; empty/error/loading states.

### P2 — important workflow and configuration gaps

1. **Onboarding takes too long to become actionable.** The page remained a skeleton after 3.5 seconds and settled around 15 seconds without progressive feedback or a timeout/retry message.
2. **Assets is missing from People navigation.** Add Assets, or place it under an explicit “More” menu with current-page highlighting.
3. **Employee account provisioning is not operationalized.** Add a directory filter and bulk action for “No account,” provisioning status, failure reason, resend invitation, and reconciliation with Users/Azure AD.
4. **Employee edit UX leaks implementation details.** Position, department, manager, and company edits include UUID-oriented placeholders. Use searchable governed selectors everywhere; never ask HR users for internal identifiers.
5. **The employee profile has excessive horizontal navigation.** Group tabs into stable domains (Profile, Employment, Lifecycle, Workforce, Growth, Pay) with a More menu and deep-linkable subsections.
6. **Organization data is not ready for real workflows.** Current people appear as top-level employees with zero reports. Add setup validation that flags orphan managers, unassigned departments/companies/positions, cycles, allocation overflow, and inactive references.
7. **Configuration is duplicated and has no guided dependency order.** “Onboarding Checklist” and “Onboarding Templates” point to the same route; employee documents repeat; lifecycle policies and journey configuration overlap without explaining which controls rules versus stages.

### P3 — quality and best-practice improvements

1. Add saved views, server-side sorting, page-size control, column selection, and URL-persisted directory filters.
2. Provide an accessible table caption and announce result counts, bulk-selection changes, loading completion, and asynchronous errors through live regions.
3. Add explicit empty states with next actions for probation, contracts, assets, and onboarding rather than generic “clear filters” guidance when the dataset is truly empty.
4. Show configuration source and last-updated metadata for every lifecycle rule/template.
5. Replace ambiguous lowercase labels such as `employee`, `position`, `location`, and `register` with consistent title case and clearer control names.
6. Add audit-log links to sensitive actions: bank/tax/ID changes, account creation/deactivation, manager changes, probation decisions, contract decisions, and offboarding completion.

## Configuration coverage checklist

| Configuration | Implemented | Required release check |
|---|---:|---|
| Company info and employee email domain | Yes | Domain verified; collision and invalid-domain handling tested |
| Company references | Yes | One active default; employee coverage validated |
| Division / department / section | Yes | Hierarchy, codes, archive rules, cycles, and allocation validated |
| Positions/designations | Yes | Active position coverage; department/company/manager consistency |
| Branches/work locations | Yes | Active locations mapped to employees and calendars |
| Grades, position levels, headcount types | Yes | Values used consistently by position and employee flows |
| Dropdown options | Yes | Ownership, deprecation, localization, and migration rules |
| Custom fields / field management | Yes | Scope, sensitivity, requiredness, visibility, export, and audit rules |
| Employee lifecycle policies | Yes | Probation length, contract notice, offboarding, assets, documents validated |
| Journey configuration | Yes | Exactly one active template per type; owner and visibility gaps blocked |
| Onboarding templates/tasks | Yes | Active default, owners, due offsets, ESS visibility, versioning |
| Document templates | Yes | Access, version, signature/acceptance, expiry, retention |
| Service desk categories/knowledge | Yes | Owner coverage, employee visibility, SLA, escalation |
| Users, groups, roles, permissions | Yes | Least privilege, field-level sensitive-data access, separation of duties |
| Sign-in, invitations, email delivery | Yes | SMTP/test-email, invitation expiry/resend, SSO/Azure AD reconciliation |
| Audit logs and retention | Partial surface | Confirm immutable events and retention for sensitive People actions |

## Recommended implementation sequence

1. Unhide and finish the People directory toolbar; add a visible Assets route.
2. Repair offboarding date normalization and backfill the invalid record.
3. Build lifecycle reconciliation so directory/profile/workspaces agree.
4. Add the four critical E2E journeys and permission matrix.
5. Improve onboarding performance and error/timeout states.
6. Replace UUID inputs, simplify profile navigation, and add account-provisioning operations.
7. Consolidate Admin Center lifecycle settings into a guided setup checklist with readiness diagnostics.

## Evidence and limitations

- Desktop authenticated Admin session only; no mutations were submitted.
- Visual evidence is from this audit run only.
- Keyboard structure and accessible names were inspected from the DOM. This is not a substitute for screen-reader, contrast, zoom, mobile, localization, or assistive-technology testing.
- Empty datasets prevented full visual validation of contract renewal, probation decisions, equipment return, and completed onboarding.
- Source inspection confirms implementations and configuration surfaces, but production integrations such as email, Azure AD, storage, and external identity delivery were not executed.

## Screenshots

- `01-people-directory.png` — table-only directory and missing management toolbar
- `02-onboarding.png` — prolonged loading skeleton
- `03-org-chart.png` — flat top-level organization state
- `04-probation.png` — zero-record probation workspace
- `05-offboarding.png` — Invalid Date / NaN days defect
- `06-contracts.png` — empty monitoring state
- `07-assets.png` — asset inventory
- `08-service-desk.png` — working ticket inbox
- `09-employee-detail.png` — comprehensive employee profile
