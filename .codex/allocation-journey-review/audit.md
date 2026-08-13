# Leave allocation journey review

Scope: `/workforce/leave/allocation`, desktop viewport, manager/admin allocation workflow.

## Journey health

1. **Enter Allocation Plans — Healthy.** The landing page now explains that this workspace creates plans, reviews impact, and tracks completed balance updates. It no longer labels the entire workspace as a draft.
2. **Start or resume a plan — Healthy.** A saved device draft has a single Resume action. Starting another plan warns before the saved draft can be replaced.
3. **Review impact and exceptions — Healthy.** Returning to Plans now saves the active draft first, so the user does not silently lose their review state.
4. **Inspect ready, scheduled, and completed plans — Healthy.** Example/history records open their own read-only plan details instead of loading the unrelated saved draft workflow. Ledger access appears only after a plan is completed.
5. **Exit to leave operations — Healthy.** The page-level action now routes to `/workforce/leave/control-panel`.

## Issues found and fixed

- The global “Draft” label implied that the Plans index itself was an in-progress allocation.
- “Exit setup” pointed to the missing `/workforce/leave/control` route.
- Opening the ready Thailand plan loaded the Anaalu draft's policy and population.
- Returning to Plans from review did not communicate that work would be preserved.
- Starting a new allocation could overwrite the saved device draft without warning.
- Ready and scheduled records exposed a ledger action before an allocation had executed.

## Evidence

- `01-plans-current.png` — initial Plans landing.
- `02-ready-plan-current.png` — initial mismatched ready-plan workflow.
- `03-plans-fixed.png` — corrected Plans landing and actions.
- `04-ready-details-fixed.png` — correct Thailand plan details drawer.
- `05-resume-fixed.png` — resumed review with Save & return control.
- `06-return-fixed.png` — successful return to the Plans landing.

## Validation

- Targeted ESLint passed for both changed components.
- `git diff --check` passed.
- Browser checks confirmed the Plans return path, the corrected control-panel href, the Ready/View action, and the plan-specific details drawer.
- The allocation execution action was not submitted because it is the irreversible step in the journey.
- Browser history contains an unrelated existing Performance module import error; the allocation page itself remained usable during this review.

## Evidence limits

This review covers the visible desktop flow and targeted browser interactions. It is not a full screen-reader, browser-matrix, mobile, or production-data audit.
