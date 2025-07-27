# CandiTrack - Modern Applicant Tracking System

A comprehensive, enterprise-grade Applicant Tracking System (ATS) built with Next.js, featuring advanced candidate management, automated workflows, and seamless integrations.

![CandiTrack](https://img.shields.io/badge/Next.js-14.2.3-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-green?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-20.10-blue?style=for-the-badge&logo=docker)

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
- **Resume History**: Track all uploaded resumes with timestamps
- **Profile Images**: Upload and manage candidate avatars
- **Stage Tracking**: Visual Kanban board with drag-and-drop functionality
- **Transition History**: Complete audit trail of candidate progress with notes
- **Recruiter Assignment**: Assign candidates to specific team members
- **Advanced Filtering**: Filter by name, position, status, education, fit score
- **Bulk Operations**: Import/export candidates via CSV
- **AI Integration**: Automated resume parsing and candidate matching
- **Automation Workflows**: PDF upload for automated candidate creation

### 💼 **Position Management**
- **Job Posting Creation**: Rich text editor with custom fields
- **Department Organization**: Structured position hierarchy
- **Status Tracking**: Open/closed position management
- **Candidate Matching**: AI-powered job-candidate matching
- **Bulk Import/Export**: CSV-based position management
- **Enhanced Filtering**: Filter by title, department, status, level

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
- **Real-time Updates**: WebSocket-based live collaboration
- **File Storage**: MinIO integration for secure file management
- **Caching**: Built-in performance optimization
- **Audit Logging**: Complete system activity tracking with search/filter
- **Health Monitoring**: Built-in health checks and monitoring
- **Background Processing**: Queue-based file processing system
- **Multi-language Font Support**: Automatic font switching between Inter (English) and Anuphan (Thai)

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript |
| **UI Framework** | Tailwind CSS, ShadCN UI Components, Inter & Anuphan Fonts |
| **Backend** | Next.js API Routes, Prisma ORM |
| **Database** | PostgreSQL 15 |
| **Authentication** | NextAuth.js (Azure AD + Credentials) |
| **File Storage** | MinIO Object Storage |
| **Caching** | Built-in caching |
| **AI/ML** | Genkit (Google AI) |
| **Deployment** | Docker, Docker Compose |
| **Monitoring** | Built-in health checks, audit logging |

## 📋 Prerequisites

- **Docker & Docker Compose** (for production deployment)
- **Node.js 18+** (for development)
- **PostgreSQL 15+** (if not using Docker)


## 🚀 Quick Start

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd studio
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

# AI Integration
GOOGLE_API_KEY=your-google-ai-key
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

CandiTrack includes N8N for powerful workflow automation capabilities. N8N allows you to create automated workflows that can integrate with your recruitment processes.

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

### Authentication Methods
1. **Email/Password**: Traditional login with bcrypt hashing
2. **Azure AD SSO**: Enterprise single sign-on (optional)

## 📊 Database Schema

The application uses Prisma ORM with the following key models:

- **User**: Authentication and user management
- **Candidate**: Candidate profiles and data
- **Position**: Job positions and requirements
- **RecruitmentStage**: Hiring pipeline stages
- **UserGroup**: Role-based access control
- **SystemSetting**: Application configuration
- **AuditLog**: System activity tracking
- **ResumeHistory**: Resume upload history
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
```bash
# Install dependencies
npm install

# Set up environment
cp env.local.template .env.local

# Run database migrations
npx prisma db push

# Seed database
npx prisma db seed

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
npm run processor    # Start background processor
```

## 📈 Monitoring & Health Checks

### Health Endpoint
- **URL**: `/api/health`
- **Method**: GET
- **Response**: Application status and version

### Built-in Monitoring
- Database connection status
- MinIO storage health
- Background processor status

## 🔗 API Documentation

Access the interactive API documentation at:
- **URL**: `/api-docs`
- **Format**: Swagger/OpenAPI 3.0

## 🛡️ Security Features

- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: Secure NextAuth.js sessions
- **CSRF Protection**: Built-in CSRF tokens
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy headers
- **Role-Based Access Control**: Granular permissions
- **Audit Logging**: Complete system activity tracking

## 🔄 Backup & Recovery

### Database Backup
```bash
# Create backup
docker exec postgres pg_dump -U user database > backup.sql

# Restore backup
docker exec -i postgres psql -U user database < backup.sql
```

### File Storage Backup
MinIO data is stored in Docker volumes. Backup the volume:
```bash
docker run --rm -v candidatrack_minio_data:/data -v $(pwd):/backup alpine tar czf /backup/minio-backup.tar.gz -C /data .
```

## 📚 Documentation

### Project Documentation
- **Business Requirements Document**: `documents/BRD.md`
- **Software Requirements Specification**: `documents/SRS.md`
- **Test Cases**: `documents/TestCases.md`

### API Documentation
- **Interactive Swagger UI**: `/api-docs`
- **API Endpoints**: Comprehensive REST API for all features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

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

## 🔄 Changelog

### Latest Updates
- ✅ Enhanced candidate management with resume history tracking
- ✅ Improved position management with advanced filtering
- ✅ Added comprehensive user group and permission management
- ✅ Implemented My Task Board with Kanban and list views
- ✅ Added server-side application preferences and data model settings
- ✅ Enhanced audit logging with search and filter capabilities
- ✅ Improved webhook integration and automation workflows
- ✅ Added comprehensive test cases and documentation
- ✅ Fixed React rendering errors and improved error handling
- ✅ Updated Docker deployment configuration

---

**CandiTrack** - Modern, scalable, and feature-rich Applicant Tracking System 