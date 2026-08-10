# System Preferences UX audit

## Scope

Combined UX and screenshot-based accessibility review of the admin journey from entering System Preferences through General, Appearance, Branding & Theme, and Sidebar settings.

## User goal

Find a settings category, understand what a control changes, make a change safely, and know whether it was saved.

## Captured steps

1. **Settings entry — poor:** `01-onboarding-interruption.png` shows an unrelated, scroll-heavy workspace setup dialog obscuring the requested destination.
2. **General settings — fair:** `02-general-settings.png` has clear section labels and descriptions, but category state was not represented in the URL.
3. **Sidebar settings — poor:** `03-sidebar-settings.png` shows a false Saving state caused by category navigation and a dense control layout with important color controls below the fold.
4. **Appearance settings — fair:** `04-appearance-settings.png` has useful device tabs and guidance, but category navigation again triggered Saving.
5. **Branding settings — poor:** `05-branding-settings.png` shows multiple broken-image previews without recovery guidance.
6. **Improved branding journey — good:** `06-improved-branding-settings.png` shows contextual onboarding removed, recoverable asset failures, and stable category navigation.
7. **Simplified Sidebar colors — good:** `07-sidebar-progressive-disclosure.png` keeps common background and text controls visible while moving hover, border, and button colors into an optional Advanced colors disclosure.

## Implemented improvements

- Restrict automatic workspace onboarding to dashboard entry points.
- Keep category selection in the URL with `?tab=...` and preserve other query parameters.
- Mark category navigation as navigation semantics and expose the current page to assistive technology.
- Allow horizontal category scrolling on narrow viewports.
- Exclude navigation clicks from autosave so Saving communicates actual setting changes.
- Replace broken logo images with an actionable “Preview unavailable — upload to replace” state.
- Group low-frequency Sidebar color controls under an accessible native disclosure.
- Announce a short “Saved” confirmation after autosave completes.

## Remaining opportunities

- Reduce the 500MB logo recommendation; it is unusually large for UI branding assets.
- Test keyboard traversal, focus visibility, color contrast, zoom/reflow, and screen-reader announcements separately. Screenshots alone cannot confirm WCAG conformance.
