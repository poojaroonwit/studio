# FitScan - Manual & Preferences Feature Showcase
## Comprehensive User Guide & System Preferences Documentation

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
3. [User Preferences & Customization](#user-preferences--customization)
4. [System Settings & Configuration](#system-settings--configuration)
5. [Feature Demonstrations](#feature-demonstrations)
6. [Advanced Configuration](#advanced-configuration)
7. [Troubleshooting & Support](#troubleshooting--support)
8. [API Documentation](#api-documentation)

---

## 🎯 System Overview

### What is FitScan?
FitScan is a comprehensive, enterprise-grade Applicant Tracking System (ATS) built with modern web technologies. It provides advanced candidate management, automated workflows, and seamless integrations for recruitment teams.

### Key Features for Showcase
- **Real-time Dashboard & Analytics**
- **Advanced Candidate Management**
- **Customizable User Preferences**
- **Role-based Access Control**
- **AI-powered Matching**
- **Workflow Automation**
- **Comprehensive Settings Management**

### Technology Stack
- **Frontend**: Next.js 15.5.2, React 18, TypeScript
- **UI Framework**: Tailwind CSS, ShadCN UI Components
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 15
- **Authentication**: NextAuth.js (Azure AD + Credentials)
- **File Storage**: MinIO Object Storage
- **AI/ML**: Genkit (Google AI)

---

## 🚀 Getting Started

### Quick Access
- **Main Application**: http://localhost:8021
- **Default Admin Login**: admin@ncc.com / nccadmin
- **API Documentation**: http://localhost:8021/api-docs/ui
- **Settings Panel**: http://localhost:8021/settings

### First-Time Setup
1. **Login with Admin Credentials**
2. **Navigate to Settings** → System Settings
3. **Configure Basic Settings**
4. **Set Up User Preferences**
5. **Customize Branding & Theme**

---

## ⚙️ User Preferences & Customization

### 1. Personal User Preferences
**Location**: Settings → User Preferences

#### Appearance Settings
- **Theme Selection**
  - Light Mode
  - Dark Mode
  - System Preference (Auto)
- **Personal Color Customization**
  - Primary color picker
  - Accent color selection
  - Custom color schemes
- **Layout Preferences**
  - Sidebar configuration
  - Navigation preferences
  - Display density

#### Task Board Customization
- **Card Display Options**
  - Card width settings (Small, Medium, Large, Custom)
  - Show/hide elements:
    - Avatar images
    - Candidate names
    - Email addresses
    - Descriptions
    - Fit scores
    - Assignee information
    - Priority indicators
    - Due dates
    - Tags and skills
    - Job applications
- **View Modes**
  - Kanban board view
  - List view
  - Grid view
- **Filtering Preferences**
  - Default search terms
  - Priority filters
  - Assignee filters
  - Stage selections

#### Positions Management Preferences
- **Display Settings**
  - Column visibility
  - Sort preferences
  - Filter defaults
- **Custom Fields**
  - Show/hide custom fields
  - Field ordering
  - Display formatting

#### Sidebar Configuration
- **Navigation Preferences**
  - Menu item visibility
  - Icon preferences
  - Collapsible sections
- **Quick Access**
  - Favorite pages
  - Recent items
  - Custom shortcuts

### 2. Preference Management Features
- **Real-time Sync**: Changes save automatically
- **Cross-device Synchronization**: Preferences sync across all devices
- **Reset Options**: Individual section or complete reset
- **Backup & Restore**: Export/import preference settings
- **Version History**: Track preference changes over time

---

## 🔧 System Settings & Configuration

### 1. System Settings
**Location**: Settings → System Settings

#### Core Configuration
- **Application Settings**
  - System-wide configurations
  - Integration settings
  - Automation workflows
  - Upload queue processing

#### Database Management
- **Connection Settings**
- **Backup Configuration**
- **Migration Management**
- **Performance Optimization**

### 2. Branding & Theme Settings
**Location**: Settings → Branding & Theme

#### Global Branding
- **Application Name**
  - Custom app name
  - Display preferences
  - Logo integration
- **Logo Management**
  - Upload custom logos
  - Favicon customization
  - Logo positioning
  - Size adjustments

#### Theme Customization
- **Color Schemes**
  - Primary colors
  - Secondary colors
  - Accent colors
  - Background colors
- **Typography**
  - Font selection
  - Font sizes
  - Font weights
  - Line spacing

#### Login Page Customization
- **Background Options**
  - Image backgrounds
  - Gradient backgrounds
  - Solid color backgrounds
- **Layout Customization**
  - Logo placement
  - Form styling
  - Button customization

### 3. Data Configuration
**Location**: Settings → Data Configuration

#### Custom Fields Management
- **Candidate Custom Fields**
  - Field definitions
  - Data types
  - Validation rules
  - Display preferences
- **Position Custom Fields**
  - Job-specific fields
  - Department fields
  - Custom attributes

#### Recruitment Stages
- **Pipeline Configuration**
  - Stage definitions
  - Stage ordering
  - Transition rules
  - Color coding
- **Workflow Automation**
  - Stage-based triggers
  - Automated actions
  - Notification rules

#### Candidate Sources
- **Source Management**
  - Source definitions
  - Tracking preferences
  - Analytics integration

### 4. User Management
**Location**: Settings → User Management

#### Role-Based Access Control (RBAC)
- **User Roles**
  - Admin
  - Recruiter
  - Hiring Manager
- **Permission Groups**
  - Module-level permissions
  - Feature access control
  - Data visibility rules

#### User Preferences Management
- **Bulk Preference Updates**
- **Template Management**
- **Default Settings**
- **User Group Preferences**

---

## 🎨 Feature Demonstrations

### 1. Dashboard Customization Demo
**Scenario**: Customizing the main dashboard for different user roles

#### Steps:
1. **Access User Preferences**
2. **Navigate to Dashboard Settings**
3. **Configure Widget Visibility**
4. **Set Default Filters**
5. **Customize Layout**
6. **Save and Test**

#### Key Features to Highlight:
- Real-time updates
- Role-based customization
- Persistent settings
- Cross-device sync

### 2. Task Board Personalization Demo
**Scenario**: Setting up personalized task board for recruiters

#### Steps:
1. **Open Task Board Settings**
2. **Configure Card Display**
3. **Set Filter Preferences**
4. **Choose View Mode**
5. **Test Different Configurations**

#### Key Features to Highlight:
- Drag-and-drop customization
- Real-time preview
- Multiple view options
- Advanced filtering

### 3. Theme & Branding Demo
**Scenario**: Customizing application appearance for company branding

#### Steps:
1. **Access Branding Settings**
2. **Upload Company Logo**
3. **Select Color Scheme**
4. **Customize Login Page**
5. **Apply Theme Changes**

#### Key Features to Highlight:
- Live preview
- Multiple theme options
- Brand consistency
- Professional appearance

### 4. Advanced Settings Demo
**Scenario**: Configuring system-wide settings and integrations

#### Steps:
1. **Navigate to System Settings**
2. **Configure Integrations**
3. **Set Up Automation**
4. **Manage Permissions**
5. **Test Configuration**

#### Key Features to Highlight:
- Enterprise-grade configuration
- Integration capabilities
- Security settings
- Performance optimization

---

## 🔍 Advanced Configuration

### 1. API Integration
- **Webhook Configuration**
- **External System Integration**
- **Data Synchronization**
- **Custom Endpoints**

### 2. Automation Setup
- **Workflow Automation**
- **Email Notifications**
- **Scheduled Tasks**
- **Event Triggers**

### 3. Performance Optimization
- **Caching Configuration**
- **Database Optimization**
- **File Storage Settings**
- **Background Processing**

### 4. Security Configuration
- **Authentication Settings**
- **Permission Management**
- **Audit Logging**
- **Data Encryption**

---

## 🛠️ Troubleshooting & Support

### Common Issues & Solutions

#### User Preferences Not Saving
**Problem**: Changes to user preferences are not persisting
**Solutions**:
1. Check internet connection
2. Verify user permissions
3. Clear browser cache
4. Check database connectivity

#### Theme Not Applying
**Problem**: Theme changes are not visible
**Solutions**:
1. Refresh the page
2. Clear browser cache
3. Check browser compatibility
4. Verify theme files

#### Settings Access Issues
**Problem**: Cannot access certain settings
**Solutions**:
1. Verify user role and permissions
2. Check admin access
3. Contact system administrator
4. Review permission groups

### Support Resources
- **Documentation**: Built-in help system
- **API Documentation**: Interactive Swagger UI
- **Logs**: Application logs for debugging
- **Health Monitoring**: System status checks

---

## 📚 API Documentation

### Interactive Documentation
- **Swagger UI**: http://localhost:8021/api-docs/ui
- **Settings API**: http://localhost:8021/settings/api-docs
- **Endpoint Testing**: Built-in API testing tools

### Key API Endpoints for Preferences
- `GET /api/user-preferences` - Retrieve user preferences
- `PUT /api/user-preferences` - Update user preferences
- `GET /api/settings/system` - Get system settings
- `PUT /api/settings/system` - Update system settings

### Authentication
- **API Keys**: For external integrations
- **Session-based**: For web interface
- **Azure AD**: For enterprise SSO

---

## 🎯 Showcase Event Preparation

### Demo Environment Setup
1. **Pre-configured Demo Data**
   - Sample candidates
   - Test positions
   - Demo users with different roles
   - Custom themes and branding

2. **Demo Scenarios**
   - New user onboarding
   - Preference customization
   - System configuration
   - Advanced features

3. **Interactive Elements**
   - Live preference changes
   - Real-time synchronization
   - Cross-device demonstration
   - Role-based access showcase

### Key Talking Points
- **User Experience**: Intuitive preference management
- **Flexibility**: Extensive customization options
- **Enterprise Features**: Role-based access and security
- **Modern Technology**: Real-time updates and synchronization
- **Scalability**: Handles multiple users and configurations

### Success Metrics to Highlight
- **User Adoption**: Easy preference management increases user satisfaction
- **Efficiency**: Customized interfaces improve productivity
- **Flexibility**: Adapts to different organizational needs
- **Security**: Enterprise-grade access control
- **Performance**: Optimized for speed and reliability

---

## 📝 Conclusion

FitScan's manual and preferences features provide a comprehensive solution for user customization and system configuration. The system offers:

- **Intuitive User Interface**: Easy-to-use preference management
- **Extensive Customization**: From appearance to functionality
- **Enterprise Security**: Role-based access and permissions
- **Real-time Synchronization**: Seamless cross-device experience
- **Scalable Architecture**: Handles multiple users and configurations

This showcase demonstrates how modern ATS systems can provide both powerful functionality and user-friendly customization options, making them adaptable to various organizational needs and user preferences.

---

*For technical support or additional information, please refer to the built-in documentation or contact the system administrator.*
