# System Test Cases

**Project Name:** FitScan - Enterprise Applicant Tracking System
**Version:** 2.2
**Date:** December 16, 2025
**Status:** Active Development

---

## 1. Authentication Module

### TC-AUTH-001: Mobile Login View
*   **Description**: Verify the specialized mobile login interface.
*   **Pre-conditions**: Device viewport < 768px. User is logged out.
*   **Steps**:
    1.  Navigate to `/auth/signin`.
    2.  Observe layout.
*   **Expected Result**:
    1.  Displayed in "Card" mode with rounded top corners.
    2.  Bottom navigation menu is **NOT** visible.
    3.  App logo and header texts are centered/aligned for mobile.

### TC-AUTH-002: Desktop Login View
*   **Description**: Verify standard desktop interface.
*   **Pre-conditions**: Device viewport > 1024px.
*   **Steps**:
    1.  Navigate to `/auth/signin`.
*   **Expected Result**:
    1.  Standard Login UI (Split screen or Center box) displayed.
    2.  No "Card" styling present.

### TC-AUTH-003: Azure AD SSO
*   **Description**: Verify Single Sign-On functionality.
*   **Pre-conditions**: Azure AD configured in Settings.
*   **Steps**:
    1.  Click "Sign in with Microsoft".
    2.  Complete external IDP flow.
*   **Expected Result**:
    1.  User redirected back to Dashboard (`/`).
    2.  Session created successfully.

## 2. Navigation Module

### TC-NAV-001: Bottom Navigation Presence
*   **Description**: Verify navigation bar persistence on authenticated pages.
*   **Pre-conditions**: Logged in on Mobile.
*   **Steps**:
    1.  Visit `/`.
    2.  Visit `/candidates`.
    3.  Visit `/positions`.
*   **Expected Result**:
    1.  Bottom Navigation bar visible on all pages.
    2.  Active tab highlighted correctly.

### TC-NAV-002: Content Padding (Overlap Check)
*   **Description**: Ensure fixed navigation does not obscure content.
*   **Pre-conditions**: Logged in on Mobile.
*   **Steps**:
    1.  Open Candidate Detail page.
    2.  Scroll to absolute bottom of "Timeline".
*   **Expected Result**:
    1.  Last timeline item is fully visible above the Nav bar.
    2.  Scroll area has sufficient `padding-bottom` (approx 160px/`pb-40`).

## 3. Evaluation Module

### TC-EVAL-001: Real-time Score Sync
*   **Description**: Verify scores sync between users.
*   **Pre-conditions**: Two users (A & B) viewing same Candidate Evaluation.
*   **Steps**:
    1.  User A changes "Communication" score to 4.
    2.  Observe User B's screen.
*   **Expected Result**:
    1.  User B's slider updates to 4 instantly without reload.
    2.  Toast notification "Score updated" appears.

### TC-EVAL-002: Mobile Evaluation Form
*   **Description**: Verify touch responsiveness.
*   **Pre-conditions**: Mobile device.
*   **Steps**:
    1.  Open Evaluation form.
    2.  Drag slider for a skill.
    3.  Tap "Next" to move to next question.
*   **Expected Result**:
    1.  Slider moves smoothly.
    2.  Transition to next question is smooth.
    3.  No layout breakage.

## 4. Candidate Management Module

### TC-CAND-001: Fit Score Filter
*   **Description**: Verify AI score filtering.
*   **Pre-conditions**: Candidates exist with varying fit scores.
*   **Steps**:
    1.  Open Filters.
    2.  Set Fit Score range to 80-100%.
*   **Expected Result**:
    1.  List filters to show only candidates with scores >= 80%.

### TC-CAND-002: Import Resume
*   **Description**: Verify resume parsing.
*   **Pre-conditions**: PDF Resume available.
*   **Steps**:
    1.  Click "Import".
    2.  Upload PDF.
*   **Expected Result**:
    1.  Progress bar shows upload status.
    2.  Candidate created with Name, Email, Phone pre-filled from resume.

## 5. Settings Module

### TC-SET-001: Custom Fields Creation
*   **Description**: Verify adding new field.
*   **Pre-conditions**: Admin access.
*   **Steps**:
    1.  Go to Settings -> Custom Fields.
    2.  Create "T-Shirt Size" (Dropdown).
    3.  Go to Candidate Profile.
*   **Expected Result**:
    1.  "T-Shirt Size" dropdown appears in candidate details.
    2.  Can save value.
