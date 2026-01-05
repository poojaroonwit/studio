# Changelog

All notable changes to FitScan Enterprise ATS will be documented in this file.

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
