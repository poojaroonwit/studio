# FitScan ATS - User Guide

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Candidate Management](#candidate-management)
4. [Position Management](#position-management)
5. [Task Management](#task-management)
6. [AI-Powered Features](#ai-powered-features)
7. [SLA Monitoring](#sla-monitoring)
8. [Notifications](#notifications)
9. [Settings & Configuration](#settings--configuration)
10. [Troubleshooting](#troubleshooting)

## 🚀 Getting Started

### First Login
1. Navigate to your FitScan instance
2. Use your provided credentials to log in
3. Complete your profile setup if prompted
4. Familiarize yourself with the dashboard

### Navigation
- **Dashboard**: Overview of recruitment metrics and KPIs
- **Candidates**: Manage candidate profiles and applications
- **Positions**: Create and manage job positions
- **My Tasks**: Personal task board for recruiters
- **Settings**: System configuration and preferences

## 📊 Dashboard Overview

### Key Metrics
- **Total Candidates**: Current number of candidates in the system
- **Open Positions**: Active positions requiring candidates
- **SLA Compliance**: Service Level Agreement compliance rate
- **New Applications**: Applications received today

### Charts & Analytics
- **Candidate Distribution**: Visual breakdown by status
- **Score Distribution**: Fit score analysis
- **Time Series**: Application trends over time
- **SLA Violations**: Positions exceeding SLA deadlines

### Real-time Updates
- Live data updates via Server-Sent Events (SSE)
- Automatic refresh of metrics and charts
- Real-time collaboration indicators

## 👥 Candidate Management

### Adding Candidates

#### Manual Entry
1. Click "Add Candidate" button
2. Fill in basic information (name, email, phone)
3. Select position and recruiter
4. Upload resume if available
5. Save candidate profile

#### Bulk Upload
1. Navigate to Candidates page
2. Click "Bulk Upload" button
3. Select CSV file with candidate data
4. Map columns to candidate fields
5. Review and confirm upload

#### AI-Powered Upload
1. Use "Bulk Upload CVs" feature
2. Upload PDF resumes
3. AI automatically parses and creates candidate profiles
4. Review and approve AI-generated data

### Managing Candidate Profiles

#### Basic Information
- **Personal Details**: Name, email, phone, location
- **Application Info**: Position applied for, application date
- **Status Tracking**: Current recruitment stage
- **Fit Score**: AI-calculated match score

#### Resume Management
- **Upload Resumes**: Multiple resume versions supported
- **Resume History**: Track all uploaded documents
- **AI Parsing**: Automatic extraction of skills and experience
- **Download**: Access original resume files

#### Custom Fields
- **Education**: University, degree, graduation year
- **Experience**: Company, position, duration
- **Skills**: Technical and soft skills
- **Certifications**: Professional certifications
- **Custom Attributes**: Organization-specific fields

### Candidate Search & Filtering

#### Basic Search
- **Name Search**: Find candidates by name
- **Email Search**: Locate by email address
- **Position Filter**: Filter by applied position
- **Status Filter**: Filter by recruitment stage

#### Advanced Search
- **AI-Powered Search**: Natural language queries
  - "Find candidates with React experience"
  - "Graduates from MIT with MBA"
  - "Worked at Google for 5+ years"
- **Skill-Based Filtering**: Filter by specific skills
- **Education Filtering**: Filter by university or degree
- **Experience Filtering**: Filter by company or role

#### Bulk Operations
- **Bulk Edit**: Update multiple candidates at once
- **Bulk Export**: Export candidate data to CSV
- **Bulk Delete**: Remove multiple candidates
- **Bulk Status Update**: Change status for multiple candidates

### Candidate Stages & Workflow

#### Stage Management
- **Applied**: Initial application received
- **Screening**: Initial candidate review
- **Shortlisted**: Selected for further consideration
- **Interviewing**: Active interview process
- **Offer**: Job offer extended
- **Hired**: Successfully hired

#### Stage Transitions
- **Drag & Drop**: Move candidates between stages
- **Bulk Transitions**: Update multiple candidates
- **Transition History**: Complete audit trail
- **Notes**: Add context to transitions

## 💼 Position Management

### Creating Positions

#### Basic Position Details
1. Click "Add Position" button
2. Enter position title and department
3. Write detailed job description
4. Set position requirements
5. Assign recruiter and grade level

#### Advanced Configuration
- **Custom Fields**: Add organization-specific fields
- **Match Criteria**: Define candidate matching criteria
- **SLA Settings**: Set service level agreement
- **Workflow Configuration**: Customize recruitment stages

### Position Lifecycle

#### Open Positions
- **Active Recruitment**: Currently accepting applications
- **Candidate Pipeline**: Track applications and progress
- **SLA Monitoring**: Monitor compliance with deadlines
- **Performance Metrics**: Track recruitment effectiveness

#### Closed Positions
- **Archive Management**: Maintain historical data
- **Success Metrics**: Analyze recruitment outcomes
- **Candidate Outcomes**: Track final hiring decisions

### Position Analytics

#### Recruitment Metrics
- **Application Volume**: Number of applications received
- **Time to Hire**: Average time from posting to hire
- **Source Effectiveness**: Which sources yield best candidates
- **Recruiter Performance**: Individual recruiter metrics

#### SLA Monitoring
- **Compliance Rate**: Percentage of positions meeting SLA
- **Violation Alerts**: Positions exceeding SLA deadlines
- **Trend Analysis**: SLA performance over time
- **Grade-Level Analysis**: SLA performance by grade

## 📋 Task Management

### My Tasks Board

#### Personal Dashboard
- **Assigned Candidates**: Candidates assigned to you
- **Pending Actions**: Items requiring your attention
- **Upcoming Deadlines**: SLA and interview deadlines
- **Recent Activity**: Latest candidate updates

#### Task Views
- **Kanban Board**: Visual task management
- **List View**: Detailed task listing
- **Calendar View**: Timeline-based task view
- **Filter Options**: Customize task display

#### Task Actions
- **Update Status**: Change candidate status
- **Add Notes**: Document candidate interactions
- **Schedule Interviews**: Plan interview sessions
- **Send Communications**: Email candidates

### Team Collaboration

#### Shared Tasks
- **Team Visibility**: See team member activities
- **Task Assignment**: Assign tasks to team members
- **Progress Tracking**: Monitor team performance
- **Workload Distribution**: Balance team workload

## 🤖 AI-Powered Features

### AI Candidate Search

#### Natural Language Search
- **Semantic Search**: Understand context and meaning
- **Complex Queries**: Multi-criteria searches
- **Smart Matching**: AI-powered candidate matching
- **Match Explanations**: Understand why candidates match

#### Search Examples
```
"Find software engineers with React experience"
"Graduates from top universities with MBA"
"Candidates with 5+ years at Fortune 500 companies"
"Developers with machine learning skills"
```

### AI Resume Parsing

#### Automatic Extraction
- **Personal Information**: Name, contact details, location
- **Education**: Universities, degrees, graduation years
- **Experience**: Companies, positions, durations
- **Skills**: Technical and soft skills
- **Certifications**: Professional certifications

#### Quality Assurance
- **Accuracy Validation**: Review AI-extracted data
- **Manual Corrections**: Edit and refine extracted information
- **Confidence Scores**: AI confidence in extracted data
- **Learning System**: Improves over time

### AI Matching

#### Fit Score Calculation
- **Algorithm-Based**: Sophisticated matching algorithms
- **Multi-Factor Analysis**: Skills, experience, education
- **Position-Specific**: Tailored to job requirements
- **Continuous Learning**: Improves with feedback

#### Match Insights
- **Strengths**: Candidate's key strengths
- **Gaps**: Areas for development
- **Recommendations**: Suggested interview questions
- **Risk Assessment**: Potential hiring risks

## ⏰ SLA Monitoring

### Service Level Agreements

#### SLA Configuration
- **Grade-Based SLAs**: Different SLAs for different grades
- **Position-Specific**: Custom SLAs for specific positions
- **Recruiter SLAs**: Individual recruiter performance
- **Department SLAs**: Department-specific requirements

#### SLA Tracking
- **Compliance Monitoring**: Real-time SLA tracking
- **Violation Alerts**: Immediate notification of violations
- **Performance Metrics**: SLA compliance rates
- **Trend Analysis**: Historical SLA performance

### SLA Violations

#### Violation Types
- **Warning**: Approaching SLA deadline
- **Critical**: SLA deadline exceeded
- **Urgent**: Significantly overdue
- **Emergency**: Critical business impact

#### Notification System
- **In-App Notifications**: Real-time alerts in the system
- **Email Notifications**: Email alerts to recruiters and managers
- **Dashboard Alerts**: Visual indicators on dashboards
- **Escalation Procedures**: Automatic escalation for critical violations

### SLA Analytics

#### Performance Metrics
- **Compliance Rate**: Overall SLA compliance percentage
- **Average Overdue**: Average days overdue
- **Violation Trends**: Patterns in SLA violations
- **Recruiter Performance**: Individual SLA performance

#### Reporting
- **SLA Reports**: Comprehensive SLA performance reports
- **Trend Analysis**: Historical performance analysis
- **Predictive Analytics**: Forecast potential violations
- **Improvement Recommendations**: Suggestions for SLA optimization

## 🔔 Notifications

### Notification Types

#### System Notifications
- **SLA Violations**: Service level agreement violations
- **System Updates**: Application updates and maintenance
- **Security Alerts**: Security-related notifications
- **Performance Alerts**: System performance issues

#### User Notifications
- **Task Assignments**: New tasks assigned to you
- **Candidate Updates**: Changes to assigned candidates
- **Interview Reminders**: Upcoming interview notifications
- **Deadline Alerts**: Approaching deadlines

#### Team Notifications
- **Team Updates**: Team member activities
- **Shared Tasks**: Tasks shared with team
- **Collaboration Alerts**: Team collaboration opportunities
- **Performance Updates**: Team performance metrics

### Notification Management

#### Notification Settings
- **Email Preferences**: Configure email notifications
- **In-App Settings**: Customize in-app notifications
- **Frequency Control**: Set notification frequency
- **Quiet Hours**: Configure do-not-disturb periods

#### Notification History
- **Read/Unread Status**: Track notification status
- **Notification Archive**: Historical notification records
- **Search Functionality**: Find specific notifications
- **Bulk Actions**: Manage multiple notifications

## ⚙️ Settings & Configuration

### User Preferences

#### Profile Settings
- **Personal Information**: Update name, email, phone
- **Avatar Management**: Upload and manage profile pictures
- **Password Security**: Change password and security settings
- **Notification Preferences**: Configure notification settings

#### Display Preferences
- **Theme Selection**: Choose light or dark theme
- **Language Settings**: Select preferred language
- **Date/Time Format**: Customize date and time display
- **Timezone Settings**: Set your timezone

### System Configuration

#### Custom Fields
- **Candidate Fields**: Add custom candidate attributes
- **Position Fields**: Create position-specific fields
- **User Fields**: Additional user information fields
- **Field Types**: Text, number, date, select, multi-select

#### Workflow Configuration
- **Recruitment Stages**: Customize recruitment pipeline
- **Stage Colors**: Set visual indicators for stages
- **Transition Rules**: Define stage transition logic
- **Automation Rules**: Set up automated workflows

#### Integration Settings
- **API Configuration**: Set up API integrations
- **Webhook Settings**: Configure webhook endpoints
- **Email Integration**: Set up email services
- **Calendar Integration**: Connect calendar systems

### Security Settings

#### Access Control
- **Role Management**: Define user roles and permissions
- **Permission Groups**: Create permission groups
- **User Management**: Add, edit, and remove users
- **Access Logs**: Monitor system access

#### Data Security
- **Data Encryption**: Configure data encryption
- **Backup Settings**: Set up data backup procedures
- **Audit Logging**: Enable comprehensive audit trails
- **Privacy Controls**: Configure data privacy settings

## 🔧 Troubleshooting

### Common Issues

#### Login Problems
- **Forgot Password**: Use password reset functionality
- **Account Locked**: Contact system administrator
- **Authentication Errors**: Check credentials and network
- **Session Timeout**: Re-login to continue

#### Performance Issues
- **Slow Loading**: Check network connection
- **Browser Compatibility**: Use supported browsers
- **Cache Issues**: Clear browser cache
- **JavaScript Errors**: Check browser console

#### Data Issues
- **Missing Data**: Check data permissions
- **Sync Problems**: Refresh page or re-login
- **Upload Failures**: Check file size and format
- **Search Issues**: Try different search terms

### Getting Help

#### Support Channels
- **In-App Help**: Use built-in help system
- **Documentation**: Access comprehensive documentation
- **Video Tutorials**: Watch step-by-step tutorials
- **Community Forum**: Connect with other users

#### Contact Support
- **Email Support**: Send detailed issue descriptions
- **Phone Support**: Call for urgent issues
- **Live Chat**: Real-time support during business hours
- **Ticket System**: Create support tickets for tracking

### Best Practices

#### Data Management
- **Regular Backups**: Ensure data is backed up
- **Data Validation**: Verify data accuracy
- **Clean Data**: Remove outdated information
- **Security Updates**: Keep system updated

#### User Training
- **New User Onboarding**: Complete training program
- **Regular Updates**: Stay informed about new features
- **Best Practices**: Follow recommended procedures
- **Continuous Learning**: Explore advanced features

---

## 📞 Support & Resources

### Documentation
- **API Documentation**: Complete API reference
- **Integration Guides**: Step-by-step integration instructions
- **Video Tutorials**: Visual learning resources
- **FAQ**: Frequently asked questions

### Community
- **User Forum**: Connect with other users
- **Feature Requests**: Suggest new features
- **Bug Reports**: Report issues and bugs
- **Success Stories**: Share your success stories

### Training
- **Online Training**: Self-paced learning modules
- **Webinars**: Live training sessions
- **Certification**: Professional certification program
- **Consulting**: Expert consulting services

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Support**: For technical support, contact your system administrator or visit the support portal.

