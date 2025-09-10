# System Requirements Document (SRD)
## FitScan - Enterprise Applicant Tracking System

**Document Version:** 1.0  
**Date:** January 2025  
**Project:** FitScan ATS  
**Status:** Approved  

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Requirements](#architecture-requirements)
3. [Functional Requirements](#functional-requirements)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [Technical Specifications](#technical-specifications)
6. [Integration Requirements](#integration-requirements)
7. [Security Requirements](#security-requirements)
8. [Performance Requirements](#performance-requirements)
9. [Deployment Requirements](#deployment-requirements)
10. [Appendices](#appendices)

---

## System Overview

### System Purpose
FitScan is a comprehensive Applicant Tracking System designed to streamline recruitment processes through intelligent automation, real-time collaboration, and AI-powered candidate matching.

### System Scope
- **In Scope**: Candidate management, position management, user management, AI matching, analytics, workflow automation
- **Out of Scope**: Payroll integration, employee onboarding, performance management

### System Context
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   External      │    │   FitScan ATS   │    │   External      │
│   Systems       │◄──►│   System        │◄──►│   Users         │
│   (HR, Email)   │    │                 │    │   (Recruiters)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Architecture Requirements

### System Architecture
- **Architecture Pattern**: Microservices with Next.js full-stack application
- **Database**: PostgreSQL 15 with Prisma ORM
- **File Storage**: MinIO object storage
- **Real-time**: Server-Sent Events (SSE)
- **AI Integration**: Google AI (Genkit)
- **Automation**: N8N workflow platform

### Technology Stack
| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Frontend | Next.js | 15.5.2 | Full-stack React framework |
| UI Library | React | 18.3.1 | Component-based UI |
| Language | TypeScript | 5.0 | Type-safe development |
| Styling | Tailwind CSS | 3.4.1 | Utility-first CSS |
| Components | ShadCN UI | Latest | Pre-built components |
| Backend | Next.js API | 15.5.2 | RESTful API endpoints |
| ORM | Prisma | 6.11.0 | Database abstraction |
| Database | PostgreSQL | 15 | Primary data storage |
| Authentication | NextAuth.js | 4.24.11 | Multi-provider auth |
| File Storage | MinIO | Latest | Object storage |
| AI/ML | Google AI | Latest | Candidate matching |
| Automation | N8N | Latest | Workflow automation |
| Containerization | Docker | 20.10+ | Application deployment |

---

## Functional Requirements

### FR-001: User Management System
**Priority:** High

**Requirements:**
- **FR-001.1**: User registration and authentication
- **FR-001.2**: Role-based access control (Admin, Recruiter, Hiring Manager)
- **FR-001.3**: User profile management
- **FR-001.4**: Session management and security
- **FR-001.5**: Multi-factor authentication support
- **FR-001.6**: Azure AD integration

**Technical Specifications:**
- JWT-based authentication
- bcrypt password hashing
- Session timeout: 8 hours
- Password complexity requirements
- Account lockout after 5 failed attempts

### FR-002: Candidate Management System
**Priority:** High

**Requirements:**
- **FR-002.1**: Candidate profile creation and management
- **FR-002.2**: Resume upload and parsing
- **FR-002.3**: Candidate status tracking
- **FR-002.4**: Search and filtering capabilities
- **FR-002.5**: Bulk operations support
- **FR-002.6**: Audit trail maintenance

**Technical Specifications:**
- Support for PDF, DOC, DOCX file formats
- File size limit: 50MB
- Resume parsing accuracy: 90%+
- Search response time: <2 seconds
- Bulk operations: up to 1000 records

### FR-003: Position Management System
**Priority:** High

**Requirements:**
- **FR-003.1**: Job position creation and management
- **FR-003.2**: Position status tracking
- **FR-003.3**: Recruiter assignment
- **FR-003.4**: Position search and filtering
- **FR-003.5**: Custom field support
- **FR-003.6**: Position analytics

**Technical Specifications:**
- Rich text editor for job descriptions
- Custom field validation
- Position hierarchy support
- Recruiter workload tracking
- Position-specific metrics

### FR-004: AI-Powered Matching System
**Priority:** High

**Requirements:**
- **FR-004.1**: Resume parsing and data extraction
- **FR-004.2**: Candidate-job matching algorithm
- **FR-004.3**: Fit score calculation
- **FR-004.4**: Match reasoning and justification
- **FR-004.5**: Learning from user feedback
- **FR-004.6**: Match analytics and reporting

**Technical Specifications:**
- Google AI (Genkit) integration
- Processing time: <30 seconds
- Match accuracy: 85%+
- Confidence scoring
- Manual override capability

### FR-005: Real-time Collaboration System
**Priority:** Medium

**Requirements:**
- **FR-005.1**: Server-Sent Events (SSE) implementation
- **FR-005.2**: Real-time notifications
- **FR-005.3**: Live status updates
- **FR-005.4**: Collaborative commenting
- **FR-005.5**: User presence indicators
- **FR-005.6**: Notification preferences

**Technical Specifications:**
- SSE connection management
- Event broadcasting
- Connection pooling
- Notification queuing
- User preference storage

### FR-006: Analytics and Reporting System
**Priority:** Medium

**Requirements:**
- **FR-006.1**: Dashboard creation and customization
- **FR-006.2**: Report generation and scheduling
- **FR-006.3**: Data export capabilities
- **FR-006.4**: KPI tracking and monitoring
- **FR-006.5**: Trend analysis and forecasting
- **FR-006.6**: Performance metrics

**Technical Specifications:**
- Chart.js and Recharts integration
- Export formats: CSV, Excel, PDF
- Scheduled report generation
- Real-time data updates
- Customizable dashboards

---

## Non-Functional Requirements

### NFR-001: Performance Requirements
- **Response Time**: Page load <3 seconds, API response <2 seconds
- **Throughput**: Support 1000+ concurrent users
- **Scalability**: Horizontal scaling capability
- **Availability**: 99.9% uptime
- **Resource Usage**: CPU <80%, Memory <8GB

### NFR-002: Security Requirements
- **Authentication**: Multi-factor authentication support
- **Authorization**: Role-based access control
- **Data Protection**: Encryption in transit and at rest
- **Audit**: Complete audit trail for all actions
- **Compliance**: GDPR, CCPA compliance

### NFR-003: Reliability Requirements
- **Uptime**: 99.9% availability
- **Backup**: Automated daily backups
- **Recovery**: RTO <4 hours, RPO <1 hour
- **Monitoring**: 24/7 system monitoring
- **Alerting**: Automated alert system

### NFR-004: Usability Requirements
- **Interface**: Responsive design for all devices
- **Accessibility**: WCAG 2.1 AA compliance
- **Languages**: English and Thai support
- **Training**: Comprehensive user documentation
- **Support**: Multi-level support system

---

## Technical Specifications

### Database Design
```sql
-- Core Tables
Users (id, name, email, role, permissions, created_at, updated_at)
Candidates (id, name, email, phone, status, position_id, recruiter_id, created_at)
Positions (id, title, department, description, is_open, recruiter_id, created_at)
RecruitmentStages (id, name, description, sort_order, is_system)
TransitionRecords (id, candidate_id, stage, notes, acting_user_id, date)
Attachments (id, candidate_id, file_path, file_name, uploaded_by, uploaded_at)
UserGroups (id, name, permissions, is_default)
CustomFieldDefinitions (id, model_name, field_key, field_type, options)
SystemSettings (key, value, updated_at)
```

### API Specifications
- **Base URL**: `/api/v1/`
- **Authentication**: JWT Bearer tokens
- **Response Format**: JSON
- **Error Handling**: Standard HTTP status codes
- **Rate Limiting**: 1000 requests/hour per user
- **CORS**: Enabled for cross-origin requests

### File Storage Specifications
- **Storage Engine**: MinIO
- **Supported Formats**: PDF, DOC, DOCX, JPG, PNG
- **File Size Limit**: 50MB
- **Storage Path**: `/uploads/{type}/{id}/{filename}`
- **Access Control**: Role-based file access
- **Backup**: Automated file backup

---

## Integration Requirements

### External System Integrations
1. **Email Systems**
   - SMTP configuration
   - Email templates
   - Notification delivery
   - Bounce handling

2. **Calendar Systems**
   - Interview scheduling
   - Meeting invitations
   - Time zone support
   - Conflict detection

3. **HR Systems**
   - Employee data sync
   - Organizational structure
   - Position hierarchy
   - User management

4. **Webhook Integrations**
   - Real-time data sync
   - Event notifications
   - Custom workflows
   - Error handling

### API Integration Specifications
- **RESTful API**: Standard HTTP methods
- **Authentication**: JWT tokens
- **Rate Limiting**: Configurable limits
- **Documentation**: OpenAPI/Swagger
- **Versioning**: Semantic versioning
- **Testing**: Automated API testing

---

## Security Requirements

### Authentication and Authorization
- **Multi-factor Authentication**: TOTP support
- **Session Management**: Secure session handling
- **Password Policy**: Complexity requirements
- **Account Lockout**: Brute force protection
- **Single Sign-On**: Azure AD integration

### Data Protection
- **Encryption**: AES-256 for data at rest
- **Transport Security**: TLS 1.3 for data in transit
- **Data Masking**: Sensitive data protection
- **Access Logging**: Complete audit trail
- **Data Retention**: Configurable retention policies

### Compliance
- **GDPR**: Data protection compliance
- **CCPA**: Privacy rights compliance
- **SOC 2**: Security controls
- **ISO 27001**: Information security management
- **Regular Audits**: Security assessments

---

## Performance Requirements

### Response Time Requirements
- **Page Load**: <3 seconds for 95% of requests
- **API Response**: <2 seconds for 95% of requests
- **Search Results**: <2 seconds for complex queries
- **File Upload**: <30 seconds for 50MB files
- **Report Generation**: <60 seconds for standard reports

### Throughput Requirements
- **Concurrent Users**: 1000+ simultaneous users
- **API Requests**: 10,000+ requests per hour
- **File Uploads**: 100+ concurrent uploads
- **Database Queries**: 50,000+ queries per hour
- **Real-time Events**: 1000+ events per second

### Scalability Requirements
- **Horizontal Scaling**: Auto-scaling capability
- **Database Scaling**: Read replicas support
- **Load Balancing**: Multiple server instances
- **Caching**: Redis for performance optimization
- **CDN**: Static asset delivery

---

## Deployment Requirements

### Infrastructure Requirements
- **Operating System**: Linux (Ubuntu 20.04+)
- **Container Runtime**: Docker 20.10+
- **Orchestration**: Docker Compose
- **Process Management**: PM2
- **Reverse Proxy**: Nginx (optional)

### Environment Requirements
- **Development**: Local development environment
- **Staging**: Pre-production testing environment
- **Production**: Live production environment
- **Backup**: Automated backup environment
- **Monitoring**: System monitoring environment

### Deployment Specifications
- **Container Images**: Multi-stage Docker builds
- **Environment Variables**: Secure configuration management
- **Health Checks**: Application health monitoring
- **Rolling Updates**: Zero-downtime deployments
- **Rollback**: Quick rollback capability

---

## Appendices

### Appendix A: Database Schema
```sql
-- Users table
CREATE TABLE "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  avatar_url VARCHAR(500),
  authentication_method VARCHAR(50) DEFAULT 'basic',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Candidates table
CREATE TABLE "Candidate" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  position_id UUID REFERENCES "Position"(id),
  recruiter_id UUID REFERENCES "User"(id),
  fit_score FLOAT DEFAULT 0,
  status_id UUID REFERENCES "RecruitmentStage"(id),
  application_date TIMESTAMP DEFAULT NOW(),
  parsed_data JSONB,
  custom_attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Appendix B: API Endpoints
```
GET    /api/v1/candidates          # List candidates
POST   /api/v1/candidates          # Create candidate
GET    /api/v1/candidates/{id}     # Get candidate
PUT    /api/v1/candidates/{id}     # Update candidate
DELETE /api/v1/candidates/{id}     # Delete candidate

GET    /api/v1/positions           # List positions
POST   /api/v1/positions           # Create position
GET    /api/v1/positions/{id}      # Get position
PUT    /api/v1/positions/{id}      # Update position
DELETE /api/v1/positions/{id}      # Delete position

GET    /api/v1/users               # List users
POST   /api/v1/users               # Create user
GET    /api/v1/users/{id}          # Get user
PUT    /api/v1/users/{id}          # Update user
DELETE /api/v1/users/{id}          # Delete user
```

### Appendix C: Configuration Files
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8021:8021"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/db
      - NEXTAUTH_SECRET=your-secret-key
    depends_on:
      - postgres
      - minio

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=studio_production
      - POSTGRES_USER=studio_user
      - POSTGRES_PASSWORD=local_dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    volumes:
      - minio_data:/data
```

---

**Document Approval**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | [To be filled] | [To be filled] | [To be filled] |
| System Architect | [To be filled] | [To be filled] | [To be filled] |
| Security Officer | [To be filled] | [To be filled] | [To be filled] |

---

*This document is confidential and proprietary. Distribution is restricted to authorized personnel only.*
