## FitScan ATS — System Requirements (SRD) — Table View

| Field | Detail |
|---|---|
| Document | System Requirements Document (SRD) |
| Version | 1.0 |
| Date | January 2025 |
| Project | FitScan ATS |
| Status | Approved |

---

### System Overview

| Topic | Detail |
|---|---|
| Purpose | ATS to streamline recruitment via automation, real-time collaboration, and AI matching. |
| In Scope | Candidate, position, user management; AI matching; analytics; automation. |
| Out of Scope | Payroll, onboarding, performance management. |
| Context | External systems (HR, email, calendar) integrate with FitScan; users access via web. |

---

### Architecture

| Area | Technology / Requirement |
|---|---|
| Pattern | Next.js full-stack app with modular services |
| Database | PostgreSQL 15 with Prisma ORM |
| Storage | MinIO object storage |
| Real-time | Server-Sent Events (SSE) |
| AI | Google AI (Genkit) |
| Automation | N8N platform |
| Auth | NextAuth.js (local + Azure AD) |
| Language | TypeScript |
| UI | React, Tailwind, ShadCN |
| Containers | Docker, Compose; PM2 |

---

### Technology Stack (Reference)

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend | Next.js | 15.5.2 | Full-stack React framework |
| UI Library | React | 18.3.1 | Component-based UI |
| Language | TypeScript | 5.x | Type-safe development |
| Styling | Tailwind CSS | 3.4.x | Utility-first CSS |
| Components | ShadCN UI | Latest | Pre-built components |
| Backend | Next.js API | 15.5.2 | RESTful endpoints |
| ORM | Prisma | 6.11.0 | DB abstraction |
| Database | PostgreSQL | 15 | Primary storage |
| Authentication | NextAuth.js | 4.24.11 | Multi-provider auth |
| File Storage | MinIO | Latest | Object storage |
| AI/ML | Google AI | Latest | Matching engine |
| Automation | N8N | Latest | Workflow orchestration |
| Containerization | Docker | 20.10+ | Deployment |

---

### Functional Requirements (Systems)

| ID | System | Priority | Key Requirements | Technical Notes |
|---|---|---|---|---|
| FR-001 | User Management | High | Registration, auth, RBAC, profiles, sessions, MFA, Azure AD | JWT, bcrypt; 8h timeout; lockout after 5 failures; password policy |
| FR-002 | Candidate Management | High | Profiles, resume upload/parsing, status, search/filter, bulk, audits | PDF/DOC/DOCX; 50MB; 90%+ parsing; search <2s; bulk 1,000 |
| FR-003 | Position Management | High | Create/manage positions, status, recruiter assignment, search, custom fields, analytics | Rich JD editor; validation; hierarchy; workload tracking |
| FR-004 | AI Matching | High | Parse, match, fit score, reasoning, learn from feedback, reporting | Genkit; processing <30s; accuracy 85%+; manual override |
| FR-005 | Real-time Collab | Medium | SSE, notifications, live status, comments, presence, preferences | Connection mgmt, broadcasting, queues, pref storage |
| FR-006 | Analytics/Reporting | Medium | Dashboards, reports, export, KPIs, trends, scheduling | Chart libs; CSV/XLS/PDF; scheduled jobs; real-time updates |

---

### Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Pages <3s; API <2s; 1000+ concurrent; 99.9% uptime; CPU <80%; RAM <8GB |
| Security | MFA; RBAC; encryption in transit/at rest; audit trails; GDPR/CCPA |
| Reliability | Daily backups; RTO <4h; RPO <1h; monitoring 24/7; automated alerts |
| Usability | Responsive UI; WCAG 2.1 AA; EN/TH; documentation; tiered support |

---

### Technical Specifications

| Area | Key Specs |
|---|---|
| Database (logical) | Users, Candidates, Positions, RecruitmentStages, TransitionRecords, Attachments, UserGroups, CustomFieldDefinitions, SystemSettings |
| API | Base `/api/v1/`; JSON; JWT Bearer; HTTP status codes; rate limit 1000 req/hr/user; CORS enabled |
| Files | MinIO; formats: PDF/DOC/DOCX/JPG/PNG; 50MB; RBAC file access; auto backups |

---

### Integration Requirements

| System | Capabilities |
|---|---|
| Email | SMTP, templates, notifications, bounce handling |
| Calendar | Interview scheduling, invites, time zones, conflict detection |
| HR | Employee sync, org structure, position hierarchy, user management |
| Webhooks | Real-time data sync, events, custom workflows, error handling |
| API | REST, JWT, configurable rate limits, OpenAPI docs, versioned, automated tests |

---

### Security Requirements

| Area | Controls |
|---|---|
| AuthN/Z | MFA (TOTP), secure sessions, password policy, lockout, Azure AD SSO |
| Data Protection | AES-256 at rest, TLS 1.3 in transit, data masking, access logs, retention policies |
| Compliance | GDPR, CCPA, SOC 2, ISO 27001, regular audits |

---

### Performance & Scalability

| Topic | Targets |
|---|---|
| Response Times | Pages <3s (p95); API <2s (p95); search <2s; upload 50MB <30s; reports <60s |
| Throughput | 1000+ users; 10k+ API req/hr; 100+ concurrent uploads; 50k+ DB queries/hr; 1000+ SSE events/s |
| Scalability | Horizontal auto-scale; DB read replicas; load balancing; Redis caching; CDN for static |

---

### Deployment

| Area | Requirement |
|---|---|
| Infrastructure | Ubuntu 20.04+; Docker 20.10+; Docker Compose; PM2; optional Nginx |
| Environments | Dev, Staging, Production, Backup, Monitoring |
| Process | Multi-stage images; env var management; health checks; rolling updates; fast rollback |

---

### Appendices

| Appendix | Content |
|---|---|
| A: DB Schema (excerpt) | Core tables: User, Candidate, Position, RecruitmentStage, TransitionRecord, Attachment |
| B: API Endpoints (excerpt) | CRUD for candidates, positions, users under `/api/v1/` |
| C: Config (excerpt) | docker-compose services for app, postgres, minio; required env vars |

---

### Approvals

| Role | Name | Signature | Date |
|---|---|---|---|
| Technical Lead | [To be filled] |  |  |
| System Architect | [To be filled] |  |  |
| Security Officer | [To be filled] |  |  |

---

This document is confidential and proprietary. Distribution is restricted to authorized personnel only.


