# FitScan - Complete User Manual
## Enterprise Applicant Tracking System (ATS)

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
3. [Authentication & User Management](#authentication--user-management)
4. [Dashboard & Analytics](#dashboard--analytics)
5. [Candidate Management](#candidate-management)
6. [Position Management](#position-management)
7. [Task Management](#task-management)
8. [User Preferences & Customization](#user-preferences--customization)
9. [System Settings & Configuration](#system-settings--configuration)
10. [API Documentation](#api-documentation)
11. [Troubleshooting & Support](#troubleshooting--support)
12. [Advanced Features](#advanced-features)

---

## 🎯 System Overview

### What is FitScan?
FitScan is a comprehensive, enterprise-grade Applicant Tracking System (ATS) built with modern web technologies. It provides advanced candidate management, automated workflows, AI-powered matching, and seamless integrations for recruitment teams of all sizes.

### Key Features
- **Real-time Dashboard & Analytics** with live updates
- **Advanced Candidate Management** with AI-powered matching
- **Customizable User Preferences** with cross-device synchronization
- **Role-based Access Control (RBAC)** for enterprise security
- **Workflow Automation** with N8N integration
- **Comprehensive Settings Management** for system administrators
- **API-First Architecture** with extensive documentation

### Technology Stack
- **Frontend**: Next.js 15.5.2, React 18, TypeScript
- **UI Framework**: Tailwind CSS, ShadCN UI Components
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 15
- **Authentication**: NextAuth.js (Azure AD + Credentials)
- **File Storage**: MinIO Object Storage
- **AI/ML**: Genkit (Google AI)
- **Real-time**: Server-Sent Events (SSE)
- **Automation**: N8N Workflow Engine

---

## 🚀 Getting Started

### Quick Access
- **Main Application**: http://localhost:8021
- **Default Admin Login**: admin@ncc.com / nccadmin
- **API Documentation**: http://localhost:8021/api-docs/ui
- **Settings Panel**: http://localhost:8021/settings
- **N8N Automation**: http://localhost:8921

### First-Time Setup
1. **Login with Admin Credentials**
2. **Navigate to Settings** → System Settings
3. **Configure Basic Settings**
4. **Set Up User Preferences**
5. **Customize Branding & Theme**
6. **Configure User Roles and Permissions**

### System Requirements
- **Docker & Docker Compose** (for production deployment)
- **Node.js 18+** (for development)
- **PostgreSQL 15+** (if not using Docker)
- **Modern Web Browser** (Chrome, Firefox, Safari, Edge)

---

## 🔐 Authentication & User Management

### Authentication Methods

#### 1. Basic Authentication (Email/Password)
- Traditional login with bcrypt hashing
- Self-service password changes
- Force password change capability
- Session management

#### 2. Azure AD SSO (Enterprise)
- Single Sign-On integration
- Enterprise directory synchronization
- Automatic user provisioning
- Group-based permissions

### User Roles & Permissions

#### Role Hierarchy
1. **Admin**
   - Full system access
   - User management
   - System configuration
   - All module permissions

2. **Recruiter**
   - Candidate management
   - Position management
   - Task board access
   - Limited system settings

3. **Hiring Manager**
   - View assigned candidates
   - Position review
   - Limited editing capabilities

#### Permission System
- **Module-level permissions**: Control access to specific features
- **Granular permissions**: Fine-grained control over actions
- **User groups**: Bulk permission management
- **Permission inheritance**: Group permissions with individual overrides

### User Management Features

#### User Creation & Editing
- **Personal Information**: Name, email, role, avatar
- **Authentication Settings**: Method, password policies
- **Team Assignment**: User groups and teams
- **Personal Preferences**: Colors, themes, display settings
- **Permission Management**: Individual and group permissions

#### User Groups & Teams
- **Group Management**: Create and manage permission groups
- **Team Organization**: Organize users by department or function
- **Bulk Operations**: Manage multiple users simultaneously
- **Permission Templates**: Apply standard permission sets

---

## 📊 Dashboard & Analytics

### Real-time Dashboard

#### Key Metrics Widgets
- **Total Candidates**: Real-time candidate count
- **Active Positions**: Open positions requiring attention
- **New Applications Today**: Daily application tracking
- **Recruitment Pipeline**: Stage-based candidate distribution
- **SLA Violations**: Service level agreement monitoring
- **Performance Analytics**: Recruiter and system performance

#### Interactive Charts
- **Candidate Distribution**: Pie charts by status and department
- **Application Trends**: Time series charts for new applications
- **Position Analytics**: Bar charts for position statistics
- **Fit Score Distribution**: Histogram of candidate fit scores
- **Recruiter Performance**: Individual and team metrics

#### Real-time Updates
- **Server-Sent Events (SSE)**: Live data synchronization
- **Automatic Refresh**: Background data updates
- **Connection Status**: Real-time connection monitoring
- **Update Indicators**: Visual feedback for data changes

### Analytics Features

#### Performance Metrics
- **Recruitment Velocity**: Time-to-hire analytics
- **Source Effectiveness**: Candidate source performance
- **Stage Conversion**: Pipeline conversion rates
- **Quality Metrics**: Fit score and hiring success rates

#### Customizable Views
- **Role-based Dashboards**: Different views for different roles
- **Widget Customization**: Show/hide specific metrics
- **Time Range Selection**: Flexible date filtering
- **Export Capabilities**: PDF and Excel export options

---

## 👥 Candidate Management

### Candidate Profiles

#### Comprehensive Information
- **Personal Details**: Name, email, phone, location
- **Professional Information**: Experience, education, skills
- **Application Data**: Position applied for, application date
- **AI-Powered Insights**: Parsed resume data, fit scores
- **Custom Fields**: Organization-specific attributes

#### Resume Management
- **Multiple Resume Support**: Version control and history
- **Automated Parsing**: AI-powered data extraction
- **File Storage**: Secure MinIO integration
- **Resume History**: Complete audit trail of uploads
- **Format Support**: PDF, DOC, DOCX files

#### Profile Images
- **Avatar Management**: Upload and manage candidate photos
- **Automatic Resizing**: Optimized image processing
- **Privacy Controls**: Configurable visibility settings

### Recruitment Pipeline

#### Stage Management
- **Customizable Stages**: Define recruitment pipeline stages
- **Visual Pipeline**: Kanban board with drag-and-drop
- **Stage Transitions**: Automated and manual stage changes
- **Transition History**: Complete audit trail with notes
- **Color Coding**: Visual stage identification

#### Candidate Movement
- **Drag-and-Drop Interface**: Intuitive stage transitions
- **Bulk Operations**: Move multiple candidates simultaneously
- **Transition Notes**: Add context to stage changes
- **Automated Workflows**: Trigger actions on stage changes
- **Approval Processes**: Multi-step approval for sensitive stages

### Advanced Features

#### AI-Powered Matching
- **Fit Score Calculation**: Automated candidate-position matching
- **Skill Analysis**: AI-powered skill extraction and matching
- **Experience Matching**: Years and type of experience analysis
- **Education Matching**: Degree and institution matching
- **Custom Criteria**: Organization-specific matching rules

#### Search & Filtering
- **Advanced Search**: Multi-field search capabilities
- **Saved Filters**: Reusable search criteria
- **Bulk Selection**: Select multiple candidates for operations
- **Export Options**: CSV and Excel export with custom fields
- **Real-time Filtering**: Instant search results

#### Communication
- **Comments System**: Threaded discussions on candidates
- **Activity Timeline**: Complete candidate interaction history
- **Notification System**: Real-time updates on candidate changes
- **Email Integration**: Automated email notifications

---

## 💼 Position Management

### Job Position Creation

#### Position Details
- **Job Title**: Position name and level
- **Department**: Organizational structure
- **Description**: Rich text job descriptions
- **Requirements**: Skills, experience, education
- **Match Criteria**: AI matching parameters
- **Hiring Timeline**: Expected start dates

#### Advanced Configuration
- **Position Levels**: Hierarchical position structure
- **Grade System**: Salary and level management
- **Recruiter Assignment**: Dedicated recruiter assignment
- **Custom Fields**: Organization-specific attributes
- **Headcount Management**: Position capacity tracking

### Position Analytics

#### Statistics & Metrics
- **Application Counts**: Total and recent applications
- **Candidate Quality**: Average fit scores
- **Time to Fill**: Recruitment timeline tracking
- **Source Analysis**: Application source effectiveness
- **Recruiter Performance**: Individual position metrics

#### Position Status Management
- **Open/Closed Status**: Position availability tracking
- **Auto-close Rules**: Automatic position closure
- **Reopening Process**: Reactivate closed positions
- **Archive Management**: Historical position data

### Integration Features

#### Job Matching
- **AI-Powered Matching**: Automatic candidate recommendations
- **Match Scoring**: Quantitative match quality assessment
- **Custom Matching Rules**: Organization-specific criteria
- **Match History**: Track matching algorithm performance

#### Bulk Operations
- **Import/Export**: CSV-based position management
- **Bulk Updates**: Modify multiple positions simultaneously
- **Template System**: Standardized position creation
- **Duplicate Detection**: Prevent duplicate positions

---

## 📋 Task Management

### My Tasks Board

#### Personalized View
- **Assigned Candidates**: Candidates assigned to current user
- **Stage-based Organization**: Kanban board by recruitment stages
- **Priority Management**: High, medium, low priority indicators
- **Due Date Tracking**: Timeline management for tasks
- **Progress Monitoring**: Visual progress indicators

#### Task Board Customization
- **Card Display Options**: Show/hide specific information
- **View Modes**: Kanban, list, and grid views
- **Filtering Options**: By stage, priority, assignee, date
- **Search Functionality**: Find specific candidates quickly
- **Bulk Actions**: Move multiple candidates between stages

#### Task Card Information
- **Candidate Details**: Name, email, position applied for
- **Fit Score**: AI-calculated match quality
- **Assignee Information**: Responsible recruiter
- **Status Badge**: Current recruitment stage
- **Skills Display**: Key candidate skills
- **Application Date**: When candidate applied

### Advanced Task Features

#### Drag-and-Drop Interface
- **Intuitive Movement**: Move candidates between stages
- **Visual Feedback**: Clear drop zones and animations
- **Bulk Movement**: Select and move multiple candidates
- **Undo Functionality**: Reverse accidental moves
- **Permission Checks**: Role-based movement restrictions

#### Real-time Collaboration
- **Live Updates**: See changes from other users instantly
- **User Presence**: See who's currently viewing candidates
- **Conflict Resolution**: Handle simultaneous edits gracefully
- **Activity Feed**: Track all task-related activities

#### Performance Tracking
- **Individual Metrics**: Personal task completion rates
- **Team Performance**: Department and team statistics
- **SLA Monitoring**: Service level agreement tracking
- **Productivity Analytics**: Time spent per task type

---

## ⚙️ User Preferences & Customization

### Personal User Preferences

#### Appearance Settings
- **Theme Selection**
  - Light Mode: Clean, bright interface
  - Dark Mode: Reduced eye strain for low-light environments
  - System Preference: Automatically follows OS settings
- **Personal Color Customization**
  - Primary color picker for interface elements
  - Accent color selection for highlights
  - Custom color schemes for personal branding
- **Layout Preferences**
  - Sidebar configuration and visibility
  - Navigation menu preferences
  - Display density (compact, normal, spacious)

#### Task Board Customization
- **Card Display Options**
  - Card width settings (Small, Medium, Large, Custom)
  - Show/hide elements:
    - Avatar images
    - Candidate names and emails
    - Descriptions and summaries
    - Fit scores with color coding
    - Assignee information
    - Priority indicators
    - Due dates and timelines
    - Tags and skills
    - Job application details
- **View Modes**
  - Kanban board view with drag-and-drop
  - List view for detailed information
  - Grid view for compact display
- **Filtering Preferences**
  - Default search terms
  - Priority filters (high, medium, low)
  - Assignee filters
  - Stage selections
  - Date range preferences

#### Positions Management Preferences
- **Display Settings**
  - Column visibility and ordering
  - Sort preferences (by date, title, department)
  - Filter defaults
  - Pagination settings
- **Custom Fields**
  - Show/hide custom fields
  - Field ordering and grouping
  - Display formatting options

#### Sidebar Configuration
- **Navigation Preferences**
  - Menu item visibility
  - Icon preferences and sizing
  - Collapsible sections
  - Quick access shortcuts
- **Quick Access**
  - Favorite pages and functions
  - Recent items and history
  - Custom shortcuts and bookmarks

### Preference Management Features

#### Real-time Synchronization
- **Automatic Saving**: Changes save automatically without manual intervention
- **Cross-device Sync**: Preferences synchronize across all devices and browsers
- **Conflict Resolution**: Handle simultaneous changes gracefully
- **Version History**: Track preference changes over time

#### Reset & Recovery Options
- **Individual Section Reset**: Reset specific preference categories
- **Complete Reset**: Restore all preferences to defaults
- **Backup & Restore**: Export/import preference settings
- **Template Management**: Save and apply preference templates

#### Advanced Features
- **User Group Preferences**: Apply preferences to user groups
- **Default Templates**: Organization-wide preference standards
- **Migration Tools**: Transfer preferences between users
- **Audit Logging**: Track preference changes for compliance

---

## 🔧 System Settings & Configuration

### System Settings

#### Core Configuration
- **Application Settings**
  - System-wide configurations and parameters
  - Integration settings and API endpoints
  - Automation workflow configurations
  - Upload queue processing settings
- **Database Management**
  - Connection settings and optimization
  - Backup configuration and scheduling
  - Migration management and versioning
  - Performance monitoring and tuning

#### Automation & Integration
- **Webhook Configuration**
  - Outgoing webhook endpoints
  - Authentication and security settings
  - Retry logic and error handling
  - Event filtering and routing
- **N8N Workflow Integration**
  - Workflow automation setup
  - Custom node configurations
  - Scheduled task management
  - Error handling and notifications

### Branding & Theme Settings

#### Global Branding
- **Application Identity**
  - Custom application name and branding
  - Logo upload and management
  - Favicon customization
  - Brand color schemes
- **Logo Management**
  - Multiple logo formats support
  - Automatic resizing and optimization
  - Logo positioning and alignment
  - Responsive logo display

#### Theme Customization
- **Color Schemes**
  - Primary and secondary color selection
  - Accent color customization
  - Background color options
  - Text color and contrast settings
- **Typography**
  - Font family selection
  - Font size and weight options
  - Line spacing and paragraph settings
  - Multi-language font support

#### Login Page Customization
- **Background Options**
  - Image backgrounds with upload support
  - Gradient backgrounds with color picker
  - Solid color backgrounds
  - Custom CSS styling options
- **Layout Customization**
  - Logo placement and sizing
  - Form styling and positioning
  - Button customization
  - Responsive design settings

### Data Configuration

#### Custom Fields Management
- **Candidate Custom Fields**
  - Field definitions and data types
  - Validation rules and constraints
  - Display preferences and formatting
  - Conditional field visibility
- **Position Custom Fields**
  - Job-specific field definitions
  - Department-specific attributes
  - Custom data validation
  - Field grouping and organization

#### Recruitment Stages
- **Pipeline Configuration**
  - Stage definitions and descriptions
  - Stage ordering and hierarchy
  - Transition rules and restrictions
  - Color coding and visual identification
- **Workflow Automation**
  - Stage-based trigger actions
  - Automated notifications
  - Approval processes
  - SLA monitoring and alerts

#### Candidate Sources
- **Source Management**
  - Source definitions and tracking
  - Source-specific configurations
  - Analytics and reporting
  - Integration with external systems

### User Management

#### Role-Based Access Control (RBAC)
- **User Roles**
  - Admin: Full system access and configuration
  - Recruiter: Candidate and position management
  - Hiring Manager: Limited access to assigned items
- **Permission Groups**
  - Module-level permission control
  - Feature access management
  - Data visibility rules
  - Action-based permissions

#### User Preferences Management
- **Bulk Preference Updates**
  - Apply preferences to multiple users
  - Template-based preference management
  - Default settings configuration
  - User group preference inheritance

---

## 📚 API Documentation

### Interactive Documentation
- **Swagger UI**: http://localhost:8021/api-docs/ui
- **Settings API**: http://localhost:8021/settings/api-docs
- **Endpoint Testing**: Built-in API testing tools
- **Authentication Testing**: Token and session testing

### Key API Endpoints

#### User Preferences API
- `GET /api/user-preferences` - Retrieve user preferences
- `PUT /api/user-preferences` - Update user preferences
- `DELETE /api/user-preferences` - Reset preferences to defaults
- `GET /api/user-preferences/[userId]` - Get specific user preferences

#### System Settings API
- `GET /api/settings/system` - Get system settings
- `PUT /api/settings/system` - Update system settings
- `GET /api/settings/system-preferences` - Get branding settings
- `PUT /api/settings/system-preferences` - Update branding settings

#### Candidate Management API
- `GET /api/candidates` - List candidates with filtering
- `POST /api/candidates` - Create new candidate
- `GET /api/candidates/[id]` - Get candidate details
- `PUT /api/candidates/[id]` - Update candidate
- `DELETE /api/candidates/[id]` - Delete candidate

#### Position Management API
- `GET /api/positions` - List positions
- `POST /api/positions` - Create new position
- `GET /api/positions/[id]` - Get position details
- `PUT /api/positions/[id]` - Update position
- `DELETE /api/positions/[id]` - Delete position

#### Task Management API
- `GET /api/taskboard/candidates` - Get task board data
- `PUT /api/transitions` - Update candidate stage
- `GET /api/transitions/[id]` - Get transition history

### Authentication Methods
- **API Keys**: For external integrations and automation
- **Session-based**: For web interface authentication
- **Azure AD**: For enterprise SSO integration
- **JWT Tokens**: For mobile and third-party applications

### Rate Limiting & Security
- **Rate Limiting**: Configurable request limits per endpoint
- **Authentication**: Multiple authentication methods supported
- **Authorization**: Role-based access control for all endpoints
- **Audit Logging**: Complete API usage tracking

---

## 🛠️ Troubleshooting & Support

### Common Issues & Solutions

#### User Preferences Not Saving
**Problem**: Changes to user preferences are not persisting
**Solutions**:
1. Check internet connection and network stability
2. Verify user permissions and authentication status
3. Clear browser cache and cookies
4. Check database connectivity and performance
5. Review browser console for JavaScript errors

#### Theme Not Applying
**Problem**: Theme changes are not visible or not working
**Solutions**:
1. Refresh the page or restart the browser
2. Clear browser cache and local storage
3. Check browser compatibility and version
4. Verify theme files are properly uploaded
5. Check for CSS conflicts or custom overrides

#### Settings Access Issues
**Problem**: Cannot access certain settings or configuration options
**Solutions**:
1. Verify user role and permission assignments
2. Check admin access and authentication
3. Contact system administrator for permission review
4. Review permission groups and inheritance
5. Check for system maintenance or updates

#### Real-time Updates Not Working
**Problem**: Live updates and SSE connections are not functioning
**Solutions**:
1. Check network connectivity and firewall settings
2. Verify SSE endpoint accessibility
3. Review browser SSE support and configuration
4. Check server logs for connection errors
5. Test with different browsers or devices

### Support Resources

#### Built-in Help System
- **Contextual Help**: In-app help and tooltips
- **Feature Documentation**: Detailed feature explanations
- **Video Tutorials**: Step-by-step video guides
- **FAQ Section**: Frequently asked questions and answers

#### Technical Support
- **Application Logs**: Comprehensive system and error logs
- **Health Monitoring**: System status and performance checks
- **Debug Tools**: Built-in debugging and diagnostic tools
- **Performance Metrics**: System performance monitoring

#### External Resources
- **API Documentation**: Complete API reference
- **Developer Guides**: Integration and customization guides
- **Community Forum**: User community and support
- **Professional Services**: Enterprise support and consulting

---

## 🚀 Advanced Features

### AI-Powered Features

#### Intelligent Candidate Matching
- **Fit Score Calculation**: Advanced algorithm for candidate-position matching
- **Skill Analysis**: AI-powered skill extraction and matching
- **Experience Matching**: Years and type of experience analysis
- **Education Matching**: Degree and institution matching
- **Custom Criteria**: Organization-specific matching rules

#### Automated Resume Processing
- **Resume Parsing**: Extract structured data from resumes
- **Data Validation**: Verify and clean extracted information
- **Duplicate Detection**: Identify duplicate candidates
- **Quality Scoring**: Assess resume quality and completeness

### Workflow Automation

#### N8N Integration
- **Visual Workflow Builder**: Drag-and-drop automation interface
- **Integration Hub**: Connect with 200+ external services
- **Webhook Support**: Trigger workflows via HTTP requests
- **Database Integration**: Direct connection to PostgreSQL
- **Custom Nodes**: Extend functionality with custom integrations

#### Automated Notifications
- **Email Notifications**: Automated email alerts and updates
- **SMS Integration**: Text message notifications for urgent items
- **Slack/Teams Integration**: Team communication platform integration
- **Custom Webhooks**: Trigger external system notifications

### Enterprise Features

#### Multi-tenancy Support
- **Organization Isolation**: Separate data and configurations
- **Custom Branding**: Organization-specific themes and logos
- **User Management**: Organization-specific user administration
- **Data Security**: Isolated data storage and access

#### Advanced Security
- **Single Sign-On (SSO)**: Enterprise authentication integration
- **Multi-factor Authentication**: Additional security layers
- **Audit Logging**: Complete system activity tracking
- **Data Encryption**: End-to-end data protection
- **Compliance**: GDPR, SOC2, and other compliance standards

#### Performance Optimization
- **Caching**: Built-in performance optimization
- **Database Optimization**: Query optimization and indexing
- **CDN Integration**: Content delivery network support
- **Load Balancing**: High availability and scalability
- **Background Processing**: Queue-based file processing

### Integration Capabilities

#### External System Integration
- **HRIS Integration**: Connect with HR information systems
- **CRM Integration**: Customer relationship management systems
- **Job Boards**: Integration with external job posting sites
- **Background Check Services**: Third-party verification services
- **Calendar Systems**: Interview scheduling integration

#### Data Import/Export
- **CSV Import/Export**: Bulk data management
- **API Integration**: RESTful API for data exchange
- **Webhook Support**: Real-time data synchronization
- **Data Migration**: Tools for system migration
- **Backup & Recovery**: Automated backup and restore

---

## 📝 Conclusion

FitScan represents a comprehensive, modern approach to applicant tracking and recruitment management. With its extensive customization options, real-time collaboration features, and enterprise-grade security, it provides organizations with the tools they need to streamline their recruitment processes.

### Key Benefits
- **User Experience**: Intuitive interface with extensive customization
- **Efficiency**: Automated workflows and AI-powered matching
- **Flexibility**: Adaptable to various organizational needs
- **Security**: Enterprise-grade access control and data protection
- **Scalability**: Handles growth from small teams to large enterprises
- **Integration**: Seamless connection with existing systems

### Getting the Most Out of FitScan
1. **Start with User Preferences**: Customize the interface to match your workflow
2. **Configure System Settings**: Set up branding and organizational preferences
3. **Train Your Team**: Ensure all users understand the features and capabilities
4. **Leverage Automation**: Use N8N workflows to automate repetitive tasks
5. **Monitor Performance**: Use analytics to optimize your recruitment process
6. **Stay Updated**: Keep the system updated with latest features and improvements

### Support and Resources
- **Built-in Documentation**: Comprehensive help system within the application
- **API Documentation**: Complete technical reference for developers
- **Community Support**: User community and knowledge sharing
- **Professional Services**: Enterprise support and customization services

---

*For technical support, feature requests, or additional information, please refer to the built-in documentation or contact your system administrator.*

**Version**: 1.0  
**Last Updated**: January 2025  
**Documentation**: Complete User Manual
