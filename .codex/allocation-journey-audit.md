# Annual Leave Allocation Journey Audit

## Scope

Combined UX and accessibility review of the Annual Leave Allocation flow at `/workforce/leave/allocation`, followed by implementation and browser verification.

## Journey health

1. **Configure — Healthy.** The flow now starts here, validates required fields, and prevents skipping ahead.
2. **Population — Healthy.** Population is explicitly sourced from policy assignments and all displayed totals use the same employee set.
3. **Review impact — Healthy.** Every exception requires an explicit include or exclude decision, followed by acknowledgement. Draft saving is functional.
4. **Execute — Healthy.** A separate final confirmation gates execution; the completed state provides a run receipt and ledger route.

## Original risks

- The page opened on step 3, so the policy and population decisions were easy to bypass.
- Population totals contradicted each other (245, 238, and 10 employees across the same journey).
- Exception controls only filtered the table; they did not record a decision.
- Continue-to-execute was not gated by completed exception review.
- Save draft had no behavior.
- Final execution lacked an explicit operator confirmation and useful completion receipt.

## Implemented changes

- Sequential step gating with backward navigation.
- One reconciled population source and department breakdown.
- Floating exception-resolution drawer with approve/exclude decisions.
- Readiness state and confirmation gate driven by unresolved exception count.
- Local draft persistence and restore feedback.
- Locked execution summary, final confirmation, and completion receipt.

## Evidence

- `allocation-journey-audit-configure.png`
- `allocation-journey-audit-population.png`
- `allocation-journey-audit-review.png`
- `allocation-journey-implemented-configure.png`
- `allocation-journey-implemented-population.png`
- `allocation-journey-implemented-review.png`
- `allocation-journey-implemented-review-ready.png`
- `allocation-journey-implemented-execute.png`

## Accessibility limits

Keyboard-accessible semantic controls, disabled states, labels, focus-managed drawers, and text status are present. Full screen-reader and zoom/reflow testing was not performed in this audit.
