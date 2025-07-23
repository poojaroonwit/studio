# Software Requirements Specification (SRS)
## CandiTrack - Applicant Tracking System

**Version:** 2.0
**Date:** 2025-01-27

## Table of Contents

1.  [Introduction](#1-introduction)
    1.1. [Purpose](#11-purpose)
    1.2. [Scope](#12-scope)
    1.3. [Definitions, Acronyms, and Abbreviations](#13-definitions-acronyms-and-abbreviations)
    1.4. [References](#14-references)
    1.5. [Overview](#15-overview)
2.  [Overall Description](#2-overall-description)
    2.1. [Product Perspective](#21-product-perspective)
    2.2. [Product Functions](#22-product-functions)
    2.3. [User Characteristics](#23-user-characteristics)
    2.4. [Constraints](#24-constraints)
    2.5. [Assumptions and Dependencies](#25-assumptions-and-dependencies)
3.  [Specific Requirements](#3-specific-requirements)
    3.1. [Functional Requirements](#31-functional-requirements)
        3.1.1. [Authentication](#311-authentication)
        3.1.2. [Dashboard](#312-dashboard)
        3.1.3. [Candidate Management](#313-candidate-management)
        3.1.4. [Position Management](#314-position-management)
        3.1.5. [User Management](#315-user-management)
        3.1.6. [My Task Board](#316-my-task-board)
        3.1.7. [Settings](#317-settings)
        3.1.8. [Logging](#318-logging)
        3.1.9. [API](#319-api)
    3.2. [User Interface (UI) Requirements](#32-user-interface-ui-requirements)
    3.3. [External Interface Requirements](#33-external-interface-requirements)
    3.4. [Non-Functional Requirements](#34-non-functional-requirements)
        3.4.1. [Performance](#341-performance)
        3.4.2. [Security](#342-security)
        3.4.3. [Reliability](#343-reliability)
        3.4.4. [Usability](#344-usability)
        3.4.5. [Maintainability](#345-maintainability)
4.  [Data Requirements](#4-data-requirements)
    4.1. [Database Schema Overview](#41-database-schema-overview)
5.  [Deployment Requirements](#5-deployment-requirements)
6.  [Implementation Status](#6-implementation-status)
7.  [Future Considerations](#7-future-considerations)

---

## 1. Introduction

### 1.1. Purpose

This Software Requirements Specification (SRS) document describes the functional and non-functional requirements for the CandiTrack Applicant Tracking System (ATS). It serves as a guide for the development, testing, and deployment of the system, reflecting its current enhanced capabilities and implementation status.

### 1.2. Scope

The CandiTrack ATS is a web-based application designed to manage the recruitment lifecycle. This includes:

| Area                                      | Description                                                                                      | Status |
| :---------------------------------------- | :----------------------------------------------------------------------------------------------- | :----- |
| Candidate Profile Management              | ✅ Managing candidate profiles, applications, resumes (with history), and profile images.           | ✅ Complete |
| Job Position Management                   | ✅ Creating and tracking job positions.                                                             | ✅ Complete |
| User Account Management                   | ✅ Managing user accounts, roles, user groups, and granular permissions.                            | ✅ Complete |
| Dashboard & Metrics                       | ✅ Providing a dashboard for key recruitment metrics.                                               | ✅ Complete |
| Settings & Configuration                  | ✅ Managing system preferences, recruitment stages, custom fields, notification settings, etc.      | ✅ Complete |
| Logging                                   | ✅ Logging system and user activities with search and filter capabilities.                          | ✅ Complete |
| API                                       | ✅ Offering an API for potential integrations.                                                      | ✅ Complete |
| Task Management                           | ✅ My Task Board with Kanban and list views for recruiters.                                         | ✅ Complete |

Features currently out of scope for the prototype include advanced AI matching, actual sending of notifications, direct job board posting, and a public-facing candidate portal.

### 1.3. Definitions, Acronyms, and Abbreviations

*   **ATS:** Applicant Tracking System
*   **RBAC:** Role-Based Access Control
*   **SSO:** Single Sign-On
*   **UI:** User Interface
*   **API:** Application Programming Interface
*   **CRUD:** Create, Read, Update, Delete
*   **PII:** Personally Identifiable Information
*   **MinIO:** High-performance, S3 compatible object storage
*   **PostgreSQL:** Open-source relational database
*   **NextAuth.js:** Authentication library for Next.js
*   **ShadCN UI:** UI component library
*   **Tailwind CSS:** CSS framework
*   **Automation Service:** Workflow automation tool
*   **Genkit:** AI framework (conceptual for this phase)
*   **CSV:** Comma-Separated Values

### 1.4. References

*   Business Requirements Document (BRD) - CandiTrack ATS
*   Project README.md
*   ShadCN UI Documentation
*   Next.js Documentation
*   NextAuth.js Documentation

### 1.5. Overview

This document details the system's capabilities, constraints, and interfaces. Section 2 provides an overall description. Section 3 lists specific functional, UI, and non-functional requirements. Section 4 outlines data requirements. Section 5 covers deployment, Section 6 shows implementation status, and Section 7 discusses future considerations.

## 2. Overall Description

### 2.1. Product Perspective

The CandiTrack ATS is a self-contained web application. It interacts with a PostgreSQL database for data persistence and a MinIO server for file storage (e.g., resumes, candidate avatars). It can optionally integrate with Azure AD for SSO and a workflow automation service via webhooks. It features server-side configuration for several aspects of its operation.

### 2.2. Product Functions

| Function                                                                                                | Status |
| :------------------------------------------------------------------------------------------------------ | :----- |
| ✅ Secure user authentication (credentials, Azure AD SSO) and authorization (roles, permissions, groups).  | ✅ Complete |
| ✅ User self-service password changes.                                                                     | ✅ Complete |
| ✅ Creation and management of candidate profiles, including resume uploads (with history) and profile images. | ✅ Complete |
| ✅ Creation and management of job positions, including custom fields.                                      | ✅ Complete |
| ✅ User account management with role, group, and granular permission assignments.                          | ✅ Complete |
| ✅ A dashboard providing an overview of recruitment activities.                                            | ✅ Complete |
| ✅ Logging of important system events and user actions, with search and filtering.                         | ✅ Complete |
| ✅ Server-side configuration options for application preferences (name, logo), recruitment stages (including deletion with replacement), custom fields, user UI data model preferences, webhook mappings, and notification settings. | ✅ Complete |
| ✅ An API for programmatic access to certain functionalities.                                              | ✅ Complete |
| ✅ Import and export capabilities for candidate and position data (CSV).                                   | ✅ Complete |
| ✅ Filterable task board for recruiters and admins with Kanban and list views.                             | ✅ Complete |

### 2.3. User Characteristics

| User Role               | Description/Responsibilities                                                                                                                     | Access Level |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| System Administrator    | ✅ Technical user responsible for user management, system configuration (stages, fields, notifications, groups, permissions), logs, and system health. | Full system access |
| Recruiter               | ✅ Primary user responsible for managing candidates, positions, tracking applications, utilizing "My Task Board".                                   | Full access to assigned candidates |
| Hiring Manager          | ✅ User involved in reviewing assigned candidates and providing feedback (access typically more restricted based on permissions).                   | Restricted access based on permissions |

### 2.4. Constraints

*   ✅ The system is built using Next.js, React, TypeScript, Tailwind CSS, and ShadCN UI.
*   ✅ Backend data is stored in a PostgreSQL database.
*   ✅ File storage is handled by a MinIO-compatible object storage service.
*   ✅ Authentication is managed by NextAuth.js.
*   ✅ The application is designed to be deployed using Docker and Docker Compose.
*   🔄 Actual sending of notifications (email/webhook) is not implemented in this phase, only configuration.
*   🔄 Rich UI interactions like drag-and-drop for sorting are not implemented.

### 2.5. Assumptions and Dependencies

*   ✅ Users will have access to a modern web browser.
*   ✅ The underlying infrastructure (servers, database, MinIO) is operational.
*   ✅ Environment variables are correctly configured for all services.
*   ✅ The default admin user (`admin@ncc.com` / `nccadmin`) will be changed or secured post-initialization.

## 3. Specific Requirements

### 3.1. Functional Requirements

#### 3.1.1. Authentication

| ID          | Requirement Description                                                                     | Status |
| :---------- | :------------------------------------------------------------------------------------------ | :----- |
| FR-AUTH-001 | ✅ The system shall allow users to log in using their registered email and password.             | ✅ Complete |
| FR-AUTH-002 | ✅ The system shall securely hash and store user passwords using bcrypt.                       | ✅ Complete |
| FR-AUTH-003 | ✅ The system shall support Single Sign-On (SSO) via Azure Active Directory.                     | ✅ Complete |
| FR-AUTH-004 | ✅ The system shall redirect unauthenticated users to the sign-in page.                          | ✅ Complete |
| FR-AUTH-005 | ✅ The system shall allow authenticated users to log out.                                        | ✅ Complete |
| FR-AUTH-006 | ✅ The system shall allow authenticated users to change their own password.                      | ✅ Complete |
| FR-AUTH-007 | ✅ The system shall log successful and failed login attempts, and logout events.                 | ✅ Complete |

#### 3.1.2. Dashboard

| ID          | Requirement Description                                                                      | Status |
| :---------- | :------------------------------------------------------------------------------------------- | :----- |
| FR-DASH-001 | ✅ The system shall display a dashboard with key recruitment metrics upon successful login.       | ✅ Complete |
| FR-DASH-002 | ✅ The dashboard shall include a chart showing the number of candidates per open position.        | ✅ Complete |
| FR-DASH-003 | ✅ The dashboard shall display summary statistics (e.g., total candidates, open positions, hires).| ✅ Complete |
| FR-DASH-004 | ✅ The dashboard shall list newly applied candidates today.                                       | ✅ Complete |
| FR-DASH-005 | ✅ The dashboard shall list open positions that currently have no candidates.                     | ✅ Complete |

#### 3.1.3. Candidate Management

| ID           | Requirement Description                                                                                                | Status |
| :----------- | :--------------------------------------------------------------------------------------------------------------------- | :----- |
| FR-CAND-001  | ✅ Authorized users shall be able to create new candidate profiles manually.                                                | ✅ Complete |
| FR-CAND-002  | ✅ The system shall allow uploading candidate resumes (PDF, DOC, DOCX) to MinIO.                                            | ✅ Complete |
| FR-CAND-003  | ✅ The system shall maintain a history of uploaded resumes for each candidate.                                              | ✅ Complete |
| FR-CAND-004  | ✅ The system shall allow uploading and displaying a profile image for each candidate.                                      | ✅ Complete |
| FR-CAND-005  | ✅ The system shall provide an option to send uploaded resumes to a configurable automation webhook for processing.                | ✅ Complete |
| FR-CAND-006  | ✅ The system shall allow authorized users to view a list of all candidates, with enhanced filtering options (name, position, status, education, fit score). | ✅ Complete |
| FR-CAND-007  | ✅ Authorized users shall be able to view detailed information for a specific candidate.                                    | ✅ Complete |
| FR-CAND-008  | ✅ Authorized users shall be able to edit candidate profile information, including parsed data fields.                      | ✅ Complete |
| FR-CAND-009  | ✅ Authorized users shall be able to update a candidate's status in the recruitment pipeline.                               | ✅ Complete |
| FR-CAND-010  | ✅ Each status change shall be logged as a transition record, with the option to add/edit notes.                            | ✅ Complete |
| FR-CAND-011  | ✅ Authorized users shall be able to delete transition records.                                                             | ✅ Complete |
| FR-CAND-012  | ✅ Authorized users shall be able to assign a candidate to a specific recruiter.                                            | ✅ Complete |
| FR-CAND-013  | ✅ Authorized users (Admin or with permission) shall be able to delete candidate profiles.                                  | ✅ Complete |
| FR-CAND-014  | ✅ The system shall support associating custom-defined fields with candidate profiles.                                      | ✅ Complete |
| FR-CAND-015  | ✅ The system shall provide an option to import candidates from a CSV file.                                                 | ✅ Complete |
| FR-CAND-016  | ✅ The system shall provide an option to export candidate data to a CSV file.                                               | ✅ Complete |
| FR-CAND-017  | ✅ The system shall allow uploading a PDF resume to an automation webhook for automated new candidate creation.                    | ✅ Complete |

#### 3.1.4. Position Management

| ID          | Requirement Description                                                                                             | Status |
| :---------- | :------------------------------------------------------------------------------------------------------------------ | :----- |
| FR-POS-001  | ✅ Authorized users shall be able to create new job positions.                                                         | ✅ Complete |
| FR-POS-002  | ✅ Position details shall include title, department, description, open/closed status, and position level.              | ✅ Complete |
| FR-POS-003  | ✅ Authorized users shall be able to view a list of all job positions, with enhanced filtering options (title, department, status, level). | ✅ Complete |
| FR-POS-004  | ✅ Authorized users shall be able to view detailed information for a specific position.                                | ✅ Complete |
| FR-POS-005  | ✅ Authorized users shall be able to edit job position details.                                                        | ✅ Complete |
| FR-POS-006  | ✅ Authorized users (Admin or with permission) shall be able to delete job positions (prevented if candidates are associated, unless replacement is handled). | ✅ Complete |
| FR-POS-007  | ✅ The system shall support associating custom-defined fields with position profiles.                                  | ✅ Complete |
| FR-POS-008  | ✅ The system shall provide an option to import positions from a CSV file.                                             | ✅ Complete |
| FR-POS-009  | ✅ The system shall provide an option to export position data to a CSV file.                                           | ✅ Complete |

#### 3.1.5. User Management

| ID          | Requirement Description                                                                                             | Status |
| :---------- | :------------------------------------------------------------------------------------------------------------------ | :----- |
| FR-USER-001 | ✅ Administrators shall be able to create new user accounts.                                                             | ✅ Complete |
| FR-USER-002 | ✅ Administrators shall be able to view a list of all users, with filtering (name, email, role).                       | ✅ Complete |
| FR-USER-003 | ✅ Administrators shall be able to edit user details, including name, email, role, and reset password.                 | ✅ Complete |
| FR-USER-004 | ✅ Administrators shall be able to assign/revoke specific module permissions (e.g., import/export) to users.           | ✅ Complete |
| FR-USER-005 | ✅ Administrators shall be able to delete user accounts (except their own).                                              | ✅ Complete |
| FR-USER-006 | ✅ Administrators shall be able to create, view, edit, and delete user groups.                                         | ✅ Complete |
| FR-USER-007 | ✅ Administrators shall be able to assign users to one or more user groups.                                            | ✅ Complete |
| FR-USER-008 | ✅ Administrators shall be able to assign module permissions to user groups.                                           | ✅ Complete |

#### 3.1.6. My Task Board

| ID          | Requirement Description                                                                                             | Status |
| :---------- | :------------------------------------------------------------------------------------------------------------------ | :----- |
| FR-TASK-001 | ✅ Recruiters and Administrators shall be able to view a "My Task Board" page.                                         | ✅ Complete |
| FR-TASK-002 | ✅ The task board shall display candidates assigned to the logged-in recruiter.                                        | ✅ Complete |
| FR-TASK-003 | ✅ Administrators shall be able to filter the task board to view candidates assigned to any recruiter or all candidates. | ✅ Complete |
| FR-TASK-004 | ✅ The task board shall offer both a list view and a Kanban view.                                                      | ✅ Complete |
| FR-TASK-005 | ✅ Users shall be able to filter candidates on the task board using enhanced filters similar to the main candidate list. | ✅ Complete |

#### 3.1.7. Settings

| ID               | Requirement Description                                                                                                             | Status |
| :--------------- | :---------------------------------------------------------------------------------------------------------------------------------- | :----- |
| FR-SET-001       | ✅ Administrators shall be able to manage server-side application preferences (theme preference, app name, app logo).                | ✅ Complete |
| FR-SET-002       | ✅ Administrators shall be able to manage system-wide recruitment stages, including deletion with candidate migration.                 | ✅ Complete |
| FR-SET-003       | ✅ Users (with permission) shall be able to view data model attributes and set server-side UI display preferences (per user).        | ✅ Complete |
| FR-SET-004       | ✅ Administrators shall be able to define custom data fields for Candidate and Position models.                                        | ✅ Complete |
| FR-SET-005       | ✅ Administrators shall be able to configure mappings for incoming webhook payloads.                                                     | ✅ Complete |
| FR-SET-006       | ✅ The system shall provide a UI to display information about server-configured webhook URLs and conceptual SMTP settings.             | ✅ Complete |
| FR-SET-007       | ✅ Administrators shall be able to configure notification settings, enabling/disabling specific events and channels (email, webhook), and setting webhook URLs. | ✅ Complete |

#### 3.1.8. Logging

| ID          | Requirement Description                                                                                             | Status |
| :---------- | :------------------------------------------------------------------------------------------------------------------ | :----- |
| FR-LOG-001  | ✅ The system shall log key actions to a database table ("LogEntry").                                                    | ✅ Complete |
| FR-LOG-002  | ✅ Authorized users (Admin or specific permission) shall be able to view application logs.                               | ✅ Complete |
| FR-LOG-003  | ✅ Log entries shall include timestamp, level, message, source, acting user ID, and optional details.                  | ✅ Complete |
| FR-LOG-004  | ✅ The log viewing page shall support filtering by log level and searching by message/source, with pagination.           | ✅ Complete |

#### 3.1.9. API

| ID          | Requirement Description                                                                                             | Status |
| :---------- | :------------------------------------------------------------------------------------------------------------------ | :----- |
| FR-API-001  | ✅ The system shall expose RESTful API endpoints for managing candidates (CRUD, resume upload, avatar upload).         | ✅ Complete |
| FR-API-002  | ✅ The system shall expose RESTful API endpoints for managing positions (CRUD).                                        | ✅ Complete |
| FR-API-003  | ✅ The system shall expose RESTful API endpoints for managing users (CRUD) - Admin restricted.                           | ✅ Complete |
| FR-API-004  | ✅ The system shall expose an API endpoint for receiving candidate data from external workflows (e.g., automation service).             | ✅ Complete |
| FR-API-005  | ✅ The system shall expose an API endpoint for logging.                                                                  | ✅ Complete |
| FR-API-006  | ✅ The system shall provide an API documentation page listing key public/semi-public endpoints.                        | ✅ Complete |
| FR-API-007  | ✅ The system shall expose API endpoints for managing system settings (preferences, stages, custom fields, webhook mappings, notification settings) - Admin restricted. | ✅ Complete |

### 3.2. User Interface (UI) Requirements

| ID     | Requirement Description                                                                                         | Status |
| :----- | :-------------------------------------------------------------------------------------------------------------- | :----- |
| UI-001 | ✅ The UI shall be responsive and accessible on modern web browsers (desktop and tablet).                          | ✅ Complete |
| UI-002 | ✅ The UI shall utilize ShadCN UI components and Tailwind CSS for a consistent and modern look and feel.           | ✅ Complete |
| UI-003 | ✅ Navigation shall be intuitive, primarily through a collapsible sidebar.                                         | ✅ Complete |
| UI-004 | ✅ Forms shall provide clear labels, input validation messages, and appropriate input types.                       | ✅ Complete |
| UI-005 | ✅ Tables shall support sorting (where applicable) and display data clearly.                                       | ✅ Complete |
| UI-006 | ✅ Loading states shall be indicated to the user (e.g., spinners).                                                 | ✅ Complete |
| UI-007 | ✅ Error messages and success notifications shall be displayed to the user via toasts.                             | ✅ Complete |
| UI-008 | ✅ Key dropdowns (e.g., for status selection, some filters) shall support type-ahead search functionality.         | ✅ Complete |
| UI-009 | ✅ Data model preferences page shall use tabs for Candidate and Position models.                                   | ✅ Complete |

### 3.3. External Interface Requirements

| ID      | Interface              | Description                                                                                                                    | Status |
| :------ | :--------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :----- |
| EI-001  | Database (PostgreSQL)  | ✅ Interface with PostgreSQL for data persistence.                                                                                | ✅ Complete |
| EI-002  | File Storage (MinIO)   | ✅ Interface with MinIO (or S3-compatible) for storing resumes, candidate avatars, and other files.                               | ✅ Complete |
| EI-003  | Azure AD (Optional)    | ✅ Interface with Azure Active Directory for SSO if configured.                                                                   | ✅ Complete |
| EI-004  | Automation Webhooks (Optional)| ✅ Send/receive data to/from automation workflows for automation.                                                                        | ✅ Complete |
| EI-005  | Google AI (Conceptual) | 🔄 Future interface with Google AI services via Genkit.                                                                           | 🔄 Future |

### 3.4. Non-Functional Requirements

#### 3.4.1. Performance

| ID      | Requirement Description                                                                                        | Status |
| :------ | :------------------------------------------------------------------------------------------------------------- | :----- |
| NFP-001 | ✅ Average page load times for common views should be under 3 seconds under typical load.                         | ✅ Complete |
| NFP-002 | ✅ API response times for common GET requests should be under 500ms.                                              | ✅ Complete |
| NFP-003 | ✅ Database queries should be optimized to avoid performance bottlenecks.                                         | ✅ Complete |

#### 3.4.2. Security

| ID      | Requirement Description                                                                                        | Status |
| :------ | :------------------------------------------------------------------------------------------------------------- | :----- |
| NFS-001 | ✅ All user passwords stored in the database must be hashed using `bcrypt`.                                       | ✅ Complete |
| NFS-002 | ✅ Access to API endpoints and UI functionalities must be protected by authentication and RBAC (roles, permissions). | ✅ Complete |
| NFS-003 | ✅ The system shall use HTTPS for all communication in a production environment.                                  | ✅ Complete |
| NFS-004 | ✅ Input validation must be performed on both client-side and server-side.                                        | ✅ Complete |
| NFS-005 | ✅ `NEXTAUTH_SECRET` must be a strong, random string and kept confidential.                                       | ✅ Complete |

#### 3.4.3. Reliability

| ID      | Requirement Description                                                                                        | Status |
| :------ | :------------------------------------------------------------------------------------------------------------- | :----- |
| NFR-001 | ✅ The system should aim for high availability, minimizing downtime.                                                | ✅ Complete |
| NFR-002 | ✅ Data integrity must be maintained; operations should be atomic where necessary.                                  | ✅ Complete |

#### 3.4.4. Usability

| ID      | Requirement Description                                                                                        | Status |
| :------ | :------------------------------------------------------------------------------------------------------------- | :----- |
| NFU-001 | ✅ The system shall be intuitive for users with basic computer literacy.                                          | ✅ Complete |
| NFU-002 | ✅ Error messages shall be clear and guide the user on corrective actions.                                        | ✅ Complete |
| NFU-003 | ✅ The UI shall be consistent across different modules of the application.                                          | ✅ Complete |

#### 3.4.5. Maintainability

| ID      | Requirement Description                                                                                        | Status |
| :------ | :------------------------------------------------------------------------------------------------------------- | :----- |
| NFM-001 | ✅ The codebase shall be modular and follow good coding practices.                                                | ✅ Complete |
| NFM-002 | ✅ TypeScript shall be used for strong typing to improve code quality.                                            | ✅ Complete |
| NFM-003 | ✅ Configuration shall be externalized using environment variables.                                               | ✅ Complete |

## 4. Data Requirements

### 4.1. Database Schema Overview

Key tables include:

| Table Name                  | Description                                                                                                | Status |
| :-------------------------- | :--------------------------------------------------------------------------------------------------------- | :----- |
| User                        | ✅ Stores user information (id, name, email, password, role, modulePermissions, avatarUrl, etc.).              | ✅ Complete |
| UserGroup                   | ✅ Stores user group information (id, name, description).                                                     | ✅ Complete |
| User_UserGroup              | ✅ Join table for User and UserGroup many-to-many relationship.                                               | ✅ Complete |
| UserGroup_PlatformModule    | ✅ Join table for UserGroup and PlatformModule (permissions) many-to-many relationship.                     | ✅ Complete |
| Position                    | ✅ Stores job position details (id, title, department, description, status, custom_attributes, etc.).         | ✅ Complete |
| Candidate                   | ✅ Stores candidate information (id, name, email, resumePath, avatarUrl, status, parsedData, custom_attributes, etc.). | ✅ Complete |
| ResumeHistory               | ✅ Stores history of resume uploads for candidates.                                                           | ✅ Complete |
| TransitionRecord            | ✅ Logs candidate status changes.                                                                             | ✅ Complete |
| RecruitmentStage            | ✅ Defines stages in the recruitment pipeline (system and custom).                                            | ✅ Complete |
| LogEntry                    | ✅ Stores application and audit logs.                                                                         | ✅ Complete |
| CustomFieldDefinition       | ✅ Defines custom fields for Candidate and Position models.                                                   | ✅ Complete |
| WebhookFieldMapping         | ✅ Stores mappings for incoming webhook payloads.                                                             | ✅ Complete |
| SystemSetting               | ✅ Stores system-wide preferences (e.g., appName, appLogoDataUrl).                                            | ✅ Complete |
| UserUIDisplayPreference     | ✅ Stores user-specific UI display preferences for data model attributes.                                     | ✅ Complete |
| NotificationEvent           | ✅ Defines system events that can trigger notifications.                                                      | ✅ Complete |
| NotificationChannel         | ✅ Defines notification channels (e.g., email, webhook).                                                      | ✅ Complete |
| NotificationSetting         | ✅ Links events to channels and stores their configuration (e.g., enabled, webhook URL).                      | ✅ Complete |

(Note: Detailed schema is in `prisma/schema.prisma`)

## 5. Deployment Requirements

| ID      | Requirement Description                                                                                        | Status |
| :------ | :------------------------------------------------------------------------------------------------------------- | :----- |
| DEP-001 | ✅ The application, PostgreSQL, and MinIO shall be deployable using Docker and Docker Compose.                    | ✅ Complete |
| DEP-002 | ✅ Configuration shall be managed via environment variables.                                                      | ✅ Complete |
| DEP-003 | ✅ The PostgreSQL database schema shall be initialized automatically via scripts.                                   | ✅ Complete |
| DEP-004 | ✅ The MinIO bucket shall be created automatically by the application if it doesn't exist.                        | ✅ Complete |

## 6. Implementation Status

### ✅ Completed Features
- **Authentication & Authorization**: Complete with Azure AD SSO and credential-based login
- **Dashboard**: Real-time metrics, charts, and statistics
- **Candidate Management**: Full CRUD with resume history, profile images, and advanced filtering
- **Position Management**: Complete position lifecycle with custom fields
- **User Management**: Role-based access control with user groups and granular permissions
- **Task Board**: Kanban and list views with enhanced filtering
- **Settings & Configuration**: Server-side preferences, recruitment stages, custom fields
- **API Documentation**: Interactive Swagger UI
- **Audit Logging**: Comprehensive system activity tracking
- **File Management**: MinIO integration for secure file storage
- **Bulk Operations**: CSV import/export for candidates and positions

### 🔄 Future Enhancements
- **AI Integration**: Advanced resume parsing and candidate matching
- **Real-time Features**: Live notifications and collaboration
- **Notification System**: Actual email/webhook sending
- **Advanced Analytics**: Comprehensive reporting and insights
- **Third-party Integrations**: Job board and HRIS connections
- **Candidate Portal**: Public-facing application system

## 7. Future Considerations

| Consideration                                            | Priority |
| :------------------------------------------------------- | :------- |
| 🔄 AI Integration (Genkit) for advanced matching and parsing. | High |
| 🔄 Real-time Features (SSE) for notifications and collaboration. | Medium |
| 🔄 **Implementation of actual notification sending logic.** | Medium |
| 🔄 Advanced Reporting & Analytics.                          | Low |
| 🔄 Third-Party Integrations (Job boards, HRIS).             | Low |
| 🔄 Candidate Portal.                                        | Low |
| 🔄 Automated Email Workflows.                               | Medium |
| 🔄 Full User Group Permission Inheritance enforcement.      | Low |
| 🔄 Rich UI for drag-and-drop sorting.                       | Low |