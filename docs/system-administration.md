# FitScan ATS - System Administration Guide

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Installation & Setup](#installation--setup)
3. [Configuration Management](#configuration-management)
4. [User Management](#user-management)
5. [Security Configuration](#security-configuration)
6. [Database Management](#database-management)
7. [File Storage Management](#file-storage-management)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)
10. [Performance Optimization](#performance-optimization)
11. [Troubleshooting](#troubleshooting)
12. [Maintenance Procedures](#maintenance-procedures)

## 🏗️ System Overview

### Architecture
FitScan ATS is built on a modern, scalable architecture:

- **Frontend**: Next.js 15.5.2 with React 18
- **Backend**: Next.js API Routes with TypeScript
- **Database**: PostgreSQL 15 with Prisma ORM
- **File Storage**: MinIO object storage
- **AI Integration**: Google Gemini AI
- **Real-time**: Server-Sent Events (SSE)
- **Authentication**: NextAuth.js with multiple providers

### System Requirements

#### Minimum Requirements
- **CPU**: 2 cores, 2.4 GHz
- **RAM**: 8 GB
- **Storage**: 100 GB SSD
- **Network**: 100 Mbps

#### Recommended Requirements
- **CPU**: 4+ cores, 3.0 GHz
- **RAM**: 16+ GB
- **Storage**: 500+ GB SSD
- **Network**: 1 Gbps

#### Software Dependencies
- **Node.js**: 18+ (LTS recommended)
- **PostgreSQL**: 15+
- **Docker**: 20.10+ (for containerized deployment)
- **MinIO**: Latest stable version

## 🚀 Installation & Setup

### Docker Deployment (Recommended)

#### 1. Clone Repository
```bash
git clone <repository-url>
cd studio-2
```

#### 2. Environment Configuration
```bash
# Copy environment template
cp env.production.template .env.production

# Edit environment variables
nano .env.production
```

#### 3. Required Environment Variables
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/fitscan"

# Authentication
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="https://your-domain.com"

# MinIO Storage
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="your-access-key"
MINIO_SECRET_KEY="your-secret-key"
MINIO_BUCKET="studio-production"

# AI Integration
GOOGLE_API_KEY="your-google-api-key"

# Application
NODE_ENV="production"
PORT=8021
```

#### 4. Start Services
```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Manual Installation

#### 1. Database Setup
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb fitscan

# Create user
sudo -u postgres createuser --interactive fitscan_user
```

#### 2. Application Setup
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed

# Build application
npm run build

# Start application
npm start
```

## ⚙️ Configuration Management

### System Settings

#### Core Settings
- **App Name**: Application display name
- **App Logo**: Company logo for branding
- **Favicon**: Browser tab icon
- **Theme**: Default theme configuration

#### AI Settings
- **Google API Key**: Primary AI service key
- **Model Selection**: Gemini model preference
- **API Key Rotation**: Multiple API keys for reliability

#### Notification Settings
- **Email Configuration**: SMTP settings
- **Webhook Endpoints**: External integrations
- **Notification Channels**: In-app, email, webhook

### Environment-Specific Configuration

#### Development
```env
NODE_ENV=development
DATABASE_URL="postgresql://localhost:5432/fitscan_dev"
NEXTAUTH_URL="http://localhost:8021"
```

#### Staging
```env
NODE_ENV=staging
DATABASE_URL="postgresql://staging-db:5432/fitscan_staging"
NEXTAUTH_URL="https://staging.your-domain.com"
```

#### Production
```env
NODE_ENV=production
DATABASE_URL="postgresql://prod-db:5432/fitscan_prod"
NEXTAUTH_URL="https://your-domain.com"
```

## 👥 User Management

### User Roles

#### Admin
- **Full System Access**: All features and settings
- **User Management**: Create, edit, delete users
- **System Configuration**: Modify system settings
- **Audit Access**: View all audit logs

#### Recruiter
- **Candidate Management**: Full candidate access
- **Position Management**: Create and manage positions
- **Task Management**: Personal task board
- **Reporting**: Access to reports and analytics

#### Hiring Manager
- **Position Access**: View assigned positions
- **Candidate Review**: Review candidate profiles
- **Interview Management**: Schedule and conduct interviews
- **Decision Making**: Approve/reject candidates

### User Creation Process

#### 1. Create User Account
```bash
# Using admin interface
POST /api/users
{
  "name": "John Doe",
  "email": "john@company.com",
  "role": "recruiter",
  "password": "secure-password"
}
```

#### 2. Assign Permissions
- **Module Permissions**: Grant access to specific modules
- **Data Permissions**: Control data access levels
- **Feature Permissions**: Enable/disable specific features

#### 3. User Groups
- **Create Groups**: Organize users by department/function
- **Group Permissions**: Apply permissions to entire groups
- **Inheritance**: Users inherit group permissions

### User Lifecycle Management

#### Onboarding
1. **Account Creation**: Create user account
2. **Permission Assignment**: Grant appropriate permissions
3. **Training**: Provide system training
4. **Access Verification**: Confirm access to required features

#### Offboarding
1. **Access Review**: Audit user permissions
2. **Data Transfer**: Transfer ownership of data
3. **Account Deactivation**: Disable user account
4. **Audit Trail**: Document access changes

## 🔒 Security Configuration

### Authentication

#### NextAuth.js Configuration
```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      // Custom credential provider
    }),
    AzureADProvider({
      // Azure AD integration
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      // JWT token customization
    },
    session: async ({ session, token }) => {
      // Session customization
    }
  }
}
```

#### Password Security
- **Minimum Length**: 8 characters
- **Complexity Requirements**: Mixed case, numbers, symbols
- **Password History**: Prevent password reuse
- **Account Lockout**: Lock after failed attempts

### Authorization

#### Role-Based Access Control (RBAC)
```typescript
// Permission system
const permissions = {
  'CANDIDATE_VIEW': ['admin', 'recruiter'],
  'CANDIDATE_EDIT': ['admin', 'recruiter'],
  'CANDIDATE_DELETE': ['admin'],
  'POSITION_CREATE': ['admin', 'recruiter'],
  'SYSTEM_SETTINGS': ['admin']
}
```

#### Data Access Control
- **Row-Level Security**: Database-level access control
- **Field-Level Security**: Sensitive data protection
- **Audit Logging**: Complete access audit trail

### Network Security

#### SSL/TLS Configuration
```nginx
# Nginx SSL configuration
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
}
```

#### Firewall Configuration
```bash
# UFW firewall rules
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5432/tcp  # PostgreSQL (if needed)
sudo ufw enable
```

## 🗄️ Database Management

### Database Schema

#### Core Tables
- **User**: User accounts and authentication
- **Candidate**: Candidate profiles and data
- **Position**: Job positions and requirements
- **RecruitmentStage**: Recruitment pipeline stages
- **Attachment**: File attachments and resumes
- **AuditLog**: System audit trail

#### Maintenance Tables
- **SystemSetting**: Application configuration
- **CustomFieldDefinition**: Custom field definitions
- **Webhook**: Webhook configurations
- **Notification**: User notifications

### Database Operations

#### Backup Procedures
```bash
# Full database backup
pg_dump -h localhost -U fitscan_user -d fitscan > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -h localhost -U fitscan_user -d fitscan | gzip > backup_$(date +%Y%m%d).sql.gz

# Automated backup script
#!/bin/bash
BACKUP_DIR="/var/backups/fitscan"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U fitscan_user -d fitscan | gzip > $BACKUP_DIR/backup_$DATE.sql.gz
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

#### Restore Procedures
```bash
# Restore from backup
gunzip -c backup_20250101.sql.gz | psql -h localhost -U fitscan_user -d fitscan

# Restore specific tables
pg_restore -h localhost -U fitscan_user -d fitscan -t candidates backup.sql
```

#### Migration Management
```bash
# Check migration status
npx prisma migrate status

# Apply pending migrations
npx prisma migrate deploy

# Create new migration
npx prisma migrate dev --name add_new_feature

# Reset database (development only)
npx prisma migrate reset
```

### Performance Optimization

#### Database Indexing
```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_candidates_email ON "Candidate" (email);
CREATE INDEX idx_candidates_position_id ON "Candidate" ("positionId");
CREATE INDEX idx_candidates_status_id ON "Candidate" ("statusId");
CREATE INDEX idx_candidates_application_date ON "Candidate" ("applicationDate");
CREATE INDEX idx_audit_log_timestamp ON "AuditLog" (timestamp);
```

#### Query Optimization
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM "Candidate" WHERE "positionId" = 'uuid';

-- Update table statistics
ANALYZE "Candidate";
ANALYZE "Position";
ANALYZE "User";
```

## 📁 File Storage Management

### MinIO Configuration

#### Storage Setup
```bash
# Start MinIO server
minio server /data --console-address ":9001"

# Create bucket
mc mb minio/studio-production

# Set bucket policy
mc policy set public minio/studio-production
```

#### File Organization
```
studio-production/
├── attachments/
│   ├── candidates/
│   │   ├── {candidate-id}/
│   │   │   ├── resume.pdf
│   │   │   └── profile.jpg
│   └── headcounts/
│       └── {headcount-id}/
├── uploads/
│   └── temp/
└── exports/
    └── reports/
```

#### File Security
- **Access Control**: Bucket-level permissions
- **Encryption**: Server-side encryption
- **Backup**: Regular file system backups
- **Retention**: Automated cleanup policies

### File Operations

#### Upload Management
```typescript
// File upload configuration
const uploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  storagePath: 'attachments/',
  compression: true
}
```

#### Cleanup Procedures
```bash
# Remove orphaned files
find /data/studio-production -type f -mtime +30 -delete

# Compress old files
gzip /data/studio-production/attachments/*.pdf
```

## 📊 Monitoring & Logging

### Application Monitoring

#### Health Checks
```typescript
// Health check endpoint
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      minio: await checkMinIO(),
      ai: await checkAI()
    }
  }
  
  return NextResponse.json(health)
}
```

#### Performance Metrics
- **Response Time**: API endpoint performance
- **Throughput**: Requests per second
- **Error Rate**: Failed request percentage
- **Resource Usage**: CPU, memory, disk usage

### Logging Configuration

#### Log Levels
- **DEBUG**: Detailed debugging information
- **INFO**: General information messages
- **WARN**: Warning messages
- **ERROR**: Error conditions
- **AUDIT**: Security and compliance events

#### Log Rotation
```bash
# Logrotate configuration
/var/log/fitscan/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 fitscan fitscan
}
```

#### Centralized Logging
```yaml
# Docker logging configuration
version: '3.8'
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 💾 Backup & Recovery

### Backup Strategy

#### Database Backups
- **Full Backups**: Daily complete database backups
- **Incremental Backups**: Hourly transaction log backups
- **Point-in-Time Recovery**: Restore to specific timestamps
- **Cross-Region Replication**: Geographic redundancy

#### File Backups
- **Scheduled Backups**: Daily file system backups
- **Versioning**: Multiple backup versions
- **Compression**: Reduce storage requirements
- **Encryption**: Secure backup storage

#### Configuration Backups
- **Environment Files**: Configuration backups
- **SSL Certificates**: Certificate backups
- **Database Schema**: Schema version control
- **Application Code**: Source code backups

### Recovery Procedures

#### Disaster Recovery Plan
1. **Assessment**: Evaluate damage and scope
2. **Communication**: Notify stakeholders
3. **Recovery**: Restore from backups
4. **Validation**: Verify system functionality
5. **Documentation**: Record recovery actions

#### Recovery Time Objectives (RTO)
- **Critical Systems**: 4 hours
- **Standard Systems**: 24 hours
- **Non-Critical Systems**: 72 hours

#### Recovery Point Objectives (RPO)
- **Database**: 1 hour maximum data loss
- **Files**: 24 hours maximum data loss
- **Configuration**: 1 week maximum data loss

## ⚡ Performance Optimization

### Application Performance

#### Caching Strategy
```typescript
// Redis caching configuration
const cacheConfig = {
  ttl: 3600, // 1 hour
  maxSize: 1000,
  strategy: 'lru'
}

// Cache frequently accessed data
const cacheKey = `candidates:${positionId}`
const cachedData = await redis.get(cacheKey)
```

#### Database Optimization
- **Connection Pooling**: Optimize database connections
- **Query Optimization**: Improve slow queries
- **Index Optimization**: Add missing indexes
- **Partitioning**: Partition large tables

#### CDN Configuration
```nginx
# Nginx CDN configuration
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    gzip_static on;
}
```

### Infrastructure Optimization

#### Load Balancing
```nginx
# Nginx load balancer configuration
upstream fitscan_backend {
    server app1:8021;
    server app2:8021;
    server app3:8021;
}

server {
    listen 80;
    location / {
        proxy_pass http://fitscan_backend;
    }
}
```

#### Auto-Scaling
```yaml
# Kubernetes HPA configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: fitscan-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: fitscan-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
psql -h localhost -U fitscan_user -d fitscan -c "SELECT 1"

# Check connection pool
netstat -an | grep 5432

# Restart database service
sudo systemctl restart postgresql
```

#### File Storage Issues
```bash
# Check MinIO status
mc admin info minio

# Check disk space
df -h

# Check file permissions
ls -la /data/studio-production/
```

#### Application Issues
```bash
# Check application logs
tail -f /var/log/fitscan/app.log

# Check process status
ps aux | grep node

# Check memory usage
free -h
```

### Diagnostic Tools

#### System Monitoring
```bash
# CPU usage
top -p $(pgrep node)

# Memory usage
pmap $(pgrep node)

# Disk I/O
iotop -p $(pgrep node)

# Network connections
netstat -tulpn | grep :8021
```

#### Application Profiling
```typescript
// Performance profiling
const startTime = Date.now()
// ... operation ...
const endTime = Date.now()
console.log(`Operation took ${endTime - startTime}ms`)
```

## 🔄 Maintenance Procedures

### Regular Maintenance

#### Daily Tasks
- **Log Review**: Check error logs
- **Backup Verification**: Verify backup integrity
- **Performance Monitoring**: Check system metrics
- **Security Scanning**: Check for vulnerabilities

#### Weekly Tasks
- **Database Maintenance**: Update statistics, vacuum
- **File Cleanup**: Remove temporary files
- **Security Updates**: Apply security patches
- **Performance Analysis**: Review performance metrics

#### Monthly Tasks
- **Full System Backup**: Complete system backup
- **Security Audit**: Comprehensive security review
- **Performance Optimization**: Database and application tuning
- **Documentation Update**: Update system documentation

### Update Procedures

#### Application Updates
```bash
# Backup current version
cp -r /opt/fitscan /opt/fitscan.backup

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run migrations
npx prisma migrate deploy

# Restart application
pm2 restart fitscan
```

#### Database Updates
```bash
# Backup database
pg_dump -h localhost -U fitscan_user -d fitscan > pre_update_backup.sql

# Apply migrations
npx prisma migrate deploy

# Verify update
npx prisma db seed
```

#### Security Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Node.js dependencies
npm audit fix

# Update Docker images
docker-compose pull
docker-compose up -d
```

---

## 📞 Support & Resources

### Documentation
- **User Guide**: End-user documentation
- **API Documentation**: Complete API reference
- **Developer Guide**: Development and customization
- **Deployment Guide**: Production deployment

### Community
- **GitHub Repository**: Source code and issues
- **Discord Server**: Real-time community chat
- **Stack Overflow**: Technical Q&A
- **Reddit Community**: User discussions

### Professional Services
- **System Administration**: Dedicated admin support
- **Custom Development**: Tailored solutions
- **Training Programs**: Comprehensive training
- **Consulting Services**: Expert guidance

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Support**: For technical support, contact your system administrator or visit the support portal.

