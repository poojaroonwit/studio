# Changelog

All notable changes to FitScan Enterprise ATS will be documented in this file.

---

## [v1.2.3-beta.1] - 2026-01-08

### Improved
- ⚡ **Auth Performance Optimization**: Significant reduction in login time (~50-70% faster). Consolidated multiple sequential database queries into a single optimized query, and throttled session activity updates to once per 60 seconds (instead of every request), dramatically reducing DB write overhead during active sessions.
- 🔄 **Retry Process Queue**: Enhanced the Candidate Import Upload Queue with a retry mechanism for failed jobs. Users can now manually retry failed uploads directly from the queue interface (`CandidateImportUploadQueue.tsx`), improving robustness for transient failures.
- 🎨 **Positions Filter Dropdown**: Increased the width of the positions filter dropdown to 450px to better accommodate long position titles and improve readability.
- ⚠️ **Loading Error Message**: Improved error handling on the Candidates page. The application now gracefully handles initial fetch errors (`initialFetchError`) and displays user-friendly error messages instead of crashing or showing blank states.
- 🔇 **Console Noise Reduction**: Silenced verbose logging in `initialize-warning-conditions.ts` to improve console readability during startup.

### Changed
- 📄 **Applicants Pagination**: Removed the "1000" items per page option to prevent performance issues. Default page size remains 20, but users can select up to 100 items per page.


### Added
- 🔒 **Screen Capture Protection**: New configurable protection against screen capture and video recording. When enabled, blurs page content when tab loses visibility, blocks PrintScreen key, and Windows Snipping Tool shortcut. Includes UI configuration in System Settings.
- 🔒 **Right-Click Protection**: New configurable option to disable right-click context menu across the application for enhanced security. Includes UI configuration in System Settings.
- 🔒 **Account Lockout**: Implemented security policy to permanently disable user account after 3 consecutive failed login attempts. Requires administrator intervention to unlock.
- ✨ **2FA Configuration in Profile**: Added a "Two-Factor Authentication" section to the "Account Settings" tab in the User Profile modal. Users can now view their 2FA status and easily access the configuration page to enable/disable 2FA.
- 📊 **Azure AD Sync Progress**: Added real-time progress indicator for user synchronization. The sync now streams status updates (e.g., "Fetching users...", "Processing 50/100...") to the UI via toast notifications.
- 📦 **Docker Image Optimization**: Enabled Next.js standalone output and optimized Dockerfile for significantly smaller image sizes (~70% reduction).

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
