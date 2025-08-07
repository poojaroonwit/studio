# FitScan - High-Level Architecture Diagram

## System Overview
FitScan is a comprehensive recruitment management system built with Next.js 14, featuring AI-powered candidate matching, real-time collaboration, and workflow automation.

## Architecture Components

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FitScan Architecture                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Dashboard     │  │   Candidates    │  │   Positions     │  │   Settings      │            │
│  │   (React/TS)    │  │   (React/TS)    │  │   (React/TS)    │  │   (React/TS)    │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Task Board    │  │   User Mgmt     │  │   API Docs      │  │   Bulk Upload   │            │
│  │   (React/TS)    │  │   (React/TS)    │  │   (Swagger UI)  │  │   (React/TS)    │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              UI Components (ShadCN/Tailwind)                               │ │
│  │  • Authentication Components  • Layout Components  • Form Components                       │ │
│  │  • Data Tables  • Charts  • Modals  • Notifications  • File Upload                         │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PRESENTATION LAYER                                            │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              Next.js 14 App Router                                          │ │
│  │                                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │   Middleware    │  │   Layout        │  │   Pages         │  │   API Routes    │        │ │
│  │  │   (Auth/Route   │  │   (AppLayout)   │  │   (Server/      │  │   (REST APIs)   │        │ │
│  │  │    Protection)  │  │                 │  │    Client)      │  │                 │        │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘        │ │
│  │                                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                              Authentication Layer                                       │ │ │
│  │  │  • NextAuth.js (Azure AD + Credentials)  • Session Management  • Role-based Access     │ │ │
│  │  │  • API Key Authentication  • JWT Tokens  • Permission Validation                        │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BUSINESS LOGIC LAYER                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              Core Business Services                                         │ │
│  │                                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │   Candidate     │  │   Position      │  │   User          │  │   Recruitment   │        │ │
│  │  │   Management    │  │   Management    │  │   Management    │  │   Stages        │        │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘        │ │
│  │                                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │   File          │  │   Audit         │  │   Webhook       │  │   AI/ML         │        │ │
│  │  │   Management    │  │   Logging       │  │   System        │  │   Services      │        │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘        │ │
│  │                                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                              AI/ML Integration                                          │ │ │
│  │  │  • Google Gemini AI (Job Description Generation)  • Candidate Search & Matching         │ │ │
│  │  │  • Resume Parsing  • Fit Score Calculation  • Natural Language Processing               │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                              Workflow Automation                                         │ │ │
│  │  │  • N8N Integration  • Webhook Triggers  • Automated Candidate Processing                │ │ │
│  │  │  • Email Notifications  • Status Transitions  • Bulk Operations                         │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DATA ACCESS LAYER                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              Prisma ORM Layer                                               │ │
│  │                                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │   Database      │  │   Migration     │  │   Schema        │  │   Query         │        │ │
│  │  │   Client        │  │   Management    │  │   Validation    │  │   Builder       │        │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘        │ │
│  │                                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                              Data Models                                                  │ │ │
│  │  │  • User  • Candidate  • Position  • RecruitmentStage  • TransitionRecord               │ │ │
│  │  │  • Attachment  • Webhook  • SystemSetting  • CustomFieldDefinition  • AuditLog         │ │ │
│  │  │  • UserGroup  • Dashboard  • UploadQueue  • JobMatch  • CandidateComment                │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    INFRASTRUCTURE LAYER                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              Containerized Services                                         │ │
│  │                                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │   Main App      │  │   PostgreSQL    │  │   MinIO         │  │   N8N           │        │ │
│  │  │   (Next.js)     │  │   (Database)    │  │   (File Storage)│  │   (Automation)  │        │ │
│  │  │   Port: 8021    │  │   Port: 8521    │  │   Port: 9847/8  │  │   Port: 8921    │        │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘        │ │
│  │                                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                              External Integrations                                       │ │ │
│  │  │  • Azure Active Directory (SSO)  • Google AI (Gemini)  • Email Services (SMTP)          │ │ │
│  │  │  • Webhook Endpoints  • Third-party APIs  • File Processing Services                    │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                              Real-time Features                                          │ │ │
│  │  │  • Server-Sent Events (SSE)  • WebSocket Connections  • Live Notifications              │ │ │
│  │  │  • Real-time Dashboard Updates  • Collaboration Features  • Upload Progress Tracking    │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SECURITY & MONITORING                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              Security Layer                                                 │ │
│  │  • Authentication (NextAuth.js)  • Authorization (Role-based)  • API Key Management       │ │
│  │  • CORS Configuration  • Input Validation  • SQL Injection Prevention                      │ │
│  │  • File Upload Security  • Audit Logging  • Session Management                             │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              Monitoring & Observability                                     │ │
│  │  • Health Checks  • Error Tracking  • Performance Monitoring  • Database Connection Pool   │ │
│  │  • Upload Queue Processing  • Webhook Delivery Status  • System Resource Usage             │ │
│  │  • Audit Trail  • User Activity Logging  • API Usage Analytics                             │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

## Key Features & Capabilities

### 🔐 Authentication & Authorization
- **Multi-provider Authentication**: Azure AD SSO + Credential-based login
- **Role-based Access Control**: Admin, Recruiter, Hiring Manager roles
- **Granular Permissions**: Module-level permissions for fine-grained access control
- **API Key Authentication**: For external integrations and automation

### 📊 Core Functionality
- **Candidate Management**: Full CRUD with resume parsing, profile images, and advanced filtering
- **Position Management**: Job posting lifecycle with custom fields and match criteria
- **Recruitment Pipeline**: Customizable stages with transition tracking
- **Dashboard & Analytics**: Real-time metrics, charts, and performance insights
- **Task Board**: Kanban and list views with enhanced filtering and collaboration

### 🤖 AI/ML Integration
- **Google Gemini AI**: Job description generation and candidate search
- **Natural Language Processing**: AI-powered candidate matching and analysis
- **Resume Parsing**: Automated extraction of candidate information
- **Fit Score Calculation**: AI-driven candidate-position matching

### 🔄 Workflow Automation
- **N8N Integration**: Visual workflow builder for process automation
- **Webhook System**: Event-driven integrations with external systems
- **Bulk Operations**: CSV import/export with validation and processing
- **Upload Queue**: Asynchronous file processing with progress tracking

### 📁 File Management
- **MinIO Object Storage**: Secure file storage for resumes, avatars, and documents
- **File Upload**: Drag-and-drop interface with progress tracking
- **Image Processing**: Avatar and logo management with optimization
- **Document Management**: Resume versioning and attachment handling

### 🔌 API & Integration
- **RESTful APIs**: Comprehensive API with Swagger documentation
- **V1 API**: Backward-compatible API for external integrations
- **Webhook System**: Configurable event notifications
- **Third-party Integrations**: Email, HRIS, and job board connections

### 🎨 User Experience
- **Modern UI**: ShadCN components with Tailwind CSS
- **Responsive Design**: Mobile-friendly interface
- **Real-time Updates**: Live notifications and collaboration features
- **Customization**: Theme preferences, branding, and layout options

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, React 18, TypeScript | Modern web application framework |
| **UI Framework** | Tailwind CSS, ShadCN UI | Component library and styling |
| **Backend** | Next.js API Routes, Prisma ORM | Server-side logic and data access |
| **Database** | PostgreSQL 15 | Primary data storage |
| **File Storage** | MinIO | Object storage for files |
| **Authentication** | NextAuth.js | Multi-provider authentication |
| **AI/ML** | Google Gemini AI | AI-powered features |
| **Automation** | N8N | Workflow automation |
| **Deployment** | Docker, Docker Compose | Containerized deployment |
| **Monitoring** | Built-in health checks, audit logging | System observability |

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    Production Deployment                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   Load Balancer │  │   Reverse Proxy │  │   SSL/TLS       │  │   CDN           │            │
│  │   (Optional)    │  │   (Nginx)       │  │   Termination   │  │   (Optional)    │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              Docker Compose Stack                                           │ │
│  │                                                                                             │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │   Main App      │  │   PostgreSQL    │  │   MinIO         │  │   N8N           │        │ │
│  │  │   Container     │  │   Container     │  │   Container     │  │   Container     │        │ │
│  │  │   (Next.js)     │  │   (Database)    │  │   (Storage)     │  │   (Automation)  │        │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘        │ │
│  │                                                                                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                              External Services                                           │ │ │
│  │  │  • Azure Active Directory  • Google AI APIs  • Email Services  • Webhook Endpoints      │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **User Authentication**: NextAuth.js handles authentication via Azure AD or credentials
2. **Request Processing**: Next.js middleware validates sessions and permissions
3. **Business Logic**: API routes process requests and apply business rules
4. **Data Access**: Prisma ORM handles database operations with connection pooling
5. **File Operations**: MinIO handles file uploads, storage, and retrieval
6. **AI Processing**: Google Gemini AI processes AI-powered features
7. **Automation**: N8N handles workflow automation and webhook processing
8. **Real-time Updates**: SSE and WebSocket connections provide live updates

## Scalability Considerations

- **Horizontal Scaling**: Stateless application design allows multiple instances
- **Database Optimization**: Connection pooling and query optimization
- **Caching Strategy**: Built-in caching for improved performance
- **File Storage**: MinIO provides scalable object storage
- **Load Balancing**: Support for multiple application instances
- **Monitoring**: Comprehensive health checks and performance monitoring

This architecture provides a robust, scalable, and maintainable foundation for the FitScan recruitment management system, supporting both current requirements and future growth. 