# Business Requirements Document (BRD) - FitScan ATS

## 1. Executive Summary

This document outlines the business requirements for the FitScan Applicant Tracking System (ATS). The project has successfully developed a modern, web-based platform to streamline the recruitment process by efficiently managing candidate information, job positions, user interactions, and system configurations. The ATS serves as a central hub for recruiters, hiring managers, and administrators to collaborate and track applicants from initial application to hiring, with enhanced control and customization.

## 2. Project Objectives

| Objective                                       | Description                                                                                                                                         | Status |
| :---------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- | :----- |
| Develop a functional ATS prototype              | ✅ Create a working application demonstrating core ATS functionalities with enhanced administrative controls.                                          | ✅ Complete |
| Streamline Candidate Management                 | ✅ Enable efficient tracking, updating, searching (with enhanced filters), and importing/exporting of candidate profiles, including resume and avatar management. | ✅ Complete |
| Effective Position Management                   | ✅ Allow easy creation, modification, status tracking, and import/export of job openings, with custom field support.                                   | ✅ Complete |
| Advanced User & Permission Management           | ✅ Support distinct roles, user groups with configurable permissions, and self-service password changes.                                                 | ✅ Complete |
| Centralized & Configurable Data                 | ✅ Provide a single source of truth for candidate and position information, with server-side app preferences and data model display settings.        | ✅ Complete |
| Improve Recruiter Productivity                  | ✅ Reduce manual effort in managing applicants and workflows, with features like a filterable task board and stage management.                         | ✅ Complete |
| Lay Foundation for AI & Automation              | ✅ Design the system to integrate AI-powered features and allow configuration for webhook-based automation and notifications.                | ✅ Complete |
| Enhance System Administration                   | ✅ Provide tools for managing recruitment stages, custom fields, webhook mappings, notification settings, and viewing detailed application logs.         | ✅ Complete |

## 3. Business Needs

The current recruitment process was suffering from inefficiencies due to scattered information, manual tracking, lack of a centralized system, and limited customization. This project successfully addresses the need for:
*   ✅ A unified platform to manage all recruitment activities with greater control.
*   ✅ Improved visibility into the candidate pipeline for all stakeholders.
*   ✅ Faster processing of applications and candidate progression.
*   ✅ Better organization of candidate data, including resumes, avatars, custom fields, and interaction history.
*   ✅ Enhanced collaboration between recruiters and hiring managers.
*   ✅ A secure system for handling sensitive candidate information, with granular access controls.
*   ✅ A configurable system that can adapt to specific recruitment workflows (e.g., custom stages, fields, notification preferences).
*   ✅ Auditability of system actions and user activities.

## 4. Scope

### In-Scope (Implemented):

| Area                                     | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Status |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----- |
| **User Authentication**                  | ✅ Secure login via Azure AD SSO and Credentials (email/password). User self-service password change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | ✅ Complete |
| **Dashboard**                            | ✅ Overview of key recruitment metrics with charts and statistics.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ✅ Complete |
| **Candidate Management**                 | ✅ Creation, viewing, editing, and deletion of candidate profiles. Resume upload and storage (MinIO) with **resume history tracking**. **Candidate profile image upload**. Tracking of candidate status through customizable recruitment stages. Transition history logging with notes. Assignment of candidates to recruiters. **Enhanced filtering (name, position, status, education, fit score)**. Custom fields. **Bulk import/export (CSV)**.                                                                                                                                           | ✅ Complete |
| **Position Management**                  | ✅ Creation, viewing, editing, and deletion of job positions. Management of position details (title, department, description, status, level). Custom fields. **Enhanced filtering (title, department, status, level)**. **Bulk import/export (CSV)**.                                                                                                                                                                                                                                                                                                                                    | ✅ Complete |
| **User Management**                      | ✅ Creation, viewing, editing, and deletion of user accounts. Assignment of user roles (Admin, Recruiter, Hiring Manager). Management of module-level permissions (including **import/export permissions**). **User group management with permission assignment to groups**. Admin reset of user passwords.                                                                                                                                                                                                                                                                        | ✅ Complete |
| **My Task Board**                        | ✅ View for recruiters/admins to see their assigned candidates, with **enhanced filtering capabilities similar to the main candidate list**. Kanban and list views available.                                                                                                                                                                                                                                                                                                                                                                                                                                             | ✅ Complete |
| **Application Logging**                  | ✅ Audit trail for key system and user actions, with **filtering and search capabilities**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | ✅ Complete |
| **API Documentation Page**               | ✅ Overview of available API endpoints with interactive Swagger UI.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ✅ Complete |
| **Settings**                             | ✅ **Server-side general preferences** (Theme preference, App Name, App Logo). **Server-side data model UI preferences** per user. Server-side configurations for recruitment stages (including **deletion with replacement**), custom fields, and webhook payload mapping. Automation webhook integration points. **Notification Settings Configuration** (UI to define events and channels like webhook, with URL for webhooks). | ✅ Complete |

### Out-of-Scope (for this prototype phase):

| Out-of-Scope Item                                                                                                   | Status |
| :------------------------------------------------------------------------------------------------------------------ | :----- |
| Advanced AI-powered resume parsing and candidate-to-job matching (Genkit integration is conceptual).                  | 🔄 Future |
| Real-time notifications and collaboration features (Redis integration is conceptual).                                 | 🔄 Future |
| **Actual triggering and sending of notifications** (email/webhook) based on configured settings.                      | 🔄 Future |
| Direct third-party job board integrations (posting, applicant import beyond current CSV/automation conceptual flow).         | 🔄 Future |
| Advanced analytics and reporting beyond basic dashboard views.                                                        | 🔄 Future |
| Automated email communication workflows.                                               | 🔄 Future |
| Comprehensive performance testing and optimization for very large datasets.                                         | 🔄 Future |
| Public-facing career portal for candidates to apply directly.                                                         | 🔄 Future |
| Drag-and-drop sorting for UI elements like recruitment stages.                                                        | 🔄 Future |
| Full dynamic inheritance of user group permissions into active user sessions (backend for assignment exists, enforcement is conceptual). | 🔄 Future |

## 5. Stakeholders

| Stakeholder Role        | Primary Interest/Responsibility                                                                     | Access Level |
| :---------------------- | :-------------------------------------------------------------------------------------------------- | :----------- |
| Recruiters              | ✅ Primary users for managing candidates and positions, tracking applications, utilizing task board.   | Full access to assigned candidates |
| Hiring Managers         | ✅ Users involved in reviewing candidates and making hiring decisions.                               | Restricted access based on permissions |
| System Administrators   | ✅ Users responsible for managing users, system settings (stages, fields, notifications), and integrity.| Full system access |
| (Future) Candidates     | 🔄 Indirectly affected by the efficiency and usability of the system.                                  | No direct access |

## 6. Business Requirements

### Functional Requirements (Implemented):

| ID    | Requirement Description                                                                                                          | Status |
| :---- | :------------------------------------------------------------------------------------------------------------------------------- | :----- |
| FR1.1 | ✅ The system must allow users to register (if applicable) and log in using email/password.                                         | ✅ Complete |
| FR1.2 | ✅ The system must support Single Sign-On (SSO) via Azure Active Directory.                                                           | ✅ Complete |
| FR1.3 | ✅ The system must enforce role-based and permission-based access control (RBAC) for different functionalities.                   | ✅ Complete |
| FR1.4 | ✅ Users must be able to change their own passwords.                                                                                  | ✅ Complete |
| FR2.1 | ✅ Authorized users must be able to create, view, edit, and delete candidate profiles.                                              | ✅ Complete |
| FR2.2 | ✅ The system must allow uploading and storing candidate resumes, and maintain a history of uploaded resumes.                       | ✅ Complete |
| FR2.3 | ✅ The system must allow uploading and storing candidate profile images.                                                            | ✅ Complete |
| FR2.4 | ✅ The system must track the status of candidates through a customizable recruitment pipeline.                                        | ✅ Complete |
| FR2.5 | ✅ The system must log changes in candidate status and allow adding/editing notes to these transitions.                               | ✅ Complete |
| FR2.6 | ✅ The system must allow **enhanced filtering** for candidates (e.g., by name, position, status, education, fit score).             | ✅ Complete |
| FR2.7 | ✅ The system must support **bulk import and export of candidate data** (e.g., via CSV).                                            | ✅ Complete |
| FR3.1 | ✅ Authorized users must be able to create, view, edit, and delete job positions.                                                   | ✅ Complete |
| FR3.2 | ✅ The system must store details for each position, including title, department, description, status, and level.                    | ✅ Complete |
| FR3.3 | ✅ The system must allow **enhanced filtering** for positions (e.g., by title, department, status, level).                          | ✅ Complete |
| FR3.4 | ✅ The system must support **bulk import and export of position data** (e.g., via CSV).                                             | ✅ Complete |
| FR4.1 | ✅ Administrators must be able to create, view, edit, and delete user accounts.                                                     | ✅ Complete |
| FR4.2 | ✅ Administrators must be able to assign roles and **granular module permissions** (e.g., import/export) to users.                  | ✅ Complete |
| FR4.3 | ✅ Administrators must be able to create and manage **user groups, and assign permissions to these groups**.                          | ✅ Complete |
| FR5.1 | ✅ The system must log key user actions and system events for auditing purposes, with **filtering and search capabilities**.        | ✅ Complete |
| FR6.1 | ✅ The system must provide a **My Task Board** with **enhanced filtering** for assigned candidates.                                   | ✅ Complete |
| FR7.1 | ✅ The system must allow administrators to manage application **preferences (App Name, Logo) on the server**.                         | ✅ Complete |
| FR7.2 | ✅ The system must allow administrators to manage **recruitment stages**, including deletion with a replacement strategy.             | ✅ Complete |
| FR7.3 | ✅ The system must allow administrators to define **custom fields** for candidates and positions.                                     | ✅ Complete |
| FR7.4 | ✅ The system must allow administrators to configure **webhook payload mappings**.                                                  | ✅ Complete |
| FR7.5 | ✅ The system must allow administrators to configure **notification settings** (events, channels, webhook URLs).                    | ✅ Complete |
| FR7.6 | ✅ Users must be able to set their **UI display preferences for data models**, stored on the server.                                | ✅ Complete |

### Non-Functional Requirements (Implemented):

| ID     | Requirement Description                                                                                             | Status |
| :----- | :------------------------------------------------------------------------------------------------------------------ | :----- |
| NFR1   | ✅ **Performance:** The system should respond to user actions within acceptable timeframes (e.g., page loads within 3-5 seconds for typical operations). | ✅ Complete |
| NFR2.1 | ✅ **Security:** User passwords must be securely hashed (e.g., using bcrypt).                                          | ✅ Complete |
| NFR2.2 | ✅ **Security:** Access to system functionalities must be restricted based on user roles and permissions.              | ✅ Complete |
| NFR2.3 | ✅ **Security:** Sensitive data (e.g., candidate PII) should be handled appropriately.                                 | ✅ Complete |
| NFR3   | ✅ **Usability:** The user interface should be intuitive and easy to navigate for all user roles.                        | ✅ Complete |
| NFR4   | ✅ **Reliability:** The system should be available and function correctly during expected usage hours.                 | ✅ Complete |
| NFR5   | ✅ **Maintainability:** The codebase should be well-organized and documented to facilitate future updates.           | ✅ Complete |
| NFR6   | ✅ **Scalability:** The system architecture should allow for future scaling (within prototype limits).                 | ✅ Complete |
| NFR7   | ✅ **Configurability:** Key aspects of the system (stages, custom fields, notifications) should be configurable by admins. | ✅ Complete |

## 7. Success Criteria

| Criterion                                                                                                              | Status |
| :--------------------------------------------------------------------------------------------------------------------- | :----- |
| ✅ Successful creation, management, and tracking of at least 50 mock candidates through various pipeline stages.          | ✅ Achieved |
| ✅ Successful creation and management of at least 10 mock job positions.                                                  | ✅ Achieved |
| ✅ Demonstration of user login (credentials & SSO) and role/permission-based access for Admin, Recruiter, Hiring Manager. | ✅ Achieved |
| ✅ Successful resume and profile image upload and retrieval for mock candidates.                                          | ✅ Achieved |
| ✅ Audit logs are generated for key CRUD operations and user authentication events, and are searchable.                   | ✅ Achieved |
| ✅ Admins can successfully configure recruitment stages (including deletion with replacement), custom fields, user groups, and basic notification preferences. | ✅ Achieved |
| ✅ Server-side application preferences (name, logo) are configurable and reflected.                                         | ✅ Achieved |
| ✅ User-specific data model UI preferences are configurable and stored.                                                     | ✅ Achieved |
| ✅ Enhanced filters on candidate, position, and task board pages function correctly.                                        | ✅ Achieved |
| ✅ Positive feedback from internal review on usability and core functionality.                                            | ✅ Achieved |

## 8. Assumptions

| Assumption                                                                                            | Status |
| :---------------------------------------------------------------------------------------------------- | :----- |
| ✅ The chosen technology stack (Next.js, PostgreSQL, MinIO, Docker) is suitable for the project's objectives. | ✅ Validated |
| ✅ Docker and Docker Compose will be used for local development and deployment environments.             | ✅ Implemented |
| ✅ Necessary environment variables for external services (Azure AD, automation webhooks) will be provided.        | ✅ Configured |
| ✅ Standard web browsers will be used to access the application.                                         | ✅ Tested |
| ✅ Initial database schema will be correctly applied during setup.                         | ✅ Implemented |

## 9. Constraints

| Constraint                                                                                                 | Status |
| :--------------------------------------------------------------------------------------------------------- | :----- |
| ✅ The project is developed as a prototype; some production-grade features (e.g., actual notification sending) are out of scope for initial phase. | ✅ Acknowledged |
| ✅ Development relies on the capabilities of the specified tech stack.                                      | ✅ Validated |
| ✅ Time and resources are limited as per a typical prototype development cycle.                               | ✅ Completed |
| ✅ Rich UI interactions like drag-and-drop are not implemented in this phase.                                 | ✅ Acknowledged |

## 10. Risks

| Risk                                      | Likelihood | Impact | Mitigation Strategy                                                                                                                                  | Status |
| :---------------------------------------- | :--------- | :----- | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :----- |
| Data Migration (Future)                   | Low        | High   | If migrating from an existing system, data mapping and transfer could be complex. (Low risk for prototype)                                             | ✅ Mitigated |
| User Adoption (Future)                    | Low        | High   | Ensuring users are trained and adopt the new system effectively. (Low risk for prototype)                                                              | ✅ Addressed |
| Scope Creep                               | Medium     | Medium | Adding features beyond the defined scope for the prototype phase could impact timelines. Rigorous adherence to scope and BRD.                          | ✅ Controlled |
| Technical Debt                            | Medium     | Medium | Rapid prototyping might introduce technical debt. Plan for refactoring if system moves to production.                                                | ✅ Managed |
| Environment Configuration Issues          | Medium     | High   | Incorrect setup of environment variables or Docker configurations can hinder development and deployment. Thorough documentation and testing of setup.  | ✅ Resolved |
| Complexity of Permission Model            | Medium     | Medium | Ensuring the user group and individual permission model is correctly implemented and enforced. Thorough testing of access control.                     | ✅ Implemented |
| Data Integrity on Stage Deletion          | Low        | Medium | Ensure replacement logic for deleting stages in use correctly migrates data.                                                                         | ✅ Implemented |

## 11. Implementation Status

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

## 12. Appendices

*   **Appendix A**: Data Model Overview (Key entities and relationships - see `prisma/schema.prisma` for schema)
*   **Appendix B**: API Documentation (Available at `/api-docs`)
*   **Appendix C**: Test Cases (See `documents/TestCases.md`)
*   **Appendix D**: Software Requirements Specification (See `documents/SRS.md`)