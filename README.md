# FitScan - Enterprise Applicant Tracking System (ATS)

A comprehensive, enterprise-grade Applicant Tracking System built with modern web technologies, featuring advanced candidate management, AI-powered matching, automated workflows, and seamless integrations.

![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-green?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-20.10-blue?style=for-the-badge&logo=docker)
![AI](https://img.shields.io/badge/AI-Powered-orange?style=for-the-badge&logo=openai)

---

## 🎯 Overview

FitScan is a modern, scalable Applicant Tracking System designed to streamline recruitment processes through intelligent automation, comprehensive candidate management, and powerful analytics.

### Key Value Propositions

- **AI-Powered Candidate Matching**: Intelligent job-candidate matching using Google AI
- **Real-time Collaboration**: Live updates and notifications via Server-Sent Events
- **Enterprise Security**: Role-based access control with granular permissions
- **Scalable Architecture**: Built on modern tech stack for high performance
- **Comprehensive Analytics**: Detailed insights into recruitment performance
- **Workflow Automation**: N8N integration for custom automation workflows

---

## 🚀 Features

### 📊 Dashboard & Analytics
- Real-time metrics and KPIs
- Recruitment pipeline visualization
- Performance analytics and SLA tracking

### 👥 Candidate Management
- Comprehensive profiles with custom fields
- Resume upload, parsing, and version history
- Stage tracking with Kanban board
- AI-powered resume parsing and matching
- Evaluation system with expertise skills and personality traits

### 💼 Position Management
- Job posting creation with rich text editor
- Headcount and SLA tracking
- Interviewer assignment and expertise skills configuration

### 👤 User & Access Management
- Role-Based Access Control (RBAC)
- Azure AD SSO integration
- Granular permissions and user groups

### 📋 Task Management
- Personal task board for recruiters
- Kanban and list views with filtering

### ⚙️ System Configuration
- Custom fields and recruitment stages
- Webhook integration and notifications
- Theme customization and API documentation

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15.5.2, React 18, TypeScript, Tailwind CSS, ShadCN UI |
| **Backend** | Next.js API Routes, Prisma 6.11.0, NextAuth.js |
| **Database** | PostgreSQL 15 |
| **Storage** | MinIO (S3 Compatible) |
| **AI** | Google AI (Genkit) |
| **Real-time** | Server-Sent Events (SSE) |
| **Automation** | N8N Workflow Engine |
| **DevOps** | Docker, PM2, SigNoz |

---

## 🚀 Quick Start

### Docker Deployment (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd studio-2

# Configure environment
cp env.local.template .env.local

# Deploy with Docker Compose
docker-compose up -d
```

### Access Points

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| **Main App** | http://localhost:8021 | admin@ncc.com / nccadmin |
| **MinIO Console** | http://localhost:9848 | minioadmin / minioadmin |
| **N8N Automation** | http://localhost:8921 | admin / admin |

⚠️ **Security**: Change all default passwords immediately after first login.

---

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

### Core Documentation not included in BRD/SRS/ERD

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System architecture, tech stack, database schema |
| [Installation](docs/INSTALLATION.md) | Setup, deployment, and configuration |
| [Development](docs/DEVELOPMENT.md) | Local development setup and workflow |
| [API Overview](docs/API_OVERVIEW.md) | REST API reference |

### Operations & Maintenance

| Document | Description |
|----------|-------------|
| [CLI Reference](docs/CLI_REFERENCE.md) | Command-line tools and scripts |
| [Monitoring](docs/MONITORING.md) | Health checks, logging, and alerting |
| [Security](docs/SECURITY.md) | Authentication, access control, best practices |
| [Backup & Recovery](docs/BACKUP_RECOVERY.md) | Backup procedures and disaster recovery |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues and solutions |

### Integration & Extensions

| Document | Description |
|----------|-------------|
| [N8N Integration](docs/N8N_INTEGRATION.md) | Workflow automation setup |
| [API Specification](docs/API_SPECIFICATION.md) | Detailed API endpoints |

### Business & Requirements

| Document | Description |
|----------|-------------|
| [BRD](docs/BRD.md) | Business Requirements Document |
| [SRS](docs/SRS.md) | System Requirements Specification |
| [ERD](docs/ERD.md) | Entity Relationship Diagram |
| [Test Cases](docs/TEST_CASES.md) | QA test scenarios |

---

## 🔧 Essential Scripts

### Development
```bash
npm run dev                 # Start development server
npm run build               # Build for production
npm run lint                # Run ESLint
```

### Database
```bash
npm run db:studio           # Open Prisma Studio
npm run db:seed             # Seed database
npm run db:create-admin     # Create admin user
```

### System Settings CLI
```bash
npm run settings:list       # List all settings
npm run settings:enable-basic-auth   # Enable basic auth
```

See [CLI Reference](docs/CLI_REFERENCE.md) for complete script documentation.

---

## 🔐 Authentication

### Methods
1. **Email/Password**: Traditional login with bcrypt hashing
2. **Azure AD SSO**: Enterprise single sign-on

### Default Admin
- **Email**: `admin@ncc.com`
- **Password**: `nccadmin`

See [Security Documentation](docs/SECURITY.md) for configuration details.

---

## 🏗️ Project Structure

```
studio-2/
├── src/
│   ├── app/           # Next.js App Router (pages + API)
│   ├── components/    # React components
│   ├── lib/           # Utility libraries
│   ├── hooks/         # React hooks
│   └── types/         # TypeScript types
├── prisma/            # Database schema and migrations
├── scripts/           # Utility scripts
├── docs/              # Documentation
└── docker-compose.yml # Docker configuration
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🆘 Support

- Check documentation at `/docs` in the application
- Review API documentation at `/api-docs`
- See [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

---

**FitScan** - Modern, scalable, and feature-rich Applicant Tracking System

Built with ❤️ using Next.js, TypeScript, and PostgreSQL