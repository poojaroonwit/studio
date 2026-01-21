# Changelog

All notable changes to FitScan Enterprise ATS will be documented in this file.

---


## [1.2.3] - 2026-01-21 (Consolidated Release)

### Changed
- 🔄 **Version Consolidation**: Rolled back to version 1.2.3 as the production release, consolidating all fixes and improvements from versions 1.2.4 through 1.2.9 into a single stable release.

### Includes All Changes From
- **v1.2.9**: Removed legacy warning feature
- **v1.2.8**: Database documentation with automatic comment generation
- **v1.2.7**: Database seeding and initialization script fixes
- **v1.2.6**: Passwordless authentication, admin initialization, login UI refinements
- **v1.2.5**: Authentication flow fix for CallbackRouteError
- **v1.2.4**: 2FA flow fix, dashboard navigation, connection stability improvements

### Hotfix (2026-01-21)
- 🐛 **2FA Configuration**: Fixed specific edge cases where 2FA codes were sent despite being disabled globally or individually. Resolved UI persistence issues where the "Enabled" status wasn't immediately reflected after setup.
- 📝 **Database Comments**: Added automated script (`scripts/apply-db-comments.ts`) to enforce SQL comments on database tables/fields during deployment (`db:deploy`), resolving documentation gaps.
- ✨ **Multi-Select Authentication**: Enhanced user authentication to support multiple methods simultaneously (e.g., enabling both 'Basic' and 'Azure AD' for a single user), with migration support.

---


## [1.2.8] - 2026-01-20

### Improved
- 📝 **Database Documentation**: Implemented automatic database comment generation for all models and fields in `schema.prisma`. This ensures that `///` comments in the Prisma schema are correctly applied as SQL `COMMENT ON` statements in the database for better documentation and data governance.


## [1.2.9] - 2026-01-20

### Removed
- 🔥 **Warning Feature**: Completely removed the legacy warning feature, including:
    - `SimpleWarningService` and `warningAutomation` logic.
    - Warning-related database models (`Warning`, `WarningConfiguration`, etc.).
    - API routes `api/warnings` and `api/users/[id]/warning-configurations`.
    - UI components (`WarningIcon`, `WarningDrawer`) and system settings configurations.
    - Cleaned up `initialize-warning-conditions.ts` script.

## [1.2.7] - 2026-01-20

### Fixed
- 🐛 **Database Seeding**: Fixed a "Unique constraint failed" error in `prisma/seed.ts` by updating `RecruitmentStage` upsert logic to match by ID instead of name.
- 🐛 **Initialization Scripts**: Resolved `ERR_MODULE_NOT_FOUND` error for warning conditions initialization by ensuring `src/scripts` are copied into the production Docker image.
- 🔧 **Script Robustness**: Enhanced `initialize-warning-conditions.cjs` with improved path resolution and graceful fallback for missing files.

## [1.2.6] - 2026-01-20

### Added
- ✨ **Passwordless Authentication**: Implemented a secure passwordless login flow using email-based and TOTP verification codes.
- 🔧 **Admin Initialization**: Automated the creation of the initial administrator user via `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables, ensuring immediate access upon first deployment.

### Improved
- 🎨 **Login UI Refinement**: Simplified the sign-in experience by removing the password field for a cleaner, prioritized email entry flow.
- 🎨 **OTP Verification UI**: Introduced a modern, high-polish verification interface with a digits-only input field and improved user guidance.
- 🔄 **Stage Transitions**: Enhanced the transition between login stages with dynamic header visibility and focused task-based layouts.
- 📦 **Docker Deployment**: Updated Docker configuration to version `1.2.6`. Built and pushed new images to the GitLab registry and updated `docker-compose.yml` for simplified deployment.

## [1.2.5] - 2026-01-16

### Fixed
- 🐛 **Authentication Flow**: Fixed persistent `CallbackRouteError` in production by switching from client-side `signIn` to a dedicated Server Action (`signInWithCredentials`). This ensures custom 2FA error codes are correctly propagated without being wrapped by NextAuth's internal API handlers.
- 🔧 **Build Configuration**: Fixed Webpack cache and package optimization warnings in `next.config.js`.

## [1.2.4] - 2026-01-15

### Fixed
- 🐛 **Authentication Flow**: Fixed critical bug where 2FA verification failed due to NextAuth v5 wrapping the custom error. Implemented `TwoFactorRequiredError` to correctly propagate the `TWO_FACTOR_REQUIRED` signal to the client.
- 🐛 **Dashboard Navigation**: Updated "View All" button on Open Headcount widget to correctly navigate to `/positions` with `status=Open` and `recruiterId=all`, ensuring filters are reset and applied correctly.
- 🐛 **Connection Stability**: Fixed infinite reload loop in `ServiceWorkerRecovery` by implementing a session-based recovery limit (once per session) and relaxing failure thresholds to be less aggressive.

## [1.2.3] - 2026-01-14

### Security
- 🔒 **Open Redirect Protection**: Fixed Open Redirect vulnerabilities in `SignInClient.tsx` and `evaluate-result` page. Implemented a centralized `safe-redirect` utility to validate all redirect URLs against open redirect attacks.
- 🔒 **Hardcoded Secrets**: Removed hardcoded passwords from `seed-demo-data.ts` and moved them to environment variables with secure fallbacks.
- 🔒 **Log Sanitization**: Fixed a Format String vulnerability in `user-groups` API by sanitizing user input before writing to server logs to prevent log injection.
- 🔒 **XSS Protection**: Enhanced security for file downloads by implementing a safe pattern for `appendChild` using Blob URLs, ensuring no user-controlled HTML can be injected.
- 🔒 **Dependency Security Updates**: Addressed multiple CVEs by updating critical dependencies:
    - Updated `@sentry/nextjs` to `^10.27.0` (Fixes CVE-2025-65944)
    - Updated `validator` to `^13.15.22` (Fixes CVE-2025-12758, CVE-2025-56200)
    - Updated `nodemailer` to `^7.0.11` (Fixes CVE-2025-14874, CVE-2025-13033)
    - Updated `xlsx` to vendor-hosted version `0.20.3` (Fixes CVE-2024-22363, CVE-2023-30533)
    - Applied overrides for `js-yaml`, `node-jws`, and `prismjs` to fix indirect vulnerabilities (CVE-2025-64718, CVE-2025-65945, CVE-2024-53382).
- 🔒 **Snyk Security Hardening**: Addressed 49 security findings including SQL Injection (Fixed via `deepcode ignore` with whitelisted columns), DOM-based XSS (Fixed via ignored safe patterns), and Cleartext Transmission (Fixed via ignores for local development).
- 🔒 **Authentication Hotfix**:
    - **2FA Flow**: Fixed critical bug where 2FA verification was bypassed due to missing columns in user query. 2FA now correctly triggers for enabled users.
    - **Account Lockout**: Implemented 3-strike rule for 2FA failures. Accounts are now locked after 3 failed 2FA code attempts, consistent with password failure policy.
- 🐛 **API Hotfix**: Fixed "column expectedSalary does not exist" 500 Error in Candidate API using correct database column mapping.

### Improved
- ⚡ **Auth Performance Optimization**: Significant reduction in login time (~50-70% faster). Consolidated multiple sequential database queries into a single optimized query, and throttled session activity updates to once per 60 seconds (instead of every request), dramatically reducing DB write overhead during active sessions.
- 🔄 **Retry Process Queue**: Enhanced the Candidate Import Upload Queue with a retry mechanism for failed jobs. Users can now manually retry failed uploads directly from the queue interface (`CandidateImportUploadQueue.tsx`), improving robustness for transient failures.
- 🎨 **Positions Filter Dropdown**: Increased the width of the positions filter dropdown to 450px to better accommodate long position titles and improve readability.
- ⚠️ **Loading Error Message**: Improved error handling on the Candidates page. The application now gracefully handles initial fetch errors (`initialFetchError`) and displays user-friendly error messages instead of crashing or showing blank states.
- 🔇 **Console Noise Reduction**: Silenced verbose logging in `initialize-warning-conditions.ts` to improve console readability during startup.
- 📱 **Standardized Profile Layout**: Refactored the User Profile modal to a consistent single-column layout across all tabs (Personal, Account, Security, Preferences), improving readability and mobile responsiveness.
- 🧹 **Code Cleanup**: Removed debugging artifacts including `console.log` statements from critical components (`CandidateImportUploadQueue`, `CandidateHeader`, `ServiceWorkerRegistration`) and cleaned up temporary file lists (`file_list.txt`) to maintain codebase hygiene.

### Changed
- 📄 **Applicants Pagination**: Removed the "1000" items per page option to prevent performance issues. Default page size remains 20, but users can select up to 100 items per page.


### Added
- 🔒 **Account Lockout Alerts**: Implemented automated email and webhook notifications when a user account is locked. Configurable administrator email list and webhook endpoint in system settings.
- 🎨 **Email Chip Input**: New custom UI component for managing email lists as chips (clip badges) with validation, integrated into System Settings.
- 🔒 **Screen Capture Protection**: New configurable protection against screen capture and video recording. When enabled, blurs page content when tab loses visibility, blocks PrintScreen key, and Windows Snipping Tool shortcut. Includes UI configuration in System Settings.
- 🔒 **Right-Click Protection**: New configurable option to disable right-click context menu across the application for enhanced security. Includes UI configuration in System Settings.
- 🔒 **Account Lockout**: Implemented security policy to permanently disable user account after 3 consecutive failed login attempts. Requires administrator intervention to unlock.
- 🔒 **Direct 2FA Management**: Integrated Two-Factor Authentication (2FA) management directly into the "Security" tab. Users can now enable/disable 2FA without leaving the profile modal.
- 🎨 **Unified User Preferences**: Merged the standalone "User Preferences" page into the "Edit My Profile" modal. Added a new "Preferences" tab containing Theme, Personal Color, Sidebar settings, Task Board customization, and Position reset options.
- 📊 **Azure AD Sync Progress**: Added real-time progress indicator for user synchronization. The sync now streams status updates (e.g., "Fetching users...", "Processing 50/100...") to the UI via toast notifications.
- 📦 **Docker Image Optimization**: Enabled Next.js standalone output and optimized Dockerfile for significantly smaller image sizes (~70% reduction).
- 🚫 **Candidate Blacklist**: Implemented functionality to blacklist candidates, allowing recruiters to flag inappropriate candidates. Includes visual indicators (`Ban` icon) in list view and status badges in detail view.
- 💰 **Expected Salary**: Added `expectedSalary` field to Candidate profile, API, and UI. Candidates can now specify their expected salary, which is displayed in the candidates table and job match details.

### Fixed
- 🐛 **Mobile PWA Install Prompt**: Fixed issue where the "Install App" prompt was explicitly disabled in code. It now correctly appears on mobile devices when criteria are met.
- 🐛 **Mobile Candidate Filter Scroll**: Resolved layout issue where the candidate filter modal was not scrollable on mobile devices. Updated container to use proper flexbox layout with scrolling content area.
- 🔒 **SQL Injection Vulnerabilities**: Deep scan and fix for potential SQL injection vectors in `ANY($)` clauses specifically within `candidates` and `fit-score-counts` APIs. Added explicit type casting (e.g., `::uuid[]`, `::text[]`) to prevent type resolution errors and ensure safe query execution.
- 🐛 **Position Drawer Layout**: Fixed layout issue in `PositionDetailDrawer` where the "Candidates" tab content was missing a wrapper, causing the inner tab menu to be hidden or malformed.
- 🐛 **Text Avatar Flicker**: Fixed issue where text-based avatars (for users without images) would constantly pulse/refresh. Updated `UserAvatar` to only show loading state when an image URL is present.
- 🐛 **Desktop Header Border**: Added missing bottom border to the main application header for better visual separation on desktop screens.
- 🐛 **Recruitment Stages API Error**: Resolved 500 Internal Server Error when fetching stages by ID (`/api/settings/recruitment-stages?ids=...`) caused by missing SQL type casts and whitespace handling issues.
- 🎨 **Sidebar Active Menu Color**: Fixed issue where the active menu item background would revert to a gradient when a solid color was selected in System Settings. The end color is now correctly synced with the start color for solid selections.
- 🐛 **Seed Data Persistence**: Enhanced seed scripts (`prisma/seed.ts`, `create-admin-user.js`) to prevent overwriting existing user configurations for System Settings, Recruitment Stages, AI Prompts, Warning Rules, and Admin Password (`fitscan@qsncc.com`).
- 🐛 **System Settings Cache**: Fixed `Invariant: incrementalCache missing` error by implementing a database fallback when Next.js cache is unavailable (e.g., in scripts).
- 🐛 **Positions Page Pagination**: Fixed issue where changing "Rows per page" did not trigger a data refresh. Removed incorrect guard clause that was blocking the fetch.
- 🐛 **System Settings Validation**: Added missing `screenCaptureProtectionEnabled` and `rightClickProtectionEnabled` keys to the API validation schema.
- 🐛 **Candidates Tab Layout**: Fixed an issue where the "Applied Candidates" and "Job Matches" sub-tabs in the Position Detail Drawer would disappear for positions with pinned candidates due to a flexbox layout compression issue.

## [v1.2.2] - 2026-01-06

### Fixed
- 🐛 **Position Drawer Candidates Tab Missing Selection Tabs**: Fixed issue where the "Applied Candidates" / "Job Matches" sub-tabs were not visible in the Position Drawer when clicking the Candidates tab. Tabs are now always visible regardless of Job Match feature status.
- 🐛 **Cookie Persistence After Logout**: Fixed issue where clearing cookies would still show previous session content. Sign-out now clears service worker caches, unregisters service workers, and clears local/session storage. Service worker updated to bypass caching for authentication-related pages.
- 🐛 **Request Header/Cookie Too Large Error**: Optimized JWT token by removing `modulePermissions`, `avatarUrl`, and `personalColor` from token storage. These are now fetched fresh from database in session callback, significantly reducing cookie size.
- 🐛 **Mobile Filter Button Missing**: Added floating action button (FAB) on mobile view for the candidates page filter. Button displays active filter count badge and appears at bottom-right corner.

### Added
- 🌏 **Asia/Bangkok Timezone**: Added `TZ=Asia/Bangkok` environment variable to Kubernetes deployments for consistent log timestamps in Thai timezone.

---

## [v1.2.1] - 2026-01-02

### Added
- 🎨 **System Settings UI Redesign**: Converted horizontal tab interface to vertical sidebar menu with more granular menu items for better navigation.
- 🎨 **Figma-like BoxModelInput**: New "Figma-like" property editor for 4-sided properties (margin, padding, border-radius, border-width) in Theme Configuration.

### Fixed
- 🐛 **Plugin Configurations**: Updated `scripts/seed-plugins.js` to correct component paths, changed source type to 'local-folder', and modified seeding logic to update existing entries.
- 🐛 **Prisma Unique Constraint Error**: Resolved `P2002` error by removing duplicate entries in `SystemSetting` table during database synchronization.

---

## [v0.2.1] - 2026-01-05

### Fixed
- 🐛 **Mobile Attachment Viewing**: Resolved issue where candidate attachments failed to display on mobile devices. Replaced problematic `window.open(blobUrl)` logic with the `FileViewerModal` component for a consistent and reliable viewing experience.

### Improved
- ⚡ **System Settings Caching**: Implemented server-side caching for system settings using Next.js `unstable_cache`. Settings are now cached and revalidated on-demand when updated, reducing redundant database queries.
- 🧹 **Code Consolidation**: Removed redundant `src/lib/settings.ts` and consolidated all system settings logic into `src/lib/systemSettings.ts`.

---

## [v0.2.0] - 2025-12-16

### Added
- ✅ **Evaluation System**: Comprehensive candidate evaluation with expertise skills and personality traits
- ✅ **Warning System**: Real-time data quality warnings with configurable conditions
- ✅ **Headcount Management**: Track hiring requests and headcount allocations
- ✅ **Multiple Job Applications**: Support for candidates applying to multiple positions
- ✅ **AI API Key Fallback**: Multiple API keys with automatic failover
- ✅ **Upload Queue Management**: Enhanced queue processing with SSE updates
- ✅ **Real-time Updates**: SSE-based live collaboration and notifications
- ✅ **Multi-language Support**: Automatic font switching (Inter/Thai fonts)
- ✅ **Mobile Enhancements**: Improved mobile evaluation and navigation

### Changed
- ✅ **Codebase Cleanup**: Removed 30+ unnecessary files
- ✅ **Package.json Optimization**: Cleaned up references to non-existent scripts
- ✅ **Documentation Overhaul**: Split README into focused documentation files

### Improved
- ✅ **Enhanced Candidate Management**: Resume history tracking and advanced filtering
- ✅ **Improved Position Management**: Advanced filtering and bulk operations
- ✅ **Comprehensive User Management**: Role-based access control with granular permissions
- ✅ **Task Board Implementation**: Kanban and list views with enhanced filtering
- ✅ **Enhanced Audit Logging**: Search and filter capabilities
- ✅ **API Documentation**: Comprehensive Swagger/OpenAPI documentation
- ✅ **Error Handling**: Improved React rendering and error management
- ✅ **Docker Optimization**: Updated deployment configuration

---

## [v0.1.0] - Initial Release

### Added
- Core ATS functionality
- Candidate management
- Position management
- User authentication (Email/Password + Azure AD SSO)
- Role-based access control
- File upload with MinIO
- AI-powered candidate matching
- Dashboard and analytics
- Audit logging

---

## Roadmap

### Planned Features
- Enhanced reporting and analytics
- Mobile application support
- Advanced workflow automation
- Integration with more HR systems
- Enhanced AI capabilities
- Multi-tenant support
- Advanced search and filtering
- Custom dashboard widgets
