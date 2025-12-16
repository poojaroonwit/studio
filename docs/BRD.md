# Business Requirements Document (BRD) - FitScan Enterprise ATS

**Project Name:** FitScan Enterprise
**Document Version:** 1.0 (Official)
**Date:** December 16, 2025
**Status:** Approved for Development
**Author:** FitScan Product Team

---

## 1. Executive Summary

### 1.1 Project Background
The current recruitment landscape faces challenges in efficiency and quality. Manual resume screening processes are time-consuming, subjective, and prone to bias, leading to extended "Time-to-Hire" metrics and suboptimal candidate placement. Communication gaps between recruiters and hiring managers further delay decision-making.

FitScan Enterprise is proposed as a centralized Applicant Tracking System (ATS) designed to address these core inefficiencies. By integrating Generative AI for objective candidate scoring and facilitating real-time collaboration for interview panels, FitScan aims to modernize the end-to-end hiring lifecycle.

### 1.2 Business Goals
1.  **Metric Improvement**: Reduce "Time-to-Hire" by 40% within the first 6 months of deployment.
2.  **Process Automation**: Automate 80% of initial resume data entry and screening through AI parsing.
3.  **Collaboration**: Transition 100% of internal feedback collection from email/Excel to the centralized platform.
4.  **Mobility**: Empower decision-makers with a fully functional mobile interface for approvals and evaluations on-the-go.

---

## 2. Business Scope

### 2.1 In-Scope Functionality
The project encompasses the following modules and capabilities:

*   **Candidate Acquisition & Management**:
    *   Resume ingestion (PDF/DOCX) with intelligent data extraction (OCR + NLP).
    *   Automated duplicate detection logic based on email/phone heuristics.
    *   Unified candidate profiles aggregating resume data, interview history, and documents.
*   **Job Requisition Management**:
    *   Creation of detailed job postings with automated approval workflows.
    *   Headcount tracking (Approved vs. Filled slots) with SLA monitoring.
    *   Interviewer assignment and scheduling coordination.
*   **Intelligent Screening (AI)**:
    *   "Fit Score" calculation (0-100%) grading candidates against specific job descriptions.
    *   Automated summarization of key strengths and weaknesses.
*   **Collaborative Evaluation**:
    *   Digital scorecards for functional skills and personality traits.
    *   Real-time synchronization of scores during panel interviews.
    *   Mobile-first evaluation interface for convenience.
*   **Administration & Compliance**:
    *   Role-Based Access Control (RBAC) separating Recruiters, Hiring Managers, and Admins.
    *   SSO Integration (Azure Active Directory).
    *   Comprehensive audit logs for all create/update/delete actions.

### 2.2 Out-of-Scope Functionality
*   **External Job Board Integration**: No direct posting to platforms like LinkedIn or Indeed in Phase 1.
*   **Video Conferencing**: Hosting video calls is excluded; usage will rely on external links (Teams/Zoom).
*   **Payroll/HRIS**: Post-hiring onboarding and payroll processing are handled by external systems.

### 2.3 User Personas
1.  **The Recruiter (Primary User)**: Sourcing candidates, managing pipelines, performing initial screens. Needs efficiency and bulk tools.
2.  **The Hiring Manager (Decision Maker)**: Creating job reqs, reviewing shortlisted candidates, making final hiring decisions. Needs mobile access and clear summaries.
3.  **The Viewer/Interviewer**: Subject matter experts conducting technical interviews. Needs a simple, focused evaluation interface.
4.  **The Administrator**: IT staff managing users, permissions, and system configuration.

---

## 3. High-Level Requirements Matrix

### 3.1 Functionality
| ID | Req Type | Description | Priority |
|:---|:---|:---|:---|
| **BR-FUNC-001** | **Core Automation** | The system must be able to parse text from uploaded PDF/DOCX resumes and map it to a structured database schema without manual intervention. | **Critical** |
| **BR-FUNC-002** | **AI Matching** | The system must generate a quantitative score (0-100) indicating the relevance of a candidate's profile to the job description. | **Critical** |
| **BR-FUNC-003** | **Access Control** | The system must prevent unauthorized users from viewing salary or sensitive candidate data based on their Role (e.g., Hiring Manager vs Recruiter). | **High** |
| **BR-FUNC-004** | **Mobility** | All "Approval" and "Evaluation" workflows must be fully executable on mobile devices (iOS/Android browsers). | **High** |
| **BR-FUNC-005** | **Real-Time Sync** | Updates made by one user (e.g., changing a status) must be reflected instantly on other active users' screens to prevent conflicts. | **Medium** |

### 3.2 Non-Functional
| ID | Req Type | Description | Priority |
|:---|:---|:---|:---|
| **BR-NF-001** | **Performance** | The "Candidate List" page must load under 2 seconds for a volume of up to 10,000 records. | **High** |
| **BR-NF-002** | **Security** | All Personal Identifiable Information (PII) must be encrypted at rest and in transit (TLS 1.2+). | **Critical** |
| **BR-NF-003** | **Availability** | The system must target 99.9% uptime during business hours (8 AM - 8 PM). | **High** |

---

## 4. Risks & Dependencies

### 4.1 Key Risks
*   **Data Accuracy**: AI parsing may potentially misinterpret complex or non-standard resume formats. Mitigation: Provide manual override capabilities for all parsed fields.
*   **Adoption Friction**: Hiring managers accustomed to email workflows may resist platform adoption. Mitigation: Focus heavily on mobile UX simplicity.

### 4.2 Dependencies
*   **Azure AD**: Corporate SSO infrastructure must be stable for authentication.
*   **Google GenAI**: Availability and quota limits of the AI service provider affect the "Fit Score" feature.

---

## 5. Approval
| Name | Role | Date | Signature |
|:---|:---|:---|:---|
| -- | Project Sponsor | -- | -- |
| -- | Product Owner | -- | -- |
| -- | Lead Architect | -- | -- |
