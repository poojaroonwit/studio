# FitScan Database Design

This document details the database schema for the FitScan system, built on **PostgreSQL** and managed via **Prisma ORM**.

## 📊 Entity Relationship Overview

The schema is organized into several functional modules:

```mermaid
erDiagram
    USER ||--o{ ACCOUNT : "external auth"
    USER ||--o{ POSITION : "recruits"
    USER ||--o{ CANDIDATE : "manages"
    USER ||--o{ NOTIFICATION : "receives"
    
    POSITION ||--o{ CANDIDATE : "contains"
    POSITION ||--o{ HEADCOUNT : "tracks"
    POSITION ||--o{ POSITION_INTERVIEWER : "assigned"
    
    CANDIDATE ||--o{ ATTACHMENT : "uploads"
    CANDIDATE ||--o{ TRANSITION_RECORD : "stage history"
    CANDIDATE ||--o{ CANDIDATE_EVALUATION : "evaluated"
    
    RECRUITMENT_STAGE ||--o{ CANDIDATE : "status"
    
    EXPERTISE_GROUP ||--o{ EXPERTISE_SKILL : "contains"
    CANDIDATE_EVALUATION ||--o{ CANDIDATE_EXPERTISE_SCORE : "scores"
    EXPERTISE_SKILL ||--o{ CANDIDATE_EXPERTISE_SCORE : "rated"
```

---

## 🔐 1. User & Access Control
Manages identity, authentication (Basic + Azure AD), and role-based permissions.

- **`User`**: Central identity table. Stores profile info, role, and MFA state.
- **`UserGroup`**: Defines sets of permissions for RBAC.
- **`UserTeam`**: Groups users for organizational structure.
- **`Account`**: External OAuth provider links (managed by NextAuth).
- **`UserActivityLog`**: Tracks security events (logins, password changes).

---

## 💼 2. Recruitment Core
The heart of the system, tracking job openings and applicants.

- **`Position`**: Job requisition details, required skills, and assigned recruiters.
- **`Candidate`**: Applicant profiles, contact info, parsed resume data, and AI Fit Scores.
- **`RecruitmentStage`**: Configurable workflow stages (e.g., "Screening", "Technical Interview").
- **`TransitionRecord`**: Audit trail of every time a candidate moves between stages.
- **`CandidateSource`**: Tracks where candidates came from (LinkedIn, Referral, etc.).

---

## 📝 3. Evaluation & AI Matching
A sophisticated subsystem for assessing candidates against position requirements.

- **`ExpertiseSkill` & `PersonalityTrait`**: Atomic units of evaluation, grouped into `ExpertiseGroup` and `PersonalityGroup`.
- **`SkillTemplate`**: Predefined sets of skills/traits that can be quickly applied to new positions.
- **`CandidateEvaluation`**: A specific assessment session for a candidate, including scores and comments.
- **`JobMatch`**: Stores AI-generated justifications and scores for candidate-position matching.

---

## ⚙️ 4. System & Integration
Utility tables for extensibility and monitoring.

- **`CustomFieldDefinition`**: Allows users to add dynamic fields to Candidates or Positions without schema changes (JSONB backed).
- **`Webhook`**: Configures outbound event notifications (e.g., notify Slack when a candidate is hired).
- **`UploadQueue`**: Manages asynchronous processing of uploaded resumes.
- **`AuditLog` & `LogEntry`**: General system logging and security auditing.

---

## 📈 5. Dashboards & UI
Stores user-specific interface configurations.

- **`Dashboard`**: Custom layouts for analytics.
- **`UserUIDisplayPreference`**: Remembers UI states (filters, column visibility) per user.
- **`Notification`**: In-app alerts for recruiters.

---

## 🛡️ Key Design Patterns
1. **Soft Deletions/Active Flags**: Most entities use `isActive` booleans instead of hard deletes to maintain audit integrity.
2. **JSONB for Extensibility**: Tables like `Candidate` and `Position` use JSONB columns (`parsedData`, `customAttributes`) for flexible data structures.
3. **Audit Trails**: Every stage movement is captured in `TransitionRecord`, and every security action in `UserActivityLog`.
