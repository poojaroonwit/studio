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

### Component Architecture

| Layer | Responsibilities | Key Components |
|---|---|---|
| Presentation | UI rendering, routing, accessibility, state via contexts | Next.js pages/routes, React components, ShadCN UI, Tailwind, contexts/providers, hooks |
| Application | HTTP/API handling, request validation, orchestration | Next.js API routes, controllers/handlers, middleware, DTO/validators |
| Domain | Core logic, use-cases, policies, rules | Services (matching, permissions), business rules, mappers |
| Infrastructure | Data and integrations | Prisma repositories, PostgreSQL, MinIO, SSE broker, SMTP/email, N8N, external HR/calendar APIs |

---

#### Frontend Modules (Next.js/React)

| Module | Purpose | Examples |
|---|---|---|
| Layout & Navigation | Global layout, sidebar, breadcrumbs | `src/app/layout.tsx`, navigation components |
| Shared UI | Reusable inputs, tables, modals | `src/components/ui/*` |
| Candidates | Browse, detail, actions, uploads | `src/components/candidates/*`, `src/app/candidates/*` |
| Positions | Manage job positions | `src/components/positions/*`, `src/app/positions/*` |
| Users & Auth | Sign-in, RBAC surface | `src/app/auth/*`, `src/components/users/*` |
| Dashboard & Reports | KPIs, charts | `src/components/dashboard/*`, charts |
| Settings | System/org configuration | `src/components/settings/*`, `src/app/settings/*` |
| Tasks & SLA | My tasks, SLA monitoring | `src/components/tasks/*`, `src/app/sla-monitoring/*` |
| Providers & Contexts | Global state, notifications, z-index | `src/contexts/*`, `src/components/providers/*` |

---

#### Backend Modules (API/Services)

| Module | Responsibilities | Tech/Notes |
|---|---|---|
| Auth | Session, providers, RBAC | NextAuth.js, JWT, Azure AD, policy checks |
| Candidates | CRUD, search, bulk ops, audit | Prisma, indexes, validations |
| Positions | CRUD, assignment, analytics | Prisma, custom fields |
| Matching (AI) | Resume parse, fit score, reasoning | Google AI (Genkit), async jobs |
| Realtime | SSE streams, notifications | Connection registry, event fan-out |
| Files | Uploads, previews, access control | MinIO, signed URLs, virus scan (optional) |
| Analytics | KPIs, exports, scheduling | Aggregations, CSV/XLS/PDF |
| Workflows | Webhooks, N8N triggers | Signed webhooks, retry/queue |
| Admin | Settings, health, maintenance | Config store, metrics |

---

#### Data Flow (High-Level)

| Step | Flow |
|---|---|
| UI -> API | Client invokes Next.js API route with JWT; middleware validates and enriches request context. |
| API -> Domain | Controller maps DTO -> use-case service, enforcing business rules and permissions. |
| Domain -> Infra | Services call repositories (Prisma), file gateways (MinIO), or external adapters. |
| Infra -> Domain -> API | Results mapped to response models; errors normalized to HTTP statuses. |
| Realtime | Domain events dispatched to SSE broker; clients receive updates by channel/topic. |
| Workflows | Outbound webhooks/N8N triggers fired on notable events with signed payloads and retries. |

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

### Interfaces and Contracts

| Interface | Direction | Consumer | Provider | Protocol/Format | Notes |
|---|---|---|---|---|---|
| Auth | Inbound | Web clients | NextAuth | OAuth/OIDC, JWT | Azure AD and credentials; session cookies |
| Candidates API | Inbound | UI, Integrations | Next.js API | HTTPS/JSON | CRUD, search, bulk, rate-limited |
| Positions API | Inbound | UI, Integrations | Next.js API | HTTPS/JSON | CRUD, analytics |
| Matching Service | Internal | API layer | AI adapter | Function/HTTP | Async job option for large batches |
| SSE Events | Outbound | Web clients | Realtime broker | HTTP/SSE | Authenticated channels |
| Webhooks | Outbound | External systems, N8N | Webhook dispatcher | HTTPS/JSON + HMAC | Retries with backoff |
| File Storage | Internal | API layer | MinIO | S3-compatible | Signed URLs; lifecycle |

---

### Configuration & Feature Flags

| Category | Key | Default | Description |
|---|---|---|---|
| Security | SESSION_TIMEOUT_HOURS | 8 | Session expiry |
| Files | MAX_UPLOAD_MB | 50 | Upload size limit |
| Performance | SEARCH_P95_MS | 2000 | Target p95 for search |
| Matching | MATCH_TIMEOUT_MS | 30000 | Max time for fit score |
| Notifications | EMAIL_RETRY_MAX | 5 | Max retries for email |
| Features | ENABLE_TALENT_POOLS | false | Gradual rollout |

---

### Security Matrix (RBAC x Resources)

| Resource | Admin | Recruiter | Hiring Manager | Candidate |
|---|---|---|---|---|
| Candidates | Full | Own/assigned | View assigned | Self |
| Positions | Full | Create/edit assigned | View/allocation | - |
| Files | Full | Upload/read assigned | Read assigned | Own uploads |
| Reports | Full | Team-level | Role-specific | - |
| Settings | Full | Limited (prefs) | - | - |

---

### SLOs, SLIs, Error Budgets

| SLO | SLI | Target | Error Budget |
|---|---|---|---|
| Availability | Uptime % monthly | 99.9% | 43.8 min/month |
| Performance | p95 page load | <3s | 5% of requests may exceed |
| API Latency | p95 endpoint | <2s | 5% of requests may exceed |
| Realtime | Delivery time | <1s | 1% events may exceed |

---

### Observability

| Area | Metrics | Logs | Traces |
|---|---|---|---|
| API | req/sec, p95/p99, error rate | structured JSON with request IDs | end-to-end route traces |
| DB | query latency, locks, cache hit | slow query log | Prisma spans |
| Realtime | connections, fan-out time | connect/disconnect events | SSE publish spans |
| Files | throughput, error rate | upload/download logs | storage access spans |

---

### Test Strategy

| Level | Scope | Tools | Gate |
|---|---|---|---|
| Unit | Pure functions/services | Vitest/Jest | 80%+ critical coverage |
| Integration | API + DB + external stubs | Supertest/Vitest | Green on main |
| E2E | Critical user flows | Playwright/Cypress | Passing before release |
| Non-Functional | Load, security, accessibility | k6/ZAP/axe | Meets SLOs, no high vulns |

---

### Deployment Matrix

| Env | Purpose | Scale | Data |
|---|---|---|---|
| Dev | Developer sandbox | 1x | Synthetic |
| Staging | Pre-prod testing | ~2-3x | Production-like |
| Production | Live users | Auto-scale | Production |

---

### Data Model Notes

| Topic | Guidance |
|---|---|
| Keys | UUID v4 for primary keys |
| Auditing | Created/updated by, timestamps on mutable tables |
| Soft Deletes | `deleted_at` for recoverability where legal |
| Indexing | Fit score, status, updated_at, foreign keys |
| Custom Fields | Separate definitions + values tables per entity |

---

### Backup & Restore

| Area | Policy |
|---|---|
| DB Backups | Daily full, 7-day retention; weekly for 12 weeks |
| Files | Lifecycle + daily snapshot |
| Restore | Quarterly DR test; RTO <4h, RPO <1h |

---

### Detailed API Specifications

| Endpoint | Method | Request | Response | Status Codes |
|---|---|---|---|---|
| `/api/v1/candidates` | GET | Query params: page, limit, search, status | Paginated candidate list | 200, 400, 401, 403 |
| `/api/v1/candidates` | POST | Candidate object | Created candidate | 201, 400, 401, 403, 409 |
| `/api/v1/candidates/{id}` | GET | Path param: id | Candidate details | 200, 401, 403, 404 |
| `/api/v1/candidates/{id}` | PUT | Path param: id, Candidate object | Updated candidate | 200, 400, 401, 403, 404 |
| `/api/v1/candidates/{id}/match` | POST | Path param: id, position_id | Match result with score | 200, 400, 401, 403, 404 |
| `/api/v1/positions` | GET | Query params: page, limit, status | Paginated position list | 200, 400, 401, 403 |
| `/api/v1/analytics/dashboard` | GET | Query params: date_range, metrics | Dashboard data | 200, 400, 401, 403 |

---

### Database Schema Details

| Table | Purpose | Key Fields | Indexes | Constraints |
|---|---|---|---|---|
| User | System users | id, email, role, permissions | email (unique), role | NOT NULL: email, role |
| Candidate | Job applicants | id, name, email, position_id, status_id | email, position_id, status_id | FK: position_id, status_id |
| Position | Job openings | id, title, department, is_open | title, department, is_open | NOT NULL: title |
| RecruitmentStage | Workflow stages | id, name, sort_order | sort_order | NOT NULL: name |
| TransitionRecord | Status changes | id, candidate_id, stage, notes, date | candidate_id, date | FK: candidate_id |
| Attachment | File uploads | id, candidate_id, file_path, file_name | candidate_id | FK: candidate_id |

---

### Error Handling & Logging

| Error Type | HTTP Code | Response Format | Logging Level |
|---|---|---|---|
| Validation Error | 400 | `{error: "validation_failed", details: [...]}` | WARN |
| Authentication Failed | 401 | `{error: "unauthorized", message: "..."}` | WARN |
| Authorization Failed | 403 | `{error: "forbidden", message: "..."}` | WARN |
| Resource Not Found | 404 | `{error: "not_found", message: "..."}` | INFO |
| Server Error | 500 | `{error: "internal_error", message: "..."}` | ERROR |
| Rate Limit Exceeded | 429 | `{error: "rate_limited", retry_after: 60}` | WARN |

---

### Performance Monitoring

| Metric | Collection Method | Alert Threshold | Action |
|---|---|---|---|
| Response Time | Application metrics | p95 > 2s | Scale up instances |
| Error Rate | Application metrics | > 1% | Page on-call engineer |
| Database Connections | DB metrics | > 80% of pool | Review connection usage |
| Memory Usage | System metrics | > 85% | Scale up or optimize |
| Disk Space | System metrics | > 90% | Clean up or expand storage |

---

### Security Controls Matrix

| Control | Implementation | Validation | Monitoring |
|---|---|---|---|
| Input Validation | Joi/Zod schemas | Unit tests | Log validation failures |
| SQL Injection | Prisma ORM | Penetration testing | Monitor unusual queries |
| XSS Prevention | React sanitization | Security scanning | CSP violation reports |
| CSRF Protection | CSRF tokens | Security testing | Token validation logs |
| Rate Limiting | Express rate limiter | Load testing | Rate limit hit logs |
| Authentication | JWT + NextAuth | Security audit | Failed login attempts |

---

### Disaster Recovery

| Scenario | RTO | RPO | Recovery Steps |
|---|---|---|---|
| Application Server Failure | 15 minutes | 0 minutes | Auto-scale new instance |
| Database Failure | 4 hours | 1 hour | Restore from backup |
| Data Center Outage | 8 hours | 4 hours | Failover to secondary region |
| Complete System Loss | 24 hours | 24 hours | Full infrastructure rebuild |

---

### Capacity Planning

| Resource | Current | Growth Rate | 6-Month Projection | Scaling Action |
|---|---|---|---|---|
| Users | 100 | 20%/month | 300 | Auto-scale instances |
| Candidates | 10,000 | 15%/month | 25,000 | Database partitioning |
| File Storage | 100GB | 10%/month | 200GB | Lifecycle policies |
| API Calls | 1M/month | 25%/month | 4M/month | CDN + caching |

---

### Integration Patterns

| Pattern | Use Case | Implementation | Benefits |
|---|---|---|---|
| Webhook | Real-time notifications | HTTP POST with HMAC | Decoupled, reliable |
| API Gateway | External access | Rate limiting, auth | Security, monitoring |
| Event Sourcing | Audit trail | Domain events | Complete history |
| CQRS | Read optimization | Separate read models | Performance, scalability |
| Saga | Distributed transactions | Choreography | Consistency, resilience |

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


