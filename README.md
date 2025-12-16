# FitScan - Enterprise Applicant Tracking System (ATS)

A comprehensive, enterprise-grade Applicant Tracking System built with modern web technologies, featuring advanced candidate management, AI-powered matching, automated workflows, and seamless integrations for recruitment teams of all sizes.

![FitScan](https://img.shields.io/badge/Next.js-15.5.2-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-green?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-20.10-blue?style=for-the-badge&logo=docker)
![AI](https://img.shields.io/badge/AI-Powered-orange?style=for-the-badge&logo=openai)

## 🎯 Overview

FitScan is a modern, scalable Applicant Tracking System designed to streamline recruitment processes through intelligent automation, comprehensive candidate management, and powerful analytics. Built with enterprise-grade security and performance in mind, it supports organizations from startups to large enterprises.

### Key Value Propositions
- **AI-Powered Candidate Matching**: Intelligent job-candidate matching using Google AI
- **Real-time Collaboration**: Live updates and notifications via Server-Sent Events
- **Enterprise Security**: Role-based access control with granular permissions
- **Scalable Architecture**: Built on modern tech stack for high performance
- **Comprehensive Analytics**: Detailed insights into recruitment performance
- **Workflow Automation**: N8N integration for custom automation workflows

## 🚀 Features

### 📊 **Dashboard & Analytics**
- Real-time metrics and KPIs
- Candidate distribution charts
- Recruitment pipeline visualization
- Performance analytics
- New candidates today tracking
- Positions needing applicants

### 👥 **Candidate Management**
- **Comprehensive Profiles**: Detailed candidate information with custom fields
- **Resume Management**: Upload, version control, and automated parsing
- **Resume History**: Track all uploaded resumes with timestamps (via Attachment table)
- **Profile Images**: Upload and manage candidate avatars
- **Stage Tracking**: Visual Kanban board with drag-and-drop functionality
- **Transition History**: Complete audit trail of candidate progress with notes
- **Recruiter Assignment**: Assign candidates to specific team members
- **Advanced Filtering**: Filter by name, position, status, education, fit score, university, major
- **Bulk Operations**: Import/export candidates via CSV
- **AI Integration**: Automated resume parsing and candidate matching
- **Automation Workflows**: PDF upload for automated candidate creation
- **Candidate Sources**: Track and manage candidate sources
- **Job Applications**: Multiple job applications per candidate with fit scores
- **Evaluation Links**: Shareable evaluation links for external assessments
- **Comments & Activity**: Rich comment system with file attachments
- **Pinned Candidates**: Mark important candidates for quick access
- **Duplicate Detection**: Automatic duplicate candidate detection and clearing

### 💼 **Position Management**
- **Job Posting Creation**: Rich text editor with custom fields
- **Department Organization**: Structured position hierarchy
- **Status Tracking**: Open/closed position management
- **Candidate Matching**: AI-powered job-candidate matching
- **Bulk Import/Export**: CSV-based position management
- **Enhanced Filtering**: Filter by title, department, status, level
- **Headcount Management**: Track hiring requests and headcount allocations
- **Interviewer Assignment**: Assign interviewers to positions
- **Expertise Skills**: Define required expertise skills and groups
- **Personality Traits**: Configure personality trait requirements
- **Position Statistics**: Detailed analytics and metrics per position
- **SLA Tracking**: Service Level Agreement monitoring per position
- **Auto-close Positions**: Automatic position closure based on criteria
- **Recruiter Assignment**: Assign recruiters to manage positions

### 👤 **User & Access Management**
- **Role-Based Access Control (RBAC)**: Admin, Recruiter, Hiring Manager roles
- **Granular Permissions**: Module-level access control (import/export, logs, etc.)
- **User Groups**: Create and manage permission groups
- **Azure AD Integration**: Single Sign-On (SSO) support
- **Password Security**: bcrypt hashing with self-service password changes
- **Permission Inheritance**: User group permissions with individual overrides

### 📋 **Task Management**
- **My Task Board**: Personalized view for recruiters
- **Kanban & List Views**: Flexible task visualization
- **Enhanced Filtering**: Advanced filters for task board
- **Admin Overview**: Administrators can view all candidates or filter by recruiter
- **Assigned Positions**: Quick access to positions assigned to recruiters

### ⚙️ **System Configuration**
- **Custom Fields**: Define custom attributes for candidates and positions
- **Recruitment Stages**: Customizable hiring pipeline with deletion/replacement logic
- **Webhook Integration**: Connect with external automation services
- **Notification System**: Configurable events and channels (email/webhook)
- **Theme Customization**: Branded UI with custom colors and logos
- **API Documentation**: Built-in Swagger documentation
- **Data Model Preferences**: User-specific UI display preferences
- **Application Preferences**: Server-side app name, logo, and theme settings

### 🔧 **Technical Features**
- **Real-time Updates**: SSE-based live collaboration with presence tracking
- **File Storage**: MinIO integration for secure file management
- **Caching**: Built-in performance optimization
- **Audit Logging**: Complete system activity tracking with search/filter
- **Health Monitoring**: Built-in health checks and monitoring
- **Background Processing**: Queue-based file processing system with SSE updates
- **Multi-language Font Support**: Automatic font switching between Inter (English) and IBM Plex Sans Thai (Thai)
- **Upload Queue Management**: Monitor and manage file processing queue
- **SLA Monitoring**: Track and alert on Service Level Agreement violations
- **Evaluation System**: Comprehensive candidate evaluation with expertise skills and personality traits
- **Warning System**: Real-time data quality warnings with auto-clearing
- **Security Dashboard**: Monitor security alerts and access patterns
- **System Status**: Real-time system health and resource monitoring
- **Link Preview**: Automatic link preview generation for external URLs

## 🛠️ Technology Stack

### Frontend Technologies
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Framework** | Next.js 15.5.2 (App Router) | Full-stack React framework with SSR/SSG |
| **UI Library** | React 18 | Component-based user interface |
| **Language** | TypeScript 5.0 | Type-safe development |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **Components** | ShadCN UI | Pre-built accessible components |
| **Fonts** | Inter (English) + IBM Plex Sans Thai | Multi-language typography support |
| **Charts** | Chart.js + Recharts | Data visualization and analytics |

### Backend Technologies
| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Framework** | Next.js API Routes | RESTful API endpoints |
| **ORM** | Prisma 6.11.0 | Database abstraction and migrations |
| **Database** | PostgreSQL 15 | Primary data storage |
| **Authentication** | NextAuth.js | Multi-provider authentication |
| **File Storage** | MinIO | Object storage for files and media |
| **AI Integration** | Google AI (Genkit) | Intelligent candidate matching |
| **Real-time** | Server-Sent Events (SSE) | Live updates and notifications |

### DevOps & Infrastructure
| Component | Technology | Purpose |
|-----------|------------|---------|
| **Containerization** | Docker + Docker Compose | Application deployment |
| **Process Management** | PM2 | Production process management |
| **Monitoring** | Built-in health checks | System monitoring and alerts |
| **Observability** | SigNoz (OpenTelemetry) | Unified logs, metrics, and traces |
| **Log Search** | Elasticsearch | Advanced log search and indexing |
| **Error Tracking** | Sentry | Error tracking and performance monitoring |
| **Logging** | Structured logging | Audit trails and debugging |
| **Testing** | Vitest + Testing Library | Unit and integration testing |
| **Automation** | N8N | Workflow automation platform |


## 📚 Documentation
Detailed documentation for the project is available in the `docs/` directory:
- **[Business Requirements (BRD)](docs/BRD.md)**: High-level business goals and scope.
- **[System Requirements (SRS)](docs/SRS.md)**: Technical specifications and architecture.
- **[Test Cases](docs/TEST_CASES.md)**: Verification scenarios for QA.
- **[Data Model (ERD)](docs/ERD.md)**: Database schema and entity relationships.
- **[API Overview](docs/API_OVERVIEW.md)**: REST API reference.

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MinIO         │    │   AI Services   │    │   N8N           │
│   (File Storage)│    │   (Google AI)   │    │   (Automation)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Business Processes

#### 1. Candidate Lifecycle Management
```
Application → Screening → Shortlisting → Interview → Offer → Hiring
     ↓           ↓           ↓           ↓         ↓        ↓
   Applied   Screening  Shortlisted Interviewing Offer   Hired
```

#### 2. AI-Powered Matching Workflow
```
Resume Upload → AI Parsing → Skill Extraction → Job Matching → Fit Score Calculation
```

#### 3. Real-time Collaboration
```
User Action → SSE Broadcast → Live Updates → Notification → Audit Log
```

### Database Schema Overview
- **User Management**: Users, UserGroups, UserTeams, Permissions, UserPreferences
- **Candidate Management**: Candidates, Attachments, TransitionRecords, CandidateComments, CandidateEvaluation, CandidateEvaluationLink
- **Position Management**: Positions, Grades, PositionLevels, Headcount, PositionInterviewer, PositionExpertiseSkill, PositionPersonalityTrait
- **Workflow Management**: RecruitmentStages, CustomFields, Webhooks, UploadQueue
- **Analytics**: AuditLogs, LogEntries, Notifications, Dashboard, DashboardShare
- **System Configuration**: SystemSettings, SystemPreferences, SystemPrompts, WarningConfiguration
- **Evaluation**: ExpertiseSkillTemplate, PersonalityTraitTemplate, ExpertiseGroup, PersonalityGroup

## 📋 Prerequisites

### System Requirements
- **Docker & Docker Compose** (for production deployment)
- **Node.js 18+** (for development)
- **PostgreSQL 15+** (if not using Docker)
- **8GB RAM minimum** (16GB recommended for production)
- **2 CPU cores minimum** (4+ cores recommended for production)


## 🚀 Quick Start

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd studio-2
   ```

2. **Configure environment variables:**
   ```bash
   # Copy the example environment file
   cp env.local.template .env.local
   
   # Edit with your configuration
   nano .env.local
   ```

3. **Deploy with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   - **Main App**: http://localhost:8021
   - **MinIO Console**: http://localhost:9848
   - **N8N Workflow Automation**: http://localhost:8921
   - **Default Login**: admin@ncc.com / nccadmin
   - **N8N Login**: admin / admin

### Option 2: Portainer Deployment

1. **Upload to Portainer:**
   - Upload the project files to your server
   - Create a new stack in Portainer
   - Use the provided `docker-compose.yml`

2. **Configure environment variables in Portainer:**
   - Set all required environment variables
   - Ensure proper network configuration

3. **Deploy the stack:**
   - Portainer will automatically build and deploy
   - Database will be seeded with initial data

## ⚙️ Configuration

### Environment Variables

#### **Essential Configuration**
```env
# Application
NODE_ENV=production
NEXTAUTH_URL=http://your-domain:8021
NEXTAUTH_SECRET=your-secret-key

# Database
DATABASE_URL=postgresql://user:password@postgres:8521/dbname

# MinIO Storage
MINIO_ENDPOINT=minio
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=studio-files


```

#### **Optional Configuration**
```env
# Azure AD SSO
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# Webhook Integration
RESUME_PROCESSING_WEBHOOK_URL=https://your-webhook-endpoint
RESUME_PROCESSING_WEBHOOK_TOKEN=your_bearer_token_here
GENERAL_PDF_WEBHOOK_URL=https://your-pdf-processor
GENERAL_PDF_WEBHOOK_TOKEN=your_bearer_token_here
RESUME_PROCESSING_WEBHOOK_TIMEOUT=1800
WEBHOOK_CONNECTION_TIMEOUT=900

# AI Integration
GOOGLE_API_KEY=your-google-ai-key

> **New**: AI API Key Fallback System - Configure multiple API keys with automatic failover for high availability. See [AI API Key Fallback System Documentation](docs/ai-api-key-fallback-system.md) for details.
```

### Port Configuration

| Service | Internal Port | External Port | Description |
|---------|---------------|---------------|-------------|
| **Main App** | 8021 | 8021 | Next.js application |
| **MinIO API** | 9000 | 9847 | Object storage API |
| **MinIO Console** | 9001 | 9848 | Storage management UI |
| **PostgreSQL** | 8521 | 5432 | Database |
| **N8N** | 5678 | 8921 | Workflow automation |

## 🤖 N8N Workflow Automation

FitScan includes N8N for powerful workflow automation capabilities. N8N allows you to create automated workflows that can integrate with your recruitment processes.

### Features
- **Visual Workflow Builder**: Drag-and-drop interface for creating automation workflows
- **Integration Hub**: Connect with 200+ services including email, CRM, HR systems
- **Webhook Support**: Trigger workflows via HTTP requests
- **Database Integration**: Direct connection to PostgreSQL database
- **Custom Nodes**: Extend functionality with custom integrations
- **Scheduling**: Time-based workflow execution
- **Error Handling**: Robust error handling and retry mechanisms

### Default Configuration
- **URL**: http://localhost:8921
- **Username**: admin
- **Password**: admin
- **Database**: Uses the same PostgreSQL instance as the main application

### Environment Variables
```env
# N8N Configuration
N8N_PORT=8921
N8N_DB_NAME=n8n
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin
N8N_HOST=localhost
N8N_PROTOCOL=http
N8N_ENCRYPTION_KEY=your-encryption-key-here-change-this-in-production
N8N_WEBHOOK_URL=http://localhost:8921/
N8N_TIMEZONE=Asia/Bangkok
N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
N8N_DB_CONNECTION_TIMEOUT=60000
```

### Use Cases
- **Automated Email Notifications**: Send emails when candidates move through stages
- **CRM Integration**: Sync candidate data with external CRM systems
- **Resume Processing**: Automate resume parsing and data extraction
- **Interview Scheduling**: Integrate with calendar systems
- **Background Checks**: Automate background check processes
- **Reporting**: Generate and send automated reports

### Security Notes
⚠️ **Important**: 
- Change the default admin password immediately after deployment
- Update the `N8N_ENCRYPTION_KEY` with a strong, unique key
- Consider enabling HTTPS in production environments
- Review and configure webhook security settings

## 🔐 Authentication

### Default Admin Account
- **Email**: `admin@ncc.com`
- **Password**: `nccadmin`

⚠️ **Security Note**: Change the default password immediately after first login.

### Creating Admin User
If the default admin user doesn't exist, create one using:
```bash
npm run db:create-admin
```

### Authentication Methods
1. **Email/Password**: Traditional login with bcrypt hashing
2. **Azure AD SSO**: Enterprise single sign-on (optional)

### Basic Authentication Toggle
You can enable/disable basic username/password login from:
- **System Settings UI**: Settings → System Settings → System tab → Feature Configuration
- **CLI Backdoor**: See [System Settings Management CLI](#system-settings-management-cli) below

## 🔧 System Settings Management CLI

A backdoor CLI tool to manage system settings, including enabling/disabling basic authentication when locked out of the system.

### Purpose

This CLI tool provides a way to manage system settings directly from the command line, bypassing the web UI. This is especially useful when:
- You're locked out of the system (e.g., basic auth is disabled)
- You need to make emergency configuration changes
- You're running automated scripts or deployments
- The web UI is unavailable

### Prerequisites

1. Node.js installed
2. Database connection configured via `DATABASE_URL` or `POSTGRES_URL` environment variable
3. Environment variables loaded (via `.env.local` or `.env` file)
4. Admin user account with password authentication enabled

### Usage

#### Direct Node.js Execution

```bash
# Show help
node scripts/manage-system-settings.js

# List all settings
node scripts/manage-system-settings.js list

# Get a specific setting
node scripts/manage-system-settings.js get basicAuthEnabled

# Set a setting
node scripts/manage-system-settings.js set basicAuthEnabled true

# Enable basic auth (convenience command)
node scripts/manage-system-settings.js enable-basic-auth

# Disable basic auth (convenience command)
node scripts/manage-system-settings.js disable-basic-auth
```

#### Using NPM Scripts

```bash
# List all settings
npm run settings:list

# Get a specific setting (add key as argument)
npm run settings:get basicAuthEnabled

# Set a setting (add key and value as arguments)
npm run settings:set basicAuthEnabled true

# Enable basic auth
npm run settings:enable-basic-auth

# Disable basic auth
npm run settings:disable-basic-auth
```

### Commands

#### `list`
Lists all system settings in a formatted table.

**Options:**
- `--json` - Output in JSON format

**Examples:**
```bash
node scripts/manage-system-settings.js list
node scripts/manage-system-settings.js list --json
```

#### `get <key>`
Retrieves a specific system setting by key.

**Options:**
- `--json` - Output in JSON format

**Examples:**
```bash
node scripts/manage-system-settings.js get basicAuthEnabled
node scripts/manage-system-settings.js get basicAuthEnabled --json
```

#### `set <key> <value>`
Sets or updates a system setting.

**Examples:**
```bash
node scripts/manage-system-settings.js set basicAuthEnabled true
node scripts/manage-system-settings.js set maxConcurrentProcessors 10
node scripts/manage-system-settings.js set appName "My App"
```

#### `enable-basic-auth`
Convenience command to enable basic username/password authentication.

**Example:**
```bash
node scripts/manage-system-settings.js enable-basic-auth
```

#### `disable-basic-auth`
Convenience command to disable basic username/password authentication.

**Example:**
```bash
node scripts/manage-system-settings.js disable-basic-auth
```

### Common Use Cases

#### Emergency: Re-enable Basic Auth

If you've disabled basic auth and can't log in via Azure AD:

```bash
node scripts/manage-system-settings.js enable-basic-auth
```

#### Check Current Basic Auth Status

```bash
node scripts/manage-system-settings.js get basicAuthEnabled
```

#### View All Settings

```bash
node scripts/manage-system-settings.js list
```

#### Export Settings to JSON

```bash
node scripts/manage-system-settings.js list --json > settings-backup.json
```

### Authentication

The CLI requires admin authentication by default. You can authenticate in two ways:

#### Interactive Mode (Recommended)
The CLI will prompt for admin email and password:
```bash
node scripts/manage-system-settings.js list
# Prompts: Admin Email: 
# Prompts: Password: (hidden input)
```

#### Non-Interactive Mode
Provide credentials via command line arguments:
```bash
node scripts/manage-system-settings.js list --email admin@example.com --password yourpassword
```

#### Emergency Bypass
Use `--no-auth` flag only in true emergency situations when you cannot authenticate:
```bash
node scripts/manage-system-settings.js enable-basic-auth --no-auth
```

**Authentication Requirements:**
- User must exist in the database
- User must have password authentication enabled (not Azure AD only)
- User must have `Admin` role OR have `SYSTEM_SETTINGS_EDIT` or `SYSTEM_SETTINGS_VIEW` permissions
- User account must be active

### Security Considerations

⚠️ **Important Security Notes:**

1. **Authentication**: The CLI now requires admin authentication by default. This provides an additional layer of security while maintaining the backdoor functionality.

2. **Access Control**: Even with authentication, ensure:
   - Only trusted administrators have access to the server
   - Database credentials are kept secure
   - The script file has appropriate file permissions

3. **Emergency Bypass**: The `--no-auth` flag should only be used in true emergency situations:
   - When you're completely locked out and cannot authenticate
   - When the database is accessible but authentication is broken
   - Document any use of this flag for audit purposes

4. **Audit Trail**: Changes made via this CLI are not automatically logged to the audit log. Consider:
   - Documenting changes manually
   - Reviewing database logs
   - Using version control for configuration changes

5. **Backup**: Before making critical changes, consider:
   - Exporting current settings: `node scripts/manage-system-settings.js list --json > backup.json`
   - Testing changes in a development environment first

6. **File Permissions**: On Unix/Linux systems, ensure the script has appropriate permissions:
   ```bash
   chmod 750 scripts/manage-system-settings.js
   ```

7. **Password Security**: When using non-interactive mode, be aware that:
   - Passwords may be visible in process lists
   - Consider using environment variables or secure credential storage
   - Clear command history after use

### Troubleshooting

#### Database Connection Error

If you see connection errors:
1. Verify `DATABASE_URL` or `POSTGRES_URL` is set correctly
2. Check that the database is running and accessible
3. Verify network connectivity and firewall rules
4. Check SSL settings if using a remote database

#### Setting Not Found

If a setting doesn't exist, the `set` command will create it. The `get` command will show a warning if the setting doesn't exist.

#### Permission Denied

On Unix/Linux systems, you may need to make the script executable:
```bash
chmod +x scripts/manage-system-settings.js
```

### Examples

#### Complete Workflow: Disable and Re-enable Basic Auth

```bash
# 1. Check current status
node scripts/manage-system-settings.js get basicAuthEnabled

# 2. Disable basic auth
node scripts/manage-system-settings.js disable-basic-auth

# 3. Verify it's disabled
node scripts/manage-system-settings.js get basicAuthEnabled

# 4. Re-enable basic auth (if needed)
node scripts/manage-system-settings.js enable-basic-auth
```

#### Batch Operations

You can create a simple shell script for batch operations:

```bash
#!/bin/bash
node scripts/manage-system-settings.js set basicAuthEnabled true
node scripts/manage-system-settings.js set jobMatchFeatureEnabled true
node scripts/manage-system-settings.js set processQueueEnabled true
```

## 📊 Database Schema

The application uses Prisma ORM with the following key models:

- **User**: Authentication and user management
- **Candidate**: Candidate profiles and data
- **Position**: Job positions and requirements
- **RecruitmentStage**: Hiring pipeline stages
- **UserGroup**: Role-based access control
- **SystemSetting**: Application configuration
- **AuditLog**: System activity tracking
- **Attachment**: File attachments including resume upload history
- **TransitionRecord**: Candidate status changes
- **CustomFieldDefinition**: Custom field definitions
- **NotificationEvent/Channel/Setting**: Notification configuration

## 🔄 Database Initialization

The application automatically initializes the database on first startup:

1. **Schema Creation**: Prisma pushes the schema to PostgreSQL
2. **Data Seeding**: Initial data is automatically inserted:
   - Admin user account
   - Default recruitment stages
   - User groups and permissions
   - Notification channels and events
   - Sample positions

## 🚀 Deployment Options

### 1. **Docker Compose** (Recommended)
```bash
docker-compose up -d
```

### 2. **Portainer Stack**
- Upload `docker-compose.yml` to Portainer
- Configure environment variables
- Deploy the stack

### 3. **Manual Docker**
```bash
# Build the image
docker build -t candidatrack .

# Run with environment variables
docker run -d \
  --name candidatrack \
  -p 8021:8021 \
  --env-file .env \
  candidatrack
```

### 4. **Production Deployment**
For production environments, consider:
- Using a reverse proxy (Nginx/Traefik)
- Setting up SSL certificates
- Configuring backup strategies
- Implementing monitoring and logging

## 🔧 Development

### Local Development Setup

#### **Prerequisites**
- Node.js 18+ (LTS recommended)
- PostgreSQL 15+ (or use Docker)
- Git

#### **Initial Setup**
```bash
# Clone the repository
git clone <repository-url>
cd studio-2

# Install dependencies
npm install

# Set up environment
cp env.local.template .env.local

# Edit .env.local with your configuration
# At minimum, configure:
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - MINIO credentials

# Run database migrations
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed database with initial data
npm run db:seed

# Create admin user (if needed)
npm run db:create-admin

# Start development server
npm run dev
```

#### **Development Workflow**
1. **Start Services**: Use Docker Compose for dependencies (PostgreSQL, MinIO)
   ```bash
   docker-compose up -d postgres minio
   ```

2. **Run Development Server**: 
   ```bash
   npm run dev
   ```
   Access at http://localhost:8021

3. **Run with Background Processor** (for testing upload queue):
   ```bash
   npm run dev:with-processor
   ```

4. **Database Management**:
   ```bash
   # View database in Prisma Studio
   npm run db:studio
   
   # Create new migration
   npm run db:dev
   
   # Check migration status
   npm run db:status
   ```

### Project Structure

```
studio-2/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── api/               # API endpoints
│   │   │   ├── v1/            # V1 API (stable)
│   │   │   ├── candidates/    # Candidate endpoints
│   │   │   ├── positions/     # Position endpoints
│   │   │   ├── ai/            # AI endpoints
│   │   │   ├── settings/      # Settings endpoints
│   │   │   └── ...
│   │   ├── candidates/        # Candidate pages
│   │   ├── positions/         # Position pages
│   │   ├── settings/           # Settings pages
│   │   └── ...
│   ├── components/            # React components
│   │   ├── ui/                # UI components (ShadCN)
│   │   ├── candidates/        # Candidate-related components
│   │   ├── positions/          # Position-related components
│   │   ├── settings/           # Settings components
│   │   └── ...
│   ├── lib/                    # Utility libraries
│   │   ├── prisma.ts          # Prisma client
│   │   ├── minio.ts           # MinIO client
│   │   ├── realtime.ts        # SSE real-time hub
│   │   └── ...
│   ├── hooks/                  # React hooks
│   ├── contexts/              # React contexts
│   ├── types/                  # TypeScript types
│   └── middleware.ts          # Next.js middleware
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.ts                # Database seed script
├── scripts/                   # Utility scripts
├── docs/                       # Documentation
├── public/                     # Static assets
└── docker-compose.yml          # Docker configuration
```

### Code Style & Standards

- **TypeScript**: Strict mode enabled, all files must be typed
- **ESLint**: Configured with Next.js rules
- **Prettier**: Automatic code formatting (if configured)
- **Component Structure**: 
  - Use functional components with hooks
  - Separate client/server components with `"use client"` directive
  - Keep components focused and reusable

### Testing

```bash
# Run tests (if configured)
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Debugging

#### **Browser DevTools**
- React DevTools for component inspection
- Network tab for API debugging
- Console for runtime errors

#### **Server-Side Debugging**
```bash
# View application logs
docker-compose logs -f app

# View specific service logs
docker-compose logs -f postgres
docker-compose logs -f minio

# Access database directly
docker exec -it <postgres-container> psql -U user -d database
```

#### **Prisma Studio**
```bash
# Open Prisma Studio for database inspection
npm run db:studio
```

### Common Development Tasks

#### **Adding a New API Endpoint**
1. Create route file: `src/app/api/your-endpoint/route.ts`
2. Export HTTP methods (GET, POST, PUT, DELETE)
3. Add authentication/authorization checks
4. Document in Swagger if needed

#### **Adding a New Page**
1. Create page file: `src/app/your-page/page.tsx`
2. Add to sidebar navigation if needed
3. Update routing configuration

#### **Adding a New Database Model**
1. Update `prisma/schema.prisma`
2. Run `npx prisma db push` or create migration
3. Generate Prisma client: `npx prisma generate`
4. Update types if needed

#### **Adding a New Component**
1. Create component file in appropriate directory
2. Use TypeScript with proper typing
3. Follow component naming conventions
4. Add to component exports if shared

### Available Scripts

#### **Development**
```bash
npm run dev                    # Start development server (port 8021)
npm run dev:custom             # Start custom development server
npm run dev:with-processor     # Start dev server with background processor
npm run build                  # Build for production
npm run start                  # Start production server
npm run start:local            # Start local development server
npm run start:local:with-processor  # Start local server with processor
npm run start:production       # Start production server with all services
npm run lint                   # Run ESLint
npm run typecheck              # Run TypeScript checks
```

#### **Database Management**
```bash
npm run db:migrate             # Run database migrations
npm run db:migrate:force       # Force run migrations
npm run db:dev                 # Development migration
npm run db:deploy              # Deploy migrations
npm run db:check               # Check database schema
npm run db:reset               # Reset database (WARNING: deletes data)
npm run db:status              # Check migration status
npm run db:studio              # Open Prisma Studio
npm run db:seed                # Seed database with initial data
npm run db:create-admin        # Create admin user
npm run db:migrate:seed        # Run migrations and seed
```

#### **Background Processing**
```bash
npm run processor              # Start background processor
npm run processor:pm2          # Start processor with PM2
npm run processor:pm2:stop     # Stop PM2 processor
npm run processor:pm2:restart # Restart PM2 processor
npm run processor:pm2:logs    # View PM2 processor logs
```

#### **Data Management**
```bash
npm run seed:demo-data         # Seed demo data
npm run seed:upload-queue      # Seed upload queue with test data
npm run fix:stages             # Fix stage mismatches
npm run fix:stages:dry-run     # Dry run for stage fixes
npm run fix:candidate-status  # Fix candidate status issues
npm run fix:status-rename      # Update components to use statusId
```

#### **System Settings Management (CLI Backdoor)**
```bash
npm run settings:list          # List all system settings
npm run settings:get           # Get a specific setting (add key as argument)
npm run settings:set           # Set a setting (add key and value as arguments)
npm run settings:enable-basic-auth   # Enable basic username/password login
npm run settings:disable-basic-auth # Disable basic username/password login
```

#### **Docker Management**
```bash
npm run start:docker           # Start Docker containers
npm run stop:docker            # Stop Docker containers
npm run logs:docker            # View Docker logs
```

#### **Migration Management**
```bash
npm run migrations:skip-failed # Skip failed migrations
npm run migrations:skip-failed:dry-run # Dry run for skipping migrations
```

#### **Setup & Utilities**
```bash
npm run setup:local            # Setup local development environment
npm run clean                  # Clean build artifacts
```

## 📈 Monitoring & Health Checks

### Health Endpoints

#### **Application Health**
- **URL**: `/api/health`
- **Method**: GET
- **Response**: Application status, version, and basic metrics

#### **Database Health**
- **URL**: `/api/health/database`
- **Method**: GET
- **Response**: Database connection status and query performance

#### **MinIO Health**
- **URL**: `/api/health/minio`
- **Method**: GET
- **Response**: MinIO connection status and bucket accessibility

#### **SSE Health**
- **URL**: `/api/sse/health`
- **Method**: GET
- **Response**: Server-Sent Events connection status

#### **V1 Health**
- **URL**: `/api/v1/health`
- **Method**: GET
- **Response**: Comprehensive health check with statistics

### Built-in Monitoring

#### **System Status Page**
- **URL**: `/system-status`
- **Features**:
  - Real-time system health metrics
  - Resource usage (CPU, memory, disk)
  - Service status indicators
  - Connection pool monitoring

#### **Dashboard Metrics**
- Real-time candidate counts
- Position statistics
- Application trends
- SLA compliance rates

#### **Log Monitoring**
- **URL**: `/logs` or `/settings/logs`
- **Features**:
  - System log viewer
  - Filter by level, date, user
  - Search functionality
  - Export capabilities

### Performance Monitoring

#### **Database Performance**
- Query execution time tracking
- Connection pool monitoring
- Index usage analysis
- Slow query detection

#### **Application Performance**
- API response times
- Page load metrics
- Real-time update latency
- Background processor throughput

### Alerting

#### **SLA Violations**
- **URL**: `/sla-monitoring`
- **Features**:
  - Position SLA tracking
  - Violation alerts
  - Compliance reports

#### **Warning System**
- **URL**: `/api/warnings`
- **Features**:
  - Data quality warnings
  - Configurable warning conditions
  - Auto-clearing warnings
  - Warning notifications

### External Monitoring Integration

#### **Health Check for Load Balancers**
```bash
# Use health endpoint for load balancer health checks
curl http://your-domain:8021/api/health
```

#### **Prometheus Metrics** (if configured)
- Expose metrics endpoint
- Monitor application metrics
- Alert on thresholds

#### **SigNoz Observability** (if configured)
- Unified observability platform (logs, metrics, traces)
- Distributed tracing across services
- Performance monitoring and bottleneck identification
- See [SigNoz Integration Documentation](./docs/signoz-integration.md) for details

#### **Elasticsearch Log Search** (if configured)
- Advanced log search and indexing
- Full-text search with fuzzy matching
- Complex queries and filtering
- Can be used alongside SigNoz

### Monitoring Best Practices

1. **Regular Health Checks**: Monitor health endpoints every 1-5 minutes
2. **Log Aggregation**: Centralize logs for analysis
3. **Alert Thresholds**: Set appropriate alert thresholds
4. **Performance Baselines**: Establish performance baselines
5. **Capacity Planning**: Monitor resource usage trends

## 🔗 API Documentation

### Interactive API Documentation
Access the interactive API documentation at:
- **URL**: `/api-docs` or `/settings/api-docs`
- **Format**: Swagger/OpenAPI 3.0

### API Versions
- **V1 API**: `/api/v1/` - Stable API with JWT authentication and comprehensive endpoints
- **Latest API**: `/api/` - Latest features and improvements

### Main API Endpoints

#### **Authentication & Authorization**
- `POST /api/v1/auth/login` - JWT-based authentication
- `GET /api/auth/session` - Session validation
- `POST /api/auth/change-password` - Password management
- `GET /api/auth/check-permissions` - Permission checking

#### **Candidates**
- `GET /api/candidates` - List candidates with filtering
- `GET /api/candidates/[id]` - Get candidate details
- `POST /api/candidates` - Create candidate
- `PUT /api/candidates/[id]` - Update candidate
- `DELETE /api/candidates/[id]` - Delete candidate
- `POST /api/candidates/import` - Bulk import
- `GET /api/candidates/export` - Export candidates
- `POST /api/candidates/bulk-action` - Bulk operations
- `GET /api/candidates/[id]/resumes` - Get resumes
- `POST /api/candidates/[id]/resumes` - Upload resume
- `GET /api/candidates/[id]/avatar` - Get avatar
- `POST /api/candidates/[id]/avatar` - Upload avatar
- `GET /api/candidates/[id]/comments` - Get comments
- `POST /api/candidates/[id]/comments` - Add comment
- `GET /api/v1/candidates/[id]/job-matches` - Get job matches
- `POST /api/v1/candidates/[id]/job-matches/add` - Add job match
- `GET /api/v1/candidates/[id]/evaluation` - Get evaluations
- `POST /api/v1/candidates/[id]/evaluation` - Create evaluation

#### **Positions**
- `GET /api/positions` - List positions
- `GET /api/positions/[id]` - Get position details
- `POST /api/positions` - Create position
- `PUT /api/positions/[id]` - Update position
- `DELETE /api/positions/[id]` - Delete position
- `POST /api/positions/import` - Bulk import
- `GET /api/positions/export` - Export positions
- `GET /api/positions/[id]/candidates` - Get position candidates
- `GET /api/positions/[id]/job-matches` - Get job matches
- `GET /api/positions/[id]/statistics` - Get statistics
- `GET /api/positions/[id]/sla` - Get SLA information
- `GET /api/positions/[id]/interviewers` - Get interviewers
- `POST /api/positions/[id]/interviewers` - Add interviewer
- `GET /api/positions/[id]/expertise-skills` - Get expertise skills
- `GET /api/positions/[id]/personality-traits` - Get personality traits

#### **Dashboard & Analytics**
- `GET /api/dashboard/data` - Get dashboard data
- `GET /api/v1/dashboard` - V1 dashboard endpoint
- `GET /api/sse` - Unified SSE stream for real-time updates (replaces deprecated /api/dashboard/stream)

#### **Upload Queue**
- `GET /api/upload-queue` - List queue items
- `GET /api/upload-queue/[id]` - Get queue item
- `POST /api/upload-queue/upload-file` - Upload file
- `POST /api/upload-queue/process` - Process queue item
- `POST /api/upload-queue/process-all` - Process all items
- `GET /api/upload-queue/stats` - Get statistics
- `GET /api/upload-queue/count` - Get pending count
- `GET /api/sse` - Unified SSE stream for real-time updates (replaces deprecated /api/upload-queue/sse)

#### **AI & Search**
- `POST /api/ai/search-candidates` - AI-powered candidate search
- `POST /api/v1/ai/search-candidates` - V1 AI search
- `POST /api/ai/generate-content` - Generate content with AI
- `POST /api/ai/generate-job-description` - Generate job description
- `GET /api/ai/available-models` - Get available AI models

#### **Evaluation**
- `GET /api/v1/evaluation/expertise-skills` - Get expertise skills
- `POST /api/v1/evaluation/expertise-skills` - Create expertise skill
- `GET /api/v1/evaluation/personality-traits` - Get personality traits
- `POST /api/v1/evaluation/personality-traits` - Create personality trait
- `GET /api/v1/evaluation/links` - Get evaluation links
- `POST /api/v1/evaluation/links` - Create evaluation link

#### **Notifications**
- `GET /api/realtime/notifications` - Get notifications
- `GET /api/realtime/notifications/count` - Get notification count
- `POST /api/realtime/notifications/mark-all-read` - Mark all as read
- `GET /api/v1/notifications` - V1 notifications endpoint

#### **Settings**
- `GET /api/settings/system-settings` - Get system settings
- `PUT /api/settings/system-settings` - Update system settings
- `GET /api/settings/user-groups` - Get user groups
- `GET /api/settings/webhooks` - Get webhooks
- `POST /api/settings/webhooks` - Create webhook
- `GET /api/settings/recruitment-stages` - Get recruitment stages
- `GET /api/settings/custom-field-definitions` - Get custom fields

#### **Health & Monitoring**
- `GET /api/health` - Application health check
- `GET /api/health/database` - Database health check
- `GET /api/health/minio` - MinIO health check
- `GET /api/v1/health` - V1 health check
- `GET /api/sse/health` - SSE health check
- `GET /api/warnings` - Get warnings
- `GET /api/sla-violations` - Get SLA violations

#### **Real-time (SSE)**
- `GET /api/sse` - Main SSE endpoint
- `GET /api/sse/status` - SSE status
- `GET /api/sse/ping` - SSE ping test
- `GET /api/realtime/presence` - User presence tracking
- `GET /api/realtime/collaboration-events` - Collaboration events

For complete API documentation, see:
- **V1 API README**: `src/app/api/v1/README.md`
- **Swagger UI**: `/api-docs`

## 🛡️ Security Features

### Authentication & Authorization
- **Password Hashing**: bcrypt with salt rounds (configurable)
- **Session Management**: Secure NextAuth.js sessions with JWT
- **Multi-Provider Auth**: Support for email/password and Azure AD SSO
- **Session Refresh**: Automatic session refresh and validation
- **Force Password Change**: Require password changes on first login
- **Account Lockout**: Inactive account management

### Data Protection
- **Input Validation**: Zod schema validation on all inputs
- **SQL Injection Prevention**: Parameterized queries via Prisma ORM
- **XSS Protection**: Content Security Policy headers and sanitization
- **File Upload Security**: Type validation, size limits, virus scanning (if configured)
- **Secure File Access**: MinIO with signed URLs for file access
- **Data Encryption**: Sensitive data encryption at rest (database)

### Access Control
- **Role-Based Access Control (RBAC)**: Admin, Recruiter, Hiring Manager roles
- **Granular Permissions**: Module-level permissions (VIEW, MANAGE, EXPORT, etc.)
- **User Groups**: Permission inheritance through groups
- **Permission Overrides**: Individual user permission customization
- **API Authentication**: JWT tokens for V1 API, session-based for web

### Security Monitoring
- **Audit Logging**: Complete system activity tracking
- **Security Dashboard**: Monitor security alerts and access patterns
- **Failed Login Tracking**: Track and alert on suspicious activity
- **Session Monitoring**: Track active sessions and user presence

### Best Practices
- **Environment Variables**: Sensitive data stored in environment variables
- **Secrets Management**: Secure secret storage and rotation
- **HTTPS Enforcement**: SSL/TLS for production deployments
- **CORS Configuration**: Proper CORS settings for API endpoints
- **Rate Limiting**: API rate limiting (if configured)
- **Security Headers**: Security-focused HTTP headers

## 🔄 Backup & Recovery

### Database Backup

#### **Manual Backup**
```bash
# Create backup
docker exec postgres pg_dump -U user database > backup.sql

# Create timestamped backup
docker exec postgres pg_dump -U user database > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup with compression
docker exec postgres pg_dump -U user database | gzip > backup.sql.gz
```

#### **Restore Backup**
```bash
# Restore from backup
docker exec -i postgres psql -U user database < backup.sql

# Restore from compressed backup
gunzip < backup.sql.gz | docker exec -i postgres psql -U user database
```

#### **Automated Backup Script**
Create a cron job for automated backups:
```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * docker exec postgres pg_dump -U user database | gzip > /backups/backup-$(date +\%Y\%m\%d).sql.gz
```

### File Storage Backup

#### **MinIO Backup**
MinIO data is stored in Docker volumes. Backup the volume:
```bash
# Backup MinIO data
docker run --rm -v candidatrack_minio_data:/data -v $(pwd):/backup alpine tar czf /backup/minio-backup-$(date +%Y%m%d).tar.gz -C /data .

# Restore MinIO data
docker run --rm -v candidatrack_minio_data:/data -v $(pwd):/backup alpine tar xzf /backup/minio-backup-YYYYMMDD.tar.gz -C /data
```

#### **MinIO Client Backup** (Alternative)
```bash
# Install MinIO client (mc)
# Backup bucket
mc mirror minio/studio-files ./backup/studio-files

# Restore bucket
mc mirror ./backup/studio-files minio/studio-files
```

### System Settings Backup

#### **Export System Settings**
```bash
# Export all system settings to JSON
npm run settings:list --json > settings-backup.json

# Restore system settings (manual)
# Use the settings:set command for each setting
```

### Backup Strategy Recommendations

1. **Daily Backups**: Database and file storage
2. **Weekly Full Backups**: Complete system backup including configurations
3. **Off-site Storage**: Store backups in separate location
4. **Backup Testing**: Regularly test backup restoration
5. **Retention Policy**: Keep backups for 30-90 days depending on requirements

### Disaster Recovery

#### **Full System Recovery**
1. Restore database from backup
2. Restore MinIO file storage
3. Restore system settings
4. Verify application functionality
5. Test critical workflows

#### **Partial Recovery**
- **Database Only**: Restore database backup
- **Files Only**: Restore MinIO backup
- **Settings Only**: Restore system settings JSON

## 📚 Documentation

### Comprehensive Documentation Suite

#### **User Documentation**
- **User Guide**: `docs/user-guide.md` - Complete user guide with step-by-step instructions
- **System Administration**: `docs/system-administration.md` - System admin guide
- **API Documentation**: `docs/api-documentation.md` - API reference guide
- **Real-time Features**: `docs/realtime.md` - Real-time collaboration documentation

#### **Technical Documentation**
- **V1 API README**: `src/app/api/v1/README.md` - Complete V1 API documentation
- **Swagger Documentation**: `src/swagger/README.md` - Swagger setup guide
- **AI Search Implementation**: `docs/ai-search-implementation.md` - AI search features
- **Security Implementation**: `docs/security-implementation.md` - Security features
- **Index Optimization**: `docs/index-optimization-analysis.md` - Database optimization

#### **Interactive Documentation**
- **Swagger UI**: `/api-docs` - Interactive API documentation
- **Application Docs**: `/docs` - In-app documentation viewer

### Key Documentation Features
- **Comprehensive Coverage**: From user guides to technical implementation
- **User-Focused**: Step-by-step guides for all user roles
- **Developer-Friendly**: Complete API documentation with examples
- **Security Guidelines**: Detailed security implementation and best practices

## 🧹 Project Maintenance

### Recent Cleanup (v0.2.0)
The project has undergone a comprehensive cleanup to improve maintainability:

- **Removed 30+ unnecessary files** including historical documentation and unused scripts
- **Cleaned package.json** by removing references to non-existent scripts
- **Eliminated duplicate SQL files** and outdated migration scripts
- **Removed standalone test files** that were not integrated into the test suite
- **Streamlined documentation** by removing obsolete troubleshooting guides

### Code Quality
- **TypeScript**: Full type safety with strict configuration
- **ESLint**: Code quality and consistency enforcement
- **Prettier**: Automated code formatting
- **Testing**: Vitest and Testing Library for comprehensive test coverage
- **CI/CD**: Automated testing and deployment pipelines

## 🤝 Contributing

### Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/studio-2.git
   cd studio-2
   ```

3. **Set up development environment**:
   ```bash
   npm install
   cp env.local.template .env.local
   # Configure .env.local
   npm run db:push
   npm run db:seed
   ```

4. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```

5. **Make your changes**
   - Follow code style guidelines
   - Write tests for new features
   - Update documentation

6. **Test your changes**:
   ```bash
   npm run lint
   npm run typecheck
   npm run test  # if tests are configured
   ```

7. **Commit your changes**:
   ```bash
   git commit -m "feat: add amazing feature"
   ```

8. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```

9. **Submit a pull request**

### Development Guidelines

#### **Code Style**
- Follow TypeScript best practices
- Use functional components with hooks
- Keep components focused and reusable
- Use meaningful variable and function names
- Add comments for complex logic

#### **Testing**
- Write tests for new features
- Maintain or improve test coverage
- Test edge cases and error scenarios
- Test both success and failure paths

#### **Documentation**
- Update README for user-facing changes
- Update API documentation for endpoint changes
- Add JSDoc comments for complex functions
- Update CHANGELOG for significant changes

#### **Commit Messages**
Use conventional commit format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Build process or auxiliary tool changes

#### **Pull Request Guidelines**
- Provide clear description of changes
- Reference related issues
- Include screenshots for UI changes
- Ensure all CI checks pass
- Request review from maintainers

#### **Backward Compatibility**
- Maintain backward compatibility when possible
- Document breaking changes clearly
- Provide migration guides for major changes
- Version API changes appropriately

### Code Review Process

1. **Automated Checks**: All PRs must pass linting and type checking
2. **Manual Review**: At least one maintainer must review
3. **Testing**: Changes must be tested before merging
4. **Documentation**: Documentation must be updated

### Reporting Issues

When reporting issues, please include:
- **Description**: Clear description of the issue
- **Steps to Reproduce**: Detailed steps to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: OS, Node version, browser (if applicable)
- **Screenshots**: If applicable
- **Logs**: Relevant error logs

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation at `/docs`
- Review the API documentation at `/api-docs`
- Check application logs for error details
- Ensure all environment variables are properly configured

## 🔧 Troubleshooting

### Database Schema Issues

If you encounter errors like `column u.authenticationMethod does not exist`, it means the database schema is out of sync with the Prisma schema.

#### **Quick Fix (Recommended)**
```bash
# Run the schema fix script
chmod +x fix-db-schema.sh
./fix-db-schema.sh
```

#### **Manual Fix**
```bash
# Generate Prisma client
npx prisma generate

# Force reset database schema
npx prisma db push --force-reset --accept-data-loss

# Seed the database
npx prisma db seed
```

#### **Windows PowerShell**
```powershell
# Run the PowerShell fix script
.\fix-db-schema.ps1
```

### Common Issues

1. **"Prisma client did not initialize yet"**
   - Run `npx prisma generate`
   - Restart the application

2. **"Database connection failed"**
   - Check `DATABASE_URL` environment variable
   - Ensure PostgreSQL is running
   - Verify network connectivity

3. **"MinIO connection failed"**
   - Check MinIO service status
   - Verify `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD`
   - Check MinIO endpoint configuration

### Log Analysis

Check application logs for detailed error information:
```bash
# Docker Compose logs
docker-compose logs -f app

# Container logs
docker logs <container-name>

# Application logs
tail -f logs/app.log
```

## 📱 Application Pages & Routes

### Main Application Pages
- **Dashboard** (`/`) - Overview and analytics
- **Applicants** (`/applicants`) - Candidate management interface
- **Candidates** (`/candidates`) - Alternative candidate view
- **Positions** (`/positions`) - Position management
- **My Tasks** (`/my-tasks`) - Personal task board for recruiters
- **Process Queue** (`/process-queue`) - Upload queue monitoring
- **SLA Monitoring** (`/sla-monitoring`) - Service Level Agreement tracking
- **System Status** (`/system-status`) - System health monitoring
- **Users** (`/users`) - User management
- **Logs** (`/logs`) - System logs viewer
- **Settings** (`/settings`) - System configuration hub

### Settings Pages
- **System Settings** (`/settings/system-settings`) - Core system configuration
- **System Preferences** (`/settings/system-preferences`) - Application preferences
- **User Management** (`/settings/users`) - User administration
- **User Groups** (`/settings/user-groups`) - Permission group management
- **User Teams** (`/settings/user-teams`) - Team organization
- **User Preferences** (`/settings/user-preferences`) - User-specific settings
- **Recruitment Stages** (`/settings/stages`) - Pipeline stage configuration
- **Custom Fields** (`/settings/custom-fields`) - Custom field definitions
- **Data Configuration** (`/settings/data-configuration`) - Data model settings
- **Evaluation Configuration** (`/settings/evaluation-configuration`) - Evaluation setup
- **System Prompts** (`/settings/system-prompts`) - AI prompt management
- **Webhooks** (`/settings/webhooks`) - Webhook configuration
- **Warning Configurations** (`/settings/warning-configurations`) - Data quality warnings
- **Recruiter Sync** (`/settings/recruiter-sync`) - Recruiter synchronization
- **API Documentation** (`/settings/api-docs`) - API documentation viewer
- **Logs** (`/settings/logs`) - Settings-specific logs

### Authentication Pages
- **Sign In** (`/auth/signin`) - User authentication

### Documentation Pages
- **Docs** (`/docs`) - Application documentation viewer
- **API Docs** (`/api-docs`) - Interactive API documentation

## 🔄 Changelog

### Latest Updates (v0.2.0)
- ✅ **Codebase Cleanup**: Removed 30+ unnecessary files including historical documentation and unused scripts
- ✅ **Package.json Optimization**: Cleaned up references to non-existent scripts and utilities
- ✅ **Enhanced Candidate Management**: Resume history tracking (via Attachment table) and advanced filtering
- ✅ **Improved Position Management**: Advanced filtering and bulk operations
- ✅ **Comprehensive User Management**: Role-based access control with granular permissions
- ✅ **Task Board Implementation**: Kanban and list views with enhanced filtering
- ✅ **Server-side Configuration**: Application preferences and data model settings
- ✅ **Enhanced Audit Logging**: Search and filter capabilities for system activity
- ✅ **Webhook Integration**: Improved automation workflows and external integrations
- ✅ **API Documentation**: Comprehensive Swagger/OpenAPI documentation
- ✅ **Error Handling**: Improved React rendering and error management
- ✅ **Docker Optimization**: Updated deployment configuration and container management
- ✅ **Real-time Updates**: SSE-based live collaboration and notifications
- ✅ **Multi-language Support**: Automatic font switching (Inter/Thai fonts)
- ✅ **Evaluation System**: Comprehensive candidate evaluation with expertise skills and personality traits
- ✅ **Warning System**: Real-time data quality warnings with configurable conditions
- ✅ **Headcount Management**: Track hiring requests and headcount allocations
- ✅ **Multiple Job Applications**: Support for candidates applying to multiple positions
- ✅ **AI API Key Fallback**: Multiple API keys with automatic failover
- ✅ **Upload Queue Management**: Enhanced queue processing with SSE updates

---

## 🎓 Learning Resources

### For Developers
- **Next.js Documentation**: https://nextjs.org/docs
- **Prisma Documentation**: https://www.prisma.io/docs
- **React Documentation**: https://react.dev
- **TypeScript Handbook**: https://www.typescriptlang.org/docs

### For System Administrators
- **PostgreSQL Documentation**: https://www.postgresql.org/docs
- **MinIO Documentation**: https://min.io/docs
- **Docker Documentation**: https://docs.docker.com
- **N8N Documentation**: https://docs.n8n.io

### For Users
- **User Guide**: `docs/user-guide.md`
- **System Administration Guide**: `docs/system-administration.md`
- **API Documentation**: `/api-docs`

## 📞 Support & Community

### Getting Help
- **Documentation**: Check `/docs` in the application
- **API Docs**: Visit `/api-docs` for API reference
- **Issues**: Report bugs via GitHub Issues
- **Logs**: Check application logs for error details

### Common Questions

#### **Q: How do I reset my password?**
A: Use the password change feature in Settings, or contact your administrator.

#### **Q: How do I add a new user?**
A: Go to Settings → Users → Add User. Configure permissions as needed.

#### **Q: How do I configure webhooks?**
A: Go to Settings → Webhooks → Add Webhook. Configure URL, events, and authentication.

#### **Q: How do I enable AI features?**
A: Configure `GOOGLE_API_KEY` in environment variables, or use Settings → AI Configuration to add API keys.

#### **Q: How do I backup my data?**
A: See the [Backup & Recovery](#-backup--recovery) section for detailed instructions.

## 🔮 Roadmap

### Planned Features
- Enhanced reporting and analytics
- Mobile application support
- Advanced workflow automation
- Integration with more HR systems
- Enhanced AI capabilities
- Multi-tenant support
- Advanced search and filtering
- Custom dashboard widgets

### Version History
- **v0.2.0** (Current): Enhanced features, evaluation system, warning system
- **v0.1.0**: Initial release with core ATS functionality

---

**FitScan** - Modern, scalable, and feature-rich Applicant Tracking System

Built with ❤️ using Next.js, TypeScript, and PostgreSQL 

## Troubleshooting

### Candidate Detail Modal Stuck on "Loading candidate details..."

If you encounter this issue, it's likely due to authentication problems. Here's how to fix it:

1. **Check if you're authenticated**:
   - Navigate to `http://localhost:8021/auth/signin`
   - Sign in with the admin credentials:
     - Email: `admin@qsncc.com`
     - Password: `nccadmin`

2. **If the admin user doesn't exist**:
   ```bash
   # Set the database URL environment variable
   $env:DATABASE_URL="postgresql://studio_user:local_dev_password@localhost:8521/studio_dev"
   
   # Create the admin user using npm script
   npm run db:create-admin
   ```

3. **Verify the database is running**:
   ```bash
   # Check if PostgreSQL is running on port 8521
   netstat -an | findstr :8521
   ```

4. **Check if the development server is running**:
   ```bash
   # Check if Next.js is running on port 8021
   netstat -an | findstr :8021
   ```

5. **Restart the development server if needed**:
   ```bash
   npm run dev
   ```

### Common Error Messages

- **"Failed to fetch" errors**: Usually indicate authentication issues or network problems
- **"Authentication required"**: User needs to sign in
- **"Candidate not found"**: The candidate ID is invalid or doesn't exist
- **"Access denied"**: User doesn't have permission to view the candidate

### API Endpoints

- Health check: `http://localhost:8021/api/health`
- Session check: `http://localhost:8021/api/auth/session`
- Login page: `http://localhost:8021/auth/signin` 

## Realtime (SSE)

The app uses a simple Server-Sent Events hub:

- Server: `src/lib/realtime.ts` exposes `subscribe(request)` and `broadcast(data, event?)`.
- Route: `src/app/api/sse/route.ts` returns `subscribe(request)`.
- Client: use `useEventSource('/api/sse')` from `src/hooks/useEventSource.ts`.

Example broadcast:

```ts
import { broadcast } from '@/lib/realtime';

broadcast({ type: 'notification', message: 'hello' }, 'notification');
```

Legacy managers (unified/enhanced/robust) were removed in favor of this simpler model. 