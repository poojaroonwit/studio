# FitScan User Manual
## Enterprise Applicant Tracking System

**Version:** 1.0  
**Date:** January 2025  
**Language:** English  

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Roles and Permissions](#user-roles-and-permissions)
3. [Dashboard Overview](#dashboard-overview)
4. [Candidate Management](#candidate-management)
5. [Position Management](#position-management)
6. [Task Management](#task-management)
7. [User Management](#user-management)
8. [System Settings](#system-settings)
9. [Analytics and Reporting](#analytics-and-reporting)
10. [Troubleshooting](#troubleshooting)
11. [Appendices](#appendices)

---

## Getting Started

### System Access
1. **Login URL**: Navigate to your FitScan instance (e.g., `http://localhost:8021`)
2. **Default Credentials**:
   - **Email**: `admin@ncc.com`
   - **Password**: `nccadmin`
3. **First Login**: Change your password immediately after first login

### System Requirements
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Screen Resolution**: 1280x720 minimum (1920x1080 recommended)
- **Internet Connection**: Stable broadband connection
- **JavaScript**: Must be enabled

### Initial Setup
1. **Change Password**: Go to Settings → Profile → Change Password
2. **Update Profile**: Complete your user profile information
3. **Configure Preferences**: Set your display preferences and notifications
4. **Explore Dashboard**: Familiarize yourself with the main dashboard

---

## User Roles and Permissions

### Admin Role
**Full system access with all permissions**

**Capabilities:**
- Manage all users and permissions
- Configure system settings
- Access all candidates and positions
- View system logs and analytics
- Manage recruitment stages and custom fields
- Configure webhooks and integrations

**Key Features:**
- User management and role assignment
- System configuration and customization
- Advanced analytics and reporting
- Security and audit management

### Recruiter Role
**Candidate and position management with limited system access**

**Capabilities:**
- Manage assigned candidates
- Create and manage positions
- Update candidate status and notes
- Access task board and workflows
- View recruitment analytics
- Upload and manage resumes

**Key Features:**
- Candidate lifecycle management
- Position management
- Task board and workflow tools
- Basic reporting and analytics

### Hiring Manager Role
**Limited access for candidate evaluation and decision-making**

**Capabilities:**
- View assigned candidates
- Access candidate profiles and resumes
- Provide interview feedback
- Update candidate status
- View position details
- Access basic reports

**Key Features:**
- Candidate evaluation tools
- Interview feedback system
- Status update capabilities
- Basic reporting access

---

## Dashboard Overview

### Main Dashboard Components

#### 1. Key Performance Indicators (KPIs)
- **Total Candidates**: Current number of candidates in the system
- **Active Positions**: Number of open positions
- **New Applications Today**: Applications received today
- **Hiring Rate**: Percentage of successful hires
- **Time to Hire**: Average time from application to hire
- **Recruiter Performance**: Individual recruiter metrics

#### 2. Candidate Distribution Chart
- Visual representation of candidates by status
- Interactive chart with drill-down capabilities
- Real-time updates via Server-Sent Events
- Color-coded status indicators

#### 3. Recent Activity Feed
- Latest candidate status changes
- New applications and updates
- System notifications
- User actions and comments

#### 4. Quick Actions Panel
- **Add New Candidate**: Quick candidate creation
- **Create Position**: New job position creation
- **Bulk Import**: Import candidates from CSV/Excel
- **Generate Report**: Quick report generation

#### 5. Position Status Overview
- Open positions requiring attention
- Positions with pending applications
- Recruiter workload distribution
- Urgent hiring needs

### Dashboard Customization
1. **Widget Management**: Add, remove, or rearrange dashboard widgets
2. **Date Range Selection**: Filter data by custom date ranges
3. **View Preferences**: Switch between different dashboard views
4. **Export Options**: Export dashboard data to various formats

---

## Candidate Management

### Creating New Candidates

#### Method 1: Manual Entry
1. **Navigate**: Go to Candidates → Add New Candidate
2. **Basic Information**:
   - Full Name (required)
   - Email Address (required)
   - Phone Number (optional)
   - Position Applied For (optional)
3. **Additional Details**:
   - Source (LinkedIn, Referral, Job Board, etc.)
   - Expected Salary
   - Availability Date
   - Notes and Comments
4. **Save**: Click "Create Candidate" to save

#### Method 2: Resume Upload
1. **Upload Resume**: Drag and drop or browse for resume file
2. **AI Parsing**: System automatically extracts candidate information
3. **Review Data**: Verify and edit parsed information
4. **Complete Profile**: Add any missing information
5. **Save**: Confirm candidate creation

#### Method 3: Bulk Import
1. **Prepare CSV**: Use the provided template format
2. **Upload File**: Go to Candidates → Import → Upload CSV
3. **Map Fields**: Match CSV columns to system fields
4. **Review Data**: Check for errors and duplicates
5. **Import**: Confirm bulk import

### Candidate Profile Management

#### Profile Sections
1. **Personal Information**
   - Contact details
   - Location and availability
   - Profile photo upload
   - Personal notes

2. **Professional Information**
   - Current position and company
   - Years of experience
   - Skills and competencies
   - Education background

3. **Application Details**
   - Applied position
   - Application date
   - Source and referral information
   - Application status

4. **Resume Management**
   - Upload multiple resume versions
   - View resume history
   - Download resumes
   - AI-parsed resume data

5. **Interview and Evaluation**
   - Interview scheduling
   - Interview feedback
   - Evaluation scores
   - Hiring recommendations

#### Status Management
1. **Current Status**: View current recruitment stage
2. **Status History**: Complete timeline of status changes
3. **Update Status**: Move candidate through recruitment pipeline
4. **Add Notes**: Document status change reasons
5. **Notify Team**: Send notifications to relevant team members

### Candidate Search and Filtering

#### Search Options
1. **Quick Search**: Search by name, email, or phone
2. **Advanced Search**: Multiple criteria combination
3. **Saved Searches**: Save frequently used search criteria
4. **Global Search**: Search across all candidate data

#### Filter Options
- **Status**: Filter by recruitment stage
- **Position**: Filter by applied position
- **Recruiter**: Filter by assigned recruiter
- **Date Range**: Filter by application date
- **Source**: Filter by candidate source
- **Skills**: Filter by specific skills
- **Location**: Filter by geographic location

### Bulk Operations

#### Available Bulk Actions
1. **Status Update**: Change status for multiple candidates
2. **Recruiter Assignment**: Assign candidates to recruiters
3. **Source Update**: Update candidate source information
4. **Export**: Export selected candidates to CSV/Excel
5. **Delete**: Remove multiple candidates (with confirmation)

#### Bulk Operation Steps
1. **Select Candidates**: Use checkboxes to select candidates
2. **Choose Action**: Select desired bulk action
3. **Configure Options**: Set parameters for the action
4. **Confirm Action**: Review and confirm bulk operation
5. **Monitor Progress**: Track operation completion

---

## Position Management

### Creating New Positions

#### Position Details
1. **Basic Information**:
   - Job Title (required)
   - Department (required)
   - Location
   - Employment Type (Full-time, Part-time, Contract)
   - Position Level (Entry, Mid-level, Senior, Executive)

2. **Job Description**:
   - Rich text editor for detailed descriptions
   - Responsibilities and requirements
   - Qualifications and experience
   - Benefits and compensation

3. **Recruitment Settings**:
   - Assigned Recruiter
   - Hiring Manager
   - Application deadline
   - Expected start date
   - Number of openings

4. **Custom Fields**:
   - Organization-specific fields
   - Custom attributes and requirements
   - Additional criteria and preferences

#### Position Status Management
- **Open**: Accepting applications
- **On Hold**: Temporarily paused
- **Closed**: No longer accepting applications
- **Filled**: Position has been filled

### Position Analytics

#### Key Metrics
1. **Application Volume**: Number of applications received
2. **Candidate Quality**: Average fit scores
3. **Time to Fill**: Days from posting to hire
4. **Source Effectiveness**: Best performing sources
5. **Recruiter Performance**: Individual recruiter metrics

#### Position Reports
- **Application Summary**: Detailed application statistics
- **Candidate Pipeline**: Status distribution
- **Recruitment Timeline**: Key milestones and dates
- **Cost Analysis**: Recruitment cost breakdown

### Position Templates
1. **Create Template**: Save position as reusable template
2. **Use Template**: Create new positions from templates
3. **Template Library**: Access organization-wide templates
4. **Template Management**: Edit and update templates

---

## Task Management

### Task Board Overview

#### Kanban View
- **Columns**: Represent different task statuses
- **Cards**: Individual tasks with candidate information
- **Drag and Drop**: Move tasks between columns
- **Quick Actions**: Access common actions from cards

#### List View
- **Table Format**: Detailed task information in rows
- **Sorting**: Sort by various criteria
- **Filtering**: Filter tasks by multiple criteria
- **Bulk Actions**: Perform actions on multiple tasks

### Task Types

#### 1. Candidate Review Tasks
- **Initial Screening**: Review new applications
- **Resume Evaluation**: Assess candidate qualifications
- **Phone Screening**: Schedule and conduct phone interviews
- **Reference Checks**: Contact candidate references

#### 2. Interview Tasks
- **Interview Scheduling**: Coordinate interview times
- **Interview Preparation**: Prepare interview materials
- **Interview Conduct**: Conduct interviews
- **Interview Feedback**: Document interview results

#### 3. Administrative Tasks
- **Document Collection**: Gather required documents
- **Background Checks**: Initiate background verification
- **Offer Preparation**: Prepare job offers
- **Onboarding Setup**: Prepare for new hire onboarding

### Task Management Features

#### Task Assignment
1. **Auto-Assignment**: System assigns tasks based on workload
2. **Manual Assignment**: Manually assign tasks to team members
3. **Reassignment**: Transfer tasks between team members
4. **Workload Balancing**: Monitor and balance team workload

#### Task Tracking
1. **Due Dates**: Set and track task deadlines
2. **Priority Levels**: Assign task priorities
3. **Progress Tracking**: Monitor task completion status
4. **Time Tracking**: Record time spent on tasks

#### Task Collaboration
1. **Comments**: Add comments and notes to tasks
2. **File Attachments**: Attach relevant documents
3. **Notifications**: Receive task-related notifications
4. **Status Updates**: Update task status and progress

---

## User Management

### User Administration (Admin Only)

#### Creating New Users
1. **Navigate**: Go to Settings → Users → Add New User
2. **Basic Information**:
   - Full Name (required)
   - Email Address (required)
   - Role Selection (Admin, Recruiter, Hiring Manager)
   - Initial Password (temporary)
3. **Permissions**: Assign specific module permissions
4. **Teams**: Assign user to teams or groups
5. **Preferences**: Set initial user preferences

#### User Role Management
1. **Role Assignment**: Assign users to appropriate roles
2. **Permission Override**: Grant additional permissions
3. **Team Assignment**: Organize users into teams
4. **Access Control**: Control system access levels

#### User Profile Management
1. **Profile Information**: Update personal details
2. **Avatar Upload**: Add profile pictures
3. **Contact Information**: Update contact details
4. **Preferences**: Configure user preferences

### User Groups and Teams

#### Creating User Groups
1. **Group Definition**: Define group purpose and scope
2. **Permission Assignment**: Assign group-level permissions
3. **Member Management**: Add and remove group members
4. **Group Hierarchy**: Create group hierarchies

#### Team Management
1. **Team Creation**: Create recruitment teams
2. **Team Assignment**: Assign users to teams
3. **Workload Distribution**: Balance team workload
4. **Team Analytics**: Track team performance

---

## System Settings

### Application Settings (Admin Only)

#### General Settings
1. **Application Name**: Set custom application name
2. **Logo Upload**: Upload company logo
3. **Theme Configuration**: Customize color schemes
4. **Language Settings**: Configure default language

#### Recruitment Settings
1. **Default Stages**: Configure recruitment pipeline stages
2. **Custom Fields**: Create custom field definitions
3. **Email Templates**: Customize email notifications
4. **Workflow Rules**: Define recruitment workflow rules

#### Integration Settings
1. **Email Configuration**: SMTP server settings
2. **Calendar Integration**: Calendar system connection
3. **Webhook Configuration**: External system integrations
4. **API Settings**: API access and rate limiting

### User Preferences

#### Display Preferences
1. **Dashboard Layout**: Customize dashboard widgets
2. **Table Views**: Configure table columns and sorting
3. **Date Formats**: Set preferred date formats
4. **Time Zone**: Configure time zone settings

#### Notification Preferences
1. **Email Notifications**: Configure email notification settings
2. **In-App Notifications**: Set in-app notification preferences
3. **SMS Notifications**: Configure SMS notifications (if available)
4. **Notification Frequency**: Set notification timing

#### Privacy Settings
1. **Data Visibility**: Control data visibility settings
2. **Activity Tracking**: Configure activity logging
3. **Profile Privacy**: Set profile visibility options
4. **Data Sharing**: Control data sharing preferences

---

## Analytics and Reporting

### Dashboard Analytics

#### Key Performance Indicators
1. **Recruitment Metrics**:
   - Total applications
   - Conversion rates
   - Time to hire
   - Cost per hire
   - Quality of hire

2. **Pipeline Metrics**:
   - Active candidates
   - Pipeline velocity
   - Stage conversion rates
   - Bottleneck identification

3. **Team Performance**:
   - Recruiter productivity
   - Team workload distribution
   - Individual performance metrics
   - Goal achievement tracking

#### Visual Analytics
1. **Charts and Graphs**: Interactive data visualizations
2. **Trend Analysis**: Historical trend identification
3. **Comparative Analysis**: Period-over-period comparisons
4. **Drill-Down Capabilities**: Detailed data exploration

### Report Generation

#### Standard Reports
1. **Candidate Reports**:
   - Candidate pipeline report
   - Application source analysis
   - Candidate quality metrics
   - Rejection reason analysis

2. **Position Reports**:
   - Position performance report
   - Time to fill analysis
   - Cost per position report
   - Recruiter assignment analysis

3. **Team Reports**:
   - Team performance dashboard
   - Individual contributor reports
   - Workload distribution analysis
   - Goal achievement tracking

#### Custom Reports
1. **Report Builder**: Create custom reports
2. **Data Selection**: Choose specific data fields
3. **Filtering Options**: Apply custom filters
4. **Formatting**: Customize report appearance
5. **Scheduling**: Set up automated report generation

#### Report Distribution
1. **Email Delivery**: Automated email reports
2. **Export Options**: CSV, Excel, PDF formats
3. **Scheduled Reports**: Regular report generation
4. **Report Sharing**: Share reports with stakeholders

---

## Troubleshooting

### Common Issues and Solutions

#### Login Problems
**Issue**: Cannot log in to the system
**Solutions**:
1. Verify correct email and password
2. Check if account is active
3. Clear browser cache and cookies
4. Try different browser
5. Contact system administrator

#### Performance Issues
**Issue**: Slow page loading or system response
**Solutions**:
1. Check internet connection
2. Close unnecessary browser tabs
3. Clear browser cache
4. Restart browser
5. Contact IT support if persistent

#### File Upload Problems
**Issue**: Cannot upload resumes or documents
**Solutions**:
1. Check file size (must be under 50MB)
2. Verify file format (PDF, DOC, DOCX supported)
3. Check internet connection stability
4. Try uploading smaller files first
5. Contact system administrator

#### Data Display Issues
**Issue**: Missing or incorrect data display
**Solutions**:
1. Refresh the page
2. Check user permissions
3. Verify data filters
4. Clear browser cache
5. Contact system administrator

### Error Messages

#### Authentication Errors
- **"Invalid credentials"**: Check email and password
- **"Account locked"**: Contact administrator to unlock
- **"Session expired"**: Log in again

#### Permission Errors
- **"Access denied"**: Insufficient permissions for action
- **"Unauthorized access"**: Contact administrator for access
- **"Role required"**: Need specific role for action

#### System Errors
- **"Server error"**: Contact system administrator
- **"Database error"**: Contact technical support
- **"File upload failed"**: Check file and try again

### Getting Help

#### Support Channels
1. **User Manual**: This comprehensive guide
2. **Help Documentation**: Built-in help system
3. **Video Tutorials**: Step-by-step video guides
4. **FAQ Section**: Frequently asked questions
5. **Support Ticket**: Submit support requests

#### Contact Information
- **System Administrator**: [Contact details]
- **IT Support**: [Contact details]
- **Training Team**: [Contact details]
- **Emergency Support**: [Contact details]

---

## Appendices

### Appendix A: Keyboard Shortcuts
| Action | Shortcut | Description |
|--------|----------|-------------|
| New Candidate | Ctrl+N | Create new candidate |
| Search | Ctrl+F | Open search dialog |
| Save | Ctrl+S | Save current form |
| Refresh | F5 | Refresh current page |
| Help | F1 | Open help system |
| Logout | Ctrl+Shift+L | Log out of system |

### Appendix B: File Format Support
| File Type | Extensions | Max Size | Purpose |
|-----------|------------|----------|---------|
| Resume | .pdf, .doc, .docx | 50MB | Candidate resumes |
| Images | .jpg, .jpeg, .png | 10MB | Profile pictures |
| Documents | .pdf, .doc, .docx | 50MB | Supporting documents |
| Spreadsheets | .csv, .xlsx | 10MB | Bulk import/export |

### Appendix C: Browser Compatibility
| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 90+ | Fully Supported | Recommended |
| Firefox | 88+ | Fully Supported | Good performance |
| Safari | 14+ | Fully Supported | macOS/iOS |
| Edge | 90+ | Fully Supported | Windows 10+ |

### Appendix D: Mobile Access
- **Responsive Design**: Optimized for mobile devices
- **Touch Interface**: Touch-friendly controls
- **Mobile Features**: Core functionality available
- **App Store**: Native mobile app (if available)

---

**Document Information**
- **Last Updated**: January 2025
- **Version**: 1.0
- **Next Review**: March 2025
- **Contact**: [Support Email]

---

*This manual is confidential and proprietary. Distribution is restricted to authorized users only.*
