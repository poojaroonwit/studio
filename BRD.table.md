## FitScan ATS — Business Requirements (BRD) — Table View

| Field | Detail |
|---|---|
| Document | Business Requirements Document (BRD) |
| Version | 1.0 |
| Date | January 2025 |
| Project | FitScan ATS |
| Status | Approved |

---

### Executive Summary

| Topic | Summary |
|---|---|
| Project Overview | Enterprise ATS to streamline recruitment with AI matching, automation, and real-time collaboration. |
| Business Problems | Manual screening, poor candidate experience, limited visibility, scalability, integrations, compliance. |
| Proposed Solution | Automated workflows, AI matching (Google AI), SSE live updates, analytics, RBAC security, scalable stack. |

---

### Business Objectives

| Objective | Key Targets |
|---|---|
| Improve recruitment efficiency | - Time-to-hire −40%<br>- Automate 80% screening<br>- Recruiter productivity +50% |
| Enhance candidate experience | - Real-time status<br>- Streamlined application/interviews<br>- Consistent communication |
| Data-driven decisions | - Full analytics<br>- KPI tracking<br>- Actionable insights |
| Compliance and security | - Full audit trails<br>- RBAC<br>- Data protection compliance |
| Secondary: Cost, Quality, Growth | - Reduce cost<br>- Improve hire quality<br>- Scale and integrate |

---

### Stakeholders

| Stakeholder | Role | Core Needs | Success Metrics |
|---|---|---|---|
| HR Managers | Strategy/oversight | Analytics, optimization, compliance | Time-to-hire ↓, quality ↑ |
| Recruiters | Day-to-day ops | Intuitive UI, automation, real-time collab | Productivity ↑, manual work ↓ |
| Hiring Managers | Evaluation/decisions | Candidate info, scheduling, feedback | Faster decisions, better insights |
| Candidates | Applicants | Easy apply, clear updates, mobile | Better experience, satisfaction ↑ |
| IT Admins | Maintenance/support | Admin ease, monitoring, integrations | Reliability, maintainability |
| Compliance Officers | Governance | Audit, data protection, reports | Compliance, audit readiness |
| Executives | Strategy/ROI | High-level analytics, ROI | Value realization, alignment |

---

### Business Requirements (with Acceptance)

| ID | Title | Priority | Key Requirements | Acceptance Criteria |
|---|---|---|---|---|
| BR-001 | Candidate Management | High | Profiles, multi-resume, stage tracking, search/filter, bulk ops, audits | CRUD profiles; drag-drop upload; stage history; search <2s; bulk 1,000 |
| BR-002 | Position Management | High | Position profiles, status, recruiter assignment, search, bulk, analytics | CRUD positions; validated status; auditable assignment; search <2s; bulk 500 |
| BR-003 | AI Matching | High | Parse resumes, fit score, reasoning, override, learn, reports | 90%+ parsing; score <30s; clear reasoning; override w/ justification; improves |
| BR-004 | Users & Security | High | Roles, RBAC, local/Azure AD auth, permissions, audit logs, teams | ≥3 roles; RBAC blocks unauthorized access; multi-auth; instant perms; all actions logged |
| BR-005 | Real-time Collab | Medium | SSE updates, notifications, live status, comments, presence, history | <1s updates; user prefs; concurrent edits; accurate presence; searchable history |
| BR-006 | Analytics | Medium | Dashboards, custom reports, exports, KPIs, trends, schedules | Dashboards <3s; role-based reports; CSV/XLS/PDF; accurate KPIs; insights |
| BR-007 | Workflow Automation | Medium | Webhooks, N8N, email alerts, custom workflows, APIs, bulk I/O | Secure webhooks; N8N usable; email <5m; no-code workflows; REST standards |
| BR-008 | Admin | Medium | Config, monitoring, backup/recovery, updates, performance, multi-tenant | No-restart config; real-time health; backup <2h; low-downtime updates; tracked metrics |

---

### Functional Requirements

| Group | Key Items |
|---|---|
| UI | Responsive; consistent UX; EN/TH; WCAG 2.1 AA; customizable dashboard |
| Data | 100k+ records; validation; backup/recovery; import/export; retention |
| Integrations | REST API; webhooks; email; calendar; HR systems |
| Performance | Pages <3s; 1000+ concurrent; 99.9% uptime; DB queries <2s; files 50MB |

---

### Non-Functional Requirements

| Category | Key Items |
|---|---|
| Security | Encrypt in transit/at rest; secure auth/session; RBAC; audits; GDPR/CCPA |
| Scalability | Horizontal scale; DB optimization; load balancer/failover; microservices; cloud-ready |
| Reliability | 99.9% availability; automated backups; graceful errors; monitoring/alerts; DR |
| Usability | Intuitive UI; docs; training; feedback loop; accessibility |

---

### Business Rules

| Area | Rules |
|---|---|
| Candidate Data | Encrypt PII; retention per policy; de-duplicate; consent required |
| Process | Log all status changes; configurable stages; workflow gating; reactivation ≤6 months |
| Access Control | Enforce permissions; admins full; recruiters scoped; session idle 8h |
| Data Quality | Validate required fields; unique emails; E.164 phones; resume formats: PDF/DOC/DOCX |
| Integration | Secure auth; rate limiting; validate webhooks; log/monitor failures |

---

### Success Criteria

| Area | KPIs |
|---|---|
| Efficiency | Time-to-hire −40%; productivity +50%; 80% screening automated |
| Adoption | 95% adoption in 3 months; CSAT 90%; training time −85% |
| Performance | 99.9% uptime; pages <3s; 1000+ concurrent |
| Data Quality | 95% accuracy; −90% duplicates; 100% audit coverage |
| Business Impact | Cost −30%; candidate satisfaction +25%; hire quality +20% |
| Technical | 99.5% API <2s; backups 100% success; zero critical vulns |
| Compliance | 100% data-protection compliance; full audit trail; regular assessments |

---

### Scope, Assumptions, Constraints

| Type | Item |
|---|---|
| In Scope | Candidate/position/user management, AI matching, analytics, workflows, admin |
| Out of Scope | Payroll, onboarding, performance management, background checks |
| Assumptions | Internet connectivity; OAuth/Azure AD available; email SMTP reachable; data stored in EU/TH as required |
| Constraints | 50MB upload cap; 1000+ concurrent users; GDPR/CCPA compliance; budget/timeboxed quarterly releases |

---

### MoSCoW Prioritization

| Must Have | Should Have | Could Have | Won't Have (now) |
|---|---|---|---|
| Core CRUD, RBAC, audit logs, resume upload/parse, fit score, dashboards | Calendar integration, CSV/XLS/PDF export, presence, custom fields, webhooks | Interview kits, talent pools, pipeline templates, A/B email | Offer management, onboarding, payroll integration |

---

### Personas

| Persona | Goals | Pain Points | Success Indicators |
|---|---|---|---|
| Recruiter | Quickly shortlist and move candidates | Manual data entry; scattered tools | Time-to-screen ↓; tasks cleared/day ↑ |
| Hiring Manager | Review and decide efficiently | Info overload; unclear status | Decision time ↓; feedback turnaround ↑ |
| HR Manager | Ensure process compliance and KPIs | Siloed data; limited visibility | SLA adherence; KPI dashboards used |
| Candidate | Smooth application and comms | Unclear status; long forms | Completion rate ↑; NPS/CSAT ↑ |
| IT Admin | Keep system healthy and secure | Manual ops; unclear logs | MTTR ↓; uptime and security posture |

---

### Top Use Cases

| UC ID | Title | Primary Actor | Basic Flow | Alternate/Exceptions |
|---|---|---|---|---|
| UC-01 | Create Candidate | Recruiter | Enter details, upload resume, save | Missing fields; duplicate detected/merge |
| UC-02 | Match to Position | Recruiter | Select position, view fit score/reasoning | Manual override with justification |
| UC-03 | Advance Stage | Recruiter | Change status, add note, notify | Permission denied; SLA breach warning |
| UC-04 | Generate Report | HR Manager | Choose KPIs, export CSV/XLS/PDF | Large range → async email delivery |
| UC-05 | Configure Roles | Admin | Assign roles/permissions | Conflict with policy → validation error |

---

### RACI (Selected Activities)

| Activity | R | A | C | I |
|---|---|---|---|---|
| Requirements sign-off | BA | Sponsor | Tech Lead, HR | Stakeholders |
| Security policy | Security Officer | Sponsor | Tech Lead | All users |
| Release go/no-go | Tech Lead | Sponsor | QA, BA | Users |
| Data retention policy | Compliance | Sponsor | Tech Lead, HR | Stakeholders |

---

### Requirement Traceability (BR → FR)

| BR ID | Supports FR IDs |
|---|---|
| BR-001 | FR-002, FR-005, FR-006 |
| BR-002 | FR-003, FR-006 |
| BR-003 | FR-004, FR-006 |
| BR-004 | FR-001 |
| BR-005 | FR-005 |
| BR-006 | FR-006 |
| BR-007 | FR-005, FR-006 |
| BR-008 | FR-001, FR-006 |

---

### Data Privacy & Retention

| Topic | Policy |
|---|---|
| PII Handling | Encrypt at rest/in transit; access via RBAC; masking in logs |
| Consent | Capture explicit consent; store timestamp and source |
| Retention | Default 24 months post-application; configurable per org |
| Right to Erasure | Soft-delete request, purge attachments, anonymize audit where required |
| DSR/Export | Candidate data export in JSON/CSV within 30 days |

---

### KPI Definitions (Detailed)

| KPI | Definition | Target |
|---|---|---|
| Time-to-Hire | Days from requisition open to acceptance | −40% vs baseline |
| Recruiter Productivity | Completed key actions per day per recruiter | +50% |
| Parsing Accuracy | Correctly extracted resume fields / total fields | ≥90% |
| Adoption | Percentage of active users over licensed | ≥95% in 3 months |
| Uptime | Percentage of time system available | ≥99.9% |

---

### Constraints & Dependencies

| Type | Detail |
|---|---|
| Technical | PostgreSQL 15; file size 50MB; SSE over HTTP/HTTPS |
| Organizational | Security reviews quarterly; change windows weekly |
| External | Azure AD availability; SMTP provider; MinIO storage |

---

### Business Process Flows

| Process | Steps | Decision Points | Outputs |
|---|---|---|---|
| Candidate Onboarding | 1. Apply 2. Parse resume 3. Initial screening 4. Assign recruiter 5. Set status | Duplicate check; qualification match | Candidate profile; initial fit score |
| Position Filling | 1. Create position 2. Define requirements 3. Assign recruiter 4. Source candidates 5. Match & rank | Budget approval; role requirements | Position profile; candidate pipeline |
| Interview Process | 1. Schedule 2. Conduct 3. Collect feedback 4. Score candidate 5. Decision | Pass/fail; next round | Interview notes; recommendation |
| Offer Management | 1. Prepare offer 2. Send 3. Negotiate 4. Accept/reject 5. Onboard | Salary approval; terms negotiation | Offer letter; acceptance/rejection |

---

### Data Dictionary

| Entity | Field | Type | Description | Business Rules |
|---|---|---|---|---|
| Candidate | id | UUID | Unique identifier | Auto-generated |
| Candidate | email | String | Contact email | Unique, validated format |
| Candidate | fit_score | Float | AI-calculated match score | 0.0-1.0, updated on position match |
| Position | status | Enum | Open/Closed/On-Hold | Only one status per position |
| User | role | Enum | Admin/Recruiter/Hiring Manager | Role determines permissions |
| TransitionRecord | stage | String | Current recruitment stage | Must follow defined workflow |

---

### Quality Attributes

| Attribute | Definition | Measurement | Target |
|---|---|---|---|
| Usability | Ease of use for end users | Task completion rate, time to complete | 90% completion, <5 min per task |
| Maintainability | Ease of system updates | Code coverage, cyclomatic complexity | 80% coverage, <10 complexity |
| Portability | System deployment flexibility | Environment setup time | <2 hours for new environment |
| Interoperability | Integration with other systems | API compatibility score | 100% REST compliance |

---

### Change Management

| Change Type | Process | Approval Required | Rollback Plan |
|---|---|---|---|
| Feature Addition | Design → Dev → Test → Deploy | Product Owner | Feature flag disable |
| Bug Fix | Issue → Fix → Test → Deploy | Tech Lead | Previous version restore |
| Configuration | Change → Validate → Apply | System Admin | Config backup restore |
| Security Update | Assess → Patch → Test → Deploy | Security Officer | Emergency rollback procedure |

---

### Training & Support

| Audience | Training Type | Duration | Materials |
|---|---|---|---|
| End Users | Role-based training | 4 hours | Video tutorials, user manual |
| Administrators | System administration | 8 hours | Admin guide, hands-on labs |
| Support Staff | Troubleshooting | 16 hours | Runbooks, escalation procedures |
| Developers | API integration | 2 hours | API docs, code examples |

---

### Compliance & Regulatory

| Regulation | Requirements | Implementation |
|---|---|---|
| GDPR | Data protection, right to erasure | Encryption, consent tracking, data export |
| CCPA | Privacy rights, data transparency | Privacy notices, opt-out mechanisms |
| SOC 2 | Security controls, monitoring | Access controls, audit logs, monitoring |
| ISO 27001 | Information security management | Security policies, risk management |

---

### Risks

| ID | Risk | Impact | Probability | Mitigations |
|---|---|---|---|---|
| R-001 | Data security/privacy breach | High | Medium | Defense-in-depth, audits/pen tests, training, compliance |
| R-002 | Performance under load | High | Medium | Load tests, scalable design, monitoring/alerts, perf reviews |
| R-003 | User adoption/change mgmt | Medium | Medium | Training, user co-design, phased rollout, feedback loops |
| R-004 | Integration complexity | Medium | Medium | Early planning/testing, standard APIs, phased approach, support |
| R-005 | AI model accuracy | Medium | Low | Continuous training, human-in-loop, feedback, accuracy checks |
| R-006 | Third-party outages | Low | Low | SLAs, backups/alternatives, monitoring, contingency plans |

---

### Appendices

| Appendix | Content |
|---|---|
| A: Glossary | ATS, API, RBAC, SSE, AI, Webhook |
| B: References | SRD, User Manual, API Docs, Test Cases, Security Policy |
| C: Contacts | Project Sponsor, BA, Tech Lead, HR Manager (to be filled) |

---

### Approvals

| Role | Name | Signature | Date |
|---|---|---|---|
| Project Sponsor | [To be filled] |  |  |
| Business Analyst | [To be filled] |  |  |
| Technical Lead | [To be filled] |  |  |

---

This document is confidential and proprietary. Distribution is restricted to authorized personnel only.


